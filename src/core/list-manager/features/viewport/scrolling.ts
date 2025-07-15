/**
 * Scrolling Module - Virtual scrolling with integrated velocity tracking
 * Handles wheel events, scroll position management, scrollbar interactions, and velocity measurement
 */

import type {
  ListManagerComponent,
  ItemRange,
  SpeedTracker,
} from "../../types";
import { LIST_MANAGER_CONSTANTS } from "../../constants";
import { clamp } from "../../utils/calculations";
import type { ItemSizeManager } from "./item-size";

/**
 * Configuration for scrolling functionality
 */
export interface ScrollingConfig {
  orientation: "vertical" | "horizontal";
  enableScrollbar: boolean;
  // Tracking configuration
  trackingEnabled?: boolean;
  measurementWindow?: number;
  decelerationFactor?: number;
  fastThreshold?: number;
  slowThreshold?: number;
  smoothingFactor?: number;
  // Callbacks
  onScrollPositionChanged?: (data: {
    position: number;
    direction: "forward" | "backward";
    previousPosition?: number;
    targetIndex?: number;
    alignment?: string;
    source?: string;
  }) => void;
  onVirtualRangeChanged?: (range: ItemRange) => void;
  onSpeedChanged?: (data: {
    speed: number;
    smoothedSpeed: number;
    direction: "forward" | "backward";
    isAccelerating: boolean;
    acceleration: number;
  }) => void;
}

/**
 * Scrolling state interface
 */
export interface ScrollingState {
  virtualScrollPosition: number;
  totalVirtualSize: number;
  containerSize: number;
  thumbPosition: number;
  scrollbarVisible: boolean;
  scrollbarFadeTimeout: number | null;
}

/**
 * Scrolling manager interface with integrated tracking
 */
export interface ScrollingManager {
  // Core scrolling
  handleWheel(event: WheelEvent): void;
  scrollToPosition(position: number): void;
  scrollToIndex(index: number, alignment?: "start" | "center" | "end"): void;

  // Container positioning
  updateContainerPosition(): void;

  // Scrollbar management
  updateScrollbar(): void;
  showScrollbar(): void;
  setupScrollbar(): void;
  destroyScrollbar(): void;

  // Wheel event management
  setupWheelEvents(): void;
  removeWheelEvents(): void;

  // State
  getScrollPosition(): number;
  getContainerSize(): number;
  getTotalVirtualSize(): number;
  updateState(updates: Partial<ScrollingState>): void;

  // Integrated tracking API
  getCurrentSpeed(): number;
  getDirection(): "forward" | "backward";
  getAcceleration(): number;
  isAccelerating(): boolean;
  getSpeedHistory(): number[];
  getSmoothedSpeed(): number;
  getAverageSpeed(): number;
  isFastScrolling(): boolean;
  isSlowScrolling(): boolean;
  isMediumScrolling(): boolean;
  updateSpeedThresholds(fast: number, slow: number): void;
  resetTracking(): void;
  getTracker(): SpeedTracker;
  isTrackingEnabled(): boolean;
}

/**
 * Creates a scrolling manager for virtual scroll position and scrollbar management
 */
