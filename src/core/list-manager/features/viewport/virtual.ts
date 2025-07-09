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

  // Virtual scrolling state
  let totalVirtualSize = 0;
  let containerSize = 0;

  /**
   * Calculate visible range based on scroll position
   */
  const calculateVisibleRange = (scrollPosition: number): ItemRange => {
    // Use getTotalItems callback if available, otherwise fall back to component.totalItems
    const actualTotalItems = getTotalItems
      ? getTotalItems()
      : component.totalItems;

    // Also ensure we use the larger of totalItems or items.length for safety
    const finalTotalItems = Math.max(actualTotalItems, component.items.length);

    const range = calculateVisibleRangeUtil(
      scrollPosition,
      containerSize,
      itemSizeManager.getEstimatedItemSize(),
      finalTotalItems,
      overscan,
      itemSizeManager.getMeasuredSizes() // Pass measured sizes for accurate calculations
    );

    return range;
  };

  /**
   * Update total virtual size for massive lists
   */
  const updateTotalVirtualSize = (totalItems: number): void => {
    // For massive lists, calculate total virtual size as:
    // estimatedItemSize × totalItems (not just loaded items)
    const estimatedItemSize = itemSizeManager.getEstimatedItemSize();
    const newTotalSize = estimatedItemSize * totalItems;

    if (newTotalSize !== totalVirtualSize) {
      totalVirtualSize = newTotalSize;

      console.log(
        `📐 [VIRTUAL] Total virtual size updated: ${(
          newTotalSize / 1000000
        ).toFixed(
          1
        )}M px (${estimatedItemSize}px × ${totalItems.toLocaleString()} items)`
      );

      // Notify about dimensions change
      onDimensionsChanged?.({
        containerSize,
        totalVirtualSize: newTotalSize,
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

  return {
    // Range calculations
    calculateVisibleRange,

    // Size management
    updateTotalVirtualSize,
    getTotalVirtualSize,

    // State management
    updateState,
    getState,
  };
};
