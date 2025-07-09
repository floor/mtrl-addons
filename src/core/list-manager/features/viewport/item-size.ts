/**
 * Item Size Management
 * Handles item measurement, caching, and size estimation for virtual scrolling
 * Works with both vertical (height) and horizontal (width) orientations
 */

export interface ItemSizeManager {
  // Measurement
  measureItem(
    element: HTMLElement,
    index: number,
    orientation?: "vertical" | "horizontal"
  ): number;

  // Cache management
  hasMeasuredSize(index: number): boolean;
  getMeasuredSize(index: number): number;
  getMeasuredSizes(): Map<number, number>;
  cacheItemSize(index: number, size: number): void;
  clearCache(): void;

  // Size estimation
  getEstimatedItemSize(): number;
  updateEstimatedSize(): void;

  // Additional utilities
  calculateTotalSize(totalItems?: number): number;
  getStats(): any;

  // Callbacks
  onSizeUpdated?: (totalSize: number) => void;
  onEstimatedSizeChanged?: (newEstimate: number) => void;
}

export interface ItemSizeConfig {
  initialEstimate?: number;
  orientation?: "vertical" | "horizontal";
  cacheSize?: number;
  onSizeUpdated?: (totalSize: number) => void;
  onEstimatedSizeChanged?: (newEstimate: number) => void;
}

/**
 * Creates an item size manager for measuring and caching item dimensions
 */
export const createItemSizeManager = (
  config: ItemSizeConfig = {}
): ItemSizeManager => {
  const {
    initialEstimate = 60,
    orientation = "vertical",
    cacheSize = 1000,
    onSizeUpdated,
    onEstimatedSizeChanged,
  } = config;

  // Size cache - stores actual measured sizes
  const measuredSizes = new Map<number, number>();
  let currentEstimatedItemSize = initialEstimate;

  /**
   * Measure actual item size and update cache
   */
  const measureItem = (
    element: HTMLElement,
    index: number,
    measureOrientation?: "vertical" | "horizontal"
  ): number => {
    if (!element || index < 0) {
      console.warn(
        `⚠️ [ITEM-SIZE] Invalid measurement parameters: element=${!!element}, index=${index}`
      );
      return currentEstimatedItemSize;
    }

    const actualOrientation = measureOrientation || orientation;
    const size =
      actualOrientation === "vertical"
        ? element.offsetHeight
        : element.offsetWidth;

    if (size > 0) {
      const previousSize = measuredSizes.get(index);
      cacheItemSize(index, size);

      // Log if this is a new measurement or size changed significantly
      if (!previousSize || Math.abs(size - previousSize) > 1) {
        console.log(
          `📏 [ITEM-SIZE] Item ${index}: ${
            previousSize ? `${previousSize}px → ` : ""
          }${size}px (${actualOrientation})`
        );
      }

      // Update estimated size based on all measurements
      updateEstimatedSize();

      // Notify about total size update
      if (onSizeUpdated) {
        const totalSize = calculateTotalSize();
        onSizeUpdated(totalSize);
      }

      return size;
    }

    console.warn(
      `⚠️ [ITEM-SIZE] Could not measure item ${index}: size=${size}px`
    );
    return currentEstimatedItemSize;
  };

  /**
   * Update estimated item size based on measured sizes
   */
  const updateEstimatedSize = (): void => {
    if (measuredSizes.size === 0) return;

    const sizes = Array.from(measuredSizes.values());
    const average = sizes.reduce((sum, size) => sum + size, 0) / sizes.length;
    const newEstimate = Math.max(1, Math.round(average));

    if (newEstimate !== currentEstimatedItemSize) {
      const previousEstimate = currentEstimatedItemSize;
      currentEstimatedItemSize = newEstimate;

      console.log(
        `📊 [ITEM-SIZE] Updated estimate: ${previousEstimate}px → ${newEstimate}px (from ${sizes.length} measurements)`
      );

      if (onEstimatedSizeChanged) {
        onEstimatedSizeChanged(newEstimate);
      }
    }
  };

  /**
   * Calculate total size for a given number of items
   */
  const calculateTotalSize = (totalItems?: number): number => {
    if (!totalItems) {
      // Calculate based on measured items only
      return Array.from(measuredSizes.values()).reduce(
        (sum, size) => sum + size,
        0
      );
    }

    let totalSize = 0;
    for (let i = 0; i < totalItems; i++) {
      totalSize += measuredSizes.get(i) || currentEstimatedItemSize;
    }
    return totalSize;
  };

  /**
   * Get size for a specific item (measured or estimated)
   */
  const getMeasuredSize = (index: number): number => {
    return measuredSizes.get(index) || currentEstimatedItemSize;
  };

  /**
   * Check if item has been measured
   */
  const hasMeasuredSize = (index: number): boolean => {
    return measuredSizes.has(index);
  };

  /**
   * Clear all cached measurements
   */
  const clearCache = (): void => {
    const cacheSize = measuredSizes.size;
    measuredSizes.clear();
    console.log(`🧹 [ITEM-SIZE] Cleared ${cacheSize} cached measurements`);
  };

  /**
   * Get current estimated item size
   */
  const getEstimatedItemSize = (): number => {
    return currentEstimatedItemSize;
  };

  /**
   * Get all measured sizes (for compatibility)
   */
  const getMeasuredSizes = (): Map<number, number> => {
    return new Map(measuredSizes);
  };

  /**
   * Cache a specific item size
   */
  const cacheItemSize = (index: number, size: number): void => {
    measuredSizes.set(index, size);
    console.log(`📦 [ITEM-SIZE] Cached size for item ${index}: ${size}px`);
  };

  /**
   * Get cache statistics
   */
  const getStats = () => {
    return {
      cachedItems: measuredSizes.size,
      estimatedSize: currentEstimatedItemSize,
      minSize:
        measuredSizes.size > 0
          ? Math.min(...measuredSizes.values())
          : currentEstimatedItemSize,
      maxSize:
        measuredSizes.size > 0
          ? Math.max(...measuredSizes.values())
          : currentEstimatedItemSize,
    };
  };

  return {
    // Core API
    measureItem,
    hasMeasuredSize,
    getMeasuredSize,
    getMeasuredSizes,
    clearCache,
    getEstimatedItemSize,
    updateEstimatedSize,
    cacheItemSize,

    // Additional utilities
    calculateTotalSize,
    getStats,

    // Callbacks
    onSizeUpdated,
    onEstimatedSizeChanged,
  };
};
