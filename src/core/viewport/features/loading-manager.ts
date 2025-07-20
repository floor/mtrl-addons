// src/core/viewport/features/loading-manager.ts

/**
 * Loading Manager Feature - Velocity-based intelligent data loading
 * Manages data loading based on scroll velocity to prevent server overload
 */

import type { ViewportContext } from "../types";
import type { CollectionComponent } from "./collection";
import type { ScrollingComponent } from "./scrolling";
import { VIEWPORT_CONSTANTS } from "../constants";

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

export interface LoadingComponent {
  loading: {
    requestLoad: (
      range: { start: number; end: number },
      priority?: "high" | "normal" | "low"
    ) => void;
    updateVelocity: (
      velocity: number,
      direction: "forward" | "backward" | "idle"
    ) => void;
    cancelPendingLoads: () => void;
    getStats: () => LoadingStats;
    isRangeLoading: (range: { start: number; end: number }) => boolean;
    processQueue: () => void;
  };
}

interface QueuedRequest {
  range: { start: number; end: number };
  priority: "high" | "normal" | "low";
  timestamp: number;
}

/**
 * Adds loading management functionality to viewport component
 */
export function withLoadingManager(config: LoadingConfig = {}) {
  return <T extends ViewportContext & CollectionComponent & ScrollingComponent>(
    component: T
  ): T & LoadingComponent => {
    const {
      cancelLoadThreshold = VIEWPORT_CONSTANTS.SPEED_TRACKING
        .CANCEL_LOAD_THRESHOLD,
      maxConcurrentRequests = VIEWPORT_CONSTANTS.LOADING
        .MAX_CONCURRENT_REQUESTS,
      enableRequestQueue = VIEWPORT_CONSTANTS.REQUEST_QUEUE.ENABLED,
    } = config;

    // State
    let currentVelocity = 0;
    let currentDirection: "forward" | "backward" | "idle" = "idle";
    let activeRequests = new Set<string>();
    let requestQueue: QueuedRequest[] = [];
    let stats = {
      pendingRequests: 0,
      completedRequests: 0,
      failedRequests: 0,
      cancelledRequests: 0,
    };
    let queueProcessTimer: number | null = null;

    /**
     * Get range key for tracking
     */
    const getRangeKey = (range: { start: number; end: number }): string => {
      return `${range.start}-${range.end}`;
    };

    /**
     * Check if we can load based on velocity
     */
    const canLoad = (): boolean => {
      const absVelocity = Math.abs(currentVelocity);
      return absVelocity < cancelLoadThreshold;
    };

    /**
     * Request to load a range
     */
    const requestLoad = (
      range: { start: number; end: number },
      priority: "high" | "normal" | "low" = "normal"
    ): void => {
      const rangeKey = getRangeKey(range);

      // Skip if already loading
      if (activeRequests.has(rangeKey)) {
        return;
      }

      // Check if we should queue or load immediately
      if (!canLoad() || activeRequests.size >= maxConcurrentRequests) {
        if (enableRequestQueue) {
          // Add to queue
          const existingIndex = requestQueue.findIndex(
            (req) => getRangeKey(req.range) === rangeKey
          );

          if (existingIndex === -1) {
            requestQueue.push({
              range,
              priority,
              timestamp: Date.now(),
            });

            // Sort queue by priority and timestamp
            requestQueue.sort((a, b) => {
              const priorityWeight = { high: 0, normal: 1, low: 2 };
              const priorityDiff =
                priorityWeight[a.priority] - priorityWeight[b.priority];
              return priorityDiff !== 0
                ? priorityDiff
                : a.timestamp - b.timestamp;
            });
          }
        }
        return;
      }

      // Load immediately
      loadRange(range);
    };

    /**
     * Load a range
     */
    const loadRange = async (range: {
      start: number;
      end: number;
    }): Promise<void> => {
      const rangeKey = getRangeKey(range);
      activeRequests.add(rangeKey);
      stats.pendingRequests++;

      console.log(
        `📥 [LOADING] Loading range ${range.start}-${
          range.end
        } (velocity: ${currentVelocity.toFixed(2)} px/ms)`
      );

      try {
        await component.collection?.loadMissingRanges(range);
        stats.completedRequests++;

        // Emit success event
        component.emit?.("viewport:load-complete", { range });
      } catch (error) {
        stats.failedRequests++;
        console.error(`❌ [LOADING] Failed to load range ${rangeKey}:`, error);

        // Emit error event
        component.emit?.("viewport:load-error", { range, error });
      } finally {
        activeRequests.delete(rangeKey);
        stats.pendingRequests--;

        // Process queue if we have capacity
        if (activeRequests.size < maxConcurrentRequests) {
          processQueue();
        }
      }
    };

    /**
     * Update velocity
     */
    const updateVelocity = (
      velocity: number,
      direction: "forward" | "backward" | "idle"
    ): void => {
      const prevVelocity = currentVelocity;
      currentVelocity = velocity;
      currentDirection = direction;

      // Cancel loads if velocity exceeds threshold
      if (
        Math.abs(velocity) >= cancelLoadThreshold &&
        prevVelocity < cancelLoadThreshold
      ) {
        console.log(
          `⚡ [LOADING] High velocity detected (${velocity.toFixed(
            2
          )} px/ms), cancelling pending loads`
        );
        cancelPendingLoads();
      }

      // Process queue when velocity drops
      if (
        Math.abs(velocity) < cancelLoadThreshold &&
        prevVelocity >= cancelLoadThreshold
      ) {
        console.log(`🐌 [LOADING] Velocity decreased, processing queue`);
        processQueue();
      }
    };

    /**
     * Cancel pending loads
     */
    const cancelPendingLoads = (): void => {
      const cancelledCount = activeRequests.size;
      if (cancelledCount > 0) {
        activeRequests.clear();
        stats.cancelledRequests += cancelledCount;
        stats.pendingRequests = 0;

        console.log(
          `🚫 [LOADING] Cancelled ${cancelledCount} pending requests`
        );

        // Emit event
        component.emit?.("viewport:loads-cancelled", { count: cancelledCount });
      }
    };

    /**
     * Process queued requests
     */
    const processQueue = (): void => {
      if (!enableRequestQueue || requestQueue.length === 0) {
        return;
      }

      // Clear any existing timer
      if (queueProcessTimer) {
        clearTimeout(queueProcessTimer);
      }

      // Debounce queue processing
      queueProcessTimer = window.setTimeout(() => {
        while (
          requestQueue.length > 0 &&
          activeRequests.size < maxConcurrentRequests &&
          canLoad()
        ) {
          const request = requestQueue.shift();
          if (request) {
            loadRange(request.range);
          }
        }
      }, 50);
    };

    /**
     * Check if a range is currently loading
     */
    const isRangeLoading = (range: { start: number; end: number }): boolean => {
      return activeRequests.has(getRangeKey(range));
    };

    /**
     * Get loading statistics
     */
    const getStats = (): LoadingStats => {
      return {
        ...stats,
        currentVelocity,
        canLoad: canLoad(),
        queuedRequests: requestQueue.length,
      };
    };

    // Initialize function
    const initialize = () => {
      // Listen for speed changes
      component.on?.("viewport:speed-changed", (data: any) => {
        updateVelocity(data.velocity, data.direction);
      });

      // Listen for render complete to check what needs loading
      component.on?.("viewport:render-complete", (data: any) => {
        requestLoad(data.range, "high");
      });

      // Get initial velocity if available
      if (component.scrolling) {
        const velocity = component.scrolling.getVelocity();
        const direction = component.scrolling.getDirection();
        updateVelocity(velocity, direction);
      }
    };

    // Cleanup function
    const destroy = () => {
      cancelPendingLoads();
      requestQueue = [];

      if (queueProcessTimer) {
        clearTimeout(queueProcessTimer);
        queueProcessTimer = null;
      }
    };

    // Store functions for viewport to call
    (component as any)._loadingInitialize = initialize;
    (component as any)._loadingDestroy = destroy;

    // Return enhanced component
    return {
      ...component,
      loading: {
        requestLoad,
        updateVelocity,
        cancelPendingLoads,
        getStats,
        isRangeLoading,
        processQueue,
      },
    };
  };
}
