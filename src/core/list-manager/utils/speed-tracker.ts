/**
 * Scroll speed tracking utility
 * Measures velocity and determines loading strategies
 */

import type { SpeedTracker } from "../types";
import { LIST_MANAGER_CONSTANTS } from "../constants";

/**
 * Create a new speed tracker instance
 */
export function createSpeedTracker(): SpeedTracker {
  return {
    velocity: 0,
    direction: "forward",
    isAccelerating: false,
    lastMeasurement: Date.now(),
  };
}

/**
 * Update speed tracker with new scroll position
 */
export function updateSpeedTracker(
  tracker: SpeedTracker,
  newPosition: number,
  previousPosition: number,
  orientation: "vertical" | "horizontal" = "vertical"
): SpeedTracker {
  const now = Date.now();
  const deltaTime = now - tracker.lastMeasurement;
  const deltaPosition = newPosition - previousPosition;

  // Calculate velocity (px/ms)
  const currentVelocity =
    deltaTime > 0 ? Math.abs(deltaPosition) / deltaTime : 0;

  // Determine direction based on orientation
  let direction: "forward" | "backward";
  if (orientation === "vertical") {
    direction = deltaPosition >= 0 ? "forward" : "backward"; // down/up
  } else {
    direction = deltaPosition >= 0 ? "forward" : "backward"; // right/left
  }

  // Check if accelerating
  const isAccelerating = currentVelocity > tracker.velocity;

  // Apply deceleration factor for smooth velocity tracking
  const smoothedVelocity =
    tracker.velocity *
      LIST_MANAGER_CONSTANTS.SPEED_TRACKING.DECELERATION_FACTOR +
    currentVelocity *
      (1 - LIST_MANAGER_CONSTANTS.SPEED_TRACKING.DECELERATION_FACTOR);

  return {
    velocity: smoothedVelocity,
    direction,
    isAccelerating,
    lastMeasurement: now,
  };
}

/**
 * Determine if scroll speed is fast (should defer loading)
 */
export function isFastScrolling(tracker: SpeedTracker): boolean {
  return (
    tracker.velocity >
    LIST_MANAGER_CONSTANTS.SPEED_TRACKING.FAST_SCROLL_THRESHOLD
  );
}

/**
 * Determine if scroll speed is slow (should load immediately)
 */
export function isSlowScrolling(tracker: SpeedTracker): boolean {
  return (
    tracker.velocity <
    LIST_MANAGER_CONSTANTS.SPEED_TRACKING.SLOW_SCROLL_THRESHOLD
  );
}

/**
 * Get loading strategy based on current speed
 */
export function getLoadingStrategy(
  tracker: SpeedTracker
): "defer" | "immediate" | "maintain" {
  if (isFastScrolling(tracker)) {
    return "defer"; // User is seeking rapidly - show placeholders
  } else if (isSlowScrolling(tracker)) {
    return "immediate"; // User is reading - load proactively
  } else {
    return "maintain"; // Medium speed - continue current strategy
  }
}

/**
 * Calculate scroll momentum for prediction
 */
export function calculateScrollMomentum(
  tracker: SpeedTracker,
  containerSize: number,
  estimatedItemSize: number
): { predictedItems: number; decelerationTime: number } {
  const { velocity, isAccelerating } = tracker;

  // If not accelerating, velocity will decay
  const decelerationFactor =
    LIST_MANAGER_CONSTANTS.SPEED_TRACKING.DECELERATION_FACTOR;

  // Calculate time to decelerate to slow scroll threshold
  const targetVelocity =
    LIST_MANAGER_CONSTANTS.SPEED_TRACKING.SLOW_SCROLL_THRESHOLD;
  const decelerationTime = isAccelerating
    ? 0
    : Math.log(targetVelocity / velocity) / Math.log(decelerationFactor);

  // Calculate predicted distance based on momentum
  const predictedDistance = velocity * decelerationTime;

  // Convert to items for preloading
  const predictedItems = Math.ceil(predictedDistance / estimatedItemSize);

  return {
    predictedItems: Math.max(0, predictedItems),
    decelerationTime: Math.max(0, decelerationTime),
  };
}

/**
 * Create speed-based loading configuration
 */
