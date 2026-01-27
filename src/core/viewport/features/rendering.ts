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
    index: number,
  ) => string | HTMLElement | any[] | Record<string, any>;
  overscan?: number;
  measureItems?: boolean;
  enableRecycling?: boolean;
  maxPoolSize?: number;
  /**
   * Maintain DOM order to match visual index order.
   * Enables CSS selectors like :first-child, :nth-child() to work correctly.
   * Default: true
   */
  maintainDomOrder?: boolean;
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
      maintainDomOrder = true,
    } = config;

    // Helper to get items from collection (single source of truth)
    const getCollectionItems = (): any[] => {
      return (
        (component as any).collection?.items || (component as any).items || []
      );
    };

    // State
    const renderedElements = new Map<number, HTMLElement>();
    const elementPool: HTMLElement[] = [];
    const poolStats = { created: 0, recycled: 0, poolSize: 0, released: 0 };

    // Store layout results for proper cleanup (prevents memory leak)
    const layoutResults = new WeakMap<HTMLElement, { destroy: () => void }>();

    // Reusable template element for HTML string parsing (more efficient than div)
    const templateParser = document.createElement("template");

    let viewportState: ViewportState | null = null;
    let currentVisibleRange = { start: 0, end: 0 };
    let lastRenderTime = 0;
    let isRemovingItem = false;

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
      poolStats.released++;

      // CRITICAL: Call destroy on layoutResult to clean up components and event listeners
      // This fixes the memory leak when using layout templates
      const layoutResult = layoutResults.get(element);
      if (layoutResult && typeof layoutResult.destroy === "function") {
        try {
          layoutResult.destroy();
        } catch (e) {
          // Ignore destroy errors - element may already be cleaned up
        }
        layoutResults.delete(element);
      }

      if (!enableRecycling) {
        element.remove();
        return;
      }
      // Clean element for reuse (no cloning - reuse the actual element)
      element.className = "mtrl-viewport-item";
      element.removeAttribute("data-index");
      element.style.cssText = "";
      element.innerHTML = "";

      // Remove from DOM first
      if (element.parentNode) {
        element.parentNode.removeChild(element);
      }

      // Add to pool if not full
      if (elementPool.length < maxPoolSize) {
        elementPool.push(element);
        poolStats.poolSize = elementPool.length;
      }
      // If pool is full, element is just dereferenced and GC'd
    };

    // Initialize
    wrapInitialize(component, () => {
      viewportState = getViewportState(component) as ViewportState;

      // Set initial items container height from current virtual size
      if (viewportState?.itemsContainer && viewportState.virtualTotalSize > 0) {
        viewportState.itemsContainer.style.height = `${viewportState.virtualTotalSize}px`;
      }

      // Listen for item update requests from API
      component.on?.("item:update-request", (data: any) => {
        const { index, item, previousItem } = data;

        // Item is already updated in collection.items by api.ts

        // Check if this item is currently rendered
        const existingElement = renderedElements.get(index);
        const wasVisible = !!existingElement;

        // Check if item was selected before update
        const wasSelected = existingElement
          ? hasClass(
              existingElement,
              VIEWPORT_CONSTANTS.SELECTION.SELECTED_CLASS,
            ) || hasClass(existingElement, "mtrl-viewport-item--selected")
          : false;

        if (existingElement && existingElement.parentNode) {
          // Re-render the item
          const newElement = renderItem(item, index);

          if (newElement) {
            // Copy position styles from existing element
            Object.assign(newElement.style, {
              position: existingElement.style.position,
              transform: existingElement.style.transform,
              width: existingElement.style.width,
            });

            // Preserve selected state
            if (wasSelected) {
              addClass(newElement, VIEWPORT_CONSTANTS.SELECTION.SELECTED_CLASS);
              addClass(newElement, "mtrl-viewport-item--selected");
            }

            // Add update animation class to inner content for visibility
            addClass(newElement, "viewport-item--updated");
            // Also try to add to first child if it exists (the actual item content)
            const innerItem = newElement.firstElementChild as HTMLElement;
            if (innerItem) {
              addClass(innerItem, "item--updated");
            }

            // Replace in DOM
            existingElement.parentNode.replaceChild(
              newElement,
              existingElement,
            );
            renderedElements.set(index, newElement);
            releaseElement(existingElement);

            // Remove the animation class after transition
            setTimeout(() => {
              removeClass(newElement, "viewport-item--updated");
              if (innerItem) {
                removeClass(innerItem, "item--updated");
              }
            }, 500);
          }
        }

        // Emit completion event
        component.emit?.("item:updated", {
          item,
          index,
          previousItem,
          wasVisible,
          wasSelected,
        });
      });

      // Listen for item remove requests from API
      component.on?.("item:remove-request", (data: any) => {
        const { index, item } = data;
        isRemovingItem = true;

        // Item is already removed from collection.items by api.ts
        // We just need to update rendered elements

        // Remove the rendered element at this index
        const existingElement = renderedElements.get(index);
        if (existingElement && existingElement.parentNode) {
          releaseElement(existingElement);
        }
        renderedElements.delete(index);

        // Shift rendered elements indices down
        const renderedKeys = Array.from(renderedElements.keys()).sort(
          (a, b) => a - b,
        );
        const newRenderedElements = new Map<number, HTMLElement>();
        for (const key of renderedKeys) {
          if (key > index) {
            const element = renderedElements.get(key);
            if (element) {
              // Update data-index attribute
              element.dataset.index = String(key - 1);
              newRenderedElements.set(key - 1, element);
            }
          } else if (key < index) {
            const element = renderedElements.get(key);
            if (element) {
              newRenderedElements.set(key, element);
            }
          }
        }
        renderedElements.clear();
        for (const [key, element] of newRenderedElements) {
          renderedElements.set(key, element);
        }

        // Decrement totalItems NOW so renderItems() uses the correct count
        // setTotalItems() will be called later by the API, which will emit
        // viewport:total-items-changed for virtual size recalculation
        if (viewportState && viewportState.totalItems > 0) {
          viewportState.totalItems--;
        }

        // Reset visible range to force re-render
        currentVisibleRange = { start: -1, end: -1 };

        // Emit completion event
        component.emit?.("item:removed", {
          item,
          index,
        });

        // After item removal, clear ALL loadedRanges
        // This forces a complete reload which is more reliable than trying to
        // track shifted indices. The items array has been spliced and all indices
        // are now different from what loadedRanges thinks they are.
        const collection = (component.viewport as any)?.collection;
        if (collection?.getLoadedRanges) {
          const loadedRanges = collection.getLoadedRanges();
          loadedRanges.clear();
        }

        // Trigger reload of visible range
        const collectionItemsArr = getCollectionItems();
        const loadedItemsCount = collectionItemsArr.length;
        const visibleRange = component.viewport?.getVisibleRange?.();
        if (visibleRange && collection?.loadMissingRanges) {
          collection.loadMissingRanges(
            { start: 0, end: Math.max(visibleRange.end, loadedItemsCount) },
            "item-removal",
          );
        }

        // Trigger re-render
        renderItems();
        isRemovingItem = false;
      });

      // Listen for items add requests from API
      component.on?.("items:add-request", (data: any) => {
        const { items: newItems, position, previousCount } = data;

        if (!newItems || newItems.length === 0) return;

        // Items are already added to collection.items by api.ts
        // We just need to update rendered elements indices if prepending

        const itemsAdded = newItems.length;

        if (position === "start") {
          // Items were prepended - shift rendered element indices
          const renderedKeys = Array.from(renderedElements.keys()).sort(
            (a, b) => b - a,
          );
          const newRenderedElements = new Map<number, HTMLElement>();
          for (const key of renderedKeys) {
            const element = renderedElements.get(key)!;
            const newIndex = key + itemsAdded;
            element.setAttribute("data-index", String(newIndex));
            newRenderedElements.set(newIndex, element);
          }
          renderedElements.clear();
          newRenderedElements.forEach((el, idx) =>
            renderedElements.set(idx, el),
          );
        }
        // For append, no index shifting needed

        // Update totalItems in viewportState
        if (viewportState) {
          viewportState.totalItems =
            (viewportState.totalItems || 0) + itemsAdded;
        }

        // Reset visible range to force re-render
        currentVisibleRange = { start: -1, end: -1 };

        // Clear loadedRanges to ensure proper reload tracking
        const collection = (component.viewport as any)?.collection;
        if (collection?.getLoadedRanges) {
          const loadedRanges = collection.getLoadedRanges();
          loadedRanges.clear();
        }

        // Trigger re-render
        renderItems();

        // Emit completion event
        component.emit?.("items:render-complete", {
          items: newItems,
          position,
          total: viewportState?.totalItems || 0,
        });
      });

      // Listen for collection items evicted - clean up rendered elements
      component.on?.("collection:items-evicted", (data: any) => {
        const { keepStart, keepEnd } = data;

        // Release rendered elements outside the keep range
        renderedElements.forEach((element, index) => {
          if (index < keepStart || index > keepEnd) {
            releaseElement(element);
            renderedElements.delete(index);
          }
        });
      });

      // Listen for reload:start to reset feature-specific state
      component.on?.("reload:start", () => {
        // Reset visible range tracking
        currentVisibleRange = { start: -1, end: -1 };
        lastRenderTime = 0;
        isRemovingItem = false;

        // Clear element pool to free memory
        elementPool.length = 0;
        poolStats.poolSize = 0;
      });

      // Listen for collection reset to clear rendering state
      component.on?.("collection:reset", () => {
        // Release and clear all rendered elements
        renderedElements.forEach((element) => {
          releaseElement(element);
        });
        renderedElements.clear();

        // Reset visible range tracking
        currentVisibleRange = { start: -1, end: -1 };
      });

      // Listen for pool clear request (on reload)
      component.on?.("viewport:clear-pool", () => {
        // Clear element pool to free memory
        elementPool.length = 0;
        poolStats.poolSize = 0;

        // Reset last render time to avoid stale calculations
        lastRenderTime = 0;
      });

      // Listen for collection data loaded
      component.on?.("collection:range-loaded", (data: any) => {
        if (!data.items?.length) return;

        // Analyze data structure on first load
        const placeholders = (component as any).placeholders;
        if (placeholders && !placeholders.hasAnalyzedStructure()) {
          placeholders.analyzeDataStructure(data.items);
        }

        // Items are already in collection.items - replace any placeholder DOM elements
        data.items.forEach((item: any, i: number) => {
          const index = data.offset + i;
          const element = renderedElements.get(index);

          // Check if current rendered element is a placeholder that needs replacing
          // Note: The actual class has 'mtrl-' prefix, so check for both
          const isPlaceholderElement =
            element?.classList.contains(VIEWPORT_CONSTANTS.PLACEHOLDER.CLASS) ||
            element?.classList.contains(
              `mtrl-${VIEWPORT_CONSTANTS.PLACEHOLDER.CLASS}`,
            );
          if (isPlaceholderElement) {
            const newElement = renderItem(item, index);
            if (newElement) {
              // Remove placeholder classes from wrapper
              removeClass(newElement, VIEWPORT_CONSTANTS.PLACEHOLDER.CLASS);
              // Also remove from inner element (for string templates)
              if (newElement.firstElementChild) {
                removeClass(
                  newElement.firstElementChild as HTMLElement,
                  VIEWPORT_CONSTANTS.PLACEHOLDER.CLASS,
                );
              }

              // Add replaced class for fade-in animation
              addClass(newElement, "viewport-item--replaced");

              // Copy position and replace
              if (element) {
                Object.assign(newElement.style, {
                  position: element.style.position,
                  transform: element.style.transform,
                  width: element.style.width,
                });
                element.parentNode?.replaceChild(newElement, element);
              }
              renderedElements.set(index, newElement);
              if (element) {
                releaseElement(element);
              }

              // Remove the replaced class after animation completes
              setTimeout(() => {
                removeClass(newElement, "viewport-item--replaced");
              }, 300);
            } else {
              // renderItem returned null - still release the old element
              if (element) {
                releaseElement(element);
              }
              renderedElements.delete(index);
            }
          }
        });

        // Check if we need to render new items (items that weren't rendered at all)
        const { visibleRange } = viewportState || {};
        if (visibleRange) {
          const renderStart = Math.max(0, visibleRange.start - overscan);
          const renderEnd = Math.min(
            viewportState?.totalItems ?? 0 - 1,
            visibleRange.end + overscan,
          );
          const loadedStart = data.offset;
          const loadedEnd = data.offset + data.items.length - 1;

          // Check if loaded data overlaps with render range and we're missing rendered elements
          const needsRender =
            loadedStart <= renderEnd &&
            loadedEnd >= renderStart &&
            renderedElements.size < renderEnd - renderStart + 1;

          if (needsRender) renderItems();
        }
      });

      // Listen for events
      component.on?.("viewport:range-changed", renderItems);
      component.on?.("viewport:scroll", updateItemPositions);

      // Update items container height when virtual size changes
      component.on?.("viewport:virtual-size-changed", (data: any) => {
        if (
          viewportState?.itemsContainer &&
          data.totalVirtualSize !== undefined
        ) {
          viewportState.itemsContainer.style.height = `${data.totalVirtualSize}px`;
        }
      });
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
      index: number,
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
      containerSize: number,
      targetScrollIndex?: number,
    ): number => {
      const actualTotalSize = totalItems * itemSize;
      const isCompressed =
        actualTotalSize > virtualTotalSize && virtualTotalSize > 0;

      // If we have a targetScrollIndex (from initialScrollIndex), use it directly
      // This ensures items are positioned correctly even with compression
      if (targetScrollIndex !== undefined && targetScrollIndex > 0) {
        // Position items relative to the target index
        // The target index should appear at the top of the viewport
        return (index - targetScrollIndex) * itemSize;
      }

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
          Math.min(1, 1 - distanceFromBottom / nearBottomThreshold),
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
            // Store layoutResult for cleanup when element is released (prevents memory leak)
            layoutResults.set(element, layoutResult);
          } else {
            // Fallback if layout didn't create a proper element
            element = getPooledElement();
            if (layoutResult.element) {
              element.appendChild(layoutResult.element);
              // Store layoutResult on wrapper element for cleanup
              layoutResults.set(element, layoutResult);
            }
          }
        } else if (typeof result === "string") {
          // Parse HTML using template element - optimized path
          // Move nodes directly instead of cloning - much faster, no memory overhead
          templateParser.innerHTML = result;
          const content = templateParser.content;

          if (content.children.length === 1) {
            // Single root element - move directly (faster than cloneNode)
            element = content.firstElementChild as HTMLElement;
            content.removeChild(element);
            addClass(element, "mtrl-viewport-item");
            if (isPlaceholder(item)) {
              addClass(element, VIEWPORT_CONSTANTS.PLACEHOLDER.CLASS);
            }
          } else {
            // Multiple children - move all into pooled element
            element = getPooledElement();
            while (content.firstChild) {
              element.appendChild(content.firstChild);
            }
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

        // Copy data-id from item to viewport element for selection support
        const itemId = item?._id || item?.id;
        if (itemId !== undefined && itemId !== null) {
          element.dataset.id = String(itemId);
        }
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
        (a, b) => a - b,
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
            Math.min(1, 1 - distanceFromBottom / containerSize),
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
            currentPosition,
          )}px)`;

          // Strategic log for last items
          // if (index >= totalItems - 5) {
          //   console.log(
          //     `[Rendering] Last item positioned: index=${index}, position=${Math.round(
          //       currentPosition
          //     )}px, itemSize=${itemSize}px, totalItems=${totalItems}`
          //   );
          // }

          currentPosition += itemSize;
        }
      });
    };

    // Main render function
    const renderItems = () => {
      if (!viewportState?.itemsContainer) {
        return;
      }

      const {
        visibleRange,
        itemsContainer,
        totalItems,
        itemSize,
        scrollPosition,
        containerSize,
        virtualTotalSize,
      } = viewportState;

      // Validate range - skip rendering if no items or range is invalid
      if (
        !visibleRange ||
        totalItems <= 0 ||
        visibleRange.start < 0 ||
        visibleRange.start >= totalItems ||
        visibleRange.end < visibleRange.start ||
        isNaN(visibleRange.start) ||
        isNaN(visibleRange.end)
      ) {
        // If totalItems is 0, clear all rendered elements to remove stale placeholders
        if (totalItems <= 0 && renderedElements.size > 0) {
          Array.from(renderedElements.entries()).forEach(([index, element]) => {
            if (element.parentNode) releaseElement(element);
            renderedElements.delete(index);
          });
          currentVisibleRange = { start: -1, end: -1 };
        }
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

      // if (isRemovingItem) {
      //   console.log(
      //     `[RENDER-FIX] renderItems calc: visibleRange=${JSON.stringify(visibleRange)}, overscan=${overscan}, totalItems=${totalItems}`,
      //   );
      //   console.log(
      //     `[RENDER-FIX] renderItems calc: renderStart=${renderStart}, renderEnd=${renderEnd}`,
      //   );
      // }

      // Remove items outside range
      const toRemove = Array.from(renderedElements.entries()).filter(
        ([index]) => index < renderStart || index > renderEnd,
      );

      toRemove.forEach(([index, element]) => {
        if (element.parentNode) releaseElement(element);
        renderedElements.delete(index);
      });

      // Get items from collection (single source of truth)
      const items = getCollectionItems();
      const missingItems: number[] = [];

      // Collect new elements to insert (index -> element)
      const newElements: Array<[number, HTMLElement]> = [];

      // Render items in range
      for (let i = renderStart; i <= renderEnd; i++) {
        if (i < 0 || i >= totalItems || renderedElements.has(i)) continue;

        let item = items[i];
        if (!item) {
          missingItems.push(i);
          // Generate placeholder (rendered dynamically, not stored)
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
        }

        const element = renderItem(item, i);
        if (element) {
          // Get targetScrollIndex from viewportState if available
          const targetScrollIndex = (viewportState as any)?.targetScrollIndex;
          const position = calculateItemPosition(
            i,
            scrollPosition,
            totalItems,
            itemSize,
            virtualTotalSize,
            containerSize,
            targetScrollIndex,
          );

          Object.assign(element.style, {
            position: "absolute",
            transform: `translateY(${position}px)`,
            width: "100%",
          });

          // Collect for batch insertion (if maintaining order) or just append
          if (maintainDomOrder) {
            newElements.push([i, element]);
          } else {
            itemsContainer.appendChild(element);
          }
          renderedElements.set(i, element);
        }
      }

      // Batch insert new elements in correct DOM order (only when maintainDomOrder is enabled)
      // This ensures CSS selectors like :first-child, :nth-child() work correctly
      if (maintainDomOrder && newElements.length > 0) {
        // Sort new elements by index
        newElements.sort(([a], [b]) => a - b);

        // Get existing DOM children sorted by their data-index
        const existingChildren = Array.from(
          itemsContainer.children,
        ) as HTMLElement[];

        // Merge new elements into correct positions
        let newIdx = 0;
        let existingIdx = 0;

        while (newIdx < newElements.length) {
          const [newIndex, newElement] = newElements[newIdx];

          // Find the first existing child with index > newIndex
          while (
            existingIdx < existingChildren.length &&
            parseInt(existingChildren[existingIdx].dataset.index || "-1", 10) <
              newIndex
          ) {
            existingIdx++;
          }

          if (existingIdx < existingChildren.length) {
            // Insert before the existing child
            itemsContainer.insertBefore(
              newElement,
              existingChildren[existingIdx],
            );
          } else {
            // Append at the end
            itemsContainer.appendChild(newElement);
          }
          newIdx++;
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
          "rendering:missing-items",
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
          "rendering:no-items",
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
      // Release all rendered elements - use releaseElement to properly destroy layoutResults
      renderedElements.forEach((element) => {
        releaseElement(element);
      });
      renderedElements.clear();

      // Clear element pool
      elementPool.length = 0;

      // Reset state
      currentVisibleRange = { start: -1, end: -1 };
      viewportState = null;
      lastRenderTime = 0;

      // Reset pool stats
      poolStats.created = 0;
      poolStats.recycled = 0;
      poolStats.poolSize = 0;
    });

    return component;
  };
};
