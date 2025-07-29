/**
 * Rendering Feature - Item rendering and positioning for viewport
 * Handles DOM element creation, positioning, recycling, and updates
 */

import { addClass, removeClass, hasClass } from "mtrl";
import type { ViewportContext, ViewportComponent } from "../types";
import { VIEWPORT_CONSTANTS } from "../constants";
import {
  isPlaceholder,
  getViewportState,
  wrapInitialize,
  wrapDestroy,
} from "./utils";
import { createLayout } from "../../layout";

export interface RenderingConfig {
  template?: (
    item: any,
    index: number
  ) => string | HTMLElement | any[] | Record<string, any>;
  overscan?: number;
  measureItems?: boolean;
  enableRecycling?: boolean;
  maxPoolSize?: number;
}

interface ViewportState {
  scrollPosition: number;
  totalItems: number;
  itemSize: number;
  containerSize: number;
  virtualTotalSize: number;
  visibleRange: { start: number; end: number };
  itemsContainer: HTMLElement | null;
}

/**
 * Rendering feature for viewport
 */
export const withRendering = (config: RenderingConfig = {}) => {
  return <T extends ViewportContext & ViewportComponent>(component: T): T => {
    const {
      template,
      overscan = 5,
      measureItems = false,
      enableRecycling = true,
      maxPoolSize = VIEWPORT_CONSTANTS.RENDERING.DEFAULT_MAX_POOL_SIZE,
    } = config;

    // State
    const renderedElements = new Map<number, HTMLElement>();
    const collectionItems: Record<number, any> = {};
    const elementPool: HTMLElement[] = [];
    const poolStats = { created: 0, recycled: 0, poolSize: 0 };

    let viewportState: ViewportState | null = null;
    let currentVisibleRange = { start: 0, end: 0 };
    let lastRenderTime = 0;

    // Element pool management
    const getPooledElement = (): HTMLElement => {
      if (enableRecycling && elementPool.length > 0) {
        poolStats.recycled++;
        return elementPool.pop()!;
      }
      const element = document.createElement("div");
      element.className = "mtrl-viewport-item";
      poolStats.created++;
      return element;
    };

    const releaseElement = (element: HTMLElement): void => {
      if (!enableRecycling) {
        element.remove();
        return;
      }
      // Clean and clone for reuse
      element.className = "mtrl-viewport-item";
      element.removeAttribute("data-index");
      element.style.cssText = "";
      element.innerHTML = "";
      const cleanElement = element.cloneNode(false) as HTMLElement;

      if (elementPool.length < maxPoolSize) {
        elementPool.push(cleanElement);
        poolStats.poolSize = elementPool.length;
      }
      element.remove();
    };

    // Initialize
    wrapInitialize(component, () => {
      viewportState = getViewportState(component) as ViewportState;

      // Listen for collection data loaded
      component.on?.("collection:range-loaded", (data: any) => {
        if (!data.items?.length) return;

        // Analyze data structure on first load
        const placeholders = (component as any).placeholders;
        if (placeholders && !placeholders.hasAnalyzedStructure()) {
          placeholders.analyzeDataStructure(data.items);
        }

        // Update collection items and replace placeholders
        data.items.forEach((item: any, i: number) => {
          const index = data.offset + i;
          const oldItem = collectionItems[index];
          collectionItems[index] = item;

          // Replace placeholder in DOM if needed
          if (
            oldItem &&
            isPlaceholder(oldItem) &&
            renderedElements.has(index)
          ) {
            const element = renderedElements.get(index);
            if (element) {
              const newElement = renderItem(item, index);
              if (newElement) {
                // Remove placeholder classes
                removeClass(newElement, VIEWPORT_CONSTANTS.PLACEHOLDER.CLASS);

                // Add replaced class for fade-in animation
                addClass(newElement, "viewport-item--replaced");

                // Copy position and replace
                Object.assign(newElement.style, {
                  position: element.style.position,
                  transform: element.style.transform,
                  width: element.style.width,
                });
                element.parentNode?.replaceChild(newElement, element);
                renderedElements.set(index, newElement);
                releaseElement(element);

                // Remove the replaced class after animation completes
                setTimeout(() => {
                  removeClass(newElement, "viewport-item--replaced");
                }, 300);
              }
            }
          }
        });

        // Check if we need to render
        const { visibleRange } = viewportState || {};
        if (visibleRange) {
          const renderStart = Math.max(0, visibleRange.start - overscan);
          const renderEnd = Math.min(
            viewportState?.totalItems ?? 0 - 1,
            visibleRange.end + overscan
          );
          const loadedStart = data.offset;
          const loadedEnd = data.offset + data.items.length - 1;

          // Check for placeholders in range
          const hasPlaceholdersInRange = Array.from(
            { length: Math.min(loadedEnd, renderEnd) - loadedStart + 1 },
            (_, i) => collectionItems[loadedStart + i]
          ).some((item) => item && isPlaceholder(item));

          const needsRender =
            (loadedStart <= renderEnd &&
              loadedEnd >= renderStart &&
              renderedElements.size < renderEnd - renderStart + 1) ||
            hasPlaceholdersInRange;

          if (needsRender) renderItems();
        }
      });

      // Listen for events
      component.on?.("viewport:range-changed", renderItems);
      component.on?.("viewport:scroll", updateItemPositions);
    });

    // Template helpers
    const getDefaultTemplate = () => (item: any, index: number) => {
      // Use layout system for default template
      return [
        {
          tag: "div",
          class: "viewport-item",
          text:
            typeof item === "object"
              ? item.name || item.label || item.text || `Item ${index}`
              : String(item),
        },
      ];
    };

    // Process layout schema with item data substitution
    const processLayoutSchema = (
      schema: any,
      item: any,
      index: number
    ): any => {
      if (typeof schema === "string") {
        // Handle variable substitution like {{name}}, {{index}}
        return schema.replace(/\{\{([^}]+)\}\}/g, (match, key) => {
          if (key === "index") return String(index);
          if (key === "item") return String(item);

          // Handle nested properties like {{user.name}}
          const value = key.split(".").reduce((obj: any, prop: string) => {
            return obj?.[prop.trim()];
          }, item);

          return value !== undefined ? String(value) : match;
        });
      }

      if (Array.isArray(schema)) {
        return schema.map((child) => processLayoutSchema(child, item, index));
      }

      if (typeof schema === "object" && schema !== null) {
        const processed: any = {};
        for (const [key, value] of Object.entries(schema)) {
          processed[key] = processLayoutSchema(value, item, index);
        }
        return processed;
      }

      return schema;
    };

    // Position calculation
    const calculateItemPosition = (
      index: number,
      scrollPosition: number,
      totalItems: number,
      itemSize: number,
      virtualTotalSize: number,
      containerSize: number
    ): number => {
      const actualTotalSize = totalItems * itemSize;
      const isCompressed =
        actualTotalSize > virtualTotalSize && virtualTotalSize > 0;

      if (!isCompressed || totalItems === 0) {
        return index * itemSize - scrollPosition;
      }

      // Compressed space handling
      const maxScrollPosition = virtualTotalSize - containerSize;
      const distanceFromBottom = maxScrollPosition - scrollPosition;
      const nearBottomThreshold = containerSize;

      if (
        distanceFromBottom <= nearBottomThreshold &&
        distanceFromBottom >= -1
      ) {
        // Near bottom interpolation
        const itemsAtBottom = Math.floor(containerSize / itemSize);
        const firstVisibleAtBottom = Math.max(0, totalItems - itemsAtBottom);
        const scrollRatio = scrollPosition / virtualTotalSize;
        const exactScrollIndex = scrollRatio * totalItems;
        const interpolation = Math.max(
          0,
          Math.min(1, 1 - distanceFromBottom / nearBottomThreshold)
        );

        const bottomPosition = (index - firstVisibleAtBottom) * itemSize;
        const normalPosition = (index - exactScrollIndex) * itemSize;
        return (
          normalPosition + (bottomPosition - normalPosition) * interpolation
        );
      }

      // Normal compressed scrolling
      const scrollRatio = scrollPosition / virtualTotalSize;
      return (index - scrollRatio * totalItems) * itemSize;
    };

    // Render single item
    const renderItem = (item: any, index: number): HTMLElement | null => {
      const itemTemplate = template || getDefaultTemplate();

      try {
        const result = itemTemplate(item, index);
        let element: HTMLElement;

        // Check if result is a layout schema (array or object)
        if (
          Array.isArray(result) ||
          (typeof result === "object" &&
            result !== null &&
            !(result instanceof HTMLElement))
        ) {
          // Process schema to substitute variables
          const processedSchema = processLayoutSchema(result, item, index);

          // Use layout system to create element
          const layoutResult = createLayout(processedSchema);
          element = layoutResult.element;

          // If the layout created a wrapper, use it directly
          if (element && element.nodeType === 1) {
            // Element is already created by layout system
          } else {
            // Fallback if layout didn't create a proper element
            element = getPooledElement();
            if (layoutResult.element) {
              element.appendChild(layoutResult.element);
            }
          }
        } else if (typeof result === "string") {
          element = getPooledElement();
          element.innerHTML = result;
          if (element.children.length === 1) {
            addClass(element.firstElementChild as HTMLElement, "viewport-item");
          }
        } else if (result instanceof HTMLElement) {
          element = getPooledElement();
          element.appendChild(result);
        } else {
          console.warn(`[Rendering] Invalid template result for item ${index}`);
          return null;
        }

        // Add classes
        if (!hasClass(element, "viewport-item"))
          addClass(element, "viewport-item");
        if (isPlaceholder(item)) {
          addClass(element, VIEWPORT_CONSTANTS.PLACEHOLDER.CLASS);
        }

        element.dataset.index = String(index);
        return element;
      } catch (error) {
        console.error(`[Rendering] Error rendering item ${index}:`, error);
        return null;
      }
    };

    // Update positions
    const updateItemPositions = (): void => {
      if (!viewportState || renderedElements.size === 0) return;

      const {
        scrollPosition,
        itemSize: itemSize,
        totalItems,
        virtualTotalSize,
        containerSize,
      } = viewportState;
      const actualTotalSize = totalItems * itemSize;
      const isCompressed =
        actualTotalSize > virtualTotalSize && virtualTotalSize > 0;

      const sortedIndices = Array.from(renderedElements.keys()).sort(
        (a, b) => a - b
      );
      if (!sortedIndices.length) return;

      const firstIndex = sortedIndices[0];
      let currentPosition = 0;

      if (isCompressed) {
        const maxScroll = virtualTotalSize - containerSize;
        const distanceFromBottom = maxScroll - scrollPosition;

        if (distanceFromBottom <= containerSize && distanceFromBottom >= -1) {
          // Near bottom interpolation
          const itemsAtBottom = Math.floor(containerSize / itemSize);
          const firstVisibleAtBottom = Math.max(0, totalItems - itemsAtBottom);
          const scrollRatio = scrollPosition / virtualTotalSize;
          const exactScrollIndex = scrollRatio * totalItems;
          const interpolation = Math.max(
            0,
            Math.min(1, 1 - distanceFromBottom / containerSize)
          );

          const bottomPos = (firstIndex - firstVisibleAtBottom) * itemSize;
          const normalPos = (firstIndex - exactScrollIndex) * itemSize;
          currentPosition = normalPos + (bottomPos - normalPos) * interpolation;
        } else {
          const scrollRatio = scrollPosition / virtualTotalSize;
          currentPosition = (firstIndex - scrollRatio * totalItems) * itemSize;
        }
      } else {
        currentPosition = firstIndex * itemSize - scrollPosition;
      }

      // Position each item
      sortedIndices.forEach((index) => {
        const element = renderedElements.get(index);
        if (element) {
          element.style.transform = `translateY(${Math.round(
            currentPosition
          )}px)`;

          // Strategic log for last items
          if (index >= totalItems - 5) {
            console.log(
              `[Rendering] Last item positioned: index=${index}, position=${Math.round(
                currentPosition
              )}px, itemSize=${itemSize}px, totalItems=${totalItems}`
            );
          }

          currentPosition += itemSize;
        }
      });
    };

    // Main render function
    const renderItems = () => {
      if (!viewportState?.itemsContainer) return;

      const {
        visibleRange,
        itemsContainer,
        totalItems,
        itemSize,
        scrollPosition,
        containerSize,
        virtualTotalSize,
      } = viewportState;

      // Validate range
      if (
        !visibleRange ||
        visibleRange.start < 0 ||
        visibleRange.start >= totalItems ||
        visibleRange.end < visibleRange.start ||
        isNaN(visibleRange.start) ||
        isNaN(visibleRange.end)
      ) {
        return;
      }

      // Check if range changed
      if (
        visibleRange.start === currentVisibleRange.start &&
        visibleRange.end === currentVisibleRange.end &&
        renderedElements.size > 0
      ) {
        updateItemPositions();
        return;
      }

      lastRenderTime = Date.now();
      const renderStart = Math.max(0, visibleRange.start - overscan);
      const renderEnd = Math.min(totalItems - 1, visibleRange.end + overscan);

      // Remove items outside range
      Array.from(renderedElements.entries())
        .filter(([index]) => index < renderStart || index > renderEnd)
        .forEach(([index, element]) => {
          if (element.parentNode) releaseElement(element);
          renderedElements.delete(index);
        });

      // Get items source
      const hasCollectionItems = Object.keys(collectionItems).length > 0;
      const items = hasCollectionItems
        ? collectionItems
        : component.items || [];
      const missingItems: number[] = [];

      // Render items in range
      for (let i = renderStart; i <= renderEnd; i++) {
        if (i < 0 || i >= totalItems || renderedElements.has(i)) continue;

        let item = items[i];
        if (!item) {
          missingItems.push(i);
          // Generate placeholder
          const placeholders = (component as any).placeholders;
          item = placeholders?.generatePlaceholderItem(i) || {
            _placeholder: true,
            index: i,
            id: `placeholder-${i}`,
            name: VIEWPORT_CONSTANTS.PLACEHOLDER.MASK_CHARACTER.repeat(15),
            text: VIEWPORT_CONSTANTS.PLACEHOLDER.MASK_CHARACTER.repeat(25),
            description:
              VIEWPORT_CONSTANTS.PLACEHOLDER.MASK_CHARACTER.repeat(40),
          };
          collectionItems[i] = item;
        }

        const element = renderItem(item, i);
        if (element) {
          const position = calculateItemPosition(
            i,
            scrollPosition,
            totalItems,
            itemSize,
            virtualTotalSize,
            containerSize
          );

          Object.assign(element.style, {
            position: "absolute",
            transform: `translateY(${position}px)`,
            width: "100%",
          });

          itemsContainer.appendChild(element);
          renderedElements.set(i, element);
        }
      }

      // Request missing items
      if (
        missingItems.length > 0 &&
        component.viewport?.collection?.loadMissingRanges
      ) {
        component.viewport.collection.loadMissingRanges(
          {
            start: Math.min(...missingItems),
            end: Math.max(...missingItems),
          },
          "rendering:missing-items"
        );
      }

      currentVisibleRange = visibleRange;

      // Emit items rendered event with elements for size calculation
      const renderedElementsArray = Array.from(renderedElements.values());
      component.emit?.("viewport:items-rendered", {
        elements: renderedElementsArray,
        range: visibleRange,
      });

      component.emit?.("viewport:rendered", {
        range: visibleRange,
        renderedCount: renderedElements.size,
      });
      updateItemPositions();

      // Load data if no items rendered
      if (
        renderedElements.size === 0 &&
        totalItems > 0 &&
        component.viewport?.collection
      ) {
        component.viewport.collection.loadMissingRanges(
          visibleRange,
          "rendering:no-items"
        );
      }
    };

    // Extend viewport API
    const originalRenderItems = component.viewport.renderItems;
    component.viewport.renderItems = () => {
      renderItems();
      originalRenderItems?.();
    };

    // Cleanup
    wrapDestroy(component, () => {
      renderedElements.forEach((element) => {
        if (element.parentNode) releaseElement(element);
      });
      renderedElements.clear();
      elementPool.length = 0;
    });

    return component;
  };
};
