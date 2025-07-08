import { describe, it, expect, beforeEach } from "bun:test";
import {
  createSpeedTracker,
  updateSpeedTracker,
  isFastScrolling,
  isSlowScrolling,
  getLoadingStrategy,
  calculateScrollMomentum,
  createSpeedBasedLoadingConfig,
  resetSpeedTracker,
  getScrollThrottleInterval,
  hasSignificantDirectionChange,
  calculateAdaptiveOverscan,
  getSpeedTrackerDebugInfo,
} from "../../../../src/core/list-manager/utils/speed-tracker";
import type { SpeedTracker } from "../../../../src/core/list-manager/types";

describe("Speed Tracker Utility", () => {
  let speedTracker: SpeedTracker;

  beforeEach(() => {
    speedTracker = createSpeedTracker();
  });

  describe("createSpeedTracker", () => {
    it("should create speed tracker with initial values", () => {
      const tracker = createSpeedTracker();

      expect(tracker.velocity).toBe(0);
      expect(tracker.direction).toBe("forward");
      expect(tracker.lastPosition).toBe(0);
      expect(tracker.lastTimestamp).toBeGreaterThan(0);
      expect(tracker.samples).toEqual([]);
      expect(tracker.isScrolling).toBe(false);
    });

    it("should create tracker with custom initial position", () => {
      const tracker = createSpeedTracker(100);

      expect(tracker.lastPosition).toBe(100);
    });
  });

  describe("updateSpeedTracker", () => {
    it("should update speed tracker with new position", () => {
      const initialTime = speedTracker.lastTimestamp;

      // Simulate moving 100px forward after 100ms
      const updated = updateSpeedTracker(speedTracker, 100, initialTime + 100);

      expect(updated.velocity).toBeGreaterThan(0);
      expect(updated.direction).toBe("forward");
      expect(updated.lastPosition).toBe(100);
      expect(updated.lastTimestamp).toBe(initialTime + 100);
      expect(updated.isScrolling).toBe(true);
    });

    it("should detect backward direction", () => {
      // Start at position 100
      speedTracker.lastPosition = 100;

      // Move backward to position 50
      const updated = updateSpeedTracker(
        speedTracker,
        50,
        speedTracker.lastTimestamp + 100
      );

      expect(updated.direction).toBe("backward");
      expect(updated.velocity).toBeGreaterThan(0); // Always positive
    });

    it("should handle same position (no movement)", () => {
      const updated = updateSpeedTracker(
        speedTracker,
        0,
        speedTracker.lastTimestamp + 100
      );

      expect(updated.velocity).toBe(0);
      expect(updated.lastPosition).toBe(0);
    });

    it("should maintain sample history", () => {
      let tracker = speedTracker;

      // Add several samples
      for (let i = 1; i <= 10; i++) {
        tracker = updateSpeedTracker(
          tracker,
          i * 10,
          tracker.lastTimestamp + 16
        );
      }

      expect(tracker.samples).toBeDefined();
      expect(tracker.samples.length).toBeGreaterThan(0);
    });

    it("should limit sample history size", () => {
      let tracker = speedTracker;

      // Add many samples (more than the limit)
      for (let i = 1; i <= 100; i++) {
        tracker = updateSpeedTracker(
          tracker,
          i * 10,
          tracker.lastTimestamp + 16
        );
      }

      // Should not exceed reasonable limit (e.g., 20 samples)
      expect(tracker.samples.length).toBeLessThanOrEqual(20);
    });
  });

  describe("isFastScrolling", () => {
    it("should detect fast scrolling", () => {
      // Simulate fast scrolling (high velocity)
      const fastTracker = updateSpeedTracker(
        speedTracker,
        1000,
        speedTracker.lastTimestamp + 100
      );

      expect(isFastScrolling(fastTracker)).toBe(true);
    });

    it("should detect slow scrolling", () => {
      // Simulate slow scrolling (low velocity)
      const slowTracker = updateSpeedTracker(
        speedTracker,
        10,
        speedTracker.lastTimestamp + 100
      );

      expect(isFastScrolling(slowTracker)).toBe(false);
    });

    it("should handle stationary state", () => {
      expect(isFastScrolling(speedTracker)).toBe(false);
    });
  });

  describe("isSlowScrolling", () => {
    it("should detect slow scrolling", () => {
      // Simulate slow scrolling
      const slowTracker = updateSpeedTracker(
        speedTracker,
        10,
        speedTracker.lastTimestamp + 100
      );

      expect(isSlowScrolling(slowTracker)).toBe(true);
    });

    it("should not detect fast scrolling as slow", () => {
      // Simulate fast scrolling
      const fastTracker = updateSpeedTracker(
        speedTracker,
        1000,
        speedTracker.lastTimestamp + 100
      );

      expect(isSlowScrolling(fastTracker)).toBe(false);
    });

    it("should handle stationary state", () => {
      expect(isSlowScrolling(speedTracker)).toBe(false);
    });
  });

  describe("getLoadingStrategy", () => {
    it("should return aggressive strategy for fast scrolling", () => {
      const fastTracker = updateSpeedTracker(
        speedTracker,
        1000,
        speedTracker.lastTimestamp + 100
      );

      const strategy = getLoadingStrategy(fastTracker);

      expect(strategy).toBe("aggressive");
    });

    it("should return conservative strategy for slow scrolling", () => {
      const slowTracker = updateSpeedTracker(
        speedTracker,
        10,
        speedTracker.lastTimestamp + 100
      );

      const strategy = getLoadingStrategy(slowTracker);

      expect(strategy).toBe("conservative");
    });

    it("should return normal strategy for moderate scrolling", () => {
      const moderateTracker = updateSpeedTracker(
        speedTracker,
        100,
        speedTracker.lastTimestamp + 100
      );

      const strategy = getLoadingStrategy(moderateTracker);

      expect(strategy).toBe("normal");
    });

    it("should return idle strategy when not scrolling", () => {
      const strategy = getLoadingStrategy(speedTracker);

      expect(strategy).toBe("idle");
    });
  });

  describe("calculateScrollMomentum", () => {
    it("should calculate momentum for fast scrolling", () => {
      const fastTracker = updateSpeedTracker(
        speedTracker,
        1000,
        speedTracker.lastTimestamp + 100
      );

      const momentum = calculateScrollMomentum(fastTracker);

      expect(momentum).toBeGreaterThan(0);
      expect(momentum).toBeLessThanOrEqual(1);
    });

    it("should return zero momentum when stationary", () => {
      const momentum = calculateScrollMomentum(speedTracker);

      expect(momentum).toBe(0);
    });

    it("should cap momentum at 1.0", () => {
      // Simulate extremely fast scrolling
      const veryFastTracker = updateSpeedTracker(
        speedTracker,
        10000,
        speedTracker.lastTimestamp + 16
      );

      const momentum = calculateScrollMomentum(veryFastTracker);

      expect(momentum).toBeLessThanOrEqual(1);
    });
  });

  describe("createSpeedBasedLoadingConfig", () => {
    it("should create config for aggressive loading", () => {
      const fastTracker = updateSpeedTracker(
        speedTracker,
        1000,
        speedTracker.lastTimestamp + 100
      );

      const config = createSpeedBasedLoadingConfig(fastTracker);

      expect(config.strategy).toBe("aggressive");
      expect(config.rangeMultiplier).toBeGreaterThan(1);
      expect(config.loadAhead).toBeGreaterThan(0);
      expect(config.throttleMs).toBeGreaterThan(0);
    });

    it("should create config for conservative loading", () => {
      const slowTracker = updateSpeedTracker(
        speedTracker,
        10,
        speedTracker.lastTimestamp + 100
      );

      const config = createSpeedBasedLoadingConfig(slowTracker);

      expect(config.strategy).toBe("conservative");
      expect(config.rangeMultiplier).toBeLessThanOrEqual(2);
      expect(config.loadAhead).toBeGreaterThanOrEqual(0);
    });

    it("should create config for idle state", () => {
      const config = createSpeedBasedLoadingConfig(speedTracker);

      expect(config.strategy).toBe("idle");
      expect(config.rangeMultiplier).toBe(1);
      expect(config.loadAhead).toBe(0);
    });
  });

  describe("resetSpeedTracker", () => {
    it("should reset speed tracker to initial state", () => {
      // First, modify the tracker
      let tracker = updateSpeedTracker(
        speedTracker,
        500,
        speedTracker.lastTimestamp + 100
      );
      tracker = updateSpeedTracker(tracker, 1000, tracker.lastTimestamp + 100);

      expect(tracker.velocity).toBeGreaterThan(0);
      expect(tracker.samples.length).toBeGreaterThan(0);

      // Reset it
      const reset = resetSpeedTracker(tracker);

      expect(reset.velocity).toBe(0);
      expect(reset.samples).toEqual([]);
      expect(reset.isScrolling).toBe(false);
      expect(reset.lastPosition).toBe(tracker.lastPosition); // Position preserved
    });

    it("should preserve current position when resetting", () => {
      const tracker = updateSpeedTracker(
        speedTracker,
        300,
        speedTracker.lastTimestamp + 100
      );
      const reset = resetSpeedTracker(tracker);

      expect(reset.lastPosition).toBe(300);
    });
  });

  describe("getScrollThrottleInterval", () => {
    it("should return shorter interval for fast scrolling", () => {
      const fastTracker = updateSpeedTracker(
        speedTracker,
        1000,
        speedTracker.lastTimestamp + 100
      );

      const interval = getScrollThrottleInterval(fastTracker);

      expect(interval).toBeGreaterThan(0);
      expect(interval).toBeLessThan(50); // Should be quite responsive
    });

    it("should return longer interval for slow scrolling", () => {
      const slowTracker = updateSpeedTracker(
        speedTracker,
        10,
        speedTracker.lastTimestamp + 100
      );

      const interval = getScrollThrottleInterval(slowTracker);

      expect(interval).toBeGreaterThan(0);
      // Should be longer than fast scrolling but still reasonable
    });

    it("should return default interval when not scrolling", () => {
      const interval = getScrollThrottleInterval(speedTracker);

      expect(interval).toBeGreaterThan(0);
      expect(interval).toBeLessThanOrEqual(100); // Reasonable default
    });
  });

  describe("hasSignificantDirectionChange", () => {
    it("should detect direction change", () => {
      // Start moving forward
      let tracker = updateSpeedTracker(
        speedTracker,
        100,
        speedTracker.lastTimestamp + 100
      );
      tracker = updateSpeedTracker(tracker, 200, tracker.lastTimestamp + 100);

      // Then move backward
      tracker = updateSpeedTracker(tracker, 150, tracker.lastTimestamp + 100);
      tracker = updateSpeedTracker(tracker, 100, tracker.lastTimestamp + 100);

      const hasChanged = hasSignificantDirectionChange(tracker);

      expect(hasChanged).toBe(true);
    });

    it("should not detect change when continuing in same direction", () => {
      // Consistent forward movement
      let tracker = updateSpeedTracker(
        speedTracker,
        100,
        speedTracker.lastTimestamp + 100
      );
      tracker = updateSpeedTracker(tracker, 200, tracker.lastTimestamp + 100);
      tracker = updateSpeedTracker(tracker, 300, tracker.lastTimestamp + 100);

      const hasChanged = hasSignificantDirectionChange(tracker);

      expect(hasChanged).toBe(false);
    });

    it("should handle insufficient sample history", () => {
      const tracker = updateSpeedTracker(
        speedTracker,
        100,
        speedTracker.lastTimestamp + 100
      );

      const hasChanged = hasSignificantDirectionChange(tracker);

      expect(hasChanged).toBe(false);
    });
  });

  describe("calculateAdaptiveOverscan", () => {
    it("should increase overscan for fast scrolling", () => {
      const fastTracker = updateSpeedTracker(
        speedTracker,
        1000,
        speedTracker.lastTimestamp + 100
      );

      const overscan = calculateAdaptiveOverscan(fastTracker, 5, 20);

      expect(overscan).toBeGreaterThan(5); // Should increase from base
      expect(overscan).toBeLessThanOrEqual(20); // Should not exceed max
    });

    it("should maintain base overscan for slow scrolling", () => {
      const slowTracker = updateSpeedTracker(
        speedTracker,
        10,
        speedTracker.lastTimestamp + 100
      );

      const overscan = calculateAdaptiveOverscan(slowTracker, 5, 20);

      expect(overscan).toBeCloseTo(5, 1); // Should be close to base
    });

    it("should return base overscan when not scrolling", () => {
      const overscan = calculateAdaptiveOverscan(speedTracker, 3, 15);

      expect(overscan).toBe(3);
    });

    it("should respect maximum overscan limit", () => {
      // Extremely fast scrolling
      const veryFastTracker = updateSpeedTracker(
        speedTracker,
        10000,
        speedTracker.lastTimestamp + 16
      );

      const overscan = calculateAdaptiveOverscan(veryFastTracker, 2, 10);

      expect(overscan).toBeLessThanOrEqual(10);
    });
  });

  describe("getSpeedTrackerDebugInfo", () => {
    it("should return comprehensive debug information", () => {
      // Create tracker with some history
      let tracker = speedTracker;
      for (let i = 1; i <= 5; i++) {
        tracker = updateSpeedTracker(
          tracker,
          i * 50,
          tracker.lastTimestamp + 20
        );
      }

      const debug = getSpeedTrackerDebugInfo(tracker);

      expect(debug).toHaveProperty("velocity");
      expect(debug).toHaveProperty("direction");
      expect(debug).toHaveProperty("isScrolling");
      expect(debug).toHaveProperty("strategy");
      expect(debug).toHaveProperty("momentum");
      expect(debug).toHaveProperty("sampleCount");
      expect(debug).toHaveProperty("averageVelocity");
      expect(debug).toHaveProperty("throttleInterval");
      expect(debug).toHaveProperty("adaptiveOverscan");

      expect(debug.velocity).toBeGreaterThan(0);
      expect(debug.isScrolling).toBe(true);
      expect(debug.sampleCount).toBeGreaterThan(0);
    });

    it("should handle idle state debug info", () => {
      const debug = getSpeedTrackerDebugInfo(speedTracker);

      expect(debug.velocity).toBe(0);
      expect(debug.isScrolling).toBe(false);
      expect(debug.strategy).toBe("idle");
      expect(debug.momentum).toBe(0);
      expect(debug.sampleCount).toBe(0);
    });
  });

  describe("Integration scenarios", () => {
    it("should handle rapid velocity changes", () => {
      let tracker = speedTracker;

      // Fast acceleration
      tracker = updateSpeedTracker(tracker, 100, tracker.lastTimestamp + 100);
      tracker = updateSpeedTracker(tracker, 300, tracker.lastTimestamp + 50);
      tracker = updateSpeedTracker(tracker, 600, tracker.lastTimestamp + 25);

      expect(isFastScrolling(tracker)).toBe(true);
      expect(getLoadingStrategy(tracker)).toBe("aggressive");

      // Sudden deceleration
      tracker = updateSpeedTracker(tracker, 650, tracker.lastTimestamp + 100);
      tracker = updateSpeedTracker(tracker, 660, tracker.lastTimestamp + 100);

      expect(isFastScrolling(tracker)).toBe(false);
      expect(getLoadingStrategy(tracker)).not.toBe("aggressive");
    });

    it("should handle direction reversals during fast scrolling", () => {
      let tracker = speedTracker;

      // Fast forward movement
      tracker = updateSpeedTracker(tracker, 500, tracker.lastTimestamp + 50);
      tracker = updateSpeedTracker(tracker, 1000, tracker.lastTimestamp + 50);

      expect(tracker.direction).toBe("forward");
      expect(isFastScrolling(tracker)).toBe(true);

      // Rapid reversal
      tracker = updateSpeedTracker(tracker, 500, tracker.lastTimestamp + 50);
      tracker = updateSpeedTracker(tracker, 0, tracker.lastTimestamp + 50);

      expect(tracker.direction).toBe("backward");
      expect(hasSignificantDirectionChange(tracker)).toBe(true);
    });
  });
});
