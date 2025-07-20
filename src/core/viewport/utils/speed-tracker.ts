// src/core/viewport/utils/speed-tracker.ts

/**
 * Speed tracking utility for viewport
 * Measures velocity and determines loading strategies
 */

import { VIEWPORT_CONSTANTS } from "../constants";

export interface SpeedTracker {
  velocity: number;
  direction: "forward" | "backward";
  isAccelerating: boolean;
  lastMeasurement: number;
}

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
  previousPosition: number
): SpeedTracker {
  const now = Date.now();
  const deltaTime = now - tracker.lastMeasurement;
  const deltaPosition = newPosition - previousPosition;

  // Calculate velocity (px/ms)
  const currentVelocity =
    deltaTime > 0 ? Math.abs(deltaPosition) / deltaTime : 0;

  // Determine direction
  const direction = deltaPosition >= 0 ? "forward" : "backward";

  // Check if accelerating
  const isAccelerating = currentVelocity > tracker.velocity;

  // Apply smoothing for more stable velocity tracking
  const smoothingFactor = 0.85;
  const smoothedVelocity =
    tracker.velocity * smoothingFactor +
    currentVelocity * (1 - smoothingFactor);

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
  return tracker.velocity > VIEWPORT_CONSTANTS.LOADING.CANCEL_THRESHOLD;
}

/**
 * Get loading strategy based on current speed
 */
export function getLoadingStrategy(
  tracker: SpeedTracker
): "defer" | "immediate" {
  return isFastScrolling(tracker) ? "defer" : "immediate";
}