export function createSpeedBasedLoadingConfig(
  tracker: SpeedTracker,
  containerSize: number,
  estimatedItemSize: number
): {
  strategy: "defer" | "immediate" | "maintain";
  prefetchCount: number;
  deferTimeout: number;
} {
  const strategy = getLoadingStrategy(tracker);
  const momentum = calculateScrollMomentum(
    tracker,
    containerSize,
    estimatedItemSize
  );

  let prefetchCount = 0;
  let deferTimeout = 0;

  switch (strategy) {
    case "defer":
      // Fast scrolling - minimal prefetch, set defer timeout
      prefetchCount = Math.ceil(containerSize / estimatedItemSize);
      deferTimeout = LIST_MANAGER_CONSTANTS.PERFORMANCE.DEBOUNCE_LOADING;
      break;

    case "immediate":
      // Slow scrolling - aggressive prefetch based on momentum
      prefetchCount = Math.max(
        momentum.predictedItems,
        LIST_MANAGER_CONSTANTS.RANGE_LOADING.PREFETCH_RANGES *
          LIST_MANAGER_CONSTANTS.RANGE_LOADING.DEFAULT_RANGE_SIZE
      );
      deferTimeout = 0;
      break;

    case "maintain":
      // Medium speed - standard prefetch
      prefetchCount =
        LIST_MANAGER_CONSTANTS.RANGE_LOADING.PREFETCH_RANGES *
        LIST_MANAGER_CONSTANTS.RANGE_LOADING.DEFAULT_RANGE_SIZE;
      deferTimeout = LIST_MANAGER_CONSTANTS.PERFORMANCE.DEBOUNCE_LOADING / 2;
      break;
  }

  return {
    strategy,
    prefetchCount,
    deferTimeout,
  };
}

/**
 * Reset speed tracker (useful for programmatic scrolling)
 */
export function resetSpeedTracker(tracker: SpeedTracker): SpeedTracker {
  return {
    velocity: 0,
    direction: tracker.direction,
    isAccelerating: false,
    lastMeasurement: Date.now(),
  };
}

/**
 * Apply speed-based throttling to scroll events
 */
export function getScrollThrottleInterval(tracker: SpeedTracker): number {
  const baseInterval = LIST_MANAGER_CONSTANTS.PERFORMANCE.THROTTLE_SCROLL;

  // Reduce throttling during fast scrolling for better responsiveness
  if (isFastScrolling(tracker)) {
    return Math.max(baseInterval / 2, 8); // Minimum 8ms (120fps)
  }

  // Increase throttling during slow scrolling to save CPU
  if (isSlowScrolling(tracker)) {
    return baseInterval * 2;
  }

  return baseInterval;
}

/**
 * Determine if scroll direction changed significantly
 */
export function hasSignificantDirectionChange(
  tracker: SpeedTracker,
  previousDirection: "forward" | "backward"
): boolean {
  return (
    tracker.direction !== previousDirection &&
    tracker.velocity >
      LIST_MANAGER_CONSTANTS.SPEED_TRACKING.SLOW_SCROLL_THRESHOLD
  );
}

/**
 * Calculate adaptive overscan based on scroll speed
 */
export function calculateAdaptiveOverscan(
  tracker: SpeedTracker,
  baseOverscan: number = LIST_MANAGER_CONSTANTS.VIRTUAL_SCROLL.OVERSCAN_BUFFER
): number {
  const { velocity } = tracker;

  // Increase overscan during fast scrolling
  if (isFastScrolling(tracker)) {
    return baseOverscan * 2;
  }

  // Reduce overscan during slow scrolling
  if (isSlowScrolling(tracker)) {
    return Math.max(1, Math.floor(baseOverscan / 2));
  }

  return baseOverscan;
}

/**
 * Get debug information for speed tracker
 */
export function getSpeedTrackerDebugInfo(tracker: SpeedTracker): {
  velocity: string;
  direction: string;
  isAccelerating: boolean;
  strategy: string;
  isFast: boolean;
  isSlow: boolean;
} {
  return {
    velocity: `${tracker.velocity.toFixed(2)} px/ms`,
    direction: tracker.direction,
    isAccelerating: tracker.isAccelerating,
    strategy: getLoadingStrategy(tracker),
    isFast: isFastScrolling(tracker),
    isSlow: isSlowScrolling(tracker),
  };
}
