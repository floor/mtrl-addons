/**
 * Scrolling Feature - Virtual scrolling with integrated velocity tracking
 * Handles wheel events, touch/mouse events, scroll position management, velocity measurement, and momentum scrolling
 */

import type { ViewportContext, ViewportComponent } from "../types";
import { VIEWPORT_CONSTANTS } from "../constants";
import { wrapInitialize, getViewportState, clamp } from "./utils";

export interface ScrollingConfig {
  orientation?: "vertical" | "horizontal";
  sensitivity?: number;
  smoothing?: boolean;
  idleTimeout?: number;
}

// Speed tracker interface
interface SpeedTracker {
  velocity: number;
  lastPosition: number;
  lastTime: number;
  direction: "forward" | "backward";
  samples: Array<{ position: number; time: number }>;
}

/**
 * Creates a new speed tracker
 */
const createSpeedTracker = (): SpeedTracker => ({
  velocity: 0,
  lastPosition: 0,
  lastTime: Date.now(),
  direction: "forward",
  samples: [],
});

/**
 * Updates speed tracker with new position
 */
const updateSpeedTracker = (
  tracker: SpeedTracker,
  newPosition: number,
  previousPosition: number,
): SpeedTracker => {
  const now = Date.now();
  const timeDelta = now - tracker.lastTime;

  if (timeDelta === 0) return tracker;

  const positionDelta = newPosition - previousPosition;
  const instantVelocity = Math.abs(positionDelta) / timeDelta;

  // Add new sample
  const samples = [...tracker.samples, { position: newPosition, time: now }];

  // Keep only recent samples (last 100ms)
  const recentSamples = samples.filter((s) => now - s.time < 100);

  // Calculate average velocity from recent samples
  let avgVelocity = instantVelocity;
  if (recentSamples.length > 1) {
    const oldestSample = recentSamples[0];
    const totalDistance = Math.abs(newPosition - oldestSample.position);
    const totalTime = now - oldestSample.time;
    avgVelocity = totalTime > 0 ? totalDistance / totalTime : instantVelocity;
  }

  return {
    velocity: avgVelocity,
    lastPosition: newPosition,
    lastTime: now,
    direction: positionDelta >= 0 ? "forward" : "backward",
    samples: recentSamples,
  };
};

/**
 * Scrolling feature for viewport
 * Handles wheel events, velocity tracking, and idle detection
 */
