/**
 * Virtual Scrolling Module - Core virtual scrolling calculations
 * Handles visible range calculation and total virtual size management
 */

import type { ListManagerComponent, ItemRange } from "../../types";
import type { ItemSizeManager } from "./item-size";
// Removed calculateVisibleRangeUtil import - using unified index-based approach

/**
 * Configuration for virtual scrolling
 */
export interface VirtualConfig {
  orientation: "vertical" | "horizontal";
  overscan: number;
  onDimensionsChanged?: (data: {
    containerSize: number;
    totalVirtualSize: number;
    estimatedItemSize: number;
    totalItems: number;
  }) => void;
}

/**
 * Virtual scrolling state
 */
export interface VirtualState {
  totalVirtualSize: number;
  containerSize: number;
}

/**
 * Virtual scrolling manager interface
 */
export interface VirtualManager {
  // Range calculations
  calculateVisibleRange(scrollPosition: number): ItemRange;

  // Size management
  updateTotalVirtualSize(totalItems: number): void;
  getTotalVirtualSize(): number;

  // Index-based scrolling utilities
  calculateVirtualPositionForIndex(index: number): number;
  calculateIndexFromVirtualPosition(position: number): number;
  getMaxScrollPosition(): number;

  // State management
  updateState(updates: Partial<VirtualState>): void;
  getState(): VirtualState;
}

/**
 * Creates a virtual scrolling manager using index-based approach
 * This avoids browser height limitations by not creating massive DOM elements
 */
