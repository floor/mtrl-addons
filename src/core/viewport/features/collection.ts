// src/core/viewport/features/collection.ts

/**
 * Collection Feature - Data management and range loading
 * Handles collection integration, pagination, and data fetching
 */

import type { ViewportContext, ViewportComponent } from "../types";
import { VIEWPORT_CONSTANTS } from "../constants";
import { wrapDestroy } from "./utils";

export interface CollectionConfig {
  collection?: any; // Collection adapter
  rangeSize?: number; // Default range size for loading
  strategy?: "offset" | "page" | "cursor"; // Loading strategy
  transform?: (item: any) => any; // Item transformation function
  cancelLoadThreshold?: number; // Velocity threshold for cancelling loads
  maxConcurrentRequests?: number;
  enableRequestQueue?: boolean;
  maxQueueSize?: number;
  loadOnDragEnd?: boolean; // Enable loading when drag ends (safety measure)
  initialScrollIndex?: number; // Initial scroll position (0-based index)
  selectId?: string | number; // ID of item to select after initial load completes
  autoLoad?: boolean; // Whether to automatically load data on initialization (default: true)
  autoSelectFirst?: boolean; // Automatically select first item after initial load (default: false)
  /** Maximum items to keep in memory (default: 1000) */
  maxCachedItems?: number;
  /** Extra items to keep around visible range during eviction (default: 150) */
  evictionBuffer?: number;
}

export interface CollectionComponent {
  collection: {
    loadRange: (offset: number, limit: number) => Promise<any[]>;
    loadMissingRanges: (
      range: { start: number; end: number },
      caller?: string,
    ) => Promise<void>;
    getLoadedRanges: () => Set<number>;
    getPendingRanges: () => Set<number>;
    clearFailedRanges: () => void;
    clearQueue: () => void;
    setManuallyLoaded: () => void;
    retryFailedRange: (rangeId: number) => Promise<any[]>;
    setTotalItems: (total: number) => void;
    getTotalItems: () => number;
    // Cursor-specific methods
    getCurrentCursor: () => string | null;
    getCursorForPage: (page: number) => string | null;
    // Reset method for reload functionality
    reset: () => void;
  };
}

/**
 * Adds collection functionality to viewport component
 */
