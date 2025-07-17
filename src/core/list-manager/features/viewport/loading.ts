/**
 * Loading - Velocity-based intelligent data loading for viewport
 *
 * This viewport module manages data loading based on scroll velocity.
 * When scrolling fast, it cancels loads to prevent server overload.
 */

import type { ListManagerComponent, ItemRange } from "../../types";
import { LIST_MANAGER_CONSTANTS } from "../../constants";
import { VIEWPORT_CONSTANTS } from "./constants";

export interface LoadingConfig {
  cancelLoadThreshold?: number; // Velocity (px/ms) above which all loads are cancelled
  maxConcurrentRequests?: number;
  enableRequestQueue?: boolean;
}

export interface LoadingManager {
  requestLoad(range: ItemRange, priority: "high" | "normal" | "low"): void;
  updateVelocity(velocity: number, direction: "forward" | "backward"): void;
  cancelPendingLoads(): void;
  getStats(): LoadingStats;
}

interface LoadingStats {
  pendingRequests: number;
  completedRequests: number;
  failedRequests: number;
  cancelledRequests: number;
  currentVelocity: number;
  canLoad: boolean;
  queuedRequests: number;
}

interface QueuedRequest {
  range: ItemRange;
  priority: "high" | "normal" | "low";
  timestamp: number;
}

/**
 * Creates a loading manager that handles data loading based on scroll velocity
 */
