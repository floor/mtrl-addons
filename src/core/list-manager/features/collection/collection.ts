/**
 * Collection Feature - Data Management Enhancer
 * Handles speed tracking, range loading, collection integration, and placeholders
 */

import type {
  ListManagerComponent,
  ItemRange,
  SpeedTracker,
} from "../../types";
import { LIST_MANAGER_CONSTANTS, PLACEHOLDER } from "../../constants";

/**
 * Configuration for collection enhancer
 */
export interface CollectionConfig {
  collection?: any; // Collection adapter
  rangeSize?: number;
  strategy?: "page" | "offset" | "cursor";
  fastThreshold?: number;
  slowThreshold?: number;
  maskCharacter?: string;
  enablePlaceholders?: boolean;
}

/**
 * Component interface after collection enhancement
 */
export interface CollectionComponent {
  collection: {
    // Data management
    setItems(items: any[]): void;
    getItems(): any[];
    setTotalItems(total: number): void;
    getTotalItems(): number;

    // Range management
    loadRange(offset: number, limit: number): Promise<any[]>;
    loadMissingRanges(visibleRange: ItemRange): Promise<void>;
    getLoadedRanges(): Set<number>;
    getPendingRanges(): Set<number>;

    // Speed tracking
    handleSpeedChange(speed: number): void;
    getSpeedTracker(): SpeedTracker;

    // Pagination strategy
    setPaginationStrategy(strategy: "page" | "offset" | "cursor"): void;
    getPaginationStrategy(): "page" | "offset" | "cursor";

    // Placeholder system
    analyzeDataStructure(items: any[]): void;
    generatePlaceholderItem(index: number): any;
    showPlaceholders(range: ItemRange): void;
    getPlaceholderStructure(): Map<string, { min: number; max: number }> | null;

    // State
    isInitialized(): boolean;
    updateLoadedData(items: any[], offset: number): void;
  };
}

/**
 * Adds collection functionality to a List Manager component
 *
 * @param config - Collection configuration
 * @returns Function that enhances a component with collection capabilities
 */
