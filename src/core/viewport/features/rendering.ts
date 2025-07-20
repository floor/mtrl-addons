/**
 * Rendering Feature - Item rendering and positioning for viewport
 * Handles DOM element creation, positioning, recycling, and updates
 */

import type { ViewportContext, ViewportComponent } from "../types";
import { VIEWPORT_CONSTANTS } from "../constants";

export interface RenderingConfig {
  template?: (item: any, index: number) => string | HTMLElement;
  overscan?: number;
  measureItems?: boolean;
  enableDeferredCleanup?: boolean;
  cleanupDelay?: number;
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
      enableDeferredCleanup = true,
      cleanupDelay = 500,
    } = config;

    // State
    const renderedElements = new Map<number, HTMLElement>();
    let currentVisibleRange = { start: 0, end: 0 };
    let cleanupTimeoutId: number | null = null;
    let lastRenderTime = 0;
    let isCleanupScheduled = false;
    let collectionItems: any[] = []; // Store collection items locally

    // Get viewport state reference
    let viewportState: ViewportState;
    const originalInitialize = component.viewport.initialize;
    component.viewport.initialize = () => {
      originalInitialize();
      viewportState = (component.viewport as any).state;

      // Listen for collection data loaded
      component.on?.("collection:range-loaded", (data: any) => {
        // Update our local items array
        if (data.items && Array.isArray(data.items)) {
          for (let i = 0; i < data.items.length; i++) {
            collectionItems[data.offset + i] = data.items[i];
          }
        }
        renderItems();
      });

      // Listen for viewport range changes
      component.on?.("viewport:range-changed", () => {
        renderItems();
      });

      // Listen for scroll events to update positions
      component.on?.("viewport:scroll", () => {
        updateItemPositions();
      });

      // Listen for idle events to ensure rendering after scroll stops
      component.on?.("viewport:idle", () => {
        // Small delay to allow collection to load data first
        setTimeout(() => {
          // Force update positions to fix any misalignment
          updateItemPositions();
          renderItems();
        }, 50);
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
      return item && typeof item === "object" && item.__isPlaceholder === true;
    };

    // Schedule deferred cleanup
    const scheduleDeferredCleanup = () => {
      if (!enableDeferredCleanup || isCleanupScheduled) return;

      isCleanupScheduled = true;

      if (cleanupTimeoutId) {
        clearTimeout(cleanupTimeoutId);
      }

      cleanupTimeoutId = window.setTimeout(() => {
        performDeferredCleanup();
        isCleanupScheduled = false;
      }, cleanupDelay);
    };

    // Perform deferred cleanup
    const performDeferredCleanup = () => {
      const visibleRange = currentVisibleRange;
      const buffer = overscan * 2;

      const keepStart = visibleRange.start - buffer;
      const keepEnd = visibleRange.end + buffer;

      // Remove elements outside the keep range
      const toRemove: number[] = [];
      renderedElements.forEach((element, index) => {
        if (index < keepStart || index > keepEnd) {
          toRemove.push(index);
        }
      });

      toRemove.forEach((index) => {
        const element = renderedElements.get(index);
        if (element && element.parentNode) {
          element.remove();
        }
        renderedElements.delete(index);
      });

      if (toRemove.length > 0) {
        console.log(`🧹 [Rendering] Cleaned up ${toRemove.length} items`);
      }
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
      // Check if we're using compressed virtual space
      const actualTotalSize = totalItems * itemSize;
      const isCompressed =
        actualTotalSize > virtualTotalSize && virtualTotalSize > 0;

      if (isCompressed && totalItems > 0) {
        // In compressed space, we need to calculate the position based on the visible range
        const scrollRatio = scrollPosition / virtualTotalSize;
        const exactScrollIndex = scrollRatio * totalItems;

        // Calculate the item's position relative to the current scroll position
        const relativeIndex = index - exactScrollIndex;
        const position = relativeIndex * itemSize;

        return position;
      } else {
        // Normal positioning
        return index * itemSize - scrollPosition;
      }
    };

    // Render single item
    const renderItem = (item: any, index: number): HTMLElement | null => {
      const itemTemplate = template || getDefaultTemplate();

      try {
        const result = itemTemplate(item, index);
        let element: HTMLElement;

        if (typeof result === "string") {
          const wrapper = document.createElement("div");
          wrapper.innerHTML = result;
          element = wrapper.firstElementChild as HTMLElement;
        } else if (result instanceof HTMLElement) {
          element = result;
        } else {
          console.warn(`[Rendering] Invalid template result for item ${index}`);
          return null;
        }

        // Add viewport item class
        element.classList.add("mtrl-viewport-item");

        // Add placeholder class if needed
        if (isPlaceholder(item)) {
          element.classList.add(VIEWPORT_CONSTANTS.PLACEHOLDER.CSS_CLASS);
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
     * Update item positions based on scroll
     */
    const updateItemPositions = () => {
      if (!viewportState || renderedElements.size === 0) return;

      const scrollPosition = viewportState.scrollPosition || 0;
      const itemSize = viewportState.estimatedItemSize || 50;
      const totalItems = viewportState.totalItems || 0;
      const virtualTotalSize = viewportState.virtualTotalSize || 0;
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
        // In compressed space, calculate based on scroll ratio
        const scrollRatio = scrollPosition / virtualTotalSize;
        const exactScrollIndex = scrollRatio * totalItems;

        // Calculate offset from the exact scroll position
        const offset = firstRenderedIndex - exactScrollIndex;
        currentPosition = offset * itemSize;
      } else {
        // Normal positioning
        const firstItemPosition = firstRenderedIndex * itemSize;
        currentPosition = firstItemPosition - scrollPosition;
      }

      // Position each item
      sortedIndices.forEach((index) => {
        const element = renderedElements.get(index);
        if (!element) return;

        const oldTransform = element.style.transform;
        element.style.transform = `translate${axis}(${Math.round(
          currentPosition
        )}px)`;

        if (
          index === sortedIndices[0] ||
          index === sortedIndices[sortedIndices.length - 1]
        ) {
          // console.log(
          //   `[Rendering] Item ${index}: ${oldTransform} -> ${element.style.transform}`
          // );
        }

        // Move to next position
        currentPosition += itemSize;
      });

      // console.log(
      //   `[Rendering] Updated positions for ${renderedElements.size} items at scroll ${scrollPosition} (compressed: ${isCompressed}, first: ${firstRenderedIndex})`
      // );
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

      // Clean up items outside the render range
      const toRemove = new Set<number>();
      renderedElements.forEach((element, index) => {
        if (index < renderStart || index > renderEnd) {
          toRemove.add(index);
        }
      });

      if (toRemove.size > 0) {
        console.log(
          `[Rendering] Cleaning up ${
            toRemove.size
          } items outside range ${renderStart}-${renderEnd}: ${Array.from(
            toRemove
          )
            .slice(0, 10)
            .join(", ")}...`
        );
      }

      toRemove.forEach((index) => {
        const element = renderedElements.get(index);
        if (element && element.parentNode) {
          element.remove();
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
      if (items.length === 0 && totalItems > 0) {
        console.log("[Rendering] No items available yet");
        return;
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
          continue;
        }

        // Render item
        const element = renderItem(item, i);
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

      // Schedule deferred cleanup
      scheduleDeferredCleanup();
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
        if (cleanupTimeoutId) {
          clearTimeout(cleanupTimeoutId);
        }
        renderedElements.clear();
        originalDestroy?.();
      };
    }

    return component;
  };
};
