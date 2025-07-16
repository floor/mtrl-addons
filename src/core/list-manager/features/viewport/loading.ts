/**
 * Loading - Velocity-based intelligent data loading for viewport
 *
 * This viewport module manages data loading strategies based on scroll velocity,
 * coordinating between the viewport (UI layer) and collection (data layer).
 */

import type {
  ListManagerComponent,
  ItemRange,
  SpeedTracker,
} from "../../types";
import { LIST_MANAGER_CONSTANTS } from "../../constants";

export interface LoadingConfig {
  fastThreshold?: number;
  slowThreshold?: number;
  maxConcurrentRequests?: number;
  debounceDelay?: number;
}

export interface LoadingManager {
  requestLoad(range: ItemRange, priority: "high" | "normal" | "low"): void;
  updateVelocity(velocity: number, direction: "forward" | "backward"): void;
  cancelPendingLoads(): void;
  getStats(): LoadingStats;
}

interface LoadingStats {
  pendingRequests: number;
  deferredRequests: number;
  completedRequests: number;
  failedRequests: number;
  currentStrategy: "immediate" | "deferred" | "cancelled";
}

interface DeferredLoad {
  range: ItemRange;
  priority: "high" | "normal" | "low";
  timestamp: number;
  timeoutId?: NodeJS.Timeout;
}

/**
 * Creates a loading manager that handles data loading based on scroll velocity
 */
