/**
 * Virtual Feature - Core virtual scrolling calculations
 * Handles visible range calculation and total virtual size management
 */

import type { ViewportContext, ViewportComponent } from "../types";
import { VIEWPORT_CONSTANTS } from "../constants";
import { wrapInitialize, getViewportState } from "./utils";

export interface VirtualConfig {
  itemSize?: number;
  overscan?: number;
  orientation?: "vertical" | "horizontal";
  autoDetectItemSize?: boolean;
  debug?: boolean;
}

/**
 * Virtual scrolling feature for viewport
 * Handles visible range calculations with compression for large datasets
 */
export const withVirtual = (config: VirtualConfig = {}) => {
  return <T extends ViewportContext & ViewportComponent>(component: T): T => {
    const {
      itemSize,
      overscan = VIEWPORT_CONSTANTS.VIRTUAL_SCROLL.OVERSCAN_BUFFER,
      orientation = "vertical",
      autoDetectItemSize = itemSize === undefined
        ? VIEWPORT_CONSTANTS.VIRTUAL_SCROLL.AUTO_DETECT_ITEM_SIZE
        : false,
      debug = false,
    } = config;

    // Use provided itemSize or default, but mark if we should auto-detect
    const initialItemSize =
      itemSize || VIEWPORT_CONSTANTS.VIRTUAL_SCROLL.DEFAULT_ITEM_SIZE;

    const MAX_VIRTUAL_SIZE = VIEWPORT_CONSTANTS.VIRTUAL_SCROLL.MAX_VIRTUAL_SIZE;
    let viewportState: any;
    let hasCalculatedItemSize = false;

    // Initialize using shared wrapper
    wrapInitialize(component, () => {
      viewportState = getViewportState(component);
      if (!viewportState) return;

      Object.assign(viewportState, {
        itemSize: initialItemSize,
        overscan,
        containerSize:
          viewportState.viewportElement?.[
            orientation === "horizontal" ? "offsetWidth" : "offsetHeight"
          ] || 600,
      });

      updateTotalVirtualSize(viewportState.totalItems);
      updateVisibleRange(viewportState.scrollPosition || 0);

      // Ensure container size is measured after DOM is ready
      requestAnimationFrame(() => {
        updateContainerSize();
      });
    });

    // Helper functions
    const getCompressionRatio = (): number => {
      if (!viewportState?.virtualTotalSize) return 1;
      const actualSize = viewportState.totalItems * viewportState.itemSize;
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
        viewportState.virtualTotalSize || totalItems * viewportState.itemSize;
      const visibleCount = Math.ceil(containerSize / viewportState.itemSize);
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
          const itemsAtBottom = Math.floor(
            containerSize / viewportState.itemSize
          );
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
          Math.floor(scrollPosition / viewportState.itemSize) - overscan
        );
        end = Math.min(totalItems - 1, start + visibleCount + overscan * 2);
      }

      // Validate output
      if (isNaN(start) || isNaN(end)) {
        console.error("[Virtual] NaN in range calculation:", {
          scrollPosition,
          containerSize,
          totalItems,
          itemSize: viewportState.itemSize,
          compressionRatio,
        });
        return { start: 0, end: 0 };
      }

      log(`Range: ${start}-${end} (scroll: ${scrollPosition})`);

      // Strategic log for last range
      if (end >= totalItems - 10) {
        console.log(
          `[Virtual] Near end range: ${start}-${end}, totalItems=${totalItems}, lastItemPos=${
            end * viewportState.itemSize
          }px, virtualSize=${viewportState.virtualTotalSize}px`
        );
      }

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

    // Update total virtual size
    const updateTotalVirtualSize = (totalItems: number) => {
      if (!viewportState) return;

      const oldSize = viewportState.virtualTotalSize;
      viewportState.totalItems = totalItems;
      const actualSize = totalItems * viewportState.itemSize;

      // Get padding from the items container if available
      let totalPadding = 0;
      if (viewportState.itemsContainer) {
        const computedStyle = window.getComputedStyle(
          viewportState.itemsContainer
        );
        const paddingTop = parseFloat(computedStyle.paddingTop) || 0;
        const paddingBottom = parseFloat(computedStyle.paddingBottom) || 0;
        totalPadding = paddingTop + paddingBottom;
      }

      // Include padding in the virtual size
      viewportState.virtualTotalSize = Math.min(
        actualSize + totalPadding,
        MAX_VIRTUAL_SIZE
      );

      // Strategic log for debugging gap issue
      console.log(
        `[Virtual] Total size update: items=${totalItems}, itemSize=${viewportState.itemSize}px, padding=${totalPadding}px, virtualSize=${viewportState.virtualTotalSize}px (was ${oldSize}px)`
      );

      component.emit?.("viewport:virtual-size-changed", {
        totalVirtualSize: viewportState.virtualTotalSize,
        totalItems: totalItems,
        compressionRatio: getCompressionRatio(),
      });
    };

    // Update container size
    const updateContainerSize = () => {
      if (!viewportState || !viewportState.viewportElement) return;

      const size =
        viewportState.viewportElement[
          viewportState.orientation === "horizontal"
            ? "offsetWidth"
            : "offsetHeight"
        ];

      // Log the actual measurement
      console.log(
        `[Virtual] Container size measured: ${size}px from viewport element`
      );

      if (size !== viewportState.containerSize) {
        viewportState.containerSize = size;
        updateVisibleRange(viewportState.scrollPosition || 0);
        updateTotalVirtualSize(viewportState.totalItems); // Also update virtual size
        component.emit?.("viewport:container-size-changed", {
          containerSize: size,
        });
      }
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

    // Listen for total items changes (important for cursor pagination)
    component.on?.("viewport:total-items-changed", (data: any) => {
      if (
        data.total !== undefined &&
        data.total !== viewportState?.totalItems
      ) {
        log(
          `Total items changed from ${viewportState?.totalItems} to ${data.total}`
        );
        updateTotalVirtualSize(data.total);
        updateVisibleRange(viewportState?.scrollPosition || 0);

        // Trigger a render to update the view
        component.viewport?.renderItems?.();
      }
    });

    // Listen for container size changes to recalculate virtual size
    component.on?.("viewport:container-size-changed", (data: any) => {
      if (viewportState && data.containerSize !== viewportState.containerSize) {
        viewportState.containerSize = data.containerSize;
        // Recalculate virtual size with new container size
        updateTotalVirtualSize(viewportState.totalItems);
        updateVisibleRange(viewportState.scrollPosition || 0);
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

    // Listen for first items rendered to calculate item size (if auto-detection is enabled)
    if (autoDetectItemSize) {
      component.on?.("viewport:items-rendered", (data: any) => {
        if (
          !hasCalculatedItemSize &&
          data.elements?.length > 0 &&
          viewportState
        ) {
          // Calculate average item size from first rendered batch
          const sizes: number[] = [];
          const sizeProperty =
            orientation === "horizontal" ? "offsetWidth" : "offsetHeight";

          data.elements.forEach((element: HTMLElement) => {
            const size = element[sizeProperty];
            if (size > 0) {
              sizes.push(size);
            }
          });

          if (sizes.length > 0) {
            const avgSize = Math.round(
              sizes.reduce((sum, size) => sum + size, 0) / sizes.length
            );

            console.log(
              `[Virtual] Auto-detected item size: ${avgSize}px (was ${viewportState.itemSize}px), based on ${sizes.length} items`
            );
            viewportState.itemSize = avgSize;

            // Recalculate everything with new size
            updateTotalVirtualSize(viewportState.totalItems);
            updateVisibleRange(viewportState.scrollPosition || 0);

            // Re-render to adjust positions
            component.viewport?.renderItems?.();

            // Emit event for size change
            component.emit?.("viewport:item-size-detected", {
              previousSize: initialItemSize,
              detectedSize: avgSize,
            });

            hasCalculatedItemSize = true;
          }
        }
      });
    }

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
      getItemSize: () => viewportState?.itemSize || initialItemSize,
      calculateIndexFromPosition: (position: number) =>
        Math.floor(
          position /
            ((viewportState?.itemSize || initialItemSize) * compressionRatio)
        ),
      calculatePositionForIndex: (index: number) =>
        index * (viewportState?.itemSize || initialItemSize) * compressionRatio,
    };

    return component;
  };
};
