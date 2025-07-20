// src/core/viewport/features/collection.ts

/**
 * Collection Feature - Data management and range loading
 * Handles collection integration, pagination, and data fetching
 */

import type { ViewportContext } from "../types";
import type { VirtualComponent } from "./virtual";
import { VIEWPORT_CONSTANTS } from "../constants";

export interface CollectionConfig {
  collection?: any; // Collection adapter
  rangeSize?: number;
  strategy?: "page" | "offset" | "cursor";
  transform?: (item: any) => any;
}

export interface CollectionComponent {
  collection: {
    loadRange: (offset: number, limit: number) => Promise<any[]>;
    loadMissingRanges: (range: { start: number; end: number }) => Promise<void>;
    getLoadedRanges: () => Set<number>;
    getPendingRanges: () => Set<number>;
    clearFailedRanges: () => void;
    retryFailedRange: (rangeId: number) => Promise<any[]>;
    setTotalItems: (total: number) => void;
    getTotalItems: () => number;
  };
}

/**
 * Adds collection functionality to viewport component
 */
export function withCollection(config: CollectionConfig = {}) {
  return <T extends ViewportContext & VirtualComponent>(
    component: T
  ): T & CollectionComponent => {
    const {
      collection,
      rangeSize = VIEWPORT_CONSTANTS.LOADING.DEFAULT_RANGE_SIZE,
      strategy = "offset",
      transform,
    } = config;

    // State
    let items: any[] = [];
    let totalItems = 0;
    let loadedRanges = new Set<number>();
    let pendingRanges = new Set<number>();
    let failedRanges = new Map<
      number,
      {
        attempts: number;
        lastError: Error;
        timestamp: number;
      }
    >();
    let activeRequests = new Map<number, Promise<any[]>>();

    /**
     * Calculate range ID based on offset and limit
     */
    const getRangeId = (offset: number, limit: number): number => {
      return Math.floor(offset / limit);
    };

    /**
     * Transform items if transform function provided
     */
    const transformItems = (rawItems: any[]): any[] => {
      if (!transform) return rawItems;
      return rawItems.map(transform);
    };

    /**
     * Load a range of data
     */
    const loadRange = async (offset: number, limit: number): Promise<any[]> => {
      if (!collection) {
        console.warn("[Collection] No collection adapter configured");
        return [];
      }

      const rangeId = getRangeId(offset, limit);

      // Check if already loaded
      if (loadedRanges.has(rangeId)) {
        return items.slice(offset, offset + limit);
      }

      // Check if already pending
      if (pendingRanges.has(rangeId)) {
        const existingRequest = activeRequests.get(rangeId);
        if (existingRequest) {
          return existingRequest;
        }
      }

      // Mark as pending
      pendingRanges.add(rangeId);

      // Create request promise
      const requestPromise = (async () => {
        try {
          // Call collection adapter
          const params =
            strategy === "page"
              ? { page: Math.floor(offset / limit) + 1, pageSize: limit }
              : { offset, limit };

          // Support both find and read methods
          const response = await (collection.find || collection.read)?.(params);

          // Extract items and total
          const rawItems = response.data || response.items || response;
          const newTotal =
            response.meta?.total ||
            response.total ||
            response.totalCount ||
            totalItems;

          // Transform items
          const transformedItems = transformItems(rawItems);

          // Update state
          if (newTotal !== totalItems) {
            setTotalItems(newTotal);
          }

          // Merge items into array
          for (let i = 0; i < transformedItems.length; i++) {
            items[offset + i] = transformedItems[i];
          }

          // Mark as loaded
          loadedRanges.add(rangeId);
          pendingRanges.delete(rangeId);
          failedRanges.delete(rangeId);

          // Emit event
          component.emit?.("viewport:range-loaded", {
            offset,
            limit,
            items: transformedItems,
            total: newTotal,
          });

          return transformedItems;
        } catch (error) {
          // Handle error
          pendingRanges.delete(rangeId);

          const attempts = (failedRanges.get(rangeId)?.attempts || 0) + 1;
          failedRanges.set(rangeId, {
            attempts,
            lastError: error as Error,
            timestamp: Date.now(),
          });

          // Emit error event
          component.emit?.("viewport:range-error", {
            offset,
            limit,
            error,
            attempts,
          });

          throw error;
        } finally {
          activeRequests.delete(rangeId);
        }
      })();

      activeRequests.set(rangeId, requestPromise);
      return requestPromise;
    };

    /**
     * Load missing ranges in visible area
     */
    const loadMissingRanges = async (range: {
      start: number;
      end: number;
    }): Promise<void> => {
      if (!collection) return;

      // Calculate range boundaries
      const startRange = Math.floor(range.start / rangeSize);
      const endRange = Math.floor(range.end / rangeSize);

      const promises: Promise<any[]>[] = [];

      for (let rangeId = startRange; rangeId <= endRange; rangeId++) {
        if (!loadedRanges.has(rangeId) && !pendingRanges.has(rangeId)) {
          const offset = rangeId * rangeSize;
          promises.push(loadRange(offset, rangeSize));
        }
      }

      if (promises.length > 0) {
        await Promise.allSettled(promises);
      }
    };

    /**
     * Retry a failed range
     */
    const retryFailedRange = async (rangeId: number): Promise<any[]> => {
      failedRanges.delete(rangeId);
      const offset = rangeId * rangeSize;
      return loadRange(offset, rangeSize);
    };

    /**
     * Set total items and update virtual size
     */
    const setTotalItems = (total: number): void => {
      totalItems = total;

      // Update virtual size
      component.virtual?.updateTotalVirtualSize(total);

      // Update component items array
      if (items.length !== total) {
        const newItems = new Array(total);
        for (let i = 0; i < Math.min(items.length, total); i++) {
          if (items[i] !== undefined) {
            newItems[i] = items[i];
          }
        }
        items = newItems;
        component.items = items;
      }

      // Emit event
      component.emit?.("viewport:total-items-changed", { total });
    };

    // Initialize function
    const initialize = () => {
      // Set initial items
      component.items = items;
      component.totalItems = totalItems;

      // Listen for scroll events to load data
      component.on?.("viewport:scroll", async (data: any) => {
        if (!component.virtual) return;

        const visibleRange = component.virtual.calculateVisibleRange(
          data.position
        );
        await loadMissingRanges(visibleRange);
      });

      // Listen for render complete to check for missing data
      component.on?.("viewport:render-complete", async (data: any) => {
        await loadMissingRanges(data.range);
      });

      // Trigger initial load if collection is available
      if (collection && rangeSize > 0) {
        // Load first range
        setTimeout(() => {
          loadRange(0, rangeSize).catch((error) => {
            console.error("[Collection] Initial load failed:", error);
          });
        }, 0);
      }
    };

    // Cleanup function
    const destroy = () => {
      // Cancel pending requests
      activeRequests.clear();
      pendingRanges.clear();
    };

    // Store functions for viewport to call
    (component as any)._collectionInitialize = initialize;
    (component as any)._collectionDestroy = destroy;

    // Return enhanced component
    return {
      ...component,
      collection: {
        loadRange,
        loadMissingRanges,
        getLoadedRanges: () => loadedRanges,
        getPendingRanges: () => pendingRanges,
        clearFailedRanges: () => failedRanges.clear(),
        retryFailedRange,
        setTotalItems,
        getTotalItems: () => totalItems,
      },
    };
  };
}
