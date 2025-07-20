// src/core/viewport/features/loading-manager.ts

/**
 * Loading Manager - Velocity-based intelligent data loading
 * Manages data loading based on scroll velocity to prevent server overload
 */

import type { ViewportComponent } from "../types";
import { VIEWPORT_CONSTANTS } from "../constants";
import type { SpeedTracker } from "../utils/speed-tracker";

export interface LoadingConfig {
  cancelLoadThreshold?: number; // Velocity (px/ms) above which loads are cancelled
  maxConcurrentRequests?: number;
  enableRequestQueue?: boolean;
}

export interface LoadingStats {
  pendingRequests: number;
  completedRequests: number;
  failedRequests: number;
  cancelledRequests: number;
  currentVelocity: number;
  canLoad: boolean;
  queuedRequests: number;
}

export interface LoadingManager {
  requestLoad(
    range: { start: number; end: number },
    priority: "high" | "normal" | "low"
  ): void;
  updateVelocity(velocity: number, direction: "forward" | "backward"): void;
  cancelPendingLoads(): void;
  getStats(): LoadingStats;
  isRangeLoading(range: { start: number; end: number }): boolean;
  processQueue(): void;
}

interface QueuedRequest {
  range: { start: number; end: number };
  priority: "high" | "normal" | "low";
  timestamp: number;
}

/**
 * Creates a loading manager that handles data loading based on scroll velocity
 */
export function createLoadingManager(
  viewport: ViewportComponent,
  config: LoadingConfig = {}
): LoadingManager {
  const {
    cancelLoadThreshold = VIEWPORT_CONSTANTS.LOADING.CANCEL_THRESHOLD,
    maxConcurrentRequests = VIEWPORT_CONSTANTS.LOADING.MAX_CONCURRENT_REQUESTS,
    enableRequestQueue = true,
  } = config;

  console.log(`🚀 [LOADING] Creating loading manager with config:`, config);

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

  // Collection feature reference
  let collectionFeature: any = null;

  /**
   * Get range key for deduplication
   */
  const getRangeKey = (range: { start: number; end: number }): string => {
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

    // When velocity drops below threshold or reaches zero, process queued requests
    if (
      (previousVelocity > cancelLoadThreshold &&
        currentVelocity <= cancelLoadThreshold) ||
      (currentVelocity === 0 && requestQueue.length > 0)
    ) {
      console.log(
        `📊 [LOADING] Velocity dropped to ${currentVelocity.toFixed(
          2
        )} px/ms, processing queue (${requestQueue.length} queued requests)`
      );
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

    if (processed > 0) {
      console.log(`✅ [LOADING] Processed ${processed} queued requests`);
    }
  };

  /**
   * Request to load a range with priority
   */
  const requestLoad = (
    range: { start: number; end: number },
    priority: "high" | "normal" | "low"
  ): void => {
    const rangeKey = getRangeKey(range);
    console.log(
      `📡 [LOADING] requestLoad called for range ${range.start}-${range.end}, velocity: ${currentVelocity}`
    );

    // Check if already loading this range
    if (activeRanges.has(rangeKey)) {
      return;
    }

    // Check velocity
    if (!canLoad()) {
      console.log(
        `🚫 [LOADING] Request cancelled - velocity ${currentVelocity.toFixed(
          2
        )} px/ms exceeds threshold ${cancelLoadThreshold} px/ms`
      );
      cancelledRequests++;

      // Queue the request if enabled
      if (enableRequestQueue) {
        requestQueue.push({
          range,
          priority,
          timestamp: Date.now(),
        });

        // Sort queue by priority
        requestQueue.sort((a, b) => {
          const priorityOrder = { high: 0, normal: 1, low: 2 };
          return priorityOrder[a.priority] - priorityOrder[b.priority];
        });

        // Enforce max queue size
        if (requestQueue.length > 50) {
          const removed = requestQueue.splice(50);
          cancelledRequests += removed.length;
        }
      }
      return;
    }

    // Execute immediately if we have capacity
    if (activeRequests < maxConcurrentRequests) {
      executeLoad(range, priority);
    } else if (enableRequestQueue) {
      // Add to queue if we're at capacity
      requestQueue.push({
        range,
        priority,
        timestamp: Date.now(),
      });
    } else {
      // Queue is disabled and we're at capacity
      cancelledRequests++;
    }
  };

  /**
   * Execute load immediately
   */
  const executeLoad = (
    range: { start: number; end: number },
    priority: "high" | "normal" | "low"
  ): void => {
    const rangeKey = getRangeKey(range);

    // Double-check for duplicates
    if (activeRanges.has(rangeKey)) {
      return;
    }

    activeRequests++;
    activeRanges.add(rangeKey);

    console.log(
      `📡 [LOADING] Loading range ${range.start}-${range.end} (priority: ${priority})`
    );

    // Get collection feature from viewport
    if (!collectionFeature) {
      const component = viewport as any;
      collectionFeature = component.collectionFeature;
    }

    if (
      collectionFeature &&
      typeof collectionFeature.loadMissingRanges === "function"
    ) {
      collectionFeature
        .loadMissingRanges(range)
        .then(() => {
          activeRequests--;
          activeRanges.delete(rangeKey);
          completedRequests++;
          // Process more requests from queue
          processQueue();
        })
        .catch((error: any) => {
          console.error(
            `❌ [LOADING] Failed to load range ${rangeKey}:`,
            error
          );
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
      console.log(`🚫 [LOADING] Cancelled ${count} pending requests`);
    }
  };

  /**
   * Check if a range is already being loaded
   */
  const isRangeLoading = (range: { start: number; end: number }): boolean => {
    const rangeKey = getRangeKey(range);
    return activeRanges.has(rangeKey);
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
    isRangeLoading,
    processQueue,
  };
}
