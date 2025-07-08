/**
 * Speed Tracking Feature - Intelligent Scroll Optimization Enhancer
 * Handles scroll velocity measurement and loading optimization
 */

import type { ListManagerComponent, SpeedTracker } from "../../types";
import { LIST_MANAGER_CONSTANTS } from "../../constants";

/**
 * Configuration for speed tracking enhancer
 */
export interface SpeedTrackingConfig {
  measurementWindow?: number;
  decelerationFactor?: number;
  fastThreshold?: number;
  slowThreshold?: number;
  smoothingFactor?: number;
  enabled?: boolean;
}

/**
 * Component interface after speed tracking enhancement
 */
export interface SpeedTrackingComponent {
  speedTracker: {
    // Speed measurement
    getCurrentSpeed(): number;
    getDirection(): "forward" | "backward";
    getAcceleration(): number;
    isAccelerating(): boolean;

    // Speed history
    getSpeedHistory(): number[];
    getSmoothedSpeed(): number;
    getAverageSpeed(): number;

    // Thresholds
    isFastScrolling(): boolean;
    isSlowScrolling(): boolean;
    isMediumScrolling(): boolean;

    // Control
    updateSpeed(deltaPosition: number, deltaTime: number): void;
    reset(): void;

    // State
    getTracker(): SpeedTracker;
    isEnabled(): boolean;

    // Configuration
    updateThresholds(fast: number, slow: number): void;
  };
}

/**
 * Adds speed tracking functionality to a List Manager component
 *
 * @param config - Speed tracking configuration
 * @returns Function that enhances a component with speed tracking capabilities
 */