export const withCollection =
  (config: CollectionConfig = {}) =>
  <T extends ListManagerComponent>(component: T): T & CollectionComponent => {
    // Configuration with defaults
    const collection = config.collection;
    const rangeSize =
      config.rangeSize ||
      LIST_MANAGER_CONSTANTS.RANGE_LOADING.DEFAULT_RANGE_SIZE;
    let paginationStrategy: "page" | "offset" | "cursor" =
      config.strategy || "page";
    const fastThreshold =
      config.fastThreshold ||
      LIST_MANAGER_CONSTANTS.SPEED_TRACKING.FAST_SCROLL_THRESHOLD;
    const slowThreshold =
      config.slowThreshold ||
      LIST_MANAGER_CONSTANTS.SPEED_TRACKING.SLOW_SCROLL_THRESHOLD;
    const maskCharacter =
      config.maskCharacter || LIST_MANAGER_CONSTANTS.PLACEHOLDER.MASK_CHARACTER;
    const enablePlaceholders = config.enablePlaceholders !== false;

    // Speed tracking state
    let speedTracker: SpeedTracker = {
      velocity: 0,
      direction: "forward",
      isAccelerating: false,
      lastMeasurement: Date.now(),
    };

    // Range management
    const loadedRanges = new Set<number>();
    const pendingRanges = new Set<number>();

    // Placeholder system
    let placeholderStructure: Map<string, { min: number; max: number }> | null =
      null;
    let placeholderTemplate:
      | ((item: any, index: number) => string | HTMLElement)
      | null = null;

    // State
    let isCollectionInitialized = false;
    let lastSpeedMeasurement = Date.now();
    let speedHistory: number[] = [];

    /**
     * Initialize collection
     */
    const initialize = (): void => {
      if (isCollectionInitialized) return;

      // Set template if provided
      if (component.template) {
        placeholderTemplate = component.template;
      }

      isCollectionInitialized = true;
      component.emit?.("collection:initialized", {
        strategy: paginationStrategy,
        rangeSize,
      });

      // 🔥 AUTO-LOAD INITIAL DATA
      if (collection) {
        // Load initial range on next tick to ensure all enhancers are ready
        setTimeout(() => {
          console.log(
            `🚀 [COLLECTION] Auto-loading initial data (strategy: ${paginationStrategy})`
          );
          loadRange(0, rangeSize).catch((error) => {
            console.error("❌ [COLLECTION] Initial load failed:", error);
          });
        }, 0);
      }
    };

    /**
     * Destroy collection
     */
    const destroy = (): void => {
      if (!isCollectionInitialized) return;

      loadedRanges.clear();
      pendingRanges.clear();
      placeholderStructure = null;
      speedHistory = [];

      isCollectionInitialized = false;
      component.emit?.("collection:destroyed", {});
    };

    /**
     * Handle speed changes for loading optimization
     */
    const handleSpeedChange = (speed: number): void => {
      const now = Date.now();
      const timeDelta = now - lastSpeedMeasurement;

      // Update speed tracker
      const previousVelocity = speedTracker.velocity;
      speedTracker.velocity = Math.abs(speed);
      speedTracker.direction = speed > 0 ? "forward" : "backward";
      speedTracker.isAccelerating = speedTracker.velocity > previousVelocity;
      speedTracker.lastMeasurement = now;

      // Track speed history for smoothing
      speedHistory.push(speedTracker.velocity);
      if (speedHistory.length > 10) {
        speedHistory.shift(); // Keep last 10 measurements
      }

      // Calculate smoothed speed
      const smoothedSpeed =
        speedHistory.reduce((sum, s) => sum + s, 0) / speedHistory.length;

      lastSpeedMeasurement = now;

      // Speed-based loading decisions
      if (smoothedSpeed > fastThreshold) {
        // Fast scrolling - show placeholders, defer loading
        handleFastScrolling();
      } else if (smoothedSpeed < slowThreshold) {
        // Slow scrolling - load immediately
        handleSlowScrolling();
      }

      component.emit?.("speed:changed", {
        speed: smoothedSpeed,
        direction: speedTracker.direction,
        isAccelerating: speedTracker.isAccelerating,
      });
    };

    /**
     * Load range of items
     */
    const loadRange = async (offset: number, limit: number): Promise<any[]> => {
      if (!collection) {
        throw new Error("No collection adapter provided");
      }

      const rangeId = Math.floor(offset / rangeSize);

      if (pendingRanges.has(rangeId)) {
        // Already loading this range
        return [];
      }

      pendingRanges.add(rangeId);

      try {
        let items: any[];
        let responseMeta: any = {};

        // Adapt to different pagination strategies
        switch (paginationStrategy) {
          case "page":
            const page = Math.floor(offset / limit) + 1;
            // Adapt generic read method to page-based strategy
            if (collection.loadPage) {
              items = await collection.loadPage({ page, limit });
            } else if (collection.read) {
              const result = await collection.read({ page, limit });
              items = result.items || [];
              responseMeta = result.meta || {};
            } else {
              throw new Error(
                "Collection adapter missing loadPage or read method"
              );
            }
            break;

          case "offset":
            if (collection.loadRange) {
              items = await collection.loadRange({ offset, limit });
            } else if (collection.read) {
              const result = await collection.read({ offset, limit });
              items = result.items || [];
              responseMeta = result.meta || {};
            } else {
              throw new Error(
                "Collection adapter missing loadRange or read method"
              );
            }
            break;

          case "cursor":
            // For cursor-based, we need to track the cursor
            if (collection.loadWithCursor) {
              items = await collection.loadWithCursor({
                limit,
                cursor: getCursorForOffset(offset),
              });
            } else if (collection.read) {
              const result = await collection.read({
                cursor: getCursorForOffset(offset),
                limit,
              });
              items = result.items || [];
              responseMeta = result.meta || {};
            } else {
              throw new Error(
                "Collection adapter missing loadWithCursor or read method"
              );
            }
            break;

          default:
            throw new Error(
              `Unsupported pagination strategy: ${paginationStrategy}`
            );
        }

        // Set total items from API metadata if available (for massive lists)
        if (responseMeta.total && responseMeta.total > component.totalItems) {
          const newTotal = responseMeta.total;
          component.totalItems = newTotal;
          console.log(
            `📊 [COLLECTION] Updated total items from API metadata: ${newTotal.toLocaleString()}`
          );
          component.emit?.("total:changed", { total: newTotal });

          // Trigger viewport to recalculate total virtual size for massive lists
          if ((component as any).viewport?.updateViewport) {
            (component as any).viewport.updateViewport();
          }
        }

        // Analyze structure on first load
        if (enablePlaceholders && !placeholderStructure && items.length > 0) {
          analyzeDataStructure(items);
        }

        // Update loaded data
        updateLoadedData(items, offset);
        loadedRanges.add(rangeId);

        component.emit?.("range:loaded", {
          range: { start: offset, end: offset + items.length - 1 },
          items,
          strategy: paginationStrategy,
        });

        return items;
      } catch (error) {
        component.emit?.("error:occurred", {
          error: error as Error,
          context: `loading-range-${offset}-${limit}`,
          strategy: paginationStrategy,
        });

        throw error;
      } finally {
        pendingRanges.delete(rangeId);
      }
    };

    /**
     * Load missing ranges based on visible range
     */
    const loadMissingRanges = async (
      visibleRange: ItemRange
    ): Promise<void> => {
      if (!collection) return;

      const startRange = Math.floor(visibleRange.start / rangeSize);
      const endRange = Math.floor(visibleRange.end / rangeSize);

      const loadPromises: Promise<any[]>[] = [];

      for (let range = startRange; range <= endRange; range++) {
        if (!loadedRanges.has(range) && !pendingRanges.has(range)) {
          const offset = range * rangeSize;
          loadPromises.push(loadRange(offset, rangeSize));
        }
      }

      // Load ranges concurrently but respect max concurrent requests
      const maxConcurrent =
        LIST_MANAGER_CONSTANTS.RANGE_LOADING.MAX_CONCURRENT_REQUESTS;
      for (let i = 0; i < loadPromises.length; i += maxConcurrent) {
        const batch = loadPromises.slice(i, i + maxConcurrent);
        await Promise.allSettled(batch);
      }

      component.emit?.("loading:triggered", {
        range: visibleRange,
        strategy: paginationStrategy,
        rangesLoaded: endRange - startRange + 1,
      });
    };

    /**
     * Analyze data structure for placeholder generation
     */
    const analyzeDataStructure = (items: any[]): void => {
      if (!items.length) return;

      const structure = new Map<string, { min: number; max: number }>();

      // Analyze sample of items to find length patterns
      const sampleSize = Math.min(
        items.length,
        PLACEHOLDER.PATTERN_ANALYSIS.SAMPLE_SIZE
      );

      for (let i = 0; i < sampleSize; i++) {
        const item = items[i];
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
      component.emit?.("structure:analyzed", { structure });
    };

    /**
     * Generate placeholder item based on analyzed structure
     */
    const generatePlaceholderItem = (index: number): any => {
      if (!placeholderStructure) {
        // Fallback placeholder
        return {
          id: `placeholder-${index}`,
          [PLACEHOLDER.PLACEHOLDER_FLAG]: true,
        };
      }

      const placeholder: Record<string, any> = {
        id: `placeholder-${index}`,
        [PLACEHOLDER.PLACEHOLDER_FLAG]: true,
      };

      // Generate masked values with random lengths within detected ranges
      placeholderStructure.forEach((range, key) => {
        if (LIST_MANAGER_CONSTANTS.PLACEHOLDER.RANDOM_LENGTH_VARIANCE) {
          const length =
            Math.floor(Math.random() * (range.max - range.min + 1)) + range.min;
          placeholder[key] = maskCharacter.repeat(length);
        } else {
          // Use average length
          const length = Math.round((range.min + range.max) / 2);
          placeholder[key] = maskCharacter.repeat(length);
        }
      });

      return placeholder;
    };

    /**
     * Show placeholders for a range
     */
    const showPlaceholders = (range: ItemRange): void => {
      if (!enablePlaceholders) return;

      const placeholderItems: any[] = [];

      for (let i = range.start; i <= range.end; i++) {
        const placeholderItem = generatePlaceholderItem(i);
        placeholderItems.push(placeholderItem);

        // Add to component items array if not already present
        if (!component.items[i]) {
          component.items[i] = placeholderItem;
        }
      }

      component.emit?.("placeholders:shown", {
        range,
        items: placeholderItems,
        count: placeholderItems.length,
      });
    };

    /**
     * Update loaded data in component
     */
    const updateLoadedData = (items: any[], offset: number): void => {
      console.log(
        `📥 [COLLECTION] updateLoadedData() called with ${items.length} items, offset: ${offset}`
      );
      console.log(
        `📥 [COLLECTION] component.items.length before:`,
        component.items.length
      );
      console.log(
        `📥 [COLLECTION] component.totalItems before:`,
        component.totalItems
      );

      // Ensure items array is large enough
      while (component.items.length < offset + items.length) {
        component.items.push(null);
      }

      console.log(
        `📥 [COLLECTION] component.items.length after padding:`,
        component.items.length
      );

      // Replace placeholders with real data
      items.forEach((item, index) => {
        const targetIndex = offset + index;
        const existingItem = component.items[targetIndex];

        // Check if replacing a placeholder
        const wasPlaceholder =
          existingItem && existingItem[PLACEHOLDER.PLACEHOLDER_FLAG];

        console.log(
          `📥 [COLLECTION] Setting item at index ${targetIndex}:`,
          item ? "exists" : "null/undefined"
        );
        component.items[targetIndex] = item;

        if (wasPlaceholder) {
          component.emit?.("placeholders:replaced", {
            index: targetIndex,
            item,
            previousPlaceholder: existingItem,
          });
        }
      });

      console.log(
        `📥 [COLLECTION] component.items.length after update:`,
        component.items.length
      );
      console.log(
        `📥 [COLLECTION] First few items:`,
        component.items.slice(0, 3)
      );

      // Only update total items if we don't have a large total from API metadata
      // This prevents overriding the massive list total (1,000,000) with loaded items count (20)
      const currentTotal = component.totalItems;
      const loadedTotal = offset + items.length;

      if (currentTotal < 1000 && loadedTotal > currentTotal) {
        // Only update for small lists where we're building the total incrementally
        component.totalItems = loadedTotal;
        component.emit?.("total:changed", { total: loadedTotal });
        console.log(
          `📊 [COLLECTION] Updated total items incrementally: ${loadedTotal}`
        );
      }
    };

    /**
     * Handle fast scrolling behavior
     */
    const handleFastScrolling = (): void => {
      // Get current visible range from viewport if available
      const visibleRange = (component as any).viewport?.getVisibleRange?.() || {
        start: 0,
        end: 10,
      };

      // Show placeholders immediately
      showPlaceholders(visibleRange);

      // Defer actual loading slightly to avoid spam
      setTimeout(() => {
        if (speedTracker.velocity < fastThreshold) {
          // Speed has decreased, now load the data
          loadMissingRanges(visibleRange);
        }
      }, LIST_MANAGER_CONSTANTS.PERFORMANCE.DEBOUNCE_LOADING);
    };

    /**
     * Handle slow scrolling behavior
     */
    const handleSlowScrolling = (): void => {
      // Get current visible range from viewport if available
      const visibleRange = (component as any).viewport?.getVisibleRange?.() || {
        start: 0,
        end: 10,
      };

      // Load immediately for reading/browsing behavior
      loadMissingRanges(visibleRange);
    };

    /**
     * Get cursor for offset (cursor pagination strategy)
     */
    const getCursorForOffset = (offset: number): string | undefined => {
      // This would need to be implemented based on the specific cursor strategy
      // For now, return undefined to load from beginning
      return undefined;
    };

    /**
     * Set items directly
     */
    const setItems = (items: any[]): void => {
      component.items = [...items];
      component.totalItems = items.length;

      // Analyze structure if enabled and not already done
      if (enablePlaceholders && !placeholderStructure && items.length > 0) {
        analyzeDataStructure(items);
      }

      // Mark all items as loaded
      loadedRanges.clear();
      for (let i = 0; i < items.length; i += rangeSize) {
        const rangeId = Math.floor(i / rangeSize);
        loadedRanges.add(rangeId);
      }

      component.emit?.("items:set", { items, total: items.length });
    };

    /**
     * Set total items count
     */
    const setTotalItems = (total: number): void => {
      component.totalItems = total;
      component.emit?.("total:changed", { total });
    };

    // Initialize collection when component initializes
    const originalInitialize = component.initialize;
    component.initialize = () => {
      originalInitialize.call(component);
      initialize();
    };

    // Destroy collection when component destroys
    const originalDestroy = component.destroy;
    component.destroy = () => {
      destroy();
      originalDestroy.call(component);
    };

    // Collection API
    const collectionManager = {
      // Data management
      setItems,
      getItems: () => [...component.items],
      setTotalItems,
      getTotalItems: () => component.totalItems,

      // Range management
      loadRange,
      loadMissingRanges,
      getLoadedRanges: () => new Set(loadedRanges),
      getPendingRanges: () => new Set(pendingRanges),

      // Speed tracking
      handleSpeedChange,
      getSpeedTracker: () => ({ ...speedTracker }),

      // Pagination strategy
      setPaginationStrategy: (strategy: "page" | "offset" | "cursor") => {
        paginationStrategy = strategy;
        // Reset loaded ranges when strategy changes
        loadedRanges.clear();
        pendingRanges.clear();
        component.emit?.("strategy:changed", { strategy });
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
    };

    return {
      ...component,
      collection: collectionManager,
    };
  };
