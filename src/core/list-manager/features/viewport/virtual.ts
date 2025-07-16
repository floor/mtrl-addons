/**
 * Virtual Scrolling Module - Core virtual scrolling calculations
 * Handles visible range calculation and total virtual size management
 */

import type { ListManagerComponent, ItemRange } from "../../types";
import type { ItemSizeManager } from "./item-size";
import { calculateVisibleRange as calculateVisibleRangeUtil } from "../../utils/calculations";

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
   * Uses index-based approach for large datasets
   */
  const calculateVisibleRange = (scrollPosition: number): ItemRange => {
    const actualTotalItems = getTotalItems
      ? getTotalItems()
      : component.totalItems;

    if (actualTotalItems === 0) {
      return { start: 0, end: 0 };
    }

    // For large datasets, use simplified index-based calculation
    if (actualTotalItems > 100000) {
      const itemSize = itemSizeManager.getEstimatedItemSize();
      const viewportItemCount = Math.ceil(containerSize / itemSize);

      // Calculate start index directly from scroll position
      const startIndex = Math.floor(scrollPosition / itemSize);
      const endIndex = Math.min(
        startIndex + viewportItemCount - 1,
        actualTotalItems - 1
      );

      // Apply overscan
      const start = Math.max(0, startIndex - overscan);
      const end = Math.min(actualTotalItems - 1, endIndex + overscan);

      return { start, end };
    }

    // For smaller datasets, use the standard calculation with measured sizes
    return calculateVisibleRangeUtil(
      scrollPosition,
      containerSize,
      itemSizeManager.getEstimatedItemSize(),
      actualTotalItems,
      overscan,
      itemSizeManager.getMeasuredSizes()
    );
  };

  /**
   * Update total virtual size based on total items
   * For index-based scrolling, we use a reasonable maximum
   */
  const updateTotalVirtualSize = (totalItems: number): void => {
    const estimatedItemSize = itemSizeManager.getEstimatedItemSize();

    // For index-based scrolling, cap the virtual size at a reasonable maximum
    // This prevents browser issues while maintaining smooth scrolling
    const MAX_VIRTUAL_SIZE = 10 * 1000 * 1000; // 10M pixels - well within browser limits

    let newTotalVirtualSize: number;

    if (totalItems * estimatedItemSize > MAX_VIRTUAL_SIZE) {
      // Use index-based virtual size
      newTotalVirtualSize = MAX_VIRTUAL_SIZE;
      console.log(
        `📐 [VIRTUAL] Using index-based scrolling for ${totalItems.toLocaleString()} items`
      );
    } else {
      // Use actual size for smaller datasets
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
