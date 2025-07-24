/**
 * Virtual Feature - Core virtual scrolling calculations
 * Handles visible range calculation and total virtual size management
 */

import type { ViewportContext, ViewportComponent } from "../types";
import { VIEWPORT_CONSTANTS } from "../constants";
import { wrapInitialize, getViewportState } from "./utils";

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

    const MAX_VIRTUAL_SIZE = VIEWPORT_CONSTANTS.VIRTUAL_SCROLL.MAX_VIRTUAL_SIZE;
    let viewportState: any;

    // Initialize using shared wrapper
    wrapInitialize(component, () => {
      viewportState = getViewportState(component);
      if (!viewportState) return;

      Object.assign(viewportState, {
        estimatedItemSize,
        overscan,
        containerSize:
          component.element?.[
            orientation === "horizontal" ? "offsetWidth" : "offsetHeight"
          ] || 600,
      });

      updateTotalVirtualSize(viewportState.totalItems);
      updateVisibleRange(viewportState.scrollPosition || 0);
    });

    // Helper functions
    const getCompressionRatio = (): number => {
      if (!viewportState?.virtualTotalSize) return 1;
      const actualSize = viewportState.totalItems * estimatedItemSize;
      return actualSize <= MAX_VIRTUAL_SIZE ? 1 : MAX_VIRTUAL_SIZE / actualSize;
    };

    const log = (message: string, data?: any) => {
      if (debug) console.log(`[Virtual] ${message}`, data);
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

      // Early returns for invalid states
      if (
        !containerSize ||
        containerSize <= 0 ||
        !totalItems ||
        totalItems <= 0
      ) {
        log(`Invalid state: container=${containerSize}, items=${totalItems}`);
        return { start: 0, end: 0 };
      }

      const virtualSize =
        viewportState.virtualTotalSize || totalItems * estimatedItemSize;
      const visibleCount = Math.ceil(containerSize / estimatedItemSize);
      const compressionRatio = getCompressionRatio();

      let start: number, end: number;

      if (compressionRatio < 1) {
        // Compressed space calculation
        const scrollRatio = scrollPosition / virtualSize;
        const exactIndex = scrollRatio * totalItems;
        start = Math.floor(exactIndex);
        end = Math.ceil(exactIndex) + visibleCount;

        // Near-bottom handling
        const maxScroll = virtualSize - containerSize;
        const distanceFromBottom = maxScroll - scrollPosition;

        if (distanceFromBottom <= containerSize && distanceFromBottom >= -1) {
          const itemsAtBottom = Math.floor(containerSize / estimatedItemSize);
          const firstVisibleAtBottom = Math.max(0, totalItems - itemsAtBottom);
          const interpolation = Math.max(
            0,
            Math.min(1, 1 - distanceFromBottom / containerSize)
          );

          start = Math.floor(
            start + (firstVisibleAtBottom - start) * interpolation
          );
          end =
            distanceFromBottom <= 1
              ? totalItems - 1
              : Math.min(totalItems - 1, start + visibleCount + overscan);

          log("Near bottom calculation:", {
            distanceFromBottom,
            interpolation,
            start,
            end,
            scrollPosition,
            totalItems,
          });
        }

        // Apply overscan
        start = Math.max(0, start - overscan);
        end = Math.min(totalItems - 1, end + overscan);
      } else {
        // Direct calculation
        start = Math.max(
          0,
          Math.floor(scrollPosition / estimatedItemSize) - overscan
        );
        end = Math.min(totalItems - 1, start + visibleCount + overscan * 2);
      }

      // Validate output
      if (isNaN(start) || isNaN(end)) {
        console.error("[Virtual] NaN in range calculation:", {
          scrollPosition,
          containerSize,
          totalItems,
          estimatedItemSize,
          compressionRatio,
        });
        return { start: 0, end: 0 };
      }

      log(`Range: ${start}-${end} (scroll: ${scrollPosition})`);
      return { start, end };
    };

    // Update functions
    const updateVisibleRange = (scrollPosition: number) => {
      if (!viewportState) return;
      viewportState.visibleRange = calculateVisibleRange(scrollPosition);
      component.emit?.("viewport:range-changed", {
        range: viewportState.visibleRange,
        scrollPosition,
      });
    };

    const updateTotalVirtualSize = (newTotalItems: number): void => {
      if (!viewportState) return;

      viewportState.totalItems = newTotalItems;
      const actualSize = newTotalItems * estimatedItemSize;
      viewportState.virtualTotalSize = Math.min(actualSize, MAX_VIRTUAL_SIZE);

      log("Total size updated:", {
        totalItems: newTotalItems,
        actualSize,
        virtualSize: viewportState.virtualTotalSize,
        compressed: actualSize > MAX_VIRTUAL_SIZE,
      });

      component.emit?.("viewport:virtual-size-changed", {
        totalVirtualSize: viewportState.virtualTotalSize,
        totalItems: newTotalItems,
        compressionRatio: getCompressionRatio(),
      });
    };

    // Override viewport methods
    component.viewport.getVisibleRange = () =>
      viewportState?.visibleRange ||
      calculateVisibleRange(viewportState?.scrollPosition || 0);

    // Event listeners
    component.on?.("viewport:scroll", (data: any) =>
      updateVisibleRange(data.position)
    );

    component.on?.("viewport:items-changed", (data: any) => {
      if (data.totalItems !== undefined) {
        updateTotalVirtualSize(data.totalItems);
        updateVisibleRange(viewportState?.scrollPosition || 0);
      }
    });

    component.on?.("collection:range-loaded", (data: any) => {
      if (
        data.total !== undefined &&
        data.total !== viewportState?.totalItems
      ) {
        updateTotalVirtualSize(data.total);
      }
      updateVisibleRange(viewportState?.scrollPosition || 0);
      component.viewport?.renderItems?.();
    });

    // Expose virtual API
    const compressionRatio = getCompressionRatio();
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
      calculateIndexFromPosition: (position: number) =>
        Math.floor(position / (estimatedItemSize * compressionRatio)),
      calculatePositionForIndex: (index: number) =>
        index * estimatedItemSize * compressionRatio,
    };

    return component;
  };
};
