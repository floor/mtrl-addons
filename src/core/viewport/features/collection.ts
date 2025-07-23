// src/core/viewport/features/collection.ts

/**
 * Collection Feature - Data management and range loading
 * Handles collection integration, pagination, and data fetching
 */

import type { ViewportContext, ViewportComponent } from "../types";
import { VIEWPORT_CONSTANTS } from "../constants";

export interface CollectionConfig {
  collection?: any; // Collection adapter
  strategy?: "offset" | "page";
  rangeSize?: number;
  transform?: (item: any) => any;
  // Loading manager settings
  cancelLoadThreshold?: number; // Velocity (px/ms) above which loads are cancelled
  maxConcurrentRequests?: number;
  enableRequestQueue?: boolean;
  maxQueueSize?: number;
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
  return <T extends ViewportContext & ViewportComponent>(
    component: T
  ): T & CollectionComponent => {
    const {
      collection,
      rangeSize = VIEWPORT_CONSTANTS.LOADING.DEFAULT_RANGE_SIZE,
      strategy = "offset",
      transform,
      cancelLoadThreshold = VIEWPORT_CONSTANTS.LOADING.CANCEL_THRESHOLD,
      maxConcurrentRequests = VIEWPORT_CONSTANTS.LOADING
        .MAX_CONCURRENT_REQUESTS,
      enableRequestQueue = VIEWPORT_CONSTANTS.REQUEST_QUEUE.ENABLED,
      maxQueueSize = VIEWPORT_CONSTANTS.REQUEST_QUEUE.MAX_QUEUE_SIZE,
    } = config;

    // console.log("[Viewport Collection] Initialized with strategy:", strategy);

    // Loading manager state
    interface QueuedRequest {
      range: { start: number; end: number };
      priority: "high" | "normal" | "low";
      timestamp: number;
      resolve: () => void;
      reject: (error: any) => void;
    }

    let currentVelocity = 0;
    let activeLoadCount = 0;
    const activeLoadRanges = new Set<string>();
    const loadRequestQueue: QueuedRequest[] = [];
    let completedLoads = 0;
    let failedLoads = 0;
    let cancelledLoads = 0;

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

    // Share items array with component
    component.items = items;

    /**
     * Get a unique ID for a range based on offset and the base range size
     */
    const getRangeId = (offset: number, limit: number): number => {
      // Always use the base rangeSize for consistent IDs
      // This ensures merged ranges can be tracked properly
      return Math.floor(offset / rangeSize);
    };

    // Loading manager helpers
    const getRangeKey = (range: { start: number; end: number }): string => {
      return `${range.start}-${range.end}`;
    };

    const canLoad = (): boolean => {
      return currentVelocity <= cancelLoadThreshold;
    };

    const processQueue = () => {
      if (!enableRequestQueue || loadRequestQueue.length === 0) return;

      // Sort queue by priority and timestamp
      loadRequestQueue.sort((a, b) => {
        const priorityOrder = { high: 0, normal: 1, low: 2 };
        const priorityDiff =
          priorityOrder[a.priority] - priorityOrder[b.priority];
        return priorityDiff !== 0 ? priorityDiff : a.timestamp - b.timestamp;
      });

      // Process requests up to capacity
      while (
        loadRequestQueue.length > 0 &&
        activeLoadCount < maxConcurrentRequests
      ) {
        const request = loadRequestQueue.shift();
        if (request) {
          executeQueuedLoad(request);
        }
      }
    };

    const executeQueuedLoad = (request: QueuedRequest) => {
      activeLoadCount++;
      activeLoadRanges.add(getRangeKey(request.range));

      // console.log(
      //   `[LoadingManager] Executing load for range ${request.range.start}-${
      //     request.range.end
      //   } (velocity: ${currentVelocity.toFixed(2)})`
      // );

      // Call the actual loadMissingRanges function
      loadMissingRangesInternal(request.range)
        .then(() => {
          request.resolve();
          completedLoads++;
        })
        .catch((error: Error) => {
          request.reject(error);
          failedLoads++;
        })
        .finally(() => {
          activeLoadCount--;
          activeLoadRanges.delete(getRangeKey(request.range));
          processQueue();
        });
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
      console.log(
        `[Collection] loadRange called: offset=${offset}, limit=${limit}`
      );

      if (!collection) {
        console.warn("[Collection] No collection adapter configured");
        return [];
      }

      const rangeId = getRangeId(offset, limit);
      console.log(`[Collection] Range ID: ${rangeId}`);

      // Check if already loaded
      if (loadedRanges.has(rangeId)) {
        console.log(
          `[Collection] Range ${rangeId} already loaded, returning cached data`
        );
        return items.slice(offset, offset + limit);
      }

      // Check if already pending
      if (pendingRanges.has(rangeId)) {
        console.log(`[Collection] Range ${rangeId} already pending`);
        const existingRequest = activeRequests.get(rangeId);
        if (existingRequest) {
          console.log(
            `[Collection] Returning existing request for range ${rangeId}`
          );
          return existingRequest;
        }
      }

      // Mark as pending
      console.log(
        `[Collection] Marking range ${rangeId} as pending and loading...`
      );
      pendingRanges.add(rangeId);

      // // Check if this range overlaps with the current visible range
      // // If so, trigger a render to show placeholders
      // We use this to fix the placeholders issue. But it is not necessary.
      // const viewportState = (component.viewport as any).state;
      // if (viewportState && viewportState.visibleRange) {
      //   const visibleRange = viewportState.visibleRange;
      //   const requestedStart = offset;
      //   const requestedEnd = offset + limit - 1;

      //   // Check if requested range overlaps with visible range
      //   if (
      //     requestedStart <= visibleRange.end &&
      //     requestedEnd >= visibleRange.start
      //   ) {
      //     console.log(
      //       `[Collection] Requested range ${requestedStart}-${requestedEnd} overlaps with visible range, triggering render`
      //     );
      //     // Trigger viewport render to show placeholders
      //     component.viewport.renderItems?.();
      //   }
      // }

      // Create request promise
      const requestPromise = (async () => {
        try {
          // Call collection adapter with appropriate parameters
          const page = Math.floor(offset / limit) + 1;
          const params =
            strategy === "page" ? { page, limit: limit } : { offset, limit };

          // console.log(
          //   `[Viewport Collection] Loading range offset=${offset}, limit=${limit}, strategy=${strategy}, calculated page=${page}, params:`,
          //   JSON.stringify(params)
          // );

          const response = await collection.read(params);

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

          // Update component items reference
          component.items = items;

          // Emit items changed event
          component.emit?.("viewport:items-changed", {
            totalItems: newTotal,
            loadedCount: items.filter((item) => item !== undefined).length,
          });

          // Update viewport state
          const viewportState = (component.viewport as any).state;
          if (viewportState) {
            viewportState.totalItems = newTotal || items.length;
          }

          // Mark as loaded
          loadedRanges.add(rangeId);
          pendingRanges.delete(rangeId);
          failedRanges.delete(rangeId);

          console.log(
            `[Collection] Range ${rangeId} loaded successfully with ${transformedItems.length} items`
          );

          // Emit events
          component.emit?.("viewport:range-loaded", {
            offset,
            limit,
            items: transformedItems,
            total: newTotal,
          });

          // Emit collection loaded event with more details
          component.emit?.("collection:range-loaded", {
            offset,
            limit,
            items: transformedItems,
            total: newTotal,
            rangeId,
            itemsInMemory: items.filter((item) => item !== undefined).length,
          });

          // Trigger viewport update
          component.viewport?.updateViewport?.();

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
     * Load missing ranges from collection
     */
    const loadMissingRangesInternal = async (range: {
      start: number;
      end: number;
    }): Promise<void> => {
      if (!collection) return;

      // Calculate range boundaries
      const startRange = Math.floor(range.start / rangeSize);
      const endRange = Math.floor(range.end / rangeSize);

      // Collect ranges that need loading
      const rangesToLoad: number[] = [];
      for (let rangeId = startRange; rangeId <= endRange; rangeId++) {
        if (!loadedRanges.has(rangeId) && !pendingRanges.has(rangeId)) {
          rangesToLoad.push(rangeId);
        }
      }

      if (rangesToLoad.length === 0) return;

      // Check if we can merge consecutive ranges for page strategy
      const shouldMerge =
        strategy === "page" &&
        rangesToLoad.length > 1 &&
        rangesToLoad.every((r, i) => i === 0 || r === rangesToLoad[i - 1] + 1);

      if (shouldMerge) {
        // Merge into a single request
        const offset = rangesToLoad[0] * rangeSize;
        const limit = rangesToLoad.length * rangeSize;

        // console.log(
        //   `[Collection] Merging ${rangesToLoad.length} consecutive ranges:`,
        //   `${rangesToLoad[0]}-${
        //     rangesToLoad[rangesToLoad.length - 1]
        //   }, limit=${limit}`
        // );

        // Mark as pending and load
        rangesToLoad.forEach((id) => pendingRanges.add(id));

        try {
          await loadRange(offset, limit);
          rangesToLoad.forEach((id) => {
            loadedRanges.add(id);
            pendingRanges.delete(id);
          });
        } catch (error) {
          rangesToLoad.forEach((id) => {
            pendingRanges.delete(id);
            failedRanges.set(id, {
              attempts: 1,
              lastError:
                error instanceof Error ? error : new Error(String(error)),
              timestamp: Date.now(),
            });
          });
          throw error;
        }
      } else {
        // Load ranges individually
        const promises = rangesToLoad.map((rangeId) =>
          loadRange(rangeId * rangeSize, rangeSize)
        );
        await Promise.allSettled(promises);
      }
    };

    /**
     * Velocity-aware wrapper for loadMissingRanges
     */
    const loadMissingRanges = (range: {
      start: number;
      end: number;
    }): Promise<void> => {
      return new Promise((resolve, reject) => {
        const rangeKey = getRangeKey(range);

        // Check if already loading
        if (activeLoadRanges.has(rangeKey)) {
          resolve();
          return;
        }

        // Check velocity - if too high, cancel the request entirely
        if (!canLoad()) {
          // console.log(
          //   `[LoadingManager] Load cancelled - velocity ${currentVelocity.toFixed(
          //     2
          //   )} exceeds threshold ${cancelLoadThreshold}`
          // );
          cancelledLoads++;
          resolve();
          return;
        }

        // Check capacity
        if (activeLoadCount < maxConcurrentRequests) {
          // Execute immediately
          executeQueuedLoad({
            range,
            priority: "normal",
            timestamp: Date.now(),
            resolve,
            reject,
          });
        } else if (
          enableRequestQueue &&
          loadRequestQueue.length < maxQueueSize
        ) {
          // Queue the request
          loadRequestQueue.push({
            range,
            priority: "normal",
            timestamp: Date.now(),
            resolve,
            reject,
          });
          // console.log(
          //   `[LoadingManager] Queued request (at capacity), queue size: ${loadRequestQueue.length}`
          // );
        } else {
          // Queue overflow - resolve to avoid errors
          if (loadRequestQueue.length >= maxQueueSize) {
            const removed = loadRequestQueue.splice(
              0,
              loadRequestQueue.length - maxQueueSize
            );
            removed.forEach((r) => {
              cancelledLoads++;
              r.resolve();
            });
          }
          resolve();
        }
      });
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
     * Set total items count
     */
    const setTotalItems = (total: number): void => {
      totalItems = total;
      component.emit?.("viewport:total-items-changed", { total });
    };

    // Hook into viewport initialization
    const originalInitialize = component.viewport.initialize;
    component.viewport.initialize = () => {
      originalInitialize();

      // Set initial total if provided
      if (component.totalItems) {
        totalItems = component.totalItems;
      }

      // Subscribe to events
      component.on?.("viewport:range-changed", async (data: any) => {
        // Don't load during fast scrolling - loadMissingRanges will handle velocity check

        // Check velocity before attempting to load
        const viewportState = (component.viewport as any).state;
        const velocity = Math.abs(viewportState?.velocity || 0);
        if (velocity > 1) {
          // Using same threshold as loading manager
          return;
        }

        if (data.range) {
          await loadMissingRanges(data.range);
        }
      });

      // Listen for velocity changes
      component.on?.("viewport:velocity-changed", (data: any) => {
        const previousVelocity = currentVelocity;
        currentVelocity = Math.abs(data.velocity || 0);

        // When velocity drops below threshold, process queue
        if (
          previousVelocity > cancelLoadThreshold &&
          currentVelocity <= cancelLoadThreshold
        ) {
          processQueue();
        }
      });

      // Listen for idle state to process queue
      component.on?.("viewport:idle", async (data: any) => {
        currentVelocity = 0;

        // Get current visible range from viewport
        const viewportState = (component.viewport as any).state;
        const visibleRange = viewportState?.visibleRange;

        if (visibleRange) {
          // Load the current visible range if needed
          await loadMissingRanges(visibleRange);
        }

        // Also process any queued requests
        processQueue();
      });

      // Load initial data if collection is available
      if (collection) {
        loadRange(0, rangeSize)
          .then(() => {
            // console.log("[Collection] Initial data loaded");
          })
          .catch((error) => {
            console.error("[Collection] Failed to load initial data:", error);
          });
      }
    };

    // Add collection API to viewport
    component.viewport.collection = {
      loadRange: (offset: number, limit: number) => loadRange(offset, limit),
      loadMissingRanges: (range: { start: number; end: number }) =>
        loadMissingRanges(range),
      getLoadedRanges: () => loadedRanges,
      getPendingRanges: () => pendingRanges,
      clearFailedRanges: () => failedRanges.clear(),
      retryFailedRange,
      setTotalItems,
      getTotalItems: () => totalItems,
    };

    // Add collection data access with direct assignment
    (component as any).collection = {
      items,
      getItems: () => items,
      getItem: (index: number) => items[index],
      loadRange,
      loadMissingRanges: (range: { start: number; end: number }) =>
        loadMissingRanges(range),
      getLoadingStats: () => ({
        pendingRequests: activeLoadCount,
        completedRequests: completedLoads,
        failedRequests: failedLoads,
        cancelledRequests: cancelledLoads,
        currentVelocity,
        canLoad: canLoad(),
        queuedRequests: loadRequestQueue.length,
      }),
    };

    // Also ensure component.items is updated
    component.items = items;

    // Cleanup function
    const destroy = () => {
      // Cancel pending requests
      activeRequests.clear();
      pendingRanges.clear();
    };

    // Return enhanced component
    return {
      ...component,
      collection: {
        loadRange,
        loadMissingRanges: (range: { start: number; end: number }) =>
          loadMissingRanges(range),
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