export const withScrolling = (config: ScrollingConfig = {}) => {
  return <T extends ViewportContext & ViewportComponent>(component: T): T => {
    const {
      orientation = "vertical",
      sensitivity = VIEWPORT_CONSTANTS.VIRTUAL_SCROLL.SCROLL_SENSITIVITY,
      smoothing = false,
      idleTimeout = 100, // Default idle timeout in ms
    } = config;

    // State
    let scrollPosition = 0;
    let totalVirtualSize = 0;
    let containerSize = 0;
    let isScrolling = false;
    let lastScrollTime = 0;
    let speedTracker = createSpeedTracker();
    let idleTimeoutId: number | null = null;
    let idleCheckFrame: number | null = null;
    let lastIdleCheckPosition = 0;
    let hasEmittedIdle = false; // Track if we've already emitted idle

    // console.log(`[Scrolling] Initial state - position: ${scrollPosition}`);

    // Get viewport state
    let viewportState: any;

    // Use shared initialization wrapper
    wrapInitialize(component, () => {
      viewportState = getViewportState(component);

      // Initialize state values
      if (viewportState) {
        totalVirtualSize = viewportState.virtualTotalSize || 0;
        containerSize = viewportState.containerSize || 0;
        // Sync scrollPosition from viewportState (important for initialScrollIndex)
        if (viewportState.scrollPosition > 0) {
          scrollPosition = viewportState.scrollPosition;
        }
        console.log(
          `[Scrolling:Init] viewportState.scrollPosition=${viewportState.scrollPosition}, local scrollPosition=${scrollPosition}, totalVirtualSize=${totalVirtualSize}, containerSize=${containerSize}`,
        );
      }

      // Listen for virtual size changes
      component.on?.("viewport:virtual-size-changed", (data: any) => {
        // console.log("[Scrolling] Virtual size changed:", data);
        updateScrollBounds(data.totalVirtualSize, containerSize);
      });

      // Listen for scroll position changes from other features (e.g., virtual.ts after item size detection)
      component.on?.("viewport:scroll-position-sync", (data: any) => {
        if (data.position !== undefined && data.position !== scrollPosition) {
          console.log(
            `[Scrolling:Sync] Syncing scrollPosition from ${scrollPosition} to ${data.position}`,
          );
          scrollPosition = data.position;
          // Also update local tracking vars
          totalVirtualSize =
            viewportState?.virtualTotalSize || totalVirtualSize;
          containerSize = viewportState?.containerSize || containerSize;
        }
      });

      // Listen for container size changes
      component.on?.("viewport:container-size-changed", (data: any) => {
        if (data.containerSize) {
          containerSize = data.containerSize;
          updateScrollBounds(totalVirtualSize, containerSize);
        }
      });

      // Attach wheel event listener to viewport element
      const viewportElement =
        viewportState?.viewportElement || (component as any).viewportElement;
      if (viewportElement) {
        // console.log(`[Scrolling] Attaching wheel event to viewport element`);
        viewportElement.addEventListener("wheel", handleWheel, {
          passive: false,
        });

        // Store reference for cleanup
        (component as any)._scrollingViewportElement = viewportElement;
      } else {
        console.warn(`[Scrolling] No viewport element found for wheel events`);
      }
    });

    // Use clamp from utils

    // Start idle detection
    const startIdleDetection = () => {
      // console.log("[Scrolling] Starting idle detection");

      // Stop any existing idle detection first
      if (idleCheckFrame !== null) {
        cancelAnimationFrame(idleCheckFrame);
        idleCheckFrame = null;
      }

      hasEmittedIdle = false; // Reset idle emission flag
      const checkIdle = () => {
        if (scrollPosition === lastIdleCheckPosition) {
          // Position hasn't changed - we're idle
          if (!hasEmittedIdle && (speedTracker.velocity > 0 || isScrolling)) {
            // console.log(
            //   "[Scrolling] Idle detected - position stable, setting velocity to zero"
            // );
            hasEmittedIdle = true; // Mark that we've emitted idle
            setVelocityToZero();
          }
        } else {
          // Position changed, reset the flag
          hasEmittedIdle = false;
        }
        lastIdleCheckPosition = scrollPosition;
        idleCheckFrame = requestAnimationFrame(checkIdle);
      };
      idleCheckFrame = requestAnimationFrame(checkIdle);
    };

    // Stop idle detection
    const stopIdleDetection = () => {
      if (idleCheckFrame) {
        // console.log("[Scrolling] Stopping idle detection");
        cancelAnimationFrame(idleCheckFrame);
        idleCheckFrame = null;
      }
    };

    // Set velocity to zero and emit idle event
    const setVelocityToZero = () => {
      // console.log("[Scrolling] Setting velocity to zero and emitting idle");

      // Stop idle detection since we're now idle
      stopIdleDetection();

      speedTracker = createSpeedTracker();
      isScrolling = false; // Reset scrolling state

      // Emit velocity change
      component.emit?.("viewport:velocity-changed", {
        velocity: 0,
        direction: speedTracker.direction,
      });

      // Emit idle state
      component.emit?.("viewport:idle", {
        position: scrollPosition,
        lastScrollTime,
      });
    };
    // Update container position
    const updateContainerPosition = () => {
      if (!viewportState || !viewportState.itemsContainer) return;

      // Items container doesn't move - items inside it are positioned
      // This is handled by the rendering feature
    };

    // Handle wheel event
    const handleWheel = (event: WheelEvent) => {
      event.preventDefault();

      const delta = orientation === "vertical" ? event.deltaY : event.deltaX;
      const scrollDelta = delta * sensitivity;

      const previousPosition = scrollPosition;
      const maxScroll = Math.max(0, totalVirtualSize - containerSize);

      let newPosition = scrollPosition + scrollDelta;

      // Apply smoothing if enabled
      if (smoothing) {
        const smoothingFactor = 0.3;
        newPosition = scrollPosition + scrollDelta * smoothingFactor;
      }

      newPosition = clamp(newPosition, 0, maxScroll);

      // DEBUG: Log scroll attempt details
      console.log(
        `[Scrolling:Wheel] delta=${delta.toFixed(1)}, scrollDelta=${scrollDelta.toFixed(1)}, ` +
          `localScrollPos=${scrollPosition.toFixed(1)}, viewportStateScrollPos=${viewportState?.scrollPosition?.toFixed(1)}, ` +
          `newPosition=${newPosition.toFixed(1)}, maxScroll=${maxScroll.toFixed(1)}, ` +
          `totalVirtualSize=${totalVirtualSize}, containerSize=${containerSize}`,
      );

      if (newPosition !== scrollPosition) {
        scrollPosition = newPosition;
        const now = Date.now();

        // Update scroll state
        if (!isScrolling) {
          isScrolling = true;
          // Stop any existing idle detection before starting new one
          stopIdleDetection();
          startIdleDetection();
        }
        lastScrollTime = now;

        // Update speed tracker
        speedTracker = updateSpeedTracker(
          speedTracker,
          scrollPosition,
          previousPosition,
        );

        // Update viewport state
        if (viewportState) {
          viewportState.scrollPosition = scrollPosition;
          viewportState.velocity = speedTracker.velocity;
          viewportState.scrollDirection = speedTracker.direction;
        }

        // Emit events
        component.emit?.("viewport:scroll", {
          position: scrollPosition,
          direction: speedTracker.direction,
          previousPosition,
        });

        component.emit?.("viewport:velocity-changed", {
          velocity: speedTracker.velocity,
          direction: speedTracker.direction,
        });

        // Trigger render
        component.viewport.renderItems();
      }
    };

    // Scroll to position
    const scrollToPosition = (position: number, source?: string) => {
      const maxScroll = Math.max(0, totalVirtualSize - containerSize);
      const clampedPosition = clamp(position, 0, maxScroll);

      // console.log(
      //   `[Scrolling] scrollToPosition: pos=${position} -> ${clampedPosition}, source=${source}, currentPos=${scrollPosition}, velocity=${speedTracker.velocity.toFixed(
      //     3
      //   )}`
      // );

      if (clampedPosition !== scrollPosition) {
        const previousPosition = scrollPosition;
        scrollPosition = clampedPosition;

        // Update speed tracker to calculate velocity
        speedTracker = updateSpeedTracker(
          speedTracker,
          scrollPosition,
          previousPosition,
        );

        // Update viewport state
        if (viewportState) {
          viewportState.scrollPosition = scrollPosition;
          viewportState.velocity = speedTracker.velocity;
          viewportState.scrollDirection = speedTracker.direction;
        }

        const direction =
          clampedPosition > previousPosition ? "forward" : "backward";

        component.emit?.("viewport:scroll", {
          position: scrollPosition,
          direction,
          previousPosition,
          source,
        });

        // Emit velocity change event so collection can track it
        component.emit?.("viewport:velocity-changed", {
          velocity: speedTracker.velocity,
          direction: speedTracker.direction,
        });

        // Update scroll state and idle detection
        if (!isScrolling) {
          isScrolling = true;
          startIdleDetection();
        }
        lastScrollTime = Date.now();

        // Trigger render
        component.viewport.renderItems();
      } else {
        // console.log(`[Scrolling] Position unchanged: ${scrollPosition}`);
        // console.log(
        //   `[Scrolling] Position unchanged: ${scrollPosition}, not resetting idle timeout`
        // );
      }
    };

    // Scroll to index
    const scrollToIndex = (
      index: number,
      alignment: "start" | "center" | "end" = "start",
    ) => {
      // console.log(
      //   `[Scrolling] scrollToIndex called: index=${index}, alignment=${alignment}`
      // );
      if (!viewportState) {
        //console.log(`[Scrolling] scrollToIndex aborted: no viewport state`);
        return;
      }

      const itemSize = viewportState.itemSize || 50;
      const totalItems = viewportState.totalItems || 0;
      const actualTotalSize = totalItems * itemSize;
      const MAX_VIRTUAL_SIZE =
        VIEWPORT_CONSTANTS.VIRTUAL_SCROLL.MAX_VIRTUAL_SIZE;
      const isCompressed = actualTotalSize > MAX_VIRTUAL_SIZE;

      let targetPosition: number;

      if (isCompressed) {
        // In compressed space, map index to virtual position
        const ratio = index / totalItems;
        targetPosition = ratio * Math.min(actualTotalSize, MAX_VIRTUAL_SIZE);
      } else {
        // Direct calculation when not compressed
        targetPosition = index * itemSize;
      }

      // Adjust position based on alignment
      switch (alignment) {
        case "center":
          targetPosition -= containerSize / 2 - itemSize / 2;
          break;
        case "end":
          targetPosition -= containerSize - itemSize;
          break;
      }

      // console.log(
      //   `[Scrolling] Target position: ${targetPosition}, isCompressed: ${isCompressed}`
      // );

      // console.log(
      //   `[Scrolling] ScrollToIndex: index=${index}, position=${targetPosition}, alignment=${alignment}`
      // );

      scrollToPosition(targetPosition, "scrollToIndex");
    };

    // Scroll to a specific page
    const scrollToPage = (
      page: number,
      limit: number = 20,
      alignment: "start" | "center" | "end" = "start",
    ) => {
      // Validate alignment parameter
      if (
        typeof alignment !== "string" ||
        !["start", "center", "end"].includes(alignment)
      ) {
        console.warn(
          `[Scrolling] Invalid alignment "${alignment}", using "start"`,
        );
        alignment = "start";
      }

      // Check if we're in cursor mode
      const viewportConfig = (component as any).config;
      const isCursorMode = viewportConfig?.pagination?.strategy === "cursor";

      if (isCursorMode) {
        // In cursor mode, check if we can scroll to this page
        const collection = (component.viewport as any).collection;
        if (collection) {
          const highestLoadedPage = Math.floor(
            collection.getLoadedRanges().size,
          );

          if (page > highestLoadedPage + 1) {
            // Limit how many pages we'll load at once to prevent excessive API calls
            const maxPagesToLoad = 10; // Reasonable limit
            const targetPage = Math.min(
              page,
              highestLoadedPage + maxPagesToLoad,
            );

            console.warn(
              `[Scrolling] Cannot jump directly to page ${page} in cursor mode. ` +
                `Pages must be loaded sequentially. Current highest page: ${highestLoadedPage}. ` +
                `Will load up to page ${targetPage}`,
            );

            // Trigger sequential loading to the target page (limited)
            const targetOffset = (targetPage - 1) * limit;
            const currentOffset = highestLoadedPage * limit;

            // Load pages sequentially up to the limited target
            console.log(
              `[Scrolling] Initiating sequential load from page ${
                highestLoadedPage + 1
              } to ${targetPage}`,
            );

            // Scroll to the last loaded position first
            const lastLoadedIndex = highestLoadedPage * limit;
            scrollToIndex(lastLoadedIndex, alignment);

            // The collection feature will handle sequential loading
            return;
          }
        }
      }

      // Convert page to index (page 1 = index 0)
      const index = (page - 1) * limit;

      // console.log(
      //   `[Scrolling] ScrollToPage: page=${page}, limit=${limit}, targetIndex=${index}, alignment=${alignment}`
      // );

      // Just scroll to the index - let the normal rendering flow handle data loading and placeholders
      scrollToIndex(index, alignment);
    };

    // Update scroll bounds
    const updateScrollBounds = (
      newTotalSize: number,
      newContainerSize: number,
    ) => {
      totalVirtualSize = newTotalSize;
      containerSize = newContainerSize;

      if (viewportState) {
        viewportState.virtualTotalSize = newTotalSize;
        viewportState.containerSize = newContainerSize;
      }

      // Clamp current position to new bounds
      const maxScroll = Math.max(0, totalVirtualSize - containerSize);
      if (scrollPosition > maxScroll) {
        scrollToPosition(maxScroll);
      }
    };

    // Extend viewport API
    const originalScrollToIndex = component.viewport.scrollToIndex;
    component.viewport.scrollToIndex = (
      index: number,
      alignment?: "start" | "center" | "end",
    ) => {
      scrollToIndex(index, alignment);
      originalScrollToIndex?.(index, alignment);
    };

    // Add scrollToPage to viewport API (new method, no original to preserve)
    (component.viewport as any).scrollToPage = (
      page: number,
      limit?: number,
      alignment?: "start" | "center" | "end",
    ) => {
      scrollToPage(page, limit, alignment);
    };

    const originalScrollToPosition = component.viewport.scrollToPosition;
    component.viewport.scrollToPosition = (position: number) => {
      scrollToPosition(position, "api");
      originalScrollToPosition?.(position);
    };

    const originalGetScrollPosition = component.viewport.getScrollPosition;
    component.viewport.getScrollPosition = () => {
      return scrollPosition;
    };

    // Add wheel event listener on initialization
    // This block is removed as per the edit hint.

    // Clean up on destroy
    if ("destroy" in component && typeof component.destroy === "function") {
      const originalDestroy = component.destroy;
      component.destroy = () => {
        // Remove event listeners
        const viewportElement = (component as any)._scrollingViewportElement;
        if (viewportElement) {
          viewportElement.removeEventListener("wheel", handleWheel);
        }

        // Clear timeouts
        if (idleTimeoutId) {
          clearTimeout(idleTimeoutId);
        }

        stopIdleDetection();
        originalDestroy?.();
      };
    }

    // Add scrollBy method
    const scrollBy = (delta: number) => {
      const previousPosition = scrollPosition;
      const maxScroll = Math.max(0, totalVirtualSize - containerSize);
      const newPosition = clamp(scrollPosition + delta, 0, maxScroll);

      if (newPosition !== previousPosition) {
        scrollPosition = newPosition;

        // Update speed tracker
        speedTracker = updateSpeedTracker(
          speedTracker,
          scrollPosition,
          previousPosition,
        );

        // Update viewport state
        if (viewportState) {
          viewportState.scrollPosition = scrollPosition;
          viewportState.velocity = speedTracker.velocity;
        }

        // Emit scroll event
        component.emit?.("viewport:scroll", {
          position: scrollPosition,
          velocity: speedTracker.velocity,
          direction: speedTracker.direction,
        });

        // Trigger render
        component.viewport.renderItems?.();

        // Start idle detection if not scrolling
        if (!isScrolling) {
          isScrolling = true;
          startIdleDetection();
        }
        lastScrollTime = Date.now();
      }
    };

    // Expose scrolling state for other features
    (component.viewport as any).scrollingState = {
      setVelocityToZero,
    };

    // Add scrollBy to viewport API
    component.viewport.scrollBy = scrollBy;
    component.viewport.getVelocity = () => speedTracker.velocity;

    // Expose scrolling API
    (component as any).scrolling = {
      handleWheel,
      scrollToPosition,
      scrollToIndex,
      scrollToPage,
      scrollBy,
      getScrollPosition: () => scrollPosition,
      updateScrollBounds,
      getVelocity: () => speedTracker.velocity,
      getDirection: () => speedTracker.direction,
      isScrolling: () => isScrolling,
    };

    return component;
  };
};
