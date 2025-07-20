/**
 * Virtual Feature - Core virtual scrolling calculations
 * Handles visible range calculation and total virtual size management
 */

import type { ViewportContext } from "../types";
import { VIEWPORT_CONSTANTS } from "../constants";

export interface VirtualConfig {
  estimatedItemSize?: number;
  overscan?: number;
  orientation?: "vertical" | "horizontal";
  debug?: boolean;
}

export interface VirtualComponent {
  virtual: {
    calculateVisibleRange: (scrollPosition: number) => {
      start: number;
      end: number;
    };
    updateTotalVirtualSize: (totalItems: number) => void;
    getTotalVirtualSize: () => number;
    getContainerSize: () => number;
    updateContainerSize: (size: number) => void;
    getEstimatedItemSize: () => number;
    calculateIndexFromPosition: (position: number) => number;
    calculatePositionForIndex: (index: number) => number;
  };
}

/**
 * Adds virtual scrolling functionality to viewport component
 */
export function withVirtual(config: VirtualConfig = {}) {
  return <T extends ViewportContext>(component: T): T & VirtualComponent => {
    const {
      estimatedItemSize = VIEWPORT_CONSTANTS.VIRTUAL_SCROLL.DEFAULT_ITEM_SIZE,
      overscan = VIEWPORT_CONSTANTS.VIRTUAL_SCROLL.OVERSCAN_BUFFER,
      orientation = "vertical",
    } = config;

    // State
    let totalVirtualSize = 0;
    let containerSize = 0;
    let totalItems = 0;
    let viewportElement: HTMLElement | null = null;

    // Constants
    const MAX_VIRTUAL_SIZE = VIEWPORT_CONSTANTS.VIRTUAL_SCROLL.MAX_VIRTUAL_SIZE;

    /**
     * Calculate compression ratio for large datasets
     */
    const getCompressionRatio = (): number => {
      const actualTotalSize = totalItems * estimatedItemSize;
      return actualTotalSize > MAX_VIRTUAL_SIZE
        ? MAX_VIRTUAL_SIZE / actualTotalSize
        : 1;
    };

    /**
     * Calculate visible range based on scroll position
     */
    const calculateVisibleRange = (
      scrollPosition: number
    ): { start: number; end: number } => {
      if (totalItems === 0 || containerSize === 0) {
        if (config.debug) {
          console.log(
            `[Virtual] Empty range: totalItems=${totalItems}, containerSize=${containerSize}`
          );
        }
        return { start: 0, end: 0 };
      }

      const compressionRatio = getCompressionRatio();
      const effectiveItemSize = estimatedItemSize * compressionRatio;

      // Calculate visible indices
      const startIndex = Math.max(
        0,
        Math.floor(scrollPosition / effectiveItemSize) - overscan
      );
      const endIndex = Math.min(
        totalItems - 1,
        Math.ceil((scrollPosition + containerSize) / effectiveItemSize) +
          overscan
      );

      if (config.debug && (isNaN(startIndex) || isNaN(endIndex))) {
        console.log(
          `[Virtual] NaN detected: scrollPosition=${scrollPosition}, effectiveItemSize=${effectiveItemSize}, containerSize=${containerSize}, totalItems=${totalItems}`
        );
      }

      return { start: startIndex, end: endIndex };
    };

    /**
     * Update total virtual size based on item count
     */
    const updateTotalVirtualSize = (newTotalItems: number): void => {
      totalItems = newTotalItems;
      const actualTotalSize = totalItems * estimatedItemSize;

      // Apply compression for very large datasets
      totalVirtualSize = Math.min(actualTotalSize, MAX_VIRTUAL_SIZE);

      // Emit size change event
      component.emit?.("viewport:virtual-size-changed", {
        totalVirtualSize,
        totalItems,
        compressionRatio: getCompressionRatio(),
      });
    };

    /**
     * Update container size
     */
    const updateContainerSize = (size: number): void => {
      containerSize = size;

      // Emit container size change
      component.emit?.("viewport:container-size-changed", {
        containerSize,
        orientation,
      });
    };

    /**
     * Calculate index from virtual position
     */
    const calculateIndexFromPosition = (position: number): number => {
      const compressionRatio = getCompressionRatio();
      const effectiveItemSize = estimatedItemSize * compressionRatio;
      return Math.floor(position / effectiveItemSize);
    };

    /**
     * Calculate virtual position for index
     */
    const calculatePositionForIndex = (index: number): number => {
      const compressionRatio = getCompressionRatio();
      const effectiveItemSize = estimatedItemSize * compressionRatio;
      return index * effectiveItemSize;
    };

    // Initialize function
    const initialize = () => {
      viewportElement = component.element;

      if (viewportElement) {
        // Get initial container size
        containerSize =
          orientation === "horizontal"
            ? viewportElement.offsetWidth
            : viewportElement.offsetHeight;

        // Set up resize observer
        const resizeObserver = new ResizeObserver((entries) => {
          for (const entry of entries) {
            const newSize =
              orientation === "horizontal"
                ? entry.contentRect.width
                : entry.contentRect.height;

            if (newSize !== containerSize) {
              updateContainerSize(newSize);
            }
          }
        });

        resizeObserver.observe(viewportElement);

        // Store observer for cleanup
        (component as any)._virtualResizeObserver = resizeObserver;
      }
    };

    // Cleanup function
    const destroy = () => {
      const resizeObserver = (component as any)._virtualResizeObserver;
      if (resizeObserver) {
        resizeObserver.disconnect();
        delete (component as any)._virtualResizeObserver;
      }
    };

    // Store functions for viewport to call
    (component as any)._virtualInitialize = initialize;
    (component as any)._virtualDestroy = destroy;

    // Return enhanced component
    return {
      ...component,
      virtual: {
        calculateVisibleRange,
        updateTotalVirtualSize,
        getTotalVirtualSize: () => totalVirtualSize,
        getContainerSize: () => containerSize,
        updateContainerSize,
        getEstimatedItemSize: () => estimatedItemSize,
        calculateIndexFromPosition,
        calculatePositionForIndex,
      },
    };
  };
}
