// src/core/viewport/features/collection.ts

/**
 * Collection Feature for Viewport
 * Handles data management, range loading, and API integration
 * Adapted from list-manager/features/collection for direct viewport integration
 */

import type { ViewportComponent } from "../types";
import { VIEWPORT_CONSTANTS } from "../constants";

/**
 * Configuration for collection feature
 */
export interface CollectionConfig {
  collection?: any; // Collection adapter
  rangeSize?: number;
  strategy?: "page" | "offset" | "cursor";
  enablePlaceholders?: boolean;
  maskCharacter?: string;
  transform?: (item: any) => any; // Transform function for items
}

/**
 * Collection feature interface
 */
export interface CollectionFeature {
  // Data management
  setItems: (items: any[]) => void;
  getItems: () => any[];
  setTotalItems: (total: number) => void;
  getTotalItems: () => number;

  // Range management
  loadRange: (offset: number, limit: number) => Promise<any[]>;
  loadMissingRanges: (range: { start: number; end: number }) => Promise<void>;
  getLoadedRanges: () => Set<number>;
  getPendingRanges: () => Set<number>;
  getFailedRanges: () => Map<
    number,
    {
      attempts: number;
      lastError: Error;
      timestamp: number;
    }
  >;
  clearFailedRanges: () => void;
  retryFailedRange: (rangeId: number) => Promise<any[]>;

  // Pagination strategy
  setPaginationStrategy: (strategy: "page" | "offset" | "cursor") => void;
  getPaginationStrategy: () => "page" | "offset" | "cursor";

  // Placeholder system
  analyzeDataStructure: (items: any[]) => void;
  generatePlaceholderItem: (index: number) => any;
  showPlaceholders: (count: number) => void;
  getPlaceholderStructure: () => Map<
    string,
    { min: number; max: number }
  > | null;

  // State
  isInitialized: () => boolean;
  updateLoadedData: (items: any[], offset: number) => void;

  // Initialization
  initialize: () => void;
}

/**
 * Calculate optimal range size based on viewport dimensions
 */
function calculateOptimalRangeSize(
  containerSize: number,
  estimatedItemSize: number,
  overscan: number = 5
): number {
  const itemsInViewport = Math.ceil(containerSize / estimatedItemSize);
  const withOverscan = itemsInViewport + overscan * 2;
  const withPreload = Math.ceil(withOverscan * 1.5);
  return Math.max(10, Math.min(100, withPreload));
}

/**
 * Creates collection management for viewport
 */