export const withSpeedTracking =
  (config: SpeedTrackingConfig = {}) =>
  <T extends ListManagerComponent>(
    component: T
  ): T & SpeedTrackingComponent => {
    // Configuration with defaults
    const measurementWindow =
      config.measurementWindow ||
      LIST_MANAGER_CONSTANTS.SPEED_TRACKING.MEASUREMENT_WINDOW;
    const decelerationFactor =
      config.decelerationFactor ||
      LIST_MANAGER_CONSTANTS.SPEED_TRACKING.DECELERATION_FACTOR;
    let fastThreshold =
      config.fastThreshold ||
      LIST_MANAGER_CONSTANTS.SPEED_TRACKING.FAST_SCROLL_THRESHOLD;
    let slowThreshold =
      config.slowThreshold ||
      LIST_MANAGER_CONSTANTS.SPEED_TRACKING.SLOW_SCROLL_THRESHOLD;
    const smoothingFactor = config.smoothingFactor || 0.8;
    const enabled = config.enabled !== false;

    // Speed tracking state
    let speedTracker: SpeedTracker = {
      velocity: 0,
      direction: "forward",
      isAccelerating: false,
      lastMeasurement: Date.now(),
    };

    // Speed measurement data
    let speedHistory: number[] = [];
    let positionHistory: { position: number; timestamp: number }[] = [];
    let smoothedSpeed = 0;
    let lastPosition = 0;
    let lastTimestamp = Date.now();
    let currentAcceleration = 0;

    // State
    let isInitialized = false;
    let animationFrameId: number | null = null;

    /**
     * Initialize speed tracking
     */
    const initialize = (): void => {
      if (isInitialized || !enabled) return;

      // Start velocity decay animation
      startVelocityDecay();

      isInitialized = true;
      component.emit?.("speed-tracking:initialized", {
        fastThreshold,
        slowThreshold,
        measurementWindow,
      });
    };

    /**
     * Destroy speed tracking
     */
    const destroy = (): void => {
      if (!isInitialized) return;

      stopVelocityDecay();
      reset();

      isInitialized = false;
      component.emit?.("speed-tracking:destroyed", {});
    };

    /**
     * Update speed based on position change
     */
    const updateSpeed = (deltaPosition: number, deltaTime: number): void => {
      if (!enabled || deltaTime <= 0) return;

      const now = Date.now();
      const position = lastPosition + deltaPosition;

      // Calculate instantaneous velocity
      const instantVelocity = Math.abs(deltaPosition) / deltaTime;

      // Update direction
      const newDirection = deltaPosition >= 0 ? "forward" : "backward";

      // Calculate acceleration
      const previousVelocity = speedTracker.velocity;
      currentAcceleration = (instantVelocity - previousVelocity) / deltaTime;

      // Update speed tracker
      speedTracker = {
        velocity: instantVelocity,
        direction: newDirection,
        isAccelerating: currentAcceleration > 0,
        lastMeasurement: now,
      };

      // Add to position history for more accurate calculations
      positionHistory.push({ position, timestamp: now });

      // Clean old history outside measurement window
      const windowStart = now - measurementWindow;
      positionHistory = positionHistory.filter(
        (entry) => entry.timestamp >= windowStart
      );

      // Calculate windowed velocity if we have enough data
      if (positionHistory.length >= 2) {
        const windowedVelocity = calculateWindowedVelocity();
        speedTracker.velocity = windowedVelocity;
      }

      // Update speed history
      speedHistory.push(speedTracker.velocity);
      if (speedHistory.length > 20) {
        speedHistory.shift(); // Keep last 20 measurements
      }

      // Update smoothed speed using exponential smoothing
      smoothedSpeed =
        smoothedSpeed * smoothingFactor +
        speedTracker.velocity * (1 - smoothingFactor);

      // Update state
      lastPosition = position;
      lastTimestamp = now;

      // Emit speed change event
      component.emit?.("speed:changed", {
        speed: speedTracker.velocity,
        smoothedSpeed,
        direction: speedTracker.direction,
        isAccelerating: speedTracker.isAccelerating,
        acceleration: currentAcceleration,
      });

      // Notify collection if available
      if ((component as any).collection?.handleSpeedChange) {
        (component as any).collection.handleSpeedChange(smoothedSpeed);
      }
    };

    /**
     * Calculate windowed velocity for better accuracy
     */
    const calculateWindowedVelocity = (): number => {
      if (positionHistory.length < 2) return 0;

      const latest = positionHistory[positionHistory.length - 1];
      const earliest = positionHistory[0];

      const totalDistance = Math.abs(latest.position - earliest.position);
      const totalTime = latest.timestamp - earliest.timestamp;

      return totalTime > 0 ? totalDistance / totalTime : 0;
    };

    /**
     * Reset speed tracking state
     */
    const reset = (): void => {
      speedTracker = {
        velocity: 0,
        direction: "forward",
        isAccelerating: false,
        lastMeasurement: Date.now(),
      };

      speedHistory = [];
      positionHistory = [];
      smoothedSpeed = 0;
      currentAcceleration = 0;
      lastPosition = 0;
      lastTimestamp = Date.now();

      component.emit?.("speed:reset", {});
    };

    /**
     * Start velocity decay animation
     */
    const startVelocityDecay = (): void => {
      const decay = () => {
        if (!enabled) return;

        const now = Date.now();
        const timeSinceUpdate = now - speedTracker.lastMeasurement;

        // Apply decay if no recent updates
        if (timeSinceUpdate > 50) {
          // 50ms threshold
          speedTracker.velocity *= decelerationFactor;
          smoothedSpeed *= decelerationFactor;

          // Stop very low velocities
          if (speedTracker.velocity < 0.1) {
            speedTracker.velocity = 0;
            speedTracker.isAccelerating = false;
          }

          if (smoothedSpeed < 0.1) {
            smoothedSpeed = 0;
          }

          speedTracker.lastMeasurement = now;
        }

        animationFrameId = requestAnimationFrame(decay);
      };

      animationFrameId = requestAnimationFrame(decay);
    };

    /**
     * Stop velocity decay animation
     */
    const stopVelocityDecay = (): void => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
      }
    };

    /**
     * Get current speed
     */
    const getCurrentSpeed = (): number => {
      return speedTracker.velocity;
    };

    /**
     * Get current direction
     */
    const getDirection = (): "forward" | "backward" => {
      return speedTracker.direction;
    };

    /**
     * Get current acceleration
     */
    const getAcceleration = (): number => {
      return currentAcceleration;
    };

    /**
     * Check if currently accelerating
     */
    const isAccelerating = (): boolean => {
      return speedTracker.isAccelerating;
    };

    /**
     * Get speed history
     */
    const getSpeedHistory = (): number[] => {
      return [...speedHistory];
    };

    /**
     * Get smoothed speed
     */
    const getSmoothedSpeed = (): number => {
      return smoothedSpeed;
    };

    /**
     * Get average speed from history
     */
    const getAverageSpeed = (): number => {
      if (speedHistory.length === 0) return 0;
      return (
        speedHistory.reduce((sum, speed) => sum + speed, 0) /
        speedHistory.length
      );
    };

    /**
     * Check if fast scrolling
     */
    const isFastScrolling = (): boolean => {
      return smoothedSpeed > fastThreshold;
    };

    /**
     * Check if slow scrolling
     */
    const isSlowScrolling = (): boolean => {
      return smoothedSpeed < slowThreshold;
    };

    /**
     * Check if medium scrolling
     */
    const isMediumScrolling = (): boolean => {
      return !isFastScrolling() && !isSlowScrolling();
    };

    /**
     * Update speed thresholds
     */
    const updateThresholds = (fast: number, slow: number): void => {
      fastThreshold = fast;
      slowThreshold = slow;

      component.emit?.("speed:thresholds-updated", {
        fastThreshold,
        slowThreshold,
      });
    };

    /**
     * Get tracker state
     */
    const getTracker = (): SpeedTracker => {
      return { ...speedTracker };
    };

    /**
     * Check if enabled
     */
    const isEnabled = (): boolean => {
      return enabled;
    };

    // Initialize when component initializes
    const originalInitialize = component.initialize;
    component.initialize = () => {
      originalInitialize.call(component);
      initialize();
    };

    // Destroy when component destroys
    const originalDestroy = component.destroy;
    component.destroy = () => {
      destroy();
      originalDestroy.call(component);
    };

    // Integrate with viewport if available
    if ((component as any).viewport) {
      const originalHandleWheel = (component as any).viewport.handleWheel;
      if (originalHandleWheel) {
        // Hook into wheel events to track scroll speed
        const enhancedHandleWheel = (event: WheelEvent) => {
          const delta = Math.abs(event.deltaY || event.deltaX);
          const timeDelta = 16; // Assume 60fps for wheel events

          updateSpeed(delta, timeDelta);

          // Call original handler
          return originalHandleWheel.call((component as any).viewport, event);
        };

        (component as any).viewport.handleWheel = enhancedHandleWheel;
      }
    }

    // Speed tracking API
    const speedTrackerAPI = {
      // Speed measurement
      getCurrentSpeed,
      getDirection,
      getAcceleration,
      isAccelerating,

      // Speed history
      getSpeedHistory,
      getSmoothedSpeed,
      getAverageSpeed,

      // Thresholds
      isFastScrolling,
      isSlowScrolling,
      isMediumScrolling,

      // Control
      updateSpeed,
      reset,

      // State
      getTracker,
      isEnabled,

      // Configuration
      updateThresholds,
    };

    return {
      ...component,
      speedTracker: speedTrackerAPI,
    };
  };