export function withCollection(config: CollectionConfig = {}) {
  return <T extends ViewportContext & ViewportComponent>(
    component: T,
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
      loadOnDragEnd = true, // Default to true as safety measure
      initialScrollIndex = 0, // Start from beginning by default
      selectId, // ID of item to select after initial load
      autoLoad = true, // Auto-load initial data by default
      autoSelectFirst = false, // Automatically select first item after initial load
      maxCachedItems = 1000, // Maximum items to keep in memory
      evictionBuffer = 150, // Extra items to keep around visible range
    } = config;

    // Track if we've completed the initial load for initialScrollIndex
    // This prevents the viewport:range-changed listener from loading page 1
    let hasCompletedInitialPositionLoad = false;
    const hasInitialScrollIndex = initialScrollIndex > 0;

    // Track if data has been manually loaded (e.g., via reloadAt)
    // This enables subsequent loads from viewport:range-changed even with autoLoad: false
    let hasManuallyLoaded = false;

    // console.log("[Viewport Collection] Initialized with config:", {
    //   strategy,
    //   rangeSize,
    //   initialScrollIndex,
    // });

    // Loading manager state
    interface QueuedRequest {
      range: { start: number; end: number };
      priority: "high" | "normal" | "low";
      timestamp: number;
      resolve: () => void;
      reject: (error: any) => void;
      caller?: string;
    }

    // State tracking
    let currentVelocity = 0;
    let activeLoadCount = 0;
    let completedLoads = 0;
    let failedLoads = 0;
    let cancelledLoads = 0;
    let isDragging = false; // Track drag state

    // Cache eviction configuration (from config)
    const MAX_CACHED_ITEMS = maxCachedItems;
    const EVICTION_BUFFER = evictionBuffer;

    // Track actual item count efficiently (avoid O(n) sparse array iteration)
    let cachedItemCount = 0;

    // Memory diagnostics
    const logMemoryStats = (caller: string) => {
      const loadedRangeCount = loadedRanges.size;
      const pendingRangeCount = pendingRanges.size;
      const abortControllerCount = abortControllers.size;
    };

    /**
     * Evict items far from the current visible range to prevent memory bloat
     * Keeps items within EVICTION_BUFFER of the visible range
     *
     * PERFORMANCE: Uses loadedRanges to iterate only loaded data, not the entire
     * sparse array. This is critical for large lists (1M+ items) where the
     * items array is sparse and iterating items.length would be O(n).
     */
    const evictDistantItems = (visibleStart: number, visibleEnd: number) => {
      // Only evict if we have more than MAX_CACHED_ITEMS
      // Use cached count instead of O(n) items.filter(Boolean).length
      if (cachedItemCount <= MAX_CACHED_ITEMS) {
        return;
      }

      const keepStart = Math.max(0, visibleStart - EVICTION_BUFFER);
      const keepEnd = visibleEnd + EVICTION_BUFFER;

      // Calculate which ranges to keep based on visible area
      const keepRangeStart = Math.floor(keepStart / rangeSize);
      const keepRangeEnd = Math.floor(keepEnd / rangeSize);

      let evictedCount = 0;
      const rangesToRemove = new Set<number>();

      // Iterate only over loaded ranges, not the entire sparse array
      // This is O(loaded ranges) instead of O(total items)
      loadedRanges.forEach((rangeId) => {
        // Check if this range is outside the keep zone
        if (rangeId < keepRangeStart || rangeId > keepRangeEnd) {
          rangesToRemove.add(rangeId);

          // Evict items in this range
          const rangeStart = rangeId * rangeSize;
          const rangeEnd = rangeStart + rangeSize;
          for (let i = rangeStart; i < rangeEnd; i++) {
            if (items[i] !== undefined) {
              delete items[i];
              evictedCount++;
            }
          }
        }
      });

      // Remove all ranges that had items evicted
      // This is critical: even if only part of a range was evicted,
      // we must remove it from loadedRanges so it gets reloaded
      // Also remove from pendingRanges - if a slow request completes for an evicted range,
      // we don't want it to block future loads when user scrolls back
      rangesToRemove.forEach((rangeId) => {
        loadedRanges.delete(rangeId);
        pendingRanges.delete(rangeId);
        // Clean up active requests tracking
        activeRequests.delete(rangeId);
        // Also abort any in-flight request for this range to free up network resources
        const controller = abortControllers.get(rangeId);
        if (controller) {
          controller.abort();
          abortControllers.delete(rangeId);
        }
      });

      if (evictedCount > 0) {
        // Update cached item count
        cachedItemCount -= evictedCount;

        // Emit event for rendering to also clean up
        component.emit?.("collection:items-evicted", {
          keepStart,
          keepEnd,
          evictedCount,
        });
      }
    };

    const activeLoadRanges = new Set<string>();
    let loadRequestQueue: QueuedRequest[] = [];

    // AbortController map for cancelling in-flight requests
    const abortControllers = new Map<number, AbortController>();

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

    // Cursor pagination state
    let currentCursor: string | null = null;
    let cursorMap = new Map<number, string>(); // Map page number to cursor
    let pageToOffsetMap = new Map<number, number>(); // Map page to actual offset
    let highestLoadedPage = 0;
    let discoveredTotal: number | null = null; // Track discovered total from API
    let hasReachedEnd = false; // Track if we've reached the end of data

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

      // Call the actual loadMissingRanges function
      loadMissingRangesInternal(request.range, request.caller)
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
      // console.log(
      //   `[Collection] loadRange called: offset=${offset}, limit=${limit}`,
      // );

      if (!collection) {
        console.warn("[Collection] No collection adapter configured");
        return [];
      }

      const rangeId = getRangeId(offset, limit);
      // console.log(`[Collection] Range ID: ${rangeId}`);

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

      // Create AbortController for this request
      const abortController = new AbortController();
      abortControllers.set(rangeId, abortController);

      // Create request promise
      const requestPromise = (async () => {
        try {
          // Call collection adapter with appropriate parameters
          const page = Math.floor(offset / limit) + 1;
          let params: any;

          if (strategy === "cursor") {
            // For cursor pagination
            if (page === 1) {
              // First page - no cursor
              params = { limit };
            } else {
              // Check if we have cursor for previous page
              const prevPageCursor = cursorMap.get(page - 1);
              if (!prevPageCursor) {
                // Can't load this page without previous cursor
                console.warn(
                  `[Collection] Cannot load page ${page} without cursor for page ${
                    page - 1
                  }`,
                );
                throw new Error(
                  `Sequential loading required - missing cursor for page ${
                    page - 1
                  }`,
                );
              }
              params = { cursor: prevPageCursor, limit };
            }
          } else if (strategy === "page") {
            params = { page, limit };
          } else {
            // offset strategy
            params = { offset, limit };
          }

          // console.log(
          //   `[Viewport Collection] Loading range offset=${offset}, limit=${limit}, strategy=${strategy}, calculated page=${page}, params:`,
          //   JSON.stringify(params)
          // );

          // Pass abort signal to the adapter if it supports it
          const response = await collection.read({
            ...params,
            signal: abortController.signal,
          });

          // Extract items and total
          const rawItems = response.data || response.items || response;
          const meta = response.meta || {};

          // For cursor pagination, track the cursor (check both cursor and nextCursor)
          const responseCursor = meta.cursor || meta.nextCursor;
          if (strategy === "cursor" && responseCursor) {
            currentCursor = responseCursor;
            cursorMap.set(page, responseCursor);
            pageToOffsetMap.set(page, offset);
            highestLoadedPage = Math.max(highestLoadedPage, page);
            // console.log(
            //   `[Collection] Stored cursor for page ${page}: ${responseCursor}`,
            // );
          }

          // Check if we've reached the end
          if (strategy === "cursor" && meta.hasNext === false) {
            hasReachedEnd = true;
            // console.log(
            //   `[Collection] Reached end of cursor pagination at page ${page}`,
            // );
          }

          // Update discovered total if provided
          // console.log(
          //   `[Collection] meta.total: ${meta.total}, discoveredTotal before: ${discoveredTotal}`,
          // );
          if (meta.total !== undefined) {
            discoveredTotal = meta.total;
          }
          // console.log(`[Collection] discoveredTotal after: ${discoveredTotal}`);

          // Transform items
          const transformedItems = transformItems(rawItems);

          // Add items to array and track count efficiently
          let newItemsAdded = 0;
          transformedItems.forEach((item, index) => {
            // Only count as new if slot was empty
            if (items[offset + index] === undefined) {
              newItemsAdded++;
            }
            items[offset + index] = item;
          });
          cachedItemCount += newItemsAdded;

          // For cursor strategy, calculate dynamic total based on loaded data
          // Use nullish coalescing (??) instead of || to handle discoveredTotal = 0 correctly
          let newTotal = discoveredTotal ?? totalItems;

          // CRITICAL FIX: When API returns 0 items on page 1 (offset 0), the list is empty.
          // We must set totalItems to 0 regardless of meta.total being undefined.
          // This handles the case where count=false is sent but the list is actually empty.
          if (offset === 0 && transformedItems.length === 0) {
            // console.log(
            //   `[Collection] Empty result on page 1 - forcing totalItems to 0`,
            // );
            newTotal = 0;
            discoveredTotal = 0;
          }
          // console.log(
          //   `[Collection] newTotal initial: ${newTotal}, totalItems: ${totalItems}, strategy: ${strategy}`,
          // );

          if (strategy === "cursor") {
            // Calculate total based on loaded items + margin
            // Use cachedItemCount instead of O(n) filter operation
            const loadedItemsCount = cachedItemCount;
            const marginItems = hasReachedEnd
              ? 0
              : rangeSize *
                VIEWPORT_CONSTANTS.PAGINATION.CURSOR_SCROLL_MARGIN_MULTIPLIER;
            const minVirtualItems =
              rangeSize *
              VIEWPORT_CONSTANTS.PAGINATION.CURSOR_MIN_VIRTUAL_SIZE_MULTIPLIER;

            // Dynamic total: loaded items + margin (unless we've reached the end)
            newTotal = Math.max(
              loadedItemsCount + marginItems,
              minVirtualItems,
            );

            // console.log(
            //   `[Collection] Cursor mode virtual size: loaded=${loadedItemsCount}, margin=${marginItems}, total=${newTotal}, hasReachedEnd=${hasReachedEnd}`,
            // );

            // Update total if it has grown
            if (newTotal > totalItems) {
              // console.log(
              //   `[Collection] Updating cursor virtual size from ${totalItems} to ${newTotal}`,
              // );
              totalItems = newTotal;
              setTotalItems(newTotal);
            }
          } else {
            // For other strategies, use discovered total or current total
            // Use nullish coalescing (??) instead of || to handle discoveredTotal = 0 correctly
            newTotal = discoveredTotal ?? totalItems;
          }

          // Update state
          // console.log(
          //   `[Collection] Before state update: newTotal=${newTotal}, totalItems=${totalItems}, will update: ${newTotal !== totalItems}`,
          // );
          if (newTotal !== totalItems) {
            // console.log(`[Collection] Calling setTotalItems(${newTotal})`);
            totalItems = newTotal;
            setTotalItems(newTotal);
          }

          // Update component items reference
          component.items = items;

          // Emit items changed event
          component.emit?.("viewport:items-changed", {
            totalItems: newTotal,
            loadedCount: cachedItemCount,
          });

          // Update viewport state
          const viewportState = (component.viewport as any).state;
          if (viewportState) {
            // Use nullish coalescing (??) instead of || to handle newTotal = 0 correctly
            viewportState.totalItems = newTotal ?? items.length;
          }

          // Verify items are actually still in the array before marking as loaded
          // This prevents a race condition where eviction happens during async load:
          // 1. Load starts for range A
          // 2. User scrolls to range B
          // 3. Eviction removes items from range A and removes from loadedRanges
          // 4. Load for range A completes, would re-add to loadedRanges
          // 5. User scrolls back to A, loadedRanges says loaded but items are gone
          const itemsActuallyStored =
            transformedItems.length > 0 &&
            transformedItems.every(
              (_, idx) => items[offset + idx] !== undefined,
            );

          if (itemsActuallyStored) {
            // Mark as loaded only if items are actually present
            loadedRanges.add(rangeId);
          }
          // Always clean up pending/failed state
          pendingRanges.delete(rangeId);
          failedRanges.delete(rangeId);

          // console.log(
          //   `[Collection] Range ${rangeId} loaded successfully with ${transformedItems.length} items`
          // );

          // Log memory stats periodically (every 5 loads)
          if (completedLoads % 5 === 0) {
            logMemoryStats(`load:${completedLoads}`);
          }

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
            cursor: strategy === "cursor" ? currentCursor : undefined,
          });

          // Trigger viewport update
          component.viewport?.updateViewport?.();

          return transformedItems;
        } catch (error) {
          // Handle AbortError and "Failed to fetch" (which can occur on abort) gracefully
          const isAbortError =
            (error as Error).name === "AbortError" ||
            ((error as Error).message === "Failed to fetch" &&
              abortController.signal.aborted);

          if (isAbortError) {
            pendingRanges.delete(rangeId);
            cancelledLoads++;
            // Don't throw, just return empty array
            return [];
          }

          // Handle other errors
          pendingRanges.delete(rangeId);
          failedLoads++;

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
          abortControllers.delete(rangeId);
        }
      })();

      activeRequests.set(rangeId, requestPromise);
      return requestPromise;
    };

    /**
     * Load missing ranges from collection
     */
    const loadMissingRangesInternal = async (
      range: {
        start: number;
        end: number;
      },
      caller?: string,
    ): Promise<void> => {
      if (!collection) return;

      // console.log(
      //   `[Collection] loadMissingRangesInternal - range: ${start}-${end}, strategy: ${strategy}`,
      // );

      // For cursor pagination, we need to load sequentially
      if (strategy === "cursor") {
        const startPage = Math.floor(range.start / rangeSize) + 1;
        const endPage = Math.floor(range.end / rangeSize) + 1;

        // Limit how many pages we'll load at once
        const maxPagesToLoad = 10;
        const currentHighestPage = highestLoadedPage || 0;
        const limitedEndPage = Math.min(
          endPage,
          currentHighestPage + maxPagesToLoad,
        );

        // console.log(
        //   `[Collection] Cursor mode: need to load pages ${startPage} to ${endPage}, limited to ${limitedEndPage}`,
        // );

        // Check if we need to load pages sequentially
        for (let page = startPage; page <= limitedEndPage; page++) {
          const rangeId = page - 1; // Convert to 0-based rangeId
          const offset = rangeId * rangeSize;

          // Skip if already being loaded
          if (pendingRanges.has(rangeId)) {
            // Range already being loaded
            return;
          }

          if (!loadedRanges.has(rangeId) && !pendingRanges.has(rangeId)) {
            // For cursor pagination, we must load sequentially
            // Check if we have all previous pages loaded
            if (page > 1) {
              let canLoad = true;
              for (let prevPage = 1; prevPage < page; prevPage++) {
                const prevRangeId = prevPage - 1;
                if (!loadedRanges.has(prevRangeId)) {
                  // console.log(
                  //   `[Collection] Cannot load page ${page} - need to load page ${prevPage} first`,
                  // );
                  canLoad = false;

                  // Try to load the missing page
                  if (!pendingRanges.has(prevRangeId)) {
                    try {
                      await loadRange(prevRangeId * rangeSize, rangeSize);
                    } catch (error) {
                      console.error(
                        `[Collection] Failed to load prerequisite page ${prevPage}:`,
                        error,
                      );
                      return; // Stop trying to load further pages
                    }
                  }
                  break;
                }
              }

              if (!canLoad) {
                continue; // Skip this page for now
              }
            }

            try {
              await loadRange(offset, rangeSize);
            } catch (error) {
              console.error(`[Collection] Failed to load page ${page}:`, error);
              break; // Stop sequential loading on error
            }
          }
        }

        if (endPage > limitedEndPage) {
          // console.log(
          //   `[Collection] Stopped at page ${limitedEndPage} to prevent excessive loading (requested up to ${endPage})`,
          // );
        }

        return;
      }

      // Original logic for offset/page strategies
      // Calculate range boundaries
      const startRange = Math.floor(range.start / rangeSize);
      const endRange = Math.floor(range.end / rangeSize);

      // console.log(
      //   `[Collection] page strategy - startRange: ${startRange}, endRange: ${endRange}, loadedRanges: [${Array.from(loadedRanges).join(", ")}]`,
      // );

      // Collect ranges that need loading
      const rangesToLoad: number[] = [];
      for (let rangeId = startRange; rangeId <= endRange; rangeId++) {
        if (!loadedRanges.has(rangeId) && !pendingRanges.has(rangeId)) {
          rangesToLoad.push(rangeId);
        }
      }

      if (rangesToLoad.length === 0) {
        // All ranges are already loaded or pending
        // But verify the data actually exists in items array (defensive check)
        for (let rangeId = startRange; rangeId <= endRange; rangeId++) {
          if (loadedRanges.has(rangeId)) {
            // Check if this range actually has data
            const rangeStart = rangeId * rangeSize;
            const hasData = items
              .slice(rangeStart, rangeStart + rangeSize)
              .some((item) => item !== undefined);
            if (!hasData) {
              // Range marked loaded but no data - force reload
              loadedRanges.delete(rangeId);
              rangesToLoad.push(rangeId);
            }
          }
        }
        // Check if there are queued requests we should process
        if (
          rangesToLoad.length === 0 &&
          loadRequestQueue.length > 0 &&
          activeLoadCount < maxConcurrentRequests
        ) {
          processQueue();
        }
        if (rangesToLoad.length === 0) {
          return;
        }
      }

      // console.log(
      //   `[Collection] Loading ${rangesToLoad.length} ranges: [${rangesToLoad.join(", ")}]`,
      // );

      // Load ranges individually - no merging to avoid loading old ranges
      const promises = rangesToLoad.map((rangeId) =>
        loadRange(rangeId * rangeSize, rangeSize),
      );
      await Promise.allSettled(promises);
    };

    /**
     * Velocity-aware wrapper for loadMissingRanges
     */
    const loadMissingRanges = (
      range: {
        start: number;
        end: number;
      },
      caller?: string,
    ): Promise<void> => {
      return new Promise((resolve, reject) => {
        const rangeKey = getRangeKey(range);

        // Check if already loading
        if (activeLoadRanges.has(rangeKey)) {
          resolve();
          return;
        }

        // Skip if dragging with low velocity (but not if we're idle)
        if (isDragging && currentVelocity < 0.5 && currentVelocity > 0) {
          cancelledLoads++;
          resolve();
          return;
        }

        // Check velocity - if too high, cancel the request entirely
        if (!canLoad()) {
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
            caller,
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
            caller,
          });
          // console.log(
          //   `[LoadingManager] Queued request (at capacity), queue size: ${loadRequestQueue.length}`
          // );
        } else {
          // Queue is full - but don't drop idle/range-changed requests, they're critical!
          // Instead, clear old queued requests and add the new one
          if (
            caller === "viewport:idle" ||
            caller === "viewport:range-changed"
          ) {
            // Clear old queued requests - they're for ranges user scrolled past
            loadRequestQueue.forEach((r) => {
              cancelledLoads++;
              r.resolve();
            });
            loadRequestQueue.length = 0;
            // Queue this priority request
            loadRequestQueue.push({
              range,
              priority: "high",
              timestamp: Date.now(),
              resolve,
              reject,
              caller,
            });
          } else {
            // Queue overflow - resolve to avoid errors
            if (loadRequestQueue.length >= maxQueueSize) {
              const removed = loadRequestQueue.splice(
                0,
                loadRequestQueue.length - maxQueueSize,
              );
              removed.forEach((r) => {
                cancelledLoads++;
                r.resolve();
              });
            }
            resolve();
          }
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

      // Update viewport state's total items
      const viewportState = (component.viewport as any).state;
      if (viewportState) {
        viewportState.totalItems = total;
      }

      component.emit?.("viewport:total-items-changed", { total });
    };

    // Hook into viewport initialization
    const originalInitialize = component.viewport.initialize;
    component.viewport.initialize = () => {
      const result = originalInitialize();
      // Skip if already initialized
      if (result === false) {
        return false;
      }

      // Set initial total if provided
      if (component.totalItems) {
        totalItems = component.totalItems;
      }

      // Listen for drag events
      component.on?.("viewport:drag-start", () => {
        isDragging = true;
      });

      component.on?.("viewport:drag-end", () => {
        isDragging = false;
        // Process any queued requests after drag ends (safety measure)
        // This ensures placeholders are replaced even if idle detection fails
        if (loadOnDragEnd) {
          processQueue();
        }
      });

      // Listen for range changes
      component.on?.("viewport:range-changed", async (data: any) => {
        // Don't load during fast scrolling - loadMissingRanges will handle velocity check

        // Skip if autoLoad is disabled AND we haven't manually loaded yet
        // This prevents unwanted page 1 loads when using reloadAt()
        // But allows subsequent loads from scrolling after reloadAt() completes
        if (!autoLoad && !hasManuallyLoaded) {
          return;
        }

        // Extract range from event data - virtual feature emits { range: { start, end }, scrollPosition }
        const range = data.range || data;
        const { start, end } = range;

        // Validate range before loading
        if (typeof start !== "number" || typeof end !== "number") {
          console.warn(
            "[Collection] Invalid range in viewport:range-changed event:",
            data,
          );
          return;
        }

        // Skip loading page 1 if we have an initialScrollIndex and haven't completed initial load yet
        // This prevents the requestAnimationFrame in virtual.ts from triggering a page 1 load
        // after we've already started loading the correct initial page
        if (hasInitialScrollIndex && !hasCompletedInitialPositionLoad) {
          const page1EndIndex = rangeSize - 1; // e.g., 29 for rangeSize=30
          if (start === 0 && end <= page1EndIndex) {
            // This is a request for page 1, skip it
            return;
          }
        }

        // Load missing ranges if needed
        await loadMissingRanges({ start, end }, "viewport:range-changed");

        // Evict distant items to prevent memory bloat
        evictDistantItems(start, end);

        // For cursor mode, check if we need to update virtual size
        if (strategy === "cursor" && !hasReachedEnd) {
          // Use cachedItemCount instead of O(n) filter operation
          const loadedItemsCount = cachedItemCount;
          const marginItems =
            rangeSize *
            VIEWPORT_CONSTANTS.PAGINATION.CURSOR_SCROLL_MARGIN_MULTIPLIER;
          const minVirtualItems =
            rangeSize *
            VIEWPORT_CONSTANTS.PAGINATION.CURSOR_MIN_VIRTUAL_SIZE_MULTIPLIER;
          const dynamicTotal = Math.max(
            loadedItemsCount + marginItems,
            minVirtualItems,
          );

          if (dynamicTotal !== totalItems) {
            // console.log(
            //   `[Collection] Updating cursor virtual size from ${totalItems} to ${dynamicTotal}`,
            // );
            setTotalItems(dynamicTotal);
          }
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

        // Reset dragging state on idle since user has stopped moving
        if (isDragging) {
          isDragging = false;
        }

        // Get current visible range from viewport
        const viewportState = (component.viewport as any).state;
        const visibleRange = viewportState?.visibleRange;

        if (visibleRange) {
          // Clear stale requests from queue that are far from current visible range
          const buffer = rangeSize * 2; // Allow some buffer
          loadRequestQueue = loadRequestQueue.filter((request) => {
            const requestEnd = request.range.end;
            const requestStart = request.range.start;
            const isRelevant =
              requestEnd >= visibleRange.start - buffer &&
              requestStart <= visibleRange.end + buffer;

            if (!isRelevant) {
              request.resolve(); // Resolve to avoid hanging promises
            }
            return isRelevant;
          });

          // Load the current visible range if needed
          await loadMissingRanges(visibleRange, "viewport:idle");
        }

        // Also process any queued requests
        processQueue();
      });

      // Listen for item removal - DON'T clear loadedRanges to prevent unnecessary reload
      // The data is already shifted locally in api.ts and rendering.ts
      // Reloading would cause race conditions and overwrite the correct totalItems
      component.on?.("item:removed", (data: any) => {
        // console.log(`[Collection] item:removed event - index: ${data.index}`);
        // console.log(`[Collection] items.length: ${items.length}`);

        // Update discoveredTotal to match the new count
        // This prevents stale discoveredTotal from being used on next load
        if (discoveredTotal !== null && discoveredTotal > 0) {
          discoveredTotal = discoveredTotal - 1;
          // console.log(
          //   `[Collection] Updated discoveredTotal to: ${discoveredTotal}`,
          // );
        }

        // NOTE: Do NOT decrement totalItems here!
        // api.ts already calls setTotalItems() after emitting item:remove-request,
        // which properly updates totalItems. Decrementing here would cause a double-decrement.

        // DON'T clear loadedRanges - we want to keep using the local data
        // The data has been shifted locally and is still valid
        // Clearing would trigger a reload which causes race conditions
        // console.log(
        //   `[Collection] Keeping loadedRanges intact:`,
        //   Array.from(loadedRanges),
        // );
      });

      // Load initial data if collection is available and autoLoad is enabled
      if (collection && autoLoad) {
        // If we have an initial scroll index OR a selectId, load data for that position directly
        // Don't use scrollToIndex() as it triggers animation/velocity tracking
        // virtual.ts has already set the scroll position and calculated the visible range
        if (
          initialScrollIndex > 0 ||
          (selectId !== undefined && selectId !== null)
        ) {
          // Get the visible range that was already calculated by virtual.ts
          // We missed the initial viewport:range-changed event because our listener wasn't ready yet
          const visibleRange = component.viewport?.getVisibleRange?.();

          if (
            visibleRange &&
            (visibleRange.start > 0 || visibleRange.end > 0)
          ) {
            // Use the pre-calculated visible range from virtual.ts
            loadMissingRanges(visibleRange, "initial-position")
              .then(() => {
                hasCompletedInitialPositionLoad = true;
                // Emit event to select item after initial load if selectId is provided
                if (selectId !== undefined) {
                  component.emit?.("collection:initial-load-complete", {
                    selectId,
                    initialScrollIndex,
                  });
                }
              })
              .catch((error) => {
                console.error(
                  "[Collection] Failed to load initial position data:",
                  error,
                );
                hasCompletedInitialPositionLoad = true; // Allow normal loading even on error
              });
          } else {
            // Fallback: calculate range from initialScrollIndex
            // This handles edge cases where visibleRange wasn't ready
            const overscan = 2;
            const estimatedVisibleCount = Math.ceil(600 / 50); // ~12 items
            const start = Math.max(0, initialScrollIndex - overscan);
            const end = initialScrollIndex + estimatedVisibleCount + overscan;

            loadMissingRanges({ start, end }, "initial-position-fallback")
              .then(() => {
                hasCompletedInitialPositionLoad = true;
                // Emit event to select item after initial load if selectId is provided
                if (selectId !== undefined) {
                  component.emit?.("collection:initial-load-complete", {
                    selectId,
                    initialScrollIndex,
                  });
                }
              })
              .catch((error) => {
                console.error(
                  "[Collection] Failed to load initial position data (fallback):",
                  error,
                );
                hasCompletedInitialPositionLoad = true; // Allow normal loading even on error
              });
          }
          return;
        }

        // No initial scroll index - load from beginning as normal
        loadRange(0, rangeSize)
          .then(() => {
            // Handle autoSelectFirst - get first item ID and emit selection event
            if (autoSelectFirst && items.length > 0) {
              const firstItem = items[0];
              const firstId = firstItem?._id || firstItem?.id;
              if (firstId !== undefined) {
                component.emit?.("collection:initial-load-complete", {
                  selectId: firstId,
                  initialScrollIndex: 0,
                });
              }
            }
          })
          .catch((error) => {
            console.error("[Collection] Failed to load initial data:", error);
          });
      }

      return result;
    };

    /**
     * Reset collection state without destroying the component
     * Clears all loaded data and prepares for fresh load
     */
    const reset = () => {
      logMemoryStats("reset:before");

      // Abort all in-flight requests
      abortControllers.forEach((controller) => {
        try {
          controller.abort();
        } catch (e) {
          // Ignore abort errors
        }
      });
      abortControllers.clear();

      // Clear all data structures
      items.length = 0;
      loadRequestQueue.length = 0;
      loadedRanges.clear();
      pendingRanges.clear();
      failedRanges.clear();
      activeLoadRanges.clear();
      activeRequests.clear();
      cursorMap.clear();
      pageToOffsetMap.clear();

      // Reset state
      totalItems = 0;
      currentCursor = null;
      highestLoadedPage = 0;
      discoveredTotal = null;
      hasReachedEnd = false;
      hasCompletedInitialPositionLoad = false;
      hasManuallyLoaded = false;

      // Reset cached item count
      cachedItemCount = 0;

      // Reset counters
      activeLoadCount = 0;
      completedLoads = 0;
      failedLoads = 0;
      cancelledLoads = 0;

      // Update component reference
      component.items = items;
      component.totalItems = 0;

      logMemoryStats("reset:after");

      // Emit reset event
      component.emit?.("collection:reset");
    };

    /**
     * Clear the request queue - used by reloadAt to prevent stale queued requests
     */
    const clearQueue = () => {
      // Resolve all pending promises to avoid hanging
      loadRequestQueue.forEach((request) => {
        request.resolve();
      });
      loadRequestQueue.length = 0;
    };

    /**
     * Mark that data has been manually loaded (e.g., via reloadAt)
     * This enables subsequent loads from viewport:range-changed
     */
    const setManuallyLoaded = () => {
      hasManuallyLoaded = true;
    };

    // Add collection API to viewport
    component.viewport.collection = {
      loadRange: (offset: number, limit: number) => loadRange(offset, limit),
      loadMissingRanges: (
        range: { start: number; end: number },
        caller?: string,
      ) => loadMissingRanges(range, caller || "viewport.collection"),
      getLoadedRanges: () => loadedRanges,
      getPendingRanges: () => pendingRanges,
      clearFailedRanges: () => failedRanges.clear(),
      clearQueue,
      setManuallyLoaded,
      retryFailedRange,
      setTotalItems,
      getTotalItems: () => totalItems,
      // Cursor-specific methods
      getCurrentCursor: () => currentCursor,
      getCursorForPage: (page: number) => cursorMap.get(page) || null,
      // Reset method for reload functionality
      reset,
    };

    // Add collection data access with direct assignment
    (component as any).collection = {
      items,
      getItems: () => items,
      getItem: (index: number) => items[index],
      loadRange,
      loadMissingRanges: (
        range: { start: number; end: number },
        caller?: string,
      ) => loadMissingRanges(range, caller || "component.collection"),
      getLoadingStats: () => ({
        pendingRequests: activeLoadCount,
        completedRequests: completedLoads,
        failedRequests: failedLoads,
        cancelledRequests: cancelledLoads,
        currentVelocity,
        canLoad: canLoad(),
        queuedRequests: loadRequestQueue.length,
      }),
      // Total items management
      getTotalItems: () => totalItems,
      setTotalItems,
      // Cursor methods
      getCurrentCursor: () => currentCursor,
      getCursorForPage: (page: number) => cursorMap.get(page) || null,
      // Reset method for reload functionality
      reset,
    };

    // Also ensure component.items is updated
    component.items = items;

    // Cleanup function - comprehensive memory cleanup
    const destroy = () => {
      logMemoryStats("destroy:before");

      // Abort all in-flight requests
      abortControllers.forEach((controller) => {
        try {
          controller.abort();
        } catch (e) {
          // Ignore abort errors
        }
      });
      abortControllers.clear();

      // Clear all data structures
      items.length = 0;
      loadRequestQueue.length = 0;
      loadedRanges.clear();
      pendingRanges.clear();
      failedRanges.clear();
      activeLoadRanges.clear();
      activeRequests.clear();
      cursorMap.clear();
      pageToOffsetMap.clear();

      // Reset state
      totalItems = 0;
      currentCursor = null;
      highestLoadedPage = 0;
      discoveredTotal = null;
      hasReachedEnd = false;

      // Clear component reference
      if (component.items === items) {
        component.items = [];
      }

      logMemoryStats("destroy:after");
    };

    // Wire destroy into the component's destroy chain
    wrapDestroy(component, destroy);

    // Return enhanced component
    return {
      ...component,
      collection: {
        // Data access methods
        items,
        getItems: () => items,
        getItem: (index: number) => items[index],
        // Loading methods
        loadRange,
        loadMissingRanges: (
          range: { start: number; end: number },
          caller?: string,
        ) => loadMissingRanges(range, caller || "return.collection"),
        getLoadedRanges: () => loadedRanges,
        getPendingRanges: () => pendingRanges,
        clearFailedRanges: () => failedRanges.clear(),
        clearQueue,
        setManuallyLoaded,
        retryFailedRange,
        setTotalItems,
        getTotalItems: () => totalItems,
        // Cursor-specific methods
        getCurrentCursor: () => currentCursor,
        getCursorForPage: (page: number) => cursorMap.get(page) || null,
        // Reset method for reload functionality
        reset,
      },
    };
  };
}