export const createScrollingManager = (
  component: ListManagerComponent,
  itemSizeManager: ItemSizeManager,
  config: ScrollingConfig,
  calculateVisibleRange: () => ItemRange,
  renderItems: () => void,
  getTotalItems?: () => number,
  loadDataForRange?: (range: { start: number; end: number }) => void // Change to loadDataForRange callback
): ScrollingManager => {
  const {
    orientation,
    enableScrollbar,
    trackingEnabled = true,
    measurementWindow = LIST_MANAGER_CONSTANTS.SPEED_TRACKING
      .MEASUREMENT_WINDOW,
    decelerationFactor = LIST_MANAGER_CONSTANTS.SPEED_TRACKING
      .DECELERATION_FACTOR,
    smoothingFactor = 0.8,
    onScrollPositionChanged,
    onVirtualRangeChanged,
    onSpeedChanged,
  } = config;

  let fastThreshold =
    config.fastThreshold ||
    LIST_MANAGER_CONSTANTS.SPEED_TRACKING.FAST_SCROLL_THRESHOLD;
  let slowThreshold =
    config.slowThreshold ||
    LIST_MANAGER_CONSTANTS.SPEED_TRACKING.SLOW_SCROLL_THRESHOLD;

  // Scrolling state
  let virtualScrollPosition = 0;
  let totalVirtualSize = 0;
  let containerSize = 0;
  let thumbPosition = 0;
  let scrollbarVisible = false;
  let scrollbarFadeTimeout: number | null = null;

  // Direct scrolling - no animation for immediate response

  // Velocity tracking state
  let speedTracker: SpeedTracker = {
    velocity: 0,
    direction: "forward",
    isAccelerating: false,
    lastMeasurement: Date.now(),
  };

  let speedHistory: number[] = [];
  let positionHistory: { position: number; timestamp: number }[] = [];
  let smoothedSpeed = 0;
  let lastPosition = 0;
  let lastTimestamp = Date.now();
  let currentAcceleration = 0;
  let animationFrameId: number | null = null;

  // Scrollbar state (managed by external plugin)
  let scrollbarPlugin: any = null;

  // Items container reference
  let itemsContainer: HTMLElement | null = null;

  /**
   * Initialize scrolling with container reference
   */
  const setItemsContainer = (container: HTMLElement) => {
    itemsContainer = container;
  };

  /**
   * Initialize velocity tracking
   */
  const initializeTracking = (): void => {
    if (!trackingEnabled) return;
    startVelocityDecay();
  };

  /**
   * Update velocity tracking
   */
  const updateVelocityTracking = (
    deltaPosition: number,
    deltaTime: number
  ): void => {
    if (!trackingEnabled || deltaTime <= 0) return;

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

    // Add to position history for windowed calculations
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
      speedHistory.shift();
    }

    // Update smoothed speed using exponential smoothing
    smoothedSpeed =
      smoothedSpeed * smoothingFactor +
      speedTracker.velocity * (1 - smoothingFactor);

    // Update state
    lastPosition = position;
    lastTimestamp = now;

    // Emit speed change event
    onSpeedChanged?.({
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
   * Start velocity decay animation
   */
  const startVelocityDecay = (): void => {
    const decay = () => {
      if (!trackingEnabled) return;

      const now = Date.now();
      const timeSinceUpdate = now - speedTracker.lastMeasurement;

      // Apply decay if no recent updates
      if (timeSinceUpdate > 50) {
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
   * Handle wheel events for virtual scrolling with integrated velocity tracking
   */
  const handleWheel = (event: WheelEvent): void => {
    event.preventDefault();

    const sensitivity =
      LIST_MANAGER_CONSTANTS.VIRTUAL_SCROLL.SCROLL_SENSITIVITY;
    const delta = orientation === "vertical" ? event.deltaY : event.deltaX;

    // Direct scroll delta for immediate response
    const scrollDelta = delta * sensitivity;

    const previousPosition = virtualScrollPosition;
    let newPosition = virtualScrollPosition + scrollDelta;

    // Apply boundary resistance if enabled
    const maxScroll = Math.max(0, totalVirtualSize - containerSize);
    newPosition = clamp(newPosition, 0, maxScroll);

    // Update scroll position immediately for instant feedback
    virtualScrollPosition = newPosition;

    // Update velocity tracking with the actual delta
    const deltaPosition = newPosition - previousPosition;
    const deltaTime = 16; // Assume 60fps for wheel events
    updateVelocityTracking(deltaPosition, deltaTime);

    // Update container position immediately for instant feedback
    updateContainerPosition();
    showScrollbar();

    // Trigger rendering for new visible range
    renderItems();

    // Emit events
    const direction = newPosition > previousPosition ? "forward" : "backward";
    onScrollPositionChanged?.({
      position: virtualScrollPosition,
      direction,
      previousPosition,
    });

    const newVisibleRange = calculateVisibleRange();
    onVirtualRangeChanged?.(newVisibleRange);
  };

  /**
   * Scroll to specific index
   */
  const scrollToIndex = (
    index: number,
    alignment: "start" | "center" | "end" = "start"
  ): void => {
    // Use getTotalItems callback if available, otherwise fall back to component.totalItems
    const totalItems = getTotalItems ? getTotalItems() : component.totalItems;

    if (index < 0 || index >= totalItems) {
      return;
    }

    const previousPosition = virtualScrollPosition;
    let targetPosition = 0;

    // Calculate position based on measured sizes
    for (let i = 0; i < index; i++) {
      targetPosition +=
        itemSizeManager.getMeasuredSize(i) ||
        itemSizeManager.getEstimatedItemSize();
    }

    // Adjust position based on alignment
    switch (alignment) {
      case "center":
        targetPosition -= containerSize / 2;
        break;
      case "end":
        targetPosition -= containerSize;
        break;
      // 'start' is default - no adjustment needed
    }

    // Ensure position is within bounds
    const maxPosition = Math.max(0, totalVirtualSize - containerSize);
    targetPosition = Math.max(0, Math.min(targetPosition, maxPosition));

    // Update scroll position immediately
    virtualScrollPosition = targetPosition;

    // Update UI immediately
    updateContainerPosition();
    updateScrollbar();
    showScrollbar();

    // Calculate new visible range and notify
    const newVisibleRange = calculateVisibleRange();

    // Notify about scroll position change
    onScrollPositionChanged?.({
      position: virtualScrollPosition,
      previousPosition,
      direction: targetPosition > previousPosition ? "forward" : "backward",
    });

    // Notify about virtual range change
    onVirtualRangeChanged?.(newVisibleRange);
  };

  /**
   * Scroll to a specific position
   */
  const scrollToPosition = (position: number): void => {
    const maxScroll = Math.max(0, totalVirtualSize - containerSize);
    const clampedPosition = clamp(position, 0, maxScroll);

    if (clampedPosition === virtualScrollPosition) {
      return;
    }

    const previousPosition = virtualScrollPosition;

    // Update scroll position immediately
    virtualScrollPosition = clampedPosition;

    // Update velocity tracking
    const deltaPosition = clampedPosition - previousPosition;
    const deltaTime = 16; // Assume 60fps
    updateVelocityTracking(deltaPosition, deltaTime);

    // Update UI immediately
    updateContainerPosition();
    updateScrollbar();
    showScrollbar();

    // Trigger rendering for new visible range
    renderItems();

    // Emit events
    const direction =
      clampedPosition > previousPosition ? "forward" : "backward";
    onScrollPositionChanged?.({
      position: virtualScrollPosition,
      direction,
      previousPosition,
    });

    const newVisibleRange = calculateVisibleRange();
    onVirtualRangeChanged?.(newVisibleRange);
  };

  /**
   * Update container position for virtual scrolling with element accumulation
   */
  const updateContainerPosition = (): void => {
    if (!itemsContainer) return;

    // Don't apply transform to container - rely on absolute positioning of items
    // Just trigger item position updates
    if ((component as any).viewport?.updateItemPositions) {
      (component as any).viewport.updateItemPositions();
    }

    console.log(
      `📐 [SCROLLING] Triggered item positions update at scroll=${virtualScrollPosition.toFixed(
        2
      )}px`
    );
  };

  /**
   * Update scrollbar thumb position and size (delegated to external plugin)
   */
  const updateScrollbar = (): void => {
    if (!enableScrollbar || !scrollbarPlugin) return;

    // Calculate scroll ratio for external scrollbar plugin
    const scrollRatio =
      totalVirtualSize > containerSize
        ? virtualScrollPosition / (totalVirtualSize - containerSize)
        : 0;

    // Update external scrollbar plugin
    if (scrollbarPlugin.updateScrollPosition) {
      scrollbarPlugin.updateScrollPosition(virtualScrollPosition);
    }
  };

  /**
   * Setup scrollbar (delegated to external plugin)
   */
  const setupScrollbar = (): void => {
    // Scrollbar setup is handled by external plugin
    // This method is kept for API compatibility
  };

  /**
   * Setup scrollbar events (delegated to external plugin)
   */
  const setupScrollbarEvents = (): void => {
    // Scrollbar events are handled by external plugin
    // This method is kept for API compatibility
  };

  /**
   * Show scrollbar (delegated to external plugin)
   */
  const showScrollbar = (): void => {
    if (!enableScrollbar || !scrollbarPlugin) return;

    // Show scrollbar through external plugin
    if (scrollbarPlugin.showScrollbar) {
      scrollbarPlugin.showScrollbar();
    }
  };

  /**
   * Destroy scrollbar and stop tracking
   */
  const destroy = (): void => {
    destroyScrollbar();
    stopVelocityDecay();
  };

  /**
   * Destroy scrollbar (delegated to external plugin)
   */
  const destroyScrollbar = (): void => {
    if (scrollbarPlugin && scrollbarPlugin.destroy) {
      scrollbarPlugin.destroy();
    }
    scrollbarPlugin = null;

    if (scrollbarFadeTimeout) {
      clearTimeout(scrollbarFadeTimeout);
      scrollbarFadeTimeout = null;
    }
  };

  /**
   * Get current scroll position
   */
  const getScrollPosition = (): number => virtualScrollPosition;

  /**
   * Get container size
   */
  const getContainerSize = (): number => containerSize;

  /**
   * Get total virtual size
   */
  const getTotalVirtualSize = (): number => totalVirtualSize;

  /**
   * Update scrolling state
   */
  const updateState = (updates: Partial<ScrollingState>): void => {
    if (updates.virtualScrollPosition !== undefined) {
      virtualScrollPosition = updates.virtualScrollPosition;
    }
    if (updates.totalVirtualSize !== undefined) {
      totalVirtualSize = updates.totalVirtualSize;
    }
    if (updates.containerSize !== undefined) {
      containerSize = updates.containerSize;
    }
    if (updates.thumbPosition !== undefined) {
      thumbPosition = updates.thumbPosition;
    }
    if (updates.scrollbarVisible !== undefined) {
      scrollbarVisible = updates.scrollbarVisible;
    }
    if (updates.scrollbarFadeTimeout !== undefined) {
      scrollbarFadeTimeout = updates.scrollbarFadeTimeout;
    }
  };

  // Initialize tracking
  initializeTracking();

  return {
    // Core scrolling
    handleWheel,
    scrollToIndex,
    scrollToPosition,

    // Container positioning
    updateContainerPosition,

    // Scrollbar management
    updateScrollbar,
    showScrollbar,
    setupScrollbar,
    destroyScrollbar: destroy,

    // Wheel event management
    setupWheelEvents: () => {
      component.element.addEventListener("wheel", handleWheel, {
        passive: false,
      });
    },
    removeWheelEvents: () => {
      component.element.removeEventListener("wheel", handleWheel);
    },

    // State
    getScrollPosition,
    getContainerSize,
    getTotalVirtualSize,
    updateState,

    // Integrated tracking API
    getCurrentSpeed: () => speedTracker.velocity,
    getDirection: () => speedTracker.direction,
    getAcceleration: () => currentAcceleration,
    isAccelerating: () => speedTracker.isAccelerating,
    getSpeedHistory: () => [...speedHistory],
    getSmoothedSpeed: () => smoothedSpeed,
    getAverageSpeed: () => {
      if (speedHistory.length === 0) return 0;
      return speedHistory.reduce((sum, v) => sum + v, 0) / speedHistory.length;
    },
    isFastScrolling: () => smoothedSpeed > fastThreshold,
    isSlowScrolling: () => smoothedSpeed < slowThreshold,
    isMediumScrolling: () =>
      smoothedSpeed >= slowThreshold && smoothedSpeed <= fastThreshold,
    updateSpeedThresholds: (fast: number, slow: number) => {
      fastThreshold = fast;
      slowThreshold = slow;
    },
    resetTracking: () => {
      speedTracker = {
        velocity: 0,
        direction: "forward",
        isAccelerating: false,
        lastMeasurement: Date.now(),
      };
      speedHistory = [];
      positionHistory = [];
      smoothedSpeed = 0;
      lastPosition = 0;
      lastTimestamp = Date.now();
      currentAcceleration = 0;
    },
    getTracker: () => ({ ...speedTracker }),
    isTrackingEnabled: () => trackingEnabled,

    // Internal (for viewport setup)
    setItemsContainer,
    setScrollbarPlugin: (plugin: any) => {
      scrollbarPlugin = plugin;
    },
  } as ScrollingManager & {
    setItemsContainer: (container: HTMLElement) => void;
  };
};