export const createLoadingManager = (
  component: ListManagerComponent,
  config: LoadingConfig = {}
): LoadingManager => {
  const {
    fastThreshold = LIST_MANAGER_CONSTANTS.SPEED_TRACKING.FAST_SCROLL_THRESHOLD,
    slowThreshold = LIST_MANAGER_CONSTANTS.SPEED_TRACKING.SLOW_SCROLL_THRESHOLD,
    maxConcurrentRequests = LIST_MANAGER_CONSTANTS.RANGE_LOADING
      .MAX_CONCURRENT_REQUESTS,
    debounceDelay = LIST_MANAGER_CONSTANTS.PERFORMANCE.DEBOUNCE_LOADING,
  } = config;

  // State
  let currentVelocity = 0;
  let scrollDirection: "forward" | "backward" = "forward";
  let pendingRequests = 0;
  const deferredLoads = new Map<string, DeferredLoad>();

  // Stats
  let completedRequests = 0;
  let failedRequests = 0;

  /**
   * Get a unique key for a range
   */
  const getRangeKey = (range: ItemRange): string => {
    return `${range.start}-${range.end}`;
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

    // Log significant velocity changes
    if (Math.abs(currentVelocity - previousVelocity) > 2) {
      const strategy = getLoadingStrategy();
      console.log(
        `🚀 [LOADING] Velocity: ${currentVelocity.toFixed(
          1
        )} px/ms, Strategy: ${strategy}, Direction: ${direction}`
      );
    }

    // Check if we should process deferred loads
    if (currentVelocity < slowThreshold) {
      processDeferredLoads();
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

    // Check if already deferred
    if (deferredLoads.has(rangeKey)) {
      const existing = deferredLoads.get(rangeKey)!;
      // Update priority if higher
      if (priority === "high" && existing.priority !== "high") {
        existing.priority = priority;
      }
      return;
    }

    // Determine loading strategy based on velocity
    const strategy = getLoadingStrategy();

    switch (strategy) {
      case "immediate":
        if (pendingRequests < maxConcurrentRequests) {
          executeLoad(range, priority);
        } else {
          deferLoad(range, priority, debounceDelay);
        }
        break;

      case "deferred":
        // Calculate adaptive delay based on velocity
        const delay = calculateDeferralDelay();
        deferLoad(range, priority, delay);
        break;

      case "cancelled":
        // Very fast scrolling - only load high priority if velocity is moderate
        if (priority === "high" && currentVelocity < fastThreshold * 2) {
          deferLoad(range, priority, calculateDeferralDelay());
        } else {
          // Log when we're cancelling loads due to high velocity
          console.log(
            `🚫 [LOADING] Cancelled ${priority} priority load for range ${
              range.start
            }-${range.end} (velocity: ${currentVelocity.toFixed(1)} px/ms)`
          );
        }
        // All loads are dropped during very fast scrolling
        break;
    }
  };

  /**
   * Get loading strategy based on current velocity
   */
  const getLoadingStrategy = (): "immediate" | "deferred" | "cancelled" => {
    // More aggressive thresholds for mouse wheel scrolling
    if (currentVelocity > fastThreshold * 3) {
      return "cancelled"; // Very fast (>15 px/ms) - cancel all loads
    } else if (currentVelocity > fastThreshold * 1.5) {
      return "cancelled"; // Fast (>7.5 px/ms) - cancel most loads
    } else if (currentVelocity > fastThreshold) {
      return "deferred"; // Moderate (>5 px/ms) - defer loading
    } else if (currentVelocity > slowThreshold) {
      return "deferred"; // Slow (>1 px/ms) - still defer with short delay
    } else {
      return "immediate"; // Very slow (<1 px/ms) - load immediately
    }
  };

  /**
   * Calculate deferral delay based on velocity
   */
  const calculateDeferralDelay = (): number => {
    if (currentVelocity > fastThreshold * 3) {
      return debounceDelay * 8; // 400ms for very fast
    } else if (currentVelocity > fastThreshold * 2) {
      return debounceDelay * 6; // 300ms for fast
    } else if (currentVelocity > fastThreshold) {
      return debounceDelay * 4; // 200ms for moderate
    } else if (currentVelocity > slowThreshold) {
      return debounceDelay * 2; // 100ms for slow
    } else {
      return debounceDelay; // 50ms for very slow
    }
  };

  /**
   * Execute load immediately
   */
  const executeLoad = (
    range: ItemRange,
    priority: "high" | "normal" | "low"
  ): void => {
    const collection = (component as any).collection;
    if (!collection || !collection.loadMissingRanges) {
      console.warn("⚠️ [LOADING] Collection not available");
      return;
    }

    pendingRequests++;

    console.log(
      `📥 [LOADING] Executing ${priority} priority load for range ${
        range.start
      }-${range.end} (velocity: ${currentVelocity.toFixed(
        1
      )} px/ms, pending: ${pendingRequests})`
    );

    collection
      .loadMissingRanges(range)
      .then(() => {
        pendingRequests--;
        completedRequests++;
        processDeferredLoads(); // Check if we can load more
      })
      .catch((error: any) => {
        pendingRequests--;
        failedRequests++;
        console.error("❌ [LOADING] Load failed:", error);
      });
  };

  /**
   * Defer load for later
   */
  const deferLoad = (
    range: ItemRange,
    priority: "high" | "normal" | "low",
    delay: number
  ): void => {
    const rangeKey = getRangeKey(range);

    // Clear existing timeout if any
    const existing = deferredLoads.get(rangeKey);
    if (existing?.timeoutId) {
      clearTimeout(existing.timeoutId);
    }

    console.log(
      `⏳ [LOADING] Deferring ${priority} priority load for range ${range.start}-${range.end} (${delay}ms)`
    );

    const timeoutId = setTimeout(() => {
      deferredLoads.delete(rangeKey);

      // Re-check velocity before loading
      if (currentVelocity < fastThreshold) {
        executeLoad(range, priority);
      } else {
        // Still scrolling fast, defer again
        deferLoad(range, priority, calculateDeferralDelay());
      }
    }, delay);

    deferredLoads.set(rangeKey, {
      range,
      priority,
      timestamp: Date.now(),
      timeoutId,
    });
  };

  /**
   * Process deferred loads when velocity decreases
   */
  const processDeferredLoads = (): void => {
    if (pendingRequests >= maxConcurrentRequests) {
      return;
    }

    // Sort by priority and timestamp
    const sortedLoads = Array.from(deferredLoads.values()).sort((a, b) => {
      if (a.priority !== b.priority) {
        const priorityOrder = { high: 0, normal: 1, low: 2 };
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      }
      return a.timestamp - b.timestamp;
    });

    // Process highest priority loads first
    for (const load of sortedLoads) {
      if (pendingRequests >= maxConcurrentRequests) {
        break;
      }

      const rangeKey = getRangeKey(load.range);
      deferredLoads.delete(rangeKey);

      if (load.timeoutId) {
        clearTimeout(load.timeoutId);
      }

      executeLoad(load.range, load.priority);
    }
  };

  /**
   * Cancel all pending deferred loads
   */
  const cancelPendingLoads = (): void => {
    for (const [key, load] of deferredLoads) {
      if (load.timeoutId) {
        clearTimeout(load.timeoutId);
      }
    }
    deferredLoads.clear();
    console.log("🚫 [LOADING] Cancelled all pending loads");
  };

  /**
   * Get current statistics
   */
  const getStats = (): LoadingStats => {
    return {
      pendingRequests,
      deferredRequests: deferredLoads.size,
      completedRequests,
      failedRequests,
      currentStrategy: getLoadingStrategy(),
    };
  };

  return {
    requestLoad,
    updateVelocity,
    cancelPendingLoads,
    getStats,
  };
};
