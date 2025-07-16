/**
 * Virtual Scrolling Module - Core virtual scrolling calculations
 * Handles visible range calculation and total virtual size management
 */

import type { ListManagerComponent, ItemRange } from "../../types";
import { LIST_MANAGER_CONSTANTS } from "../../constants";
import { calculateVisibleRange as calculateVisibleRangeUtil } from "../../utils/calculations";
import type { ItemSizeManager } from "./item-size";

/**
 * Configuration for virtual scrolling calculations
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
 * Virtual scrolling state interface
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

  // Height capping utilities
  calculateVirtualPositionForIndex(index: number): number;
  getHeightCapInfo(): any;

  // State management
  updateState(updates: Partial<VirtualState>): void;
  getState(): VirtualState;
}

/**
 * Creates a virtual scrolling manager for range and size calculations
 */
export const createVirtualManager = (
  component: ListManagerComponent,
  itemSizeManager: ItemSizeManager,
  config: VirtualConfig,
  getTotalItems?: () => number // Add getTotalItems callback
): VirtualManager => {
  const { orientation, overscan, onDimensionsChanged } = config;

  // Browser height limits (safe maximum to avoid DOM limitations)
  const MAX_SAFE_VIRTUAL_SIZE = 16 * 1000 * 1000; // 16M pixels (safe for all browsers)

  // Virtual scrolling state
  let totalVirtualSize = 0;
  let actualTotalSize = 0; // The real total size if uncapped
  let containerSize = 0;
  let isVirtualSizeCapped = false;

  /**
   * Calculate visible range based on scroll position (with height capping support)
   */
  const calculateVisibleRange = (scrollPosition: number): ItemRange => {
    // Use getTotalItems callback if available, otherwise fall back to component.totalItems
    const actualTotalItems = getTotalItems
      ? getTotalItems()
      : component.totalItems;

    // Use the actual total items count - don't use items.length as it may be padded
    const finalTotalItems = actualTotalItems;

    if (!isVirtualSizeCapped) {
      // Standard calculation for smaller datasets
      const range = calculateVisibleRangeUtil(
        scrollPosition,
        containerSize,
        itemSizeManager.getEstimatedItemSize(),
        finalTotalItems,
        overscan,
        itemSizeManager.getMeasuredSizes()
      );
      return range;
    }

    // Height-capped calculation for massive datasets
    // CRITICAL FIX: Ensure we're using the correct virtual size for massive datasets
    // The totalVirtualSize should be 16M pixels for 1M items, not based on loaded items
    const currentTotalVirtualSize = isVirtualSizeCapped
      ? MAX_SAFE_VIRTUAL_SIZE
      : totalVirtualSize;
    const currentActualTotalSize = isVirtualSizeCapped
      ? finalTotalItems * itemSizeManager.getEstimatedItemSize()
      : actualTotalSize;

    // Map scroll position from capped virtual space to actual data range
    const scrollRatio =
      currentTotalVirtualSize > 0
        ? scrollPosition / currentTotalVirtualSize
        : 0;
    const actualScrollPosition = scrollRatio * currentActualTotalSize;

    // Debug logging for height-capped calculations
    if (scrollPosition > 0) {
      console.log(`🔍 [VIRTUAL-CAPPED] Mapping scroll position:
        Virtual scroll: ${scrollPosition}px
        Virtual total: ${currentTotalVirtualSize}px
        Scroll ratio: ${scrollRatio}
        Actual total: ${currentActualTotalSize}px
        Mapped position: ${actualScrollPosition}px
        Expected index: ${Math.floor(
          actualScrollPosition / itemSizeManager.getEstimatedItemSize()
        )}`);
    }

    // Calculate visible range using actual scroll position
    const range = calculateVisibleRangeUtil(
      actualScrollPosition,
      containerSize,
      itemSizeManager.getEstimatedItemSize(),
      finalTotalItems,
      overscan,
      itemSizeManager.getMeasuredSizes()
    );

    return range;
  };

  /**
   * Update total virtual size for massive lists (with height capping)
   */
  const updateTotalVirtualSize = (totalItems: number): void => {
    // Calculate the actual total size (unlimited)
    const estimatedItemSize = itemSizeManager.getEstimatedItemSize();
    const newActualTotalSize = estimatedItemSize * totalItems;

    // Determine if we need to cap the virtual size
    const needsCapping = newActualTotalSize > MAX_SAFE_VIRTUAL_SIZE;
    const newTotalVirtualSize = needsCapping
      ? MAX_SAFE_VIRTUAL_SIZE
      : newActualTotalSize;

    // Only update if something changed
    if (
      newTotalVirtualSize !== totalVirtualSize ||
      newActualTotalSize !== actualTotalSize
    ) {
      actualTotalSize = newActualTotalSize;
      totalVirtualSize = newTotalVirtualSize;
      isVirtualSizeCapped = needsCapping;

      if (needsCapping) {
        const compressionRatio = (
          (newTotalVirtualSize / newActualTotalSize) *
          100
        ).toFixed(1);
        console.log(
          `📐 [VIRTUAL-CAPPED] Virtual size capped for browser safety:`
        );
        console.log(
          `    Actual: ${(newActualTotalSize / 1000000).toFixed(
            1
          )}M px (${estimatedItemSize}px × ${totalItems.toLocaleString()} items)`
        );
        console.log(
          `    Virtual: ${(newTotalVirtualSize / 1000000).toFixed(
            1
          )}M px (${compressionRatio}% of actual)`
        );
        console.log(
          `    🚀 Height optimization: Active for ${totalItems.toLocaleString()} items`
        );
      } else {
        console.log(
          `📐 [VIRTUAL] Total virtual size updated: ${(
            newTotalVirtualSize / 1000000
          ).toFixed(
            1
          )}M px (${estimatedItemSize}px × ${totalItems.toLocaleString()} items)`
        );
      }

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

  /**
   * Calculate virtual scroll position for a given item index (with height capping support)
   */
  const calculateVirtualPositionForIndex = (index: number): number => {
    if (!isVirtualSizeCapped) {
      // Standard calculation for smaller datasets
      let position = 0;
      for (let i = 0; i < index; i++) {
        position += itemSizeManager.getMeasuredSize(i);
      }
      return position;
    }

    // Height-capped calculation for massive datasets
    // Calculate actual position first
    let actualPosition = 0;
    for (let i = 0; i < index; i++) {
      actualPosition += itemSizeManager.getMeasuredSize(i);
    }

    // Map actual position to capped virtual space
    const positionRatio =
      actualTotalSize > 0 ? actualPosition / actualTotalSize : 0;
    return positionRatio * totalVirtualSize;
  };

  /**
   * Get height capping information
   */
  const getHeightCapInfo = () => ({
    isVirtualSizeCapped,
    actualTotalSize,
    virtualTotalSize: totalVirtualSize,
    maxSafeVirtualSize: MAX_SAFE_VIRTUAL_SIZE,
    compressionRatio: isVirtualSizeCapped
      ? totalVirtualSize / actualTotalSize
      : 1,
  });

  return {
    // Range calculations
    calculateVisibleRange,

    // Size management
    updateTotalVirtualSize,
    getTotalVirtualSize,

    // Height capping utilities
    calculateVirtualPositionForIndex,
    getHeightCapInfo,

    // State management
    updateState,
    getState,
  };
};