export const createCollectionFeature = (
  viewport: ViewportComponent,
  config: CollectionConfig = {}
): CollectionFeature => {
  // Configuration
  const collection = config.collection;
  const maskCharacter =
    config.maskCharacter || VIEWPORT_CONSTANTS.PLACEHOLDER.MASK_CHARACTER;
  const enablePlaceholders = config.enablePlaceholders !== false;

  // Calculate optimal range size
  const containerSize = viewport.element?.offsetHeight || 600;
  const estimatedItemSize = VIEWPORT_CONSTANTS.VIRTUAL_SCROLL.DEFAULT_ITEM_SIZE;
  const overscan = VIEWPORT_CONSTANTS.VIRTUAL_SCROLL.OVERSCAN_BUFFER;
  const rangeSize =
    config.rangeSize ||
    calculateOptimalRangeSize(containerSize, estimatedItemSize, overscan);

  let paginationStrategy: "page" | "offset" | "cursor" =
    config.strategy || "page";

  // State management
  const loadedRanges = new Set<number>();
  const pendingRanges = new Set<number>();
  const failedRanges = new Map<
    number,
    {
      attempts: number;
      lastError: Error;
      timestamp: number;
    }
  >();
  const pendingRangeDetails = new Map<number, { start: number; end: number }>();

  let placeholderStructure: Map<string, { min: number; max: number }> | null =
    null;
  let isCollectionInitialized = false;
  let items: any[] = [];
  let totalItems = 0;

  /**
   * Check if a range overlaps with any pending ranges
   */
  const hasOverlappingPendingRange = (start: number, end: number): boolean => {
    for (const [_, range] of pendingRangeDetails) {
      if (start <= range.end && end >= range.start) {
        return true;
      }
    }
    return false;
  };

  /**
   * Load range of items
   */
  const loadRange = async (offset: number, limit: number): Promise<any[]> => {
    console.log(
      `📥 [COLLECTION] loadRange called: offset=${offset}, limit=${limit}`
    );

    if (!collection) {
      throw new Error("No collection adapter provided");
    }

    const rangeId = Math.floor(offset / rangeSize);
    const rangeEnd = offset + limit - 1;

    // Check if already loaded or pending
    if (
      loadedRanges.has(rangeId) ||
      hasOverlappingPendingRange(offset, rangeEnd)
    ) {
      console.log(`⏭️ [COLLECTION] Range ${rangeId} already loaded or pending`);
      return [];
    }

    pendingRanges.add(rangeId);
    pendingRangeDetails.set(rangeId, { start: offset, end: rangeEnd });

    try {
      let loadedItems: any[] = [];
      let responseMeta: any = {};

      // Load data based on pagination strategy
      console.log(
        `📋 [COLLECTION] Loading with strategy: ${paginationStrategy}`
      );

      switch (paginationStrategy) {
        case "page":
          // For page-based APIs, we need to use a fixed page size
          const pageSize = 20; // Standard API page size
          const page = Math.floor(offset / pageSize) + 1;
          // Don't adjust limit if we don't know total items yet
          const adjustedLimit =
            totalItems > 0 && offset + pageSize >= totalItems
              ? Math.min(pageSize, totalItems - offset)
              : pageSize;

          console.log(
            `📄 [COLLECTION] Loading page ${page} with limit ${adjustedLimit}`
          );

          if (collection.read) {
            const result = await collection.read({
              page,
              limit: adjustedLimit,
            });
            console.log(`📦 [COLLECTION] Read result:`, result);

            if (result.error) {
              throw new Error(result.error.message || "Failed to load data");
            }
            loadedItems = result.items || [];

            // Apply transform if provided
            if (config.transform && loadedItems.length > 0) {
              console.log(
                `✨ [COLLECTION] Transforming ${loadedItems.length} items`
              );
              loadedItems = loadedItems.map(config.transform);
            }

            responseMeta = result.meta || {};
          }
          break;

        case "offset":
          if (collection.read) {
            const result = await collection.read({ offset, limit });
            if (result.error) {
              throw new Error(result.error.message || "Failed to load data");
            }
            loadedItems = result.items || [];

            // Apply transform if provided
            if (config.transform && loadedItems.length > 0) {
              console.log(
                `✨ [COLLECTION] Transforming ${loadedItems.length} items`
              );
              loadedItems = loadedItems.map(config.transform);
            }

            responseMeta = result.meta || {};
          }
          break;

        case "cursor":
          // Cursor-based pagination would need cursor tracking
          throw new Error("Cursor pagination not yet implemented");
      }

      // Update total from API metadata if available
      if (responseMeta.total && responseMeta.total > totalItems) {
        totalItems = responseMeta.total;
        viewport.emit?.("collection:total-changed", { total: totalItems });
      }

      // Analyze structure on first load
      if (
        enablePlaceholders &&
        !placeholderStructure &&
        loadedItems.length > 0
      ) {
        analyzeDataStructure(loadedItems);
      }

      // Update loaded data
      updateLoadedData(loadedItems, offset);

      // Mark range as loaded
      loadedRanges.add(rangeId);
      pendingRanges.delete(rangeId);
      pendingRangeDetails.delete(rangeId);

      viewport.emit?.("collection:range-loaded", {
        range: { start: offset, end: offset + limit - 1 },
        items: loadedItems,
      });

      return loadedItems;
    } catch (error) {
      // Handle failed range
      const failedInfo = failedRanges.get(rangeId) || {
        attempts: 0,
        lastError: error as Error,
        timestamp: Date.now(),
      };
      failedInfo.attempts++;
      failedInfo.lastError = error as Error;
      failedInfo.timestamp = Date.now();
      failedRanges.set(rangeId, failedInfo);

      viewport.emit?.("collection:range-failed", {
        rangeId,
        offset,
        limit,
        error: error as Error,
        attempts: failedInfo.attempts,
      });

      return [];
    } finally {
      pendingRanges.delete(rangeId);
      pendingRangeDetails.delete(rangeId);
    }
  };

  /**
   * Load missing ranges based on visible range
   */
  const loadMissingRanges = async (visibleRange: {
    start: number;
    end: number;
  }): Promise<void> => {
    if (!collection) return;

    // Check concurrent request limit
    if (
      pendingRanges.size >= VIEWPORT_CONSTANTS.LOADING.MAX_CONCURRENT_REQUESTS
    ) {
      return;
    }

    // For page-based APIs, use fixed page size for range calculations
    const pageSize = paginationStrategy === "page" ? 20 : rangeSize;
    const startRange = Math.floor(visibleRange.start / pageSize);
    const endRange = Math.floor(visibleRange.end / pageSize);

    const loadPromises: Promise<any[]>[] = [];
    const maxRangesToLoad = 3;
    let rangesQueued = 0;

    for (
      let range = startRange;
      range <= endRange && rangesQueued < maxRangesToLoad;
      range++
    ) {
      if (!loadedRanges.has(range) && !pendingRanges.has(range)) {
        // Check if this is a failed range and if we should retry
        const failedInfo = failedRanges.get(range);
        if (failedInfo) {
          const timeSinceLastAttempt = Date.now() - failedInfo.timestamp;
          const backoffTime = Math.min(
            1000 * Math.pow(2, failedInfo.attempts - 1),
            30000
          );

          if (timeSinceLastAttempt < backoffTime) {
            continue;
          }
        }

        const offset = range * pageSize;
        loadPromises.push(loadRange(offset, pageSize));
        rangesQueued++;
      }
    }

    // Load ranges concurrently
    await Promise.allSettled(loadPromises);
  };

  /**
   * Analyze data structure for placeholder generation
   */
  const analyzeDataStructure = (sampleItems: any[]): void => {
    if (!sampleItems.length) return;

    const structure = new Map<string, { min: number; max: number }>();
    const sampleSize = Math.min(
      sampleItems.length,
      VIEWPORT_CONSTANTS.PLACEHOLDER.PATTERN_ANALYSIS.SAMPLE_SIZE
    );

    for (let i = 0; i < sampleSize; i++) {
      const item = sampleItems[i];
      if (!item || typeof item !== "object") continue;

      Object.keys(item).forEach((key) => {
        const value = String(item[key] || "");
        const length = value.length;

        if (!structure.has(key)) {
          structure.set(key, { min: length, max: length });
        } else {
          const current = structure.get(key)!;
          structure.set(key, {
            min: Math.min(current.min, length),
            max: Math.max(current.max, length),
          });
        }
      });
    }

    placeholderStructure = structure;
    viewport.emit?.("collection:structure-analyzed", { structure });
  };

  /**
   * Generate placeholder item based on analyzed structure
   */
  const generatePlaceholderItem = (index: number): any => {
    if (!placeholderStructure) {
      return {
        id: `placeholder-${index}`,
        [VIEWPORT_CONSTANTS.PLACEHOLDER.PLACEHOLDER_FLAG]: true,
      };
    }

    const placeholder: Record<string, any> = {
      id: `placeholder-${index}`,
      [VIEWPORT_CONSTANTS.PLACEHOLDER.PLACEHOLDER_FLAG]: true,
    };

    placeholderStructure.forEach((range, key) => {
      if (VIEWPORT_CONSTANTS.PLACEHOLDER.RANDOM_LENGTH_VARIANCE) {
        const length =
          Math.floor(Math.random() * (range.max - range.min + 1)) + range.min;
        placeholder[key] = maskCharacter.repeat(length);
      } else {
        const length = Math.round((range.min + range.max) / 2);
        placeholder[key] = maskCharacter.repeat(length);
      }
    });

    return placeholder;
  };

  /**
   * Show placeholders for a count of items
   */
  const showPlaceholders = (count: number): void => {
    if (!enablePlaceholders) return;

    const placeholderItems: any[] = [];

    for (let i = 0; i < count; i++) {
      const placeholderItem = generatePlaceholderItem(i);
      placeholderItems.push(placeholderItem);

      if (!items[i]) {
        items[i] = placeholderItem;
      }
    }

    viewport.emit?.("collection:placeholders-shown", {
      count,
      items: placeholderItems,
    });
  };

  /**
   * Update loaded data
   */
  const updateLoadedData = (loadedItems: any[], offset: number): void => {
    // Ensure items array is large enough
    while (items.length < offset + loadedItems.length) {
      items.push(null);
    }

    // Replace placeholders with real data
    loadedItems.forEach((item, index) => {
      const targetIndex = offset + index;
      const existingItem = items[targetIndex];
      const wasPlaceholder =
        existingItem &&
        existingItem[VIEWPORT_CONSTANTS.PLACEHOLDER.PLACEHOLDER_FLAG];

      items[targetIndex] = item;

      if (wasPlaceholder) {
        viewport.emit?.("collection:placeholder-replaced", {
          index: targetIndex,
          item,
          previousPlaceholder: existingItem,
        });
      }
    });

    // Update total for small lists
    const currentTotal = totalItems;
    const loadedTotal = offset + loadedItems.length;

    if (currentTotal < 1000 && loadedTotal > currentTotal) {
      totalItems = loadedTotal;
      viewport.emit?.("collection:total-changed", { total: loadedTotal });
    }
  };

  /**
   * Initialize collection on first data load
   */
  const initialize = (): void => {
    if (isCollectionInitialized) return;

    isCollectionInitialized = true;
    viewport.emit?.("collection:initialized", {
      strategy: paginationStrategy,
      rangeSize,
    });

    // Auto-load initial data if collection is provided
    if (collection) {
      console.log(
        "📊 [COLLECTION] Scheduling initial load, rangeSize:",
        rangeSize
      );
      setTimeout(() => {
        console.log("🔄 [COLLECTION] Starting initial load...");
        loadRange(0, rangeSize)
          .then((items) => {
            console.log(
              "✅ [COLLECTION] Initial load complete, items:",
              items.length
            );
          })
          .catch((error) => {
            console.error("❌ [COLLECTION] Initial load failed:", error);
          });
      }, 0);
    }
  };

  // Initialize on first use
  if (collection) {
    console.log("🎯 [COLLECTION] Initializing with adapter:", collection);
    initialize();
  } else {
    // Even without a collection, initialize the feature
    console.log("⚠️ [COLLECTION] No adapter provided, initializing empty");
    isCollectionInitialized = true;
  }

  // Return collection feature API
  return {
    // Data management
    setItems: (newItems: any[]) => {
      items = [...newItems];
      totalItems = newItems.length;

      if (enablePlaceholders && !placeholderStructure && newItems.length > 0) {
        analyzeDataStructure(newItems);
      }

      loadedRanges.clear();
      for (let i = 0; i < newItems.length; i += rangeSize) {
        const rangeId = Math.floor(i / rangeSize);
        loadedRanges.add(rangeId);
      }

      viewport.emit?.("collection:items-set", {
        items: newItems,
        total: newItems.length,
      });
    },
    getItems: () => [...items],
    setTotalItems: (total: number) => {
      totalItems = total;
      viewport.emit?.("collection:total-changed", { total });
    },
    getTotalItems: () => totalItems,

    // Range management
    loadRange,
    loadMissingRanges,
    getLoadedRanges: () => new Set(loadedRanges),
    getPendingRanges: () => new Set(pendingRanges),
    getFailedRanges: () => new Map(failedRanges),
    clearFailedRanges: () => failedRanges.clear(),
    retryFailedRange: (rangeId: number) => {
      if (failedRanges.has(rangeId)) {
        failedRanges.delete(rangeId);
        const offset = rangeId * rangeSize;
        return loadRange(offset, rangeSize);
      }
      return Promise.resolve([]);
    },

    // Pagination strategy
    setPaginationStrategy: (strategy: "page" | "offset" | "cursor") => {
      paginationStrategy = strategy;
      loadedRanges.clear();
      pendingRanges.clear();
      viewport.emit?.("collection:strategy-changed", { strategy });
    },
    getPaginationStrategy: () => paginationStrategy,

    // Placeholder system
    analyzeDataStructure,
    generatePlaceholderItem,
    showPlaceholders,
    getPlaceholderStructure: () =>
      placeholderStructure ? new Map(placeholderStructure) : null,

    // State
    isInitialized: () => isCollectionInitialized,
    updateLoadedData,

    // Initialization
    initialize,
  };
};
