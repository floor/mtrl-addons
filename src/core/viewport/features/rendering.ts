/**
 * Rendering Feature - Item rendering and positioning for viewport
 * Handles DOM element creation, positioning, recycling, and updates
 */

import { addClass, removeClass, hasClass } from "mtrl";
import type { ViewportContext, ViewportComponent } from "../types";
import { VIEWPORT_CONSTANTS } from "../constants";

export interface RenderingConfig {
  template?: (item: any, index: number) => string | HTMLElement;
  overscan?: number;
  measureItems?: boolean;
  enableRecycling?: boolean;
  maxPoolSize?: number;
}

// Internal state interface
interface ViewportState {
  scrollPosition: number;
  totalItems: number;
  estimatedItemSize: number;
  containerSize: number;
  virtualTotalSize: number;
  visibleRange: { start: number; end: number };
  itemsContainer: HTMLElement | null;
}

/**
 * Rendering feature for viewport
 * Handles virtual space compression, precise positioning, and deferred cleanup
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
    let viewportState: ViewportState | null = null;
    let currentVisibleRange = { start: 0, end: 0 };
    let lastRenderTime = 0;

    // Element pool for recycling
    const elementPool: HTMLElement[] = [];
    const poolStats = {
      created: 0,
      recycled: 0,
      poolSize: 0,
    };

    /**
     * Get an element from the pool or create a new one
     */
    const getPooledElement = (): HTMLElement => {
      if (enableRecycling && elementPool.length > 0) {
        poolStats.recycled++;
        return elementPool.pop()!;
      }

      // Create new element
      const element = document.createElement("div");
      element.className = "mtrl-viewport-item";
      poolStats.created++;
      return element;
    };

    /**
     * Release an element back to the pool
     */
    const releaseElement = (element: HTMLElement): void => {
      if (!enableRecycling) {
        element.remove();
        return;
      }

      // Clean up element for reuse
      element.className = "mtrl-viewport-item";
      element.removeAttribute("data-index");
      element.style.cssText = "";
      element.innerHTML = "";

      // Remove all event listeners by cloning
      const cleanElement = element.cloneNode(false) as HTMLElement;

      // Add to pool if not at max capacity
      if (elementPool.length < maxPoolSize) {
        elementPool.push(cleanElement);
        poolStats.poolSize = elementPool.length;
      }

      // Remove from DOM
      element.remove();
    };

    // Get viewport state reference
    let originalInitialize = component.viewport.initialize;
    component.viewport.initialize = () => {
      originalInitialize();
      viewportState = (component.viewport as any).state;

      // Listen for collection data loaded
      component.on?.("collection:range-loaded", (data: any) => {
        // Update our local items array
        if (data.items && Array.isArray(data.items)) {
          // Analyze data structure on first load if placeholders are available
          const componentWithPlaceholders = component as any;
          if (
            componentWithPlaceholders.placeholders &&
            !componentWithPlaceholders.placeholders.hasAnalyzedStructure()
          ) {
            componentWithPlaceholders.placeholders.analyzeDataStructure(
              data.items
            );
          }

          // Replace placeholders with real data
          for (let i = 0; i < data.items.length; i++) {
            const index = data.offset + i;
            const oldItem = collectionItems[index];
            collectionItems[index] = data.items[i];

            // If we're replacing a placeholder, update the DOM element
            if (
              oldItem &&
              isPlaceholder(oldItem) &&
              renderedElements.has(index)
            ) {
              const element = renderedElements.get(index);
              if (element) {
                // Re-render the element with real data
                const newElement = renderItem(data.items[i], index);
                if (newElement) {
                  // Ensure the new element doesn't have placeholder classes
                  removeClass(
                    newElement,
                    VIEWPORT_CONSTANTS.PLACEHOLDER.CSS_CLASS
                  );
                  const itemElement = newElement.querySelector(
                    ".list-item, .user-item"
                  );
                  if (itemElement) {
                    removeClass(
                      itemElement as HTMLElement,
                      "list-item__placeholder"
                    );
                  }

                  // Copy position from old element
                  newElement.style.position = element.style.position;
                  newElement.style.transform = element.style.transform;
                  newElement.style.width = element.style.width;

                  // Replace in DOM
                  element.parentNode?.replaceChild(newElement, element);
                  renderedElements.set(index, newElement);

                  // Release old element
                  releaseElement(element);
                }
              }
            }
          }

          // Check if loaded range overlaps with current visible range
          const loadedStart = data.offset;
          const loadedEnd = data.offset + data.items.length - 1;
          const visibleRange = viewportState?.visibleRange;

          if (visibleRange) {
            const renderStart = Math.max(0, visibleRange.start - overscan);
            const renderEnd = Math.min(
              viewportState?.totalItems ?? 0 - 1,
              visibleRange.end + overscan
            );

            // Check if we need to render
            // Always render if we're replacing placeholders
            let hasPlaceholdersInRange = false;
            for (let i = loadedStart; i <= loadedEnd && i <= renderEnd; i++) {
              // Check if we have a placeholder item stored
              const storedItem = collectionItems[i];
              if (storedItem && isPlaceholder(storedItem)) {
                hasPlaceholdersInRange = true;
                break;
              }
            }

            // Only render if we don't have all items already rendered OR we have placeholders to replace
            const needsRender =
              (loadedStart <= renderEnd &&
                loadedEnd >= renderStart &&
                renderedElements.size < renderEnd - renderStart + 1) ||
              hasPlaceholdersInRange;

            if (needsRender) {
              renderItems();
            }
          }
        }
      });

      // Listen for viewport range changes
      component.on?.("viewport:range-changed", () => {
        renderItems();
      });

      // Listen for scroll events to update positions
      component.on?.("viewport:scroll", () => {
        updateItemPositions();
      });
    };

    // Helper to get default template
    const getDefaultTemplate = () => (item: any, index: number) => {
      const div = document.createElement("div");
      div.className = "mtrl-viewport-item";
      div.textContent = `Item ${index}`;
      return div;
    };

    // Helper to check if item is placeholder
    const isPlaceholder = (item: any): boolean => {
      return (
        item &&
        typeof item === "object" &&
        (item._placeholder === true ||
          item[VIEWPORT_CONSTANTS.PLACEHOLDER.PLACEHOLDER_FLAG] === true)
      );
    };

    /**
     * Calculate position for a single item
     */
    const calculateItemPosition = (
      index: number,
      scrollPosition: number,
      totalItems: number,
      itemSize: number,
      virtualTotalSize: number,
      containerSize: number
    ): number => {
      // Get the visible range to check if this item should be visible
      const visibleRange = viewportState?.visibleRange;

      // Check if we're using compressed virtual space
      const actualTotalSize = totalItems * itemSize;
      const isCompressed =
        actualTotalSize > virtualTotalSize && virtualTotalSize > 0;

      if (isCompressed && totalItems > 0) {
        // Handle compressed space
        const maxScrollPosition = virtualTotalSize - containerSize;
        const distanceFromBottom = maxScrollPosition - scrollPosition;
        const nearBottomThreshold = containerSize;

        if (
          distanceFromBottom <= nearBottomThreshold &&
          distanceFromBottom >= -1
        ) {
          // Near bottom - use interpolation
          const itemsThatFitCompletely = Math.floor(containerSize / itemSize);
          const firstVisibleAtBottom = Math.max(
            0,
            totalItems - itemsThatFitCompletely
          );

          const scrollRatio = scrollPosition / virtualTotalSize;
          const exactScrollIndex = scrollRatio * totalItems;

          const interpolationFactor = Math.max(
            0,
            Math.min(1, 1 - distanceFromBottom / nearBottomThreshold)
          );

          const bottomPosition = (index - firstVisibleAtBottom) * itemSize;
          const normalPosition = (index - exactScrollIndex) * itemSize;

          const result =
            normalPosition +
            (bottomPosition - normalPosition) * interpolationFactor;

          return result;
        } else {
          // Normal compressed scrolling
          const scrollRatio = scrollPosition / virtualTotalSize;
          const exactScrollIndex = scrollRatio * totalItems;
          const result = (index - exactScrollIndex) * itemSize;
          return result;
        }
      } else {
        // Direct positioning when not compressed
        const itemPosition = index * itemSize;
        return itemPosition - scrollPosition;
      }
    };

    // Render single item
    const renderItem = (item: any, index: number): HTMLElement | null => {
      const itemTemplate = template || getDefaultTemplate();

      try {
        const result = itemTemplate(item, index);
        let element: HTMLElement;

        if (typeof result === "string") {
          // For string templates, use a pooled element and set innerHTML
          element = getPooledElement();
          element.innerHTML = result;

          // If the result contains a single root element, extract it
          if (element.children.length === 1) {
            const child = element.firstElementChild as HTMLElement;
            addClass(child, "viewport-item");
            // Return the wrapper element for consistency
          }
        } else if (result instanceof HTMLElement) {
          // For HTMLElement templates, we can't easily recycle
          // so we'll wrap it in a pooled container
          element = getPooledElement();
          element.appendChild(result);
        } else {
          console.warn(`[Rendering] Invalid template result for item ${index}`);
          return null;
        }

        // Add viewport item class if not already present
        if (!hasClass(element, "viewport-item")) {
          addClass(element, "viewport-item");
        }

        // Add placeholder class if needed
        if (isPlaceholder(item)) {
          addClass(element, VIEWPORT_CONSTANTS.PLACEHOLDER.CSS_CLASS);
          // Also add to any child element that might be the actual item
          const itemElement = element.querySelector(".list-item, .user-item");
          if (itemElement) {
            addClass(itemElement as HTMLElement, "list-item__placeholder");
          }
        }

        // Set data attribute
        element.dataset.index = String(index);

        return element;
      } catch (error) {
        console.error(`[Rendering] Error rendering item ${index}:`, error);
        return null;
      }
    };

    /**
     * Update positions of all rendered items
     */
    const updateItemPositions = (): void => {
      if (!viewportState || renderedElements.size === 0) return;

      const scrollPosition = viewportState.scrollPosition || 0;
      const itemSize = viewportState.estimatedItemSize || 50;
      const totalItems = viewportState.totalItems || 0;
      const virtualTotalSize = viewportState.virtualTotalSize || 0;
      const containerSize = viewportState.containerSize || 0;
      const isHorizontal = false; // TODO: get from viewport state
      const axis = isHorizontal ? "X" : "Y";

      // Check if we're using compressed virtual space
      const actualTotalSize = totalItems * itemSize;
      const isCompressed =
        actualTotalSize > virtualTotalSize && virtualTotalSize > 0;

      // Get sorted indices
      const sortedIndices = Array.from(renderedElements.keys()).sort(
        (a, b) => a - b
      );
      if (sortedIndices.length === 0) return;

      const firstRenderedIndex = sortedIndices[0];

      let currentPosition = 0;

      if (isCompressed) {
        // Handle compressed space
        const maxScrollPosition = virtualTotalSize - containerSize;
        const distanceFromBottom = maxScrollPosition - scrollPosition;
        const nearBottomThreshold = containerSize;

        if (
          distanceFromBottom <= nearBottomThreshold &&
          distanceFromBottom >= -1
        ) {
          // Near bottom - use interpolation
          const itemsThatFitCompletely = Math.floor(containerSize / itemSize);
          const firstVisibleAtBottom = Math.max(
            0,
            totalItems - itemsThatFitCompletely
          );

          const scrollRatio = scrollPosition / virtualTotalSize;
          const exactScrollIndex = scrollRatio * totalItems;

          const interpolationFactor = Math.max(
            0,
            Math.min(1, 1 - distanceFromBottom / nearBottomThreshold)
          );

          const bottomPosition =
            (firstRenderedIndex - firstVisibleAtBottom) * itemSize;
          const normalPosition =
            (firstRenderedIndex - exactScrollIndex) * itemSize;

          currentPosition =
            normalPosition +
            (bottomPosition - normalPosition) * interpolationFactor;
        } else {
          // Normal compressed scrolling
          const scrollRatio = scrollPosition / virtualTotalSize;
          const exactScrollIndex = scrollRatio * totalItems;
          const offset = firstRenderedIndex - exactScrollIndex;
          currentPosition = offset * itemSize;
        }
      } else {
        // Normal positioning
        const firstItemPosition = firstRenderedIndex * itemSize;
        currentPosition = firstItemPosition - scrollPosition;
      }

      // Position each item
      sortedIndices.forEach((index) => {
        const element = renderedElements.get(index);
        if (!element) return;

        element.style.transform = `translate${axis}(${Math.round(
          currentPosition
        )}px)`;

        // Move to next position
        currentPosition += itemSize;
      });
    };

    /**
     * Render items in the visible range
     */
    const renderItems = () => {
      if (!viewportState || !viewportState.itemsContainer) return;

      const {
        visibleRange,
        itemsContainer,
        totalItems,
        estimatedItemSize,
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
        // console.log(
        //   `[Rendering] Invalid range: ${visibleRange?.start}-${visibleRange?.end}`
        // );
        return;
      }

      // Check if range changed
      const rangeChanged =
        visibleRange.start !== currentVisibleRange.start ||
        visibleRange.end !== currentVisibleRange.end;

      if (!rangeChanged && renderedElements.size > 0) {
        // Just update positions if range hasn't changed
        updateItemPositions();
        return;
      }

      // Update last render time
      lastRenderTime = Date.now();

      // Calculate render range with overscan
      const renderStart = Math.max(0, visibleRange.start - overscan);
      const renderEnd = Math.min(totalItems - 1, visibleRange.end + overscan);

      // Remove items outside render range
      const toRemove = new Set<number>();
      renderedElements.forEach((element, index) => {
        if (index < renderStart || index > renderEnd) {
          toRemove.add(index);
        }
      });

      if (toRemove.size > 0) {
        // if (enableRecycling) {
        //   console.log(
        //     `[Rendering] Pool stats - Created: ${poolStats.created}, Recycled: ${poolStats.recycled}, Pool size: ${elementPool.length}`
        //   );
        // }
      }

      // Remove items outside range
      toRemove.forEach((index) => {
        const element = renderedElements.get(index);
        if (element && element.parentNode) {
          releaseElement(element);
        }
        renderedElements.delete(index);
      });

      // Get collection if available - check both possible locations
      const viewportCollection = component.viewport?.collection;

      // Use collection items if available, otherwise fall back to component items
      const hasCollectionItems = Object.keys(collectionItems).length > 0;
      const items = hasCollectionItems
        ? collectionItems
        : component.items || [];

      // Skip rendering if no items available
      if (hasCollectionItems) {
        // For collection items (object), check if we have any items in the render range
        let hasItemsInRange = false;
        for (let i = renderStart; i <= renderEnd; i++) {
          if (collectionItems[i]) {
            hasItemsInRange = true;
            break;
          }
        }
        // Don't skip rendering - we should show placeholders or keep existing items
        // if (!hasItemsInRange && totalItems > 0) {
        //   return;
        // }
      } else if (
        (!items || (Array.isArray(items) && items.length === 0)) &&
        totalItems > 0
      ) {
        // console.log("[Rendering] No items available yet");
        // Don't return - continue to render placeholders
        // return;
      }

      // Track missing items
      const missingItems: number[] = [];

      // Render items in visible range
      for (let i = renderStart; i <= renderEnd; i++) {
        // Skip if outside bounds
        if (i < 0 || i >= totalItems) continue;

        // Skip if already rendered
        if (renderedElements.has(i)) continue;

        // Get item from collection or items array
        const item = items[i];

        if (!item) {
          // Track missing item
          missingItems.push(i);
          // Don't skip - render a placeholder instead
          // continue;
        }

        // Render item or placeholder
        let itemToRender = item;
        if (!item) {
          // Use placeholder feature if available
          const componentWithPlaceholders = component as any;
          if (componentWithPlaceholders.placeholders) {
            itemToRender =
              componentWithPlaceholders.placeholders.generatePlaceholderItem(i);
          } else {
            // Fallback to simple placeholder
            itemToRender = {
              _placeholder: true,
              index: i,
              id: `placeholder-${i}`,
              // Add some masked content for better visual feedback
              name: VIEWPORT_CONSTANTS.PLACEHOLDER.MASK_CHARACTER.repeat(15),
              text: VIEWPORT_CONSTANTS.PLACEHOLDER.MASK_CHARACTER.repeat(25),
              description:
                VIEWPORT_CONSTANTS.PLACEHOLDER.MASK_CHARACTER.repeat(40),
            };
          }
          // Store the placeholder in collectionItems so we can detect it later
          collectionItems[i] = itemToRender;
        }

        const element = renderItem(itemToRender, i);
        if (element) {
          // Calculate position
          const position = calculateItemPosition(
            i,
            scrollPosition,
            totalItems,
            estimatedItemSize,
            virtualTotalSize,
            containerSize
          );

          // Position element
          element.style.position = "absolute";
          element.style.transform = `translateY(${position}px)`;
          element.style.width = "100%";

          // Add to DOM
          itemsContainer.appendChild(element);

          // Track rendered item
          renderedElements.set(i, element);
        }
      }

      // Request loading of missing items as a single range
      if (missingItems.length > 0 && viewportCollection?.loadMissingRanges) {
        const minIndex = Math.min(...missingItems);
        const maxIndex = Math.max(...missingItems);
        viewportCollection.loadMissingRanges({
          start: minIndex,
          end: maxIndex,
        });
      }

      // Track current range
      currentVisibleRange = visibleRange;

      // Emit render complete event
      component.emit?.("viewport:rendered", {
        range: visibleRange,
        renderedCount: renderedElements.size,
      });

      // Update positions after rendering
      updateItemPositions();

      // Final check: if we have no rendered elements after all this,
      // it means we scrolled to a position with no data
      if (renderedElements.size === 0 && totalItems > 0) {
        // Request data for the current visible range
        if (viewportCollection) {
          viewportCollection.loadMissingRanges(visibleRange);
        }
      }
    };

    // Extend viewport API
    const originalRenderItems = component.viewport.renderItems;
    component.viewport.renderItems = () => {
      renderItems();
      originalRenderItems?.();
    };

    // Clean up on destroy
    if ("destroy" in component && typeof component.destroy === "function") {
      const originalDestroy = component.destroy;
      component.destroy = () => {
        // Release all rendered elements to pool
        renderedElements.forEach((element) => {
          if (element.parentNode) {
            releaseElement(element);
          }
        });
        renderedElements.clear();

        // Clear the pool
        elementPool.length = 0;

        originalDestroy?.();
      };
    }

    return component;
  };
};
