/**
 * Virtual Feature - Core virtual scrolling calculations
 * Handles visible range calculation and total virtual size management
 */

import type { ViewportContext, ViewportComponent } from "../types";
import { VIEWPORT_CONSTANTS } from "../constants";

export interface VirtualConfig {
  estimatedItemSize?: number;
  overscan?: number;
  orientation?: "vertical" | "horizontal";
  debug?: boolean;
}

/**
 * Virtual scrolling feature for viewport
 * Handles visible range calculations with compression for large datasets
 */
export const withVirtual = (config: VirtualConfig = {}) => {
  return <T extends ViewportContext & ViewportComponent>(component: T): T => {
    const {
      estimatedItemSize = VIEWPORT_CONSTANTS.VIRTUAL_SCROLL.DEFAULT_ITEM_SIZE,
      overscan = VIEWPORT_CONSTANTS.VIRTUAL_SCROLL.OVERSCAN_BUFFER,
      orientation = "vertical",
      debug = false,
    } = config;

    // Constants
    const MAX_VIRTUAL_SIZE = VIEWPORT_CONSTANTS.VIRTUAL_SCROLL.MAX_VIRTUAL_SIZE;

    // Get viewport state
    let viewportState: any;
    const originalInitialize = component.viewport.initialize;
    component.viewport.initialize = () => {
      originalInitialize();
      viewportState = (component.viewport as any).state;

      // Update state with config values
      if (viewportState) {
        viewportState.estimatedItemSize = estimatedItemSize;
        viewportState.overscan = overscan;

        // Initialize container size if element exists
        if (component.element) {
          const size =
            orientation === "horizontal"
              ? component.element.offsetWidth
              : component.element.offsetHeight;

          viewportState.containerSize = size || 600; // Default to 600 if no size

          if (debug) {
            console.log(
              `[Virtual] Initialized container size: ${viewportState.containerSize}`
            );
          }
        }

        // Calculate initial virtual size
        updateTotalVirtualSize(viewportState.totalItems);

        // Calculate initial visible range
        updateVisibleRange(viewportState.scrollPosition || 0);
      }
    };

    // Helper to get compression ratio
    const getCompressionRatio = (): number => {
      if (!viewportState || !viewportState.virtualTotalSize) return 1;

      const actualTotalSize = viewportState.totalItems * estimatedItemSize;
      if (actualTotalSize <= MAX_VIRTUAL_SIZE) return 1;

      return MAX_VIRTUAL_SIZE / actualTotalSize;
    };

    // Calculate visible range
    const calculateVisibleRange = (
      scrollPosition: number
    ): { start: number; end: number } => {
      if (!viewportState) {
        console.warn("[Virtual] No viewport state, returning empty range");
        return { start: 0, end: 0 };
      }

      const { containerSize, totalItems } = viewportState;

      // Validate inputs
      if (!containerSize || containerSize <= 0) {
        if (debug) {
          console.log(`[Virtual] Invalid container size: ${containerSize}`);
        }
        return { start: 0, end: 0 };
      }

      if (!totalItems || totalItems <= 0) {
        if (debug) {
          console.log(`[Virtual] No items to display: ${totalItems}`);
        }
        return { start: 0, end: 0 };
      }

      const compressionRatio = getCompressionRatio();
      let start: number;
      let end: number;

      // Use virtualTotalSize if available, otherwise calculate it
      const virtualSize =
        viewportState.virtualTotalSize || totalItems * estimatedItemSize;

      if (compressionRatio < 1) {
        // Compressed space - use ratio-based calculation
        const scrollRatio = scrollPosition / virtualSize;
        const exactIndex = scrollRatio * totalItems;
        start = Math.floor(exactIndex);

        const visibleCount = Math.ceil(containerSize / estimatedItemSize);
        end = Math.ceil(exactIndex) + visibleCount;

        // Special handling for max scroll position - ensure last items are visible
        const maxScroll = virtualSize - containerSize;
        if (scrollPosition >= maxScroll - 1) {
          // At the very bottom, show the last items
          end = totalItems - 1;
          start = Math.max(0, end - visibleCount - overscan * 2);
        }

        // Apply overscan after calculating the base range
        start = Math.max(0, start - overscan);
        end = Math.min(totalItems - 1, end + overscan);
      } else {
        // Direct calculation
        start = Math.floor(scrollPosition / estimatedItemSize) - overscan;
        const visibleCount = Math.ceil(containerSize / estimatedItemSize);
        end = start + visibleCount + overscan * 2;
      }

      // Clamp to valid range
      start = Math.max(0, start);
      end = Math.min(totalItems - 1, end);

      // Validate output
      if (isNaN(start) || isNaN(end)) {
        console.error("[Virtual] NaN in range calculation:", {
          scrollPosition,
          containerSize,
          totalItems,
          estimatedItemSize,
          virtualTotalSize: viewportState.virtualTotalSize,
          compressionRatio,
          viewportState: {
            hasState: !!viewportState,
            stateKeys: viewportState ? Object.keys(viewportState) : [],
            actualVirtualSize: viewportState?.virtualTotalSize,
          },
        });
        return { start: 0, end: 0 };
      }

      if (debug) {
        console.log(
          `[Virtual] Range: ${start}-${end} (scroll: ${scrollPosition}, container: ${containerSize})`
        );
      }

      return { start, end };
    };

    // Update visible range in state
    const updateVisibleRange = (scrollPosition: number) => {
      if (!viewportState) return;

      const range = calculateVisibleRange(scrollPosition);
      viewportState.visibleRange = range;

      // Emit range change event
      component.emit?.("viewport:range-changed", {
        range,
        scrollPosition,
      });
    };

    // Update total virtual size
    const updateTotalVirtualSize = (newTotalItems: number): void => {
      if (!viewportState) return;

      viewportState.totalItems = newTotalItems;
      const actualTotalSize = newTotalItems * estimatedItemSize;

      // Apply compression for very large datasets
      viewportState.virtualTotalSize = Math.min(
        actualTotalSize,
        MAX_VIRTUAL_SIZE
      );

      if (debug) {
        console.log(`[Virtual] Total size updated:`, {
          totalItems: newTotalItems,
          actualSize: actualTotalSize,
          virtualSize: viewportState.virtualTotalSize,
          compressed: actualTotalSize > MAX_VIRTUAL_SIZE,
        });
      }

      // Emit size change event
      component.emit?.("viewport:virtual-size-changed", {
        totalVirtualSize: viewportState.virtualTotalSize,
        totalItems: newTotalItems,
        compressionRatio: getCompressionRatio(),
      });
    };

    // Override getVisibleRange to use our calculation
    const originalGetVisibleRange = component.viewport.getVisibleRange;
    component.viewport.getVisibleRange = () => {
      if (!viewportState) return { start: 0, end: 0 };
      return (
        viewportState.visibleRange ||
        calculateVisibleRange(viewportState.scrollPosition || 0)
      );
    };

    // Listen for scroll events to update visible range
    component.on?.("viewport:scroll", (data: any) => {
      updateVisibleRange(data.position);
    });

    // Listen for item changes
    component.on?.("viewport:items-changed", (data: any) => {
      if (data.totalItems !== undefined) {
        updateTotalVirtualSize(data.totalItems);
        updateVisibleRange(viewportState?.scrollPosition || 0);
      }
    });

    // Listen for collection loaded events
    component.on?.("collection:range-loaded", (data: any) => {
      console.log(
        "[Virtual] Collection loaded, updating with total:",
        data.total
      );

      if (
        data.total !== undefined &&
        data.total !== viewportState?.totalItems
      ) {
        updateTotalVirtualSize(data.total);

        // Also update viewport state virtual size
        if (viewportState) {
          const actualTotalSize = data.total * estimatedItemSize;
          viewportState.virtualTotalSize = Math.min(
            actualTotalSize,
            MAX_VIRTUAL_SIZE
          );
          console.log(
            "[Virtual] Updated virtualTotalSize:",
            viewportState.virtualTotalSize
          );
        }
      }

      // Always update visible range when new data loads
      updateVisibleRange(viewportState?.scrollPosition || 0);

      // Trigger render
      component.viewport?.renderItems?.();
    });

    // Expose virtual API
    (component as any).virtual = {
      calculateVisibleRange,
      updateTotalVirtualSize,
      getTotalVirtualSize: () => viewportState?.virtualTotalSize || 0,
      getContainerSize: () => viewportState?.containerSize || 0,
      updateContainerSize: (size: number) => {
        if (viewportState) {
          viewportState.containerSize = size;
          updateVisibleRange(viewportState.scrollPosition || 0);
        }
      },
      getEstimatedItemSize: () => estimatedItemSize,
      calculateIndexFromPosition: (position: number) => {
        const compressionRatio = getCompressionRatio();
        const effectiveItemSize = estimatedItemSize * compressionRatio;
        return Math.floor(position / effectiveItemSize);
      },
      calculatePositionForIndex: (index: number) => {
        const compressionRatio = getCompressionRatio();
        const effectiveItemSize = estimatedItemSize * compressionRatio;
        return index * effectiveItemSize;
      },
    };

    return component;
  };
};
