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
    orientation?: "vertical" | "horizontal",
  ): number;

  // Cache management
  hasMeasuredSize(index: number): boolean;
  getMeasuredSize(index: number): number;
  getMeasuredSizes(): Map<number, number>;
  cacheItemSize(index: number, size: number): void;
  clearCache(): void;

  // Size estimation
  getItemSize(): number;
  updateItemSize(): void;

  // Additional utilities
  calculateTotalSize(totalItems?: number): number;
  getStats(): any;

  // Callbacks
  onSizeUpdated?: (totalSize: number) => void;
  onItemSizeChanged?: (newEstimate: number) => void;
}

export interface ItemSizeConfig {
  initialEstimate?: number;
  orientation?: "vertical" | "horizontal";
  cacheSize?: number;
  onSizeUpdated?: (totalSize: number) => void;
  onItemSizeChanged?: (newEstimate: number) => void;
}

/**
 * Creates an item size manager for measuring and caching item dimensions
 */
export const createItemSizeManager = (
  config: ItemSizeConfig = {},
): ItemSizeManager => {
  const {
    initialEstimate = 60,
    orientation = "vertical",
    cacheSize = 1000,
    onSizeUpdated,
    onItemSizeChanged,
  } = config;

  // Size cache - stores actual measured sizes
  const measuredSizes = new Map<number, number>();
  let currentItemSize = initialEstimate;

  // Batching state for performance optimization
  let batchUpdateTimeout: number | null = null;
  let pendingMeasurements = 0;
  let batchStartTime = 0;

  /**
   * Cache a specific item size with cache size management
   */
  const cacheItemSize = (index: number, size: number): void => {
    if (measuredSizes.size >= cacheSize) {
      // Remove oldest entries (10% of cache size)
      const entries = Array.from(measuredSizes.entries());
      entries.slice(0, Math.floor(cacheSize * 0.1)).forEach(([key]) => {
        measuredSizes.delete(key);
      });
    }
    measuredSizes.set(index, size);
  };

  /**
   * Trigger batched updates after measurements are complete
   */
  const triggerBatchedUpdates = (): void => {
    // Update estimated size based on all measurements
    updateItemSize();

    // Notify about total size update
    if (onSizeUpdated) {
      const totalSize = calculateTotalSize();
      onSizeUpdated(totalSize);
    }

    // Reset batch state
    pendingMeasurements = 0;
    batchUpdateTimeout = null;
  };

  /**
   * Schedule batched updates (debounced)
   */
  const scheduleBatchedUpdates = (): void => {
    if (batchUpdateTimeout) {
      clearTimeout(batchUpdateTimeout);
    }

    // Short timeout to batch rapid measurements
    batchUpdateTimeout = window.setTimeout(() => {
      const batchDuration = Date.now() - batchStartTime;
      triggerBatchedUpdates();
    }, 16); // ~1 frame delay to batch measurements
  };

  /**
   * Measure actual item size and update cache (with batching)
   */
  const measureItem = (
    element: HTMLElement,
    index: number,
    measureOrientation?: "vertical" | "horizontal",
  ): number => {
    if (!element || index < 0) {
      return currentItemSize;
    }

    const actualOrientation = measureOrientation || orientation;
    const size =
      actualOrientation === "vertical"
        ? element.offsetHeight
        : element.offsetWidth;

    if (size > 0) {
      const previousSize = measuredSizes.get(index);
      cacheItemSize(index, size);

      // Track batch state
      if (pendingMeasurements === 0) {
        batchStartTime = Date.now();
      }
      pendingMeasurements++;

      // Schedule batched updates instead of immediate callbacks
      scheduleBatchedUpdates();

      return size;
    }

    return currentItemSize;
  };

  /**
   * Update estimated item size based on measured sizes (with change threshold)
   */
  const updateItemSize = (): void => {
    if (measuredSizes.size === 0) return;

    const sizes = Array.from(measuredSizes.values());
    const average = sizes.reduce((sum, size) => sum + size, 0) / sizes.length;
    const newEstimate = Math.max(1, Math.round(average));

    // Only update if the change is significant (>2px or >5% change)
    const changeThreshold = Math.max(2, Math.round(currentItemSize * 0.05));
    const absoluteChange = Math.abs(newEstimate - currentItemSize);

    if (absoluteChange >= changeThreshold) {
      const previousEstimate = currentItemSize;
      currentItemSize = newEstimate;

      if (onItemSizeChanged) {
        onItemSizeChanged(newEstimate);
      }
    } else if (absoluteChange > 0) {
      // Silent update for small changes
      currentItemSize = newEstimate;
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
        0,
      );
    }

    let totalSize = 0;
    for (let i = 0; i < totalItems; i++) {
      totalSize += measuredSizes.get(i) || currentItemSize;
    }
    return totalSize;
  };

  /**
   * Get size for a specific item (measured or estimated)
   */
  const getMeasuredSize = (index: number): number => {
    return measuredSizes.get(index) || currentItemSize;
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
  };

  /**
   * Get current estimated item size
   */
  const getItemSize = (): number => {
    return currentItemSize;
  };

  /**
   * Get all measured sizes (for compatibility)
   */
  const getMeasuredSizes = (): Map<number, number> => {
    return new Map(measuredSizes);
  };

  /**
   * Get cache statistics
   */
  const getStats = () => {
    return {
      cachedItems: measuredSizes.size,
      estimatedSize: currentItemSize,
      cacheSize: cacheSize,
      minSize:
        measuredSizes.size > 0
          ? Math.min(...measuredSizes.values())
          : currentItemSize,
      maxSize:
        measuredSizes.size > 0
          ? Math.max(...measuredSizes.values())
          : currentItemSize,
      orientation: orientation,
    };
  };

  return {
    // Core API
    measureItem,
    hasMeasuredSize,
    getMeasuredSize,
    getMeasuredSizes,
    clearCache,
    getItemSize,
    updateItemSize,
    cacheItemSize,

    // Additional utilities
    calculateTotalSize,
    getStats,

    // Callbacks
    onSizeUpdated,
    onItemSizeChanged,
  };
};