export const createLoadingManager = (
  component: ListManagerComponent,
  config: LoadingConfig = {}
): LoadingManager => {
  const {
    cancelLoadThreshold = VIEWPORT_CONSTANTS.LOADING.CANCEL_THRESHOLD,
    maxConcurrentRequests = VIEWPORT_CONSTANTS.REQUEST_QUEUE
      .MAX_ACTIVE_REQUESTS,
    enableRequestQueue = VIEWPORT_CONSTANTS.REQUEST_QUEUE.ENABLED,
  } = config;

  // State
  let currentVelocity = 0;
  let scrollDirection: "forward" | "backward" = "forward";
  let activeRequests = 0;

  // Request queue
  let requestQueue: QueuedRequest[] = [];

  // Track active requests to prevent duplicates
  const activeRanges = new Set<string>();

  // Stats
  let completedRequests = 0;
  let failedRequests = 0;
  let cancelledRequests = 0;

  /**
   * Get range key for deduplication
   */
  const getRangeKey = (range: ItemRange): string => {
    return `${range.start}-${range.end}`;
  };

  /**
   * Check if we should load data at current velocity
   */
  const canLoad = (): boolean => {
    return currentVelocity <= cancelLoadThreshold;
  };

  /**
   * Update current velocity
   */
  const updateVelocity = (
    velocity: number,
    direction: "forward" | "backward"
  ): void => {
    const previousVelocity = currentVelocity;
    currentVelocity = Math.abs(velocity);
    scrollDirection = direction;

    // Only log significant velocity changes
    if (Math.abs(previousVelocity - currentVelocity) > 0.5) {
      console.log(
        `🔄 [LOADING] Velocity updated: ${previousVelocity.toFixed(
          2
        )} → ${currentVelocity.toFixed(
          2
        )} px/ms (threshold: ${cancelLoadThreshold})`
      );
    }

    // When velocity drops below threshold (including reaching zero), process queued requests
    if (
      previousVelocity > cancelLoadThreshold &&
      currentVelocity <= cancelLoadThreshold
    ) {
      console.log(
        `📊 [LOADING] Velocity dropped to loadable level (${currentVelocity.toFixed(
          2
        )} px/ms), processing ${requestQueue.length} queued requests`
      );
      processQueue();
    } else if (
      currentVelocity <= cancelLoadThreshold &&
      requestQueue.length > 0
    ) {
      // Only log if there are items in queue
      console.log(
        `✅ [LOADING] Velocity still at loadable level: ${currentVelocity.toFixed(
          2
        )} px/ms (queue: ${requestQueue.length} items)`
      );
    }
  };

  /**
   * Process the request queue
   */
  const processQueue = (): void => {
    console.log(
      `🔄 [LOADING] processQueue called - queue length: ${requestQueue.length}, activeRequests: ${activeRequests}/${maxConcurrentRequests}`
    );

    if (!enableRequestQueue) {
      console.log(`❌ [LOADING] Request queue is disabled`);
      return;
    }

    let processed = 0;
    while (requestQueue.length > 0 && activeRequests < maxConcurrentRequests) {
      const request = requestQueue.shift();
      if (request) {
        console.log(
          `✅ [LOADING] Processing queued request for range ${request.range.start}-${request.range.end}`
        );
        executeLoad(request.range, request.priority);
        processed++;
      }
    }

    if (processed === 0 && requestQueue.length > 0) {
      console.log(
        `⏸️ [LOADING] Queue processing paused - max concurrent requests (${maxConcurrentRequests}) reached`
      );
    }
  };

  /**
   * Request to load a range with priority
   */
  const requestLoad = (
    range: ItemRange,
    priority: "high" | "normal" | "low"
  ): void => {
    const rangeKey = getRangeKey(range);

    // Check if already loading this range
    if (activeRanges.has(rangeKey)) {
      console.log(
        `⏳ [LOADING] Range ${range.start}-${range.end} is already being loaded`
      );
      return;
    }

    // Check velocity for all requests
    if (!canLoad()) {
      console.log(
        `🚫 [LOADING] Cancelled ${priority} priority load for range ${
          range.start
        }-${range.end} due to high velocity (${currentVelocity.toFixed(
          2
        )} px/ms > ${cancelLoadThreshold} px/ms)`
      );
      cancelledRequests++;
      return;
    }

    // If velocity is low, execute immediately
    if (activeRequests < maxConcurrentRequests) {
      console.log(
        `✅ [LOADING] Processing ${priority} priority load for range ${
          range.start
        }-${range.end} immediately (velocity: ${currentVelocity.toFixed(
          2
        )} px/ms)`
      );
      executeLoad(range, priority);
    } else if (enableRequestQueue) {
      // Add to queue if we're at capacity
      requestQueue.push({
        range,
        priority,
        timestamp: Date.now(),
      });

      // Enforce max queue size
      if (
        requestQueue.length > VIEWPORT_CONSTANTS.REQUEST_QUEUE.MAX_QUEUE_SIZE
      ) {
        const removed = requestQueue.splice(
          0,
          requestQueue.length - VIEWPORT_CONSTANTS.REQUEST_QUEUE.MAX_QUEUE_SIZE
        );
        cancelledRequests += removed.length;
      }

      console.log(
        `📋 [LOADING] Queued ${priority} priority request for range ${range.start}-${range.end} (queue size: ${requestQueue.length})`
      );
    }
  };

  /**
   * Execute load immediately
   */
  const executeLoad = (
    range: ItemRange,
    priority: "high" | "normal" | "low"
  ): void => {
    const rangeKey = getRangeKey(range);

    // Double-check for duplicates
    if (activeRanges.has(rangeKey)) {
      return;
    }

    console.log(
      `📡 [LOADING] Executing ${priority} priority load for range ${range.start}-${range.end}`
    );

    activeRequests++;
    activeRanges.add(rangeKey);

    // Request data from collection
    const collection = (component as any).collection;
    if (collection && typeof collection.loadMissingRanges === "function") {
      collection
        .loadMissingRanges(range)
        .then(() => {
          activeRequests--;
          activeRanges.delete(rangeKey);
          completedRequests++;
          console.log(
            `✅ [LOADING] Completed load for range ${range.start}-${range.end}`
          );
          // Process more requests from queue
          processQueue();
        })
        .catch((error: any) => {
          activeRequests--;
          activeRanges.delete(rangeKey);
          failedRequests++;
          console.error(
            `❌ [LOADING] Failed to load range ${range.start}-${range.end}:`,
            error
          );
          // Process more requests from queue even on failure
          processQueue();
        });
    } else {
      activeRequests--;
      activeRanges.delete(rangeKey);
      console.warn(
        `⚠️ [LOADING] No collection available for range ${range.start}-${range.end}`
      );
      processQueue();
    }
  };

  /**
   * Cancel all pending loads
   */
  const cancelPendingLoads = (): void => {
    const count = requestQueue.length;
    if (count > 0) {
      cancelledRequests += count;
      requestQueue = [];
      console.log(`🚫 [LOADING] Cancelled ${count} pending loads`);
    }
  };

  /**
   * Get loading statistics
   */
  const getStats = (): LoadingStats => {
    return {
      pendingRequests: activeRequests,
      completedRequests,
      failedRequests,
      cancelledRequests,
      currentVelocity,
      canLoad: canLoad(),
      queuedRequests: requestQueue.length,
    };
  };

  return {
    requestLoad,
    updateVelocity,
    cancelPendingLoads,
    getStats,
  };
};
