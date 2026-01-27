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
  initialScrollIndex?: number;
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
      initialScrollIndex = 0,
    } = config;

    // Use provided itemSize or default, but mark if we should auto-detect
    const initialItemSize =
      itemSize || VIEWPORT_CONSTANTS.VIRTUAL_SCROLL.DEFAULT_ITEM_SIZE;

    const MAX_VIRTUAL_SIZE = VIEWPORT_CONSTANTS.VIRTUAL_SCROLL.MAX_VIRTUAL_SIZE;
    let viewportState: any;
    let hasCalculatedItemSize = false;
    let hasRecalculatedScrollForCompression = false; // Track if we've recalculated scroll position for compression

    // Listen for reload:start to reset feature-specific state
    component.on?.("reload:start", () => {
      hasCalculatedItemSize = false;
      hasRecalculatedScrollForCompression = false;
      // Reset viewportState if it exists
      if (viewportState) {
        viewportState.scrollPosition = 0;
        viewportState.totalItems = 0;
        viewportState.virtualTotalSize = 0;
        viewportState.visibleRange = { start: 0, end: 0 };
        delete (viewportState as any).targetScrollIndex;
      }
    });

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

      // If we have an initial scroll index, calculate initial scroll position
      // Note: We store the initialScrollIndex to use directly in range calculations
      // because scroll position may be compressed for large lists
      let initialScrollPosition = viewportState.scrollPosition || 0;

      if (initialScrollIndex > 0) {
        // Store the target index for use in range calculations
        (viewportState as any).targetScrollIndex = initialScrollIndex;

        // Calculate scroll position (may be compressed for large lists)
        initialScrollPosition =
          initialScrollIndex * (viewportState.itemSize || initialItemSize);
        viewportState.scrollPosition = initialScrollPosition;

        // Notify scrolling feature to sync its local scroll position
        // Use setTimeout to ensure scrolling feature has initialized
        setTimeout(() => {
          component.emit?.("viewport:scroll-position-sync", {
            position: initialScrollPosition,
            source: "initial-scroll-index",
          });
        }, 0);
      }

      updateVisibleRange(initialScrollPosition);

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
      scrollPosition: number,
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
        // If we have an initialScrollIndex, use it to calculate the range
        // even when totalItems is 0 (not yet loaded from API)
        if (initialScrollIndex > 0) {
          const visibleCount = Math.ceil(
            (containerSize || 600) /
              (viewportState.itemSize || initialItemSize),
          );
          const start = Math.max(0, initialScrollIndex - overscan);
          const end = initialScrollIndex + visibleCount + overscan;
          return { start, end };
        }
        log(`Invalid state: container=${containerSize}, items=${totalItems}`);
        return { start: 0, end: 0 };
      }

      const virtualSize =
        viewportState.virtualTotalSize || totalItems * viewportState.itemSize;
      const visibleCount = Math.ceil(containerSize / viewportState.itemSize);
      const compressionRatio = getCompressionRatio();

      let start: number, end: number;

      // Check if we have a target scroll index (for initialScrollIndex with compression)
      const targetScrollIndex = (viewportState as any).targetScrollIndex;

      if (compressionRatio < 1) {
        // Compressed space calculation
        // If we have a targetScrollIndex, use it directly instead of calculating from scroll position
        // This ensures we show the correct items even when virtual space is compressed
        if (targetScrollIndex !== undefined && targetScrollIndex > 0) {
          start = Math.max(0, targetScrollIndex - overscan);
          end = Math.min(
            totalItems - 1,
            targetScrollIndex + visibleCount + overscan,
          );
          // Clear targetScrollIndex after first use so normal scrolling works
          delete (viewportState as any).targetScrollIndex;
        } else {
          const scrollRatio = scrollPosition / virtualSize;
          const exactIndex = scrollRatio * totalItems;
          start = Math.floor(exactIndex);
          end = Math.ceil(exactIndex) + visibleCount;
        }

        // Near-bottom handling
        const maxScroll = virtualSize - containerSize;
        const distanceFromBottom = maxScroll - scrollPosition;

        if (distanceFromBottom <= containerSize && distanceFromBottom >= -1) {
          const itemsAtBottom = Math.floor(
            containerSize / viewportState.itemSize,
          );
          const firstVisibleAtBottom = Math.max(0, totalItems - itemsAtBottom);
          const interpolation = Math.max(
            0,
            Math.min(1, 1 - distanceFromBottom / containerSize),
          );

          start = Math.floor(
            start + (firstVisibleAtBottom - start) * interpolation,
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
          Math.floor(scrollPosition / viewportState.itemSize) - overscan,
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

      // log(`Range: ${start}-${end} (scroll: ${scrollPosition})`);

      // Strategic log for last range
      // if (end >= totalItems - 10) {
      //   console.log(
      //     `[Virtual] Near end range: ${start}-${end}, totalItems=${totalItems}, lastItemPos=${
      //       end * viewportState.itemSize
      //     }px, virtualSize=${viewportState.virtualTotalSize}px`
      //   );
      // }

      return { start, end };
    };

    // Calculate actual visible range (without overscan buffer)
    const calculateActualVisibleRange = (scrollPosition: number) => {
      if (!viewportState) return { start: 0, end: 0 };

      const { containerSize, totalItems } = viewportState;
      if (!containerSize || !totalItems) return { start: 0, end: 0 };

      const itemSize = viewportState.itemSize;
      const visibleCount = Math.ceil(containerSize / itemSize);
      const compressionRatio = viewportState.virtualTotalSize
        ? (totalItems * itemSize) / viewportState.virtualTotalSize
        : 1;

      let start: number, end: number;

      if (compressionRatio < 1) {
        // Compressed space - calculate based on scroll ratio
        const virtualSize =
          viewportState.virtualTotalSize || totalItems * itemSize;
        const scrollRatio = scrollPosition / virtualSize;
        start = Math.floor(scrollRatio * totalItems);
        end = Math.min(totalItems - 1, start + visibleCount - 1);
      } else {
        // Direct calculation
        start = Math.floor(scrollPosition / itemSize);
        end = Math.min(totalItems - 1, start + visibleCount - 1);
      }

      // Ensure valid range
      start = Math.max(0, start);
      end = Math.max(start, end);

      return { start, end };
    };

    // Update functions
    const updateVisibleRange = (scrollPosition: number) => {
      if (!viewportState) return;
      viewportState.visibleRange = calculateVisibleRange(scrollPosition);

      // DEBUG: Log who calls updateVisibleRange with 0 when it should be non-zero

      // Calculate actual visible range (without overscan) for UI display
      const actualVisibleRange = calculateActualVisibleRange(scrollPosition);

      component.emit?.("viewport:range-changed", {
        range: viewportState.visibleRange,
        visibleRange: actualVisibleRange,
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
          viewportState.itemsContainer,
        );
        const paddingTop = parseFloat(computedStyle.paddingTop) || 0;
        const paddingBottom = parseFloat(computedStyle.paddingBottom) || 0;
        totalPadding = paddingTop + paddingBottom;
      }

      // Include padding in the virtual size
      viewportState.virtualTotalSize = Math.min(
        actualSize + totalPadding,
        MAX_VIRTUAL_SIZE,
      );

      // Strategic log for debugging gap issue
      // console.log(
      //   `[Virtual] Total size update: items=${totalItems}, itemSize=${viewportState.itemSize}px, padding=${totalPadding}px, virtualSize=${viewportState.virtualTotalSize}px (was ${oldSize}px)`
      // );

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
      // console.log(
      //   `[Virtual] Container size measured: ${size}px from viewport element`
      // );

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
      updateVisibleRange(data.position),
    );

    component.on?.("viewport:items-changed", (data: any) => {
      if (data.totalItems !== undefined) {
        updateTotalVirtualSize(data.totalItems);
        updateVisibleRange(viewportState?.scrollPosition || 0);
      }
    });

    // Listen for total items changes (important for cursor pagination)
    // Note: setTotalItems() updates viewportState.totalItems BEFORE emitting this event,
    // so we can't rely on viewportState.totalItems to detect the first total.
    // Instead we use the hasRecalculatedScrollForCompression flag.
    component.on?.("viewport:total-items-changed", (data: any) => {
      if (data.total === undefined) return;

      // FIX: When we first receive totalItems with initialScrollIndex and compression,
      // recalculate scroll position to account for compression.
      // Without this, initialScrollIndex calculates position as index * itemSize,
      // but rendering uses compressed space, causing items to appear off-screen.
      //
      // We check this BEFORE updateTotalVirtualSize because we need to recalculate
      // scroll position based on the new total, and the flag ensures we only do this once.
      if (
        initialScrollIndex > 0 &&
        !hasRecalculatedScrollForCompression &&
        data.total > 0
      ) {
        const actualTotalSize = data.total * viewportState.itemSize;
        const isCompressed = actualTotalSize > MAX_VIRTUAL_SIZE;

        if (isCompressed) {
          // Recalculate scroll position using compression-aware formula
          // Same formula used in scrollToIndex
          const ratio = initialScrollIndex / data.total;
          const compressedPosition = ratio * MAX_VIRTUAL_SIZE;

          viewportState.scrollPosition = compressedPosition;

          // Notify scrolling feature to sync its local scroll position
          component.emit?.("viewport:scroll-position-sync", {
            position: compressedPosition,
            source: "compression-recalculation",
          });

          // Clear targetScrollIndex since we've now correctly calculated the scroll position
          // The normal compressed scrolling formula will now work correctly
          delete (viewportState as any).targetScrollIndex;
        }

        // Mark as done even if not compressed - we only want to do this check once
        hasRecalculatedScrollForCompression = true;
      }

      updateTotalVirtualSize(data.total);
      updateVisibleRange(viewportState?.scrollPosition || 0);

      // Trigger a render to update the view
      component.viewport?.renderItems?.();
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
              sizes.reduce((sum, size) => sum + size, 0) / sizes.length,
            );
            const previousItemSize = viewportState.itemSize;
            viewportState.itemSize = avgSize;

            // If we have an initialScrollIndex, recalculate scroll position
            // based on the newly detected item size
            if (initialScrollIndex > 0 && avgSize !== previousItemSize) {
              const newScrollPosition = initialScrollIndex * avgSize;
              viewportState.scrollPosition = newScrollPosition;

              // Notify scrolling feature to sync its local scroll position
              component.emit?.("viewport:scroll-position-sync", {
                position: newScrollPosition,
                source: "item-size-detected",
              });
            }

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
            ((viewportState?.itemSize || initialItemSize) * compressionRatio),
        ),
      calculatePositionForIndex: (index: number) =>
        index * (viewportState?.itemSize || initialItemSize) * compressionRatio,
    };

    return component;
  };
};
