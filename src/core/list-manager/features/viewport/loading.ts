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

    // When velocity drops below threshold (including reaching zero), process queued requests
    if (
      previousVelocity > cancelLoadThreshold &&
      currentVelocity <= cancelLoadThreshold
    ) {
      processQueue();
    }
  };

  /**
   * Process the request queue
   */
  const processQueue = (): void => {
    if (!enableRequestQueue) {
      return;
    }

    let processed = 0;
    while (requestQueue.length > 0 && activeRequests < maxConcurrentRequests) {
      const request = requestQueue.shift();
      if (request) {
        executeLoad(request.range, request.priority);
        processed++;
      }
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
      return;
    }

    // Check velocity for all requests
    if (!canLoad()) {
      cancelledRequests++;
      return;
    }

    // If velocity is low, execute immediately
    if (activeRequests < maxConcurrentRequests) {
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
          // Process more requests from queue
          processQueue();
        })
        .catch((error: any) => {
          activeRequests--;
          activeRanges.delete(rangeKey);
          failedRequests++;
          // Process more requests from queue even on failure
          processQueue();
        });
    } else {
      activeRequests--;
      activeRanges.delete(rangeKey);
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
