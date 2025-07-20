/**
 * Scrolling Feature - Virtual scrolling with integrated velocity tracking
 * Handles wheel events, scroll position management, and velocity measurement
 */

import type { ViewportContext } from "../types";
import { VIEWPORT_CONSTANTS } from "../constants";
import {
  createSpeedTracker,
  updateSpeedTracker,
  type SpeedTracker,
} from "../utils/speed-tracker";

export interface ScrollingConfig {
  orientation?: "vertical" | "horizontal";
  sensitivity?: number;
  smoothing?: boolean;
}

export interface ScrollingComponent {
  scrolling: {
    handleWheel: (event: WheelEvent) => void;
    scrollToPosition: (position: number, source?: string) => void;
    scrollToIndex: (
      index: number,
      alignment?: "start" | "center" | "end"
    ) => void;
    getScrollPosition: () => number;
    updateScrollBounds: (totalSize: number, containerSize: number) => void;
    getVelocity: () => number;
    getDirection: () => "forward" | "backward" | "idle";
  };
}

/**
 * Adds scrolling functionality to viewport component
 */
export function withScrolling(config: ScrollingConfig = {}) {
  return <T extends ViewportContext>(component: T): T & ScrollingComponent => {
    const {
      orientation = "vertical",
      sensitivity = VIEWPORT_CONSTANTS.VIRTUAL_SCROLL.SCROLL_SENSITIVITY,
      smoothing = false,
    } = config;

    // State
    let scrollPosition = 0;
    let totalVirtualSize = 0;
    let containerSize = 0;
    let viewportElement: HTMLElement | null = null;
    let speedTracker: SpeedTracker = createSpeedTracker();
    let lastIdleCheckPosition = 0;
    let idleCheckFrame: number | null = null;
    let wheelListener: ((e: WheelEvent) => void) | null = null;

    // Helper functions
    const clamp = (value: number, min: number, max: number) => {
      return Math.max(min, Math.min(max, value));
    };

    /**
     * Start idle detection
     */
    const startIdleDetection = (): void => {
      const checkIdle = () => {
        if (
          scrollPosition === lastIdleCheckPosition &&
          speedTracker.velocity > 0
        ) {
          setVelocityToZero();
        }
        lastIdleCheckPosition = scrollPosition;
        idleCheckFrame = requestAnimationFrame(checkIdle);
      };
      idleCheckFrame = requestAnimationFrame(checkIdle);
    };

    /**
     * Set velocity to zero and trigger updates
     */
    const setVelocityToZero = (): void => {
      speedTracker = createSpeedTracker();

      // Emit speed change event
      component.emit?.("viewport:speed-changed", {
        velocity: 0,
        direction: "idle" as const,
      });

      // Trigger scroll position changed to load data
      component.emit?.("viewport:scroll", {
        position: scrollPosition,
        direction: speedTracker.direction,
        previousPosition: scrollPosition,
      });
    };

    /**
     * Update scroll position
     */
    const updateScrollPosition = (
      newPosition: number,
      source: string = "unknown"
    ): void => {
      const maxScroll = Math.max(0, totalVirtualSize - containerSize);
      const clampedPosition = clamp(newPosition, 0, maxScroll);

      if (clampedPosition === scrollPosition) return;

      const previousPosition = scrollPosition;
      scrollPosition = clampedPosition;

      // Update speed tracker
      speedTracker = updateSpeedTracker(
        speedTracker,
        clampedPosition,
        previousPosition
      );

      // Emit events
      component.emit?.("viewport:scroll", {
        position: scrollPosition,
        direction: speedTracker.direction,
        previousPosition,
        source,
      });

      component.emit?.("viewport:speed-changed", {
        velocity: speedTracker.velocity,
        direction: speedTracker.direction,
      });
    };

    /**
     * Handle wheel events
     */
    const handleWheel = (event: WheelEvent): void => {
      event.preventDefault();

      const delta = orientation === "horizontal" ? event.deltaX : event.deltaY;
      const adjustedDelta = delta * sensitivity;

      updateScrollPosition(scrollPosition + adjustedDelta, "wheel");
    };

    /**
     * Scroll to specific position
     */
    const scrollToPosition = (
      position: number,
      source: string = "api"
    ): void => {
      updateScrollPosition(position, source);
    };

    /**
     * Scroll to specific index
     */
    const scrollToIndex = (
      index: number,
      alignment: "start" | "center" | "end" = "start"
    ): void => {
      const estimatedItemSize =
        VIEWPORT_CONSTANTS.VIRTUAL_SCROLL.DEFAULT_ITEM_SIZE;
      let targetPosition = index * estimatedItemSize;

      if (alignment === "center") {
        targetPosition -= containerSize / 2 - estimatedItemSize / 2;
      } else if (alignment === "end") {
        targetPosition -= containerSize - estimatedItemSize;
      }

      scrollToPosition(targetPosition, "scrollToIndex");
    };

    /**
     * Update scroll bounds
     */
    const updateScrollBounds = (
      totalSize: number,
      newContainerSize: number
    ): void => {
      totalVirtualSize = totalSize;
      containerSize = newContainerSize;

      // Clamp current position to new bounds
      const maxScroll = Math.max(0, totalVirtualSize - containerSize);
      if (scrollPosition > maxScroll) {
        updateScrollPosition(maxScroll, "bounds-update");
      }
    };

    // Initialize function to be called by viewport
    const initialize = () => {
      viewportElement = component.element;

      if (viewportElement) {
        // Add wheel listener
        wheelListener = (e: WheelEvent) => handleWheel(e);
        viewportElement.addEventListener("wheel", wheelListener, {
          passive: false,
        });

        // Start idle detection
        startIdleDetection();
      }
    };

    // Cleanup function
    const destroy = () => {
      if (viewportElement && wheelListener) {
        viewportElement.removeEventListener("wheel", wheelListener);
      }

      if (idleCheckFrame) {
        cancelAnimationFrame(idleCheckFrame);
        idleCheckFrame = null;
      }
    };

    // Store initialize and destroy on component for viewport to call
    (component as any)._scrollingInitialize = initialize;
    (component as any)._scrollingDestroy = destroy;

    // Return enhanced component
    return {
      ...component,
      scrolling: {
        handleWheel,
        scrollToPosition,
        scrollToIndex,
        getScrollPosition: () => scrollPosition,
        updateScrollBounds,
        getVelocity: () => speedTracker.velocity,
        getDirection: () => speedTracker.direction,
      },
    };
  };
}