export const createVirtualManager = (
  component: ListManagerComponent,
  itemSizeManager: ItemSizeManager,
  config: VirtualConfig,
  getTotalItems?: () => number
): VirtualManager => {
  const { orientation, overscan, onDimensionsChanged } = config;

  // Virtual scrolling state
  let totalVirtualSize = 0;
  let containerSize = 0;

  /**
   * Calculate visible range based on scroll position
   * Uses unified index-based approach for all dataset sizes
   */
  const calculateVisibleRange = (scrollPosition: number): ItemRange => {
    const actualTotalItems = getTotalItems
      ? getTotalItems()
      : component.totalItems;

    if (actualTotalItems === 0) {
      return { start: 0, end: 0 };
    }

    // Always use index-based calculation for consistency
    if (totalVirtualSize > 0) {
      // Map scroll position to item index using ratio
      const scrollRatio = Math.min(1, scrollPosition / totalVirtualSize);
      const exactScrollIndex = scrollRatio * actualTotalItems;
      const startIndex = Math.floor(exactScrollIndex);

      // Calculate viewport size in items
      const viewportItemCount = Math.ceil(
        containerSize / itemSizeManager.getEstimatedItemSize()
      );
      const itemsInViewport = Math.floor(
        containerSize / itemSizeManager.getEstimatedItemSize()
      );

      // Special handling for when we're near the very end
      const maxScrollPosition = totalVirtualSize - containerSize;
      const distanceFromBottom = maxScrollPosition - scrollPosition;

      // Calculate what the last possible start index should be
      const maxStartIndex = Math.max(0, actualTotalItems - itemsInViewport);

      // Use a larger threshold (500 pixels) to ensure smooth transitions
      // This represents about 6 items worth of scrolling
      const bottomThreshold = 500;

      if (distanceFromBottom <= bottomThreshold && distanceFromBottom >= -1) {
        // When near the bottom, interpolate between the calculated position and the last position
        // This ensures smooth scrolling without jumps

        if (distanceFromBottom <= 1 && distanceFromBottom >= -1) {
          // At the very bottom, show exactly the last items
          const lastStartIndex = maxStartIndex;
          const start = Math.max(0, lastStartIndex - overscan);
          const end = actualTotalItems - 1;

          return { start, end };
        } else {
          // Near the bottom but not at the very end
          // Smoothly interpolate between normal calculation and bottom position
          const interpolationFactor =
            (bottomThreshold - distanceFromBottom) / bottomThreshold;

          // Calculate where we would be with normal scrolling
          let normalStartIndex = startIndex;
          if (normalStartIndex > maxStartIndex) {
            normalStartIndex = maxStartIndex;
          }

          // Interpolate between normal position and max position
          const interpolatedStartIndex = Math.floor(
            normalStartIndex +
              (maxStartIndex - normalStartIndex) * interpolationFactor
          );

          const endIndex = Math.min(
            interpolatedStartIndex + viewportItemCount - 1,
            actualTotalItems - 1
          );

          // Apply overscan
          const start = Math.max(0, interpolatedStartIndex - overscan);
          const end = Math.min(actualTotalItems - 1, endIndex + overscan);

          console.log(`📊 [VIRTUAL] Near bottom - interpolated position:
            scrollPosition: ${scrollPosition}
            distanceFromBottom: ${distanceFromBottom}
            interpolationFactor: ${interpolationFactor}
            normalStartIndex: ${normalStartIndex}
            interpolatedStartIndex: ${interpolatedStartIndex}
            range: ${start}-${end}`);

          return { start, end };
        }
      }

      // For positions not near the end, use normal index-based calculation
      let adjustedStartIndex = startIndex;
      if (startIndex > maxStartIndex) {
        adjustedStartIndex = maxStartIndex;
      }

      const endIndex = Math.min(
        adjustedStartIndex + viewportItemCount - 1,
        actualTotalItems - 1
      );

      // Apply overscan
      const start = Math.max(0, adjustedStartIndex - overscan);
      const end = Math.min(actualTotalItems - 1, endIndex + overscan);

      return { start, end };
    }

    // This should not happen as totalVirtualSize should always be > 0
    console.warn(
      `[VIRTUAL] Unexpected state: totalVirtualSize=${totalVirtualSize}`
    );
    return { start: 0, end: Math.min(10, actualTotalItems - 1) };
  };

  /**
   * Update total virtual size based on total items
   * Uses actual size when possible, caps at 10M pixels to prevent browser issues
   */
  const updateTotalVirtualSize = (totalItems: number): void => {
    const estimatedItemSize = itemSizeManager.getEstimatedItemSize();

    // Cap the virtual size at a reasonable maximum to prevent browser issues
    // This provides smooth scrolling for any dataset size
    const MAX_VIRTUAL_SIZE = 10 * 1000 * 1000; // 10M pixels - well within browser limits

    let newTotalVirtualSize: number;

    if (totalItems * estimatedItemSize > MAX_VIRTUAL_SIZE) {
      // Cap virtual size to prevent browser issues
      newTotalVirtualSize = MAX_VIRTUAL_SIZE;
      // console.log(
      //   `📐 [VIRTUAL] Capping virtual size at 10M pixels for ${totalItems.toLocaleString()} items (would be ${(
      //     (totalItems * estimatedItemSize) /
      //     1_000_000
      //   ).toFixed(1)}M pixels)`
      // );
    } else {
      // Use actual size when within limits
      newTotalVirtualSize = totalItems * estimatedItemSize;
    }

    if (newTotalVirtualSize !== totalVirtualSize) {
      totalVirtualSize = newTotalVirtualSize;

      // Notify about dimensions change
      onDimensionsChanged?.({
        containerSize,
        totalVirtualSize: newTotalVirtualSize,
        estimatedItemSize,
        totalItems,
      });
    }
  };

  /**
   * Calculate virtual scroll position for a given item index
   */
  const calculateVirtualPositionForIndex = (index: number): number => {
    const actualTotalItems = getTotalItems
      ? getTotalItems()
      : component.totalItems;

    if (actualTotalItems === 0) return 0;

    const itemSize = itemSizeManager.getEstimatedItemSize();
    const actualPosition = index * itemSize;

    // If using index-based scrolling, map to virtual space
    const actualTotalSize = actualTotalItems * itemSize;
    if (actualTotalSize > totalVirtualSize) {
      const ratio = index / actualTotalItems;
      return ratio * totalVirtualSize;
    }

    return actualPosition;
  };

  /**
   * Calculate item index from virtual scroll position
   */
  const calculateIndexFromVirtualPosition = (position: number): number => {
    const actualTotalItems = getTotalItems
      ? getTotalItems()
      : component.totalItems;

    if (actualTotalItems === 0 || totalVirtualSize === 0) return 0;

    const itemSize = itemSizeManager.getEstimatedItemSize();
    const actualTotalSize = actualTotalItems * itemSize;

    // If using index-based scrolling, map from virtual space
    if (actualTotalSize > totalVirtualSize) {
      const ratio = position / totalVirtualSize;
      return Math.floor(ratio * actualTotalItems);
    }

    return Math.floor(position / itemSize);
  };

  /**
   * Get maximum scroll position
   */
  const getMaxScrollPosition = (): number => {
    return Math.max(0, totalVirtualSize - containerSize);
  };

  /**
   * Get current total virtual size
   */
  const getTotalVirtualSize = (): number => totalVirtualSize;

  /**
   * Update virtual scrolling state
   */
  const updateState = (updates: Partial<VirtualState>): void => {
    if (updates.totalVirtualSize !== undefined) {
      totalVirtualSize = updates.totalVirtualSize;
    }
    if (updates.containerSize !== undefined) {
      containerSize = updates.containerSize;
    }
  };

  /**
   * Get current virtual scrolling state
   */
  const getState = (): VirtualState => ({
    totalVirtualSize,
    containerSize,
  });

  return {
    // Range calculations
    calculateVisibleRange,

    // Size management
    updateTotalVirtualSize,
    getTotalVirtualSize,

    // Index-based scrolling utilities
    calculateVirtualPositionForIndex,
    calculateIndexFromVirtualPosition,
    getMaxScrollPosition,

    // State management
    updateState,
    getState,
  };
};
