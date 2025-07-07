import type { ListManagerPlugin, ViewportInfo } from "../../types";
import { SCROLL, CLASSES, LOGGING } from "../../constants";

/**
 * Scroll target interface
 */
export interface ScrollTarget {
  index?: number;
  position?: "top" | "bottom" | number;
  itemId?: string;
  alignment?: "start" | "center" | "end";
  offset?: number;
}

/**
 * Scroll options interface
 */
export interface ScrollOptions {
  behavior?: "smooth" | "instant" | "auto";
  duration?: number;
  easing?: "ease" | "ease-in" | "ease-out" | "ease-in-out" | "linear";
  callback?: () => void;
}

/**
 * Scroll animation state
 */
interface ScrollAnimationState {
  isScrolling: boolean;
  startTime: number;
  startPosition: number;
  targetPosition: number;
  duration: number;
  easing: string;
  animationId: number | null;
  callback?: () => void;
}

/**
 * Programmatic scroll configuration
 */
export interface ProgrammaticScrollConfig {
  smooth: boolean;
  duration: number;
  easing: "ease" | "ease-in" | "ease-out" | "ease-in-out" | "linear";
  restorePosition: boolean;
  enableBoundaries: boolean;
  bounceThreshold: number;
}

/**
 * Easing functions for scroll animations
 */
const easingFunctions = {
  linear: (t: number) => t,
  ease: (t: number) => t * t * (3 - 2 * t),
  "ease-in": (t: number) => t * t,
  "ease-out": (t: number) => t * (2 - t),
  "ease-in-out": (t: number) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t),
};

/**
 * Programmatic scroll plugin
 * Handles all programmatic scrolling operations
 */
export const programmaticScroll = (
  config: Partial<ProgrammaticScrollConfig> = {}
): ListManagerPlugin => ({
  name: "programmatic-scroll",
  version: "1.0.0",
  dependencies: [],

  install: (listManager, pluginConfig) => {
    // Configuration with defaults
    const scrollConfig: ProgrammaticScrollConfig = {
      smooth: SCROLL.DEFAULT_BEHAVIOR === "smooth",
      duration: SCROLL.DEFAULT_EASING_DURATION,
      easing: SCROLL.DEFAULT_EASING as "ease-out",
      restorePosition: true,
      enableBoundaries: SCROLL.ENABLE_BOUNDARIES,
      bounceThreshold: 50,
      ...config,
    };

    // Animation state
    let animationState: ScrollAnimationState = {
      isScrolling: false,
      startTime: 0,
      startPosition: 0,
      targetPosition: 0,
      duration: 0,
      easing: "ease-out",
      animationId: null,
    };

    // Stored scroll position for restoration
    let storedScrollPosition = 0;

    // Get viewport element
    const getViewportElement = (): HTMLElement | null => {
      const container = listManager.getConfig().container;
      return container?.querySelector(`.${CLASSES.VIEWPORT}`) || null;
    };

    /**
     * Calculate target scroll position
     */
    const calculateTargetPosition = (
      target: ScrollTarget,
      viewportInfo: ViewportInfo
    ): number => {
      const viewport = getViewportElement();
      if (!viewport) return 0;

      let targetPosition = 0;

      if (target.index !== undefined) {
        // Scroll to specific index
        const itemHeight = 50; // TODO: Get from height manager
        targetPosition = target.index * itemHeight;

        // Adjust for alignment
        if (target.alignment) {
          switch (target.alignment) {
            case "center":
              targetPosition -= viewportInfo.containerHeight / 2;
              break;
            case "end":
              targetPosition -= viewportInfo.containerHeight - itemHeight;
              break;
            case "start":
            default:
              // Already positioned at start
              break;
          }
        }
      } else if (target.position !== undefined) {
        // Scroll to specific position
        if (target.position === "top") {
          targetPosition = 0;
        } else if (target.position === "bottom") {
          targetPosition =
            viewportInfo.totalHeight - viewportInfo.containerHeight;
        } else if (typeof target.position === "number") {
          targetPosition = target.position;
        }
      } else if (target.itemId) {
        // TODO: Find item by ID and scroll to it
        console.warn(`${LOGGING.PREFIX} Scroll to item ID not yet implemented`);
        return viewport.scrollTop;
      }

      // Apply offset
      if (target.offset) {
        targetPosition += target.offset;
      }

      // Ensure within boundaries
      if (scrollConfig.enableBoundaries) {
        targetPosition = Math.max(
          0,
          Math.min(
            targetPosition,
            viewportInfo.totalHeight - viewportInfo.containerHeight
          )
        );
      }

      return targetPosition;
    };

    /**
     * Perform smooth scroll animation
     */
    const smoothScroll = (
      targetPosition: number,
      options: ScrollOptions
    ): Promise<void> => {
      return new Promise((resolve) => {
        const viewport = getViewportElement();
        if (!viewport) {
          resolve();
          return;
        }

        const startPosition = viewport.scrollTop;
        const distance = targetPosition - startPosition;
        const duration = options.duration || scrollConfig.duration;
        const easing = options.easing || scrollConfig.easing;

        // If distance is very small, skip animation
        if (Math.abs(distance) < 1) {
          viewport.scrollTop = targetPosition;
          options.callback?.();
          resolve();
          return;
        }

        // Setup animation state
        animationState = {
          isScrolling: true,
          startTime: performance.now(),
          startPosition,
          targetPosition,
          duration,
          easing,
          animationId: null,
          callback: options.callback,
        };

        // Animation function
        const animate = (currentTime: number) => {
          const elapsed = currentTime - animationState.startTime;
          const progress = Math.min(elapsed / duration, 1);

          // Apply easing
          const easingFunction =
            easingFunctions[easing] || easingFunctions.linear;
          const easedProgress = easingFunction(progress);

          // Calculate current position
          const currentPosition = startPosition + distance * easedProgress;
          viewport.scrollTop = currentPosition;

          // Emit scroll events
          listManager.emit("scroll:position:changed", {
            scrollTop: currentPosition,
            progress: easedProgress,
            target: targetPosition,
          });

          if (progress < 1) {
            animationState.animationId = requestAnimationFrame(animate);
          } else {
            // Animation complete
            viewport.scrollTop = targetPosition;
            animationState.isScrolling = false;
            animationState.animationId = null;

            listManager.emit("scroll:end", {
              scrollTop: targetPosition,
              duration: elapsed,
            });

            animationState.callback?.();
            resolve();
          }
        };

        // Start animation
        listManager.emit("scroll:start", {
          from: startPosition,
          to: targetPosition,
          duration,
        });

        animationState.animationId = requestAnimationFrame(animate);
      });
    };

    /**
     * Perform instant scroll
     */
    const instantScroll = (
      targetPosition: number,
      options: ScrollOptions
    ): void => {
      const viewport = getViewportElement();
      if (!viewport) return;

      const previousPosition = viewport.scrollTop;
      viewport.scrollTop = targetPosition;

      listManager.emit("scroll:position:changed", {
        scrollTop: targetPosition,
        previous: previousPosition,
        instant: true,
      });

      options.callback?.();
    };

    /**
     * Cancel current scroll animation
     */
    const cancelScroll = (): void => {
      if (animationState.animationId) {
        cancelAnimationFrame(animationState.animationId);
        animationState.animationId = null;
        animationState.isScrolling = false;

        listManager.emit("scroll:cancelled", {
          position: getViewportElement()?.scrollTop || 0,
        });
      }
    };

    /**
     * Store current scroll position
     */
    const storePosition = (): void => {
      const viewport = getViewportElement();
      if (viewport) {
        storedScrollPosition = viewport.scrollTop;
      }
    };

    /**
     * Restore stored scroll position
     */
    const restorePosition = (options: ScrollOptions = {}): Promise<void> => {
      if (storedScrollPosition > 0) {
        return scrollTo(
          {
            position: storedScrollPosition,
          },
          {
            behavior: "smooth",
            ...options,
          }
        );
      }
      return Promise.resolve();
    };

    /**
     * Main scroll function
     */
    const scrollTo = (
      target: ScrollTarget,
      options: ScrollOptions = {}
    ): Promise<void> => {
      const viewport = getViewportElement();
      if (!viewport) {
        return Promise.reject(new Error("No viewport element found"));
      }

      // Cancel any ongoing scroll
      cancelScroll();

      const viewportInfo = listManager.getViewportInfo();
      const targetPosition = calculateTargetPosition(target, viewportInfo);
      const behavior =
        options.behavior || (scrollConfig.smooth ? "smooth" : "instant");

      if (behavior === "smooth") {
        return smoothScroll(targetPosition, options);
      } else {
        instantScroll(targetPosition, options);
        return Promise.resolve();
      }
    };

    /**
     * Scroll by relative amount
     */
    const scrollBy = (
      delta: number,
      options: ScrollOptions = {}
    ): Promise<void> => {
      const viewport = getViewportElement();
      if (!viewport) {
        return Promise.reject(new Error("No viewport element found"));
      }

      const currentPosition = viewport.scrollTop;
      return scrollTo(
        {
          position: currentPosition + delta,
        },
        options
      );
    };

    /**
     * Check if scroll boundaries are exceeded
     */
    const checkBoundaries = (
      position: number
    ): {
      exceeded: boolean;
      direction: "top" | "bottom" | null;
      bounce: number;
    } => {
      const viewportInfo = listManager.getViewportInfo();
      const maxScroll = viewportInfo.totalHeight - viewportInfo.containerHeight;

      if (position < -scrollConfig.bounceThreshold) {
        return { exceeded: true, direction: "top", bounce: -position };
      }

      if (position > maxScroll + scrollConfig.bounceThreshold) {
        return {
          exceeded: true,
          direction: "bottom",
          bounce: position - maxScroll,
        };
      }

      return { exceeded: false, direction: null, bounce: 0 };
    };

    // Store position when component initializes
    if (scrollConfig.restorePosition) {
      setTimeout(storePosition, 100);
    }

    // Return programmatic scroll API
    return {
      // Core scroll methods
      scrollTo,
      scrollBy,

      // Convenience methods
      scrollToIndex(index: number, options: ScrollOptions = {}) {
        return scrollTo({ index, alignment: "start" }, options);
      },

      scrollToTop(options: ScrollOptions = {}) {
        return scrollTo({ position: "top" }, options);
      },

      scrollToBottom(options: ScrollOptions = {}) {
        return scrollTo({ position: "bottom" }, options);
      },

      scrollToItem(itemId: string, options: ScrollOptions = {}) {
        return scrollTo({ itemId, alignment: "start" }, options);
      },

      // Position management
      storePosition,
      restorePosition,

      // Animation control
      cancelScroll,
      isScrolling: () => animationState.isScrolling,

      // Boundary checking
      checkBoundaries,

      // Configuration
      updateConfig(newConfig: Partial<ProgrammaticScrollConfig>) {
        Object.assign(scrollConfig, newConfig);
      },

      // Lifecycle
      destroy() {
        cancelScroll();
        console.log(`${LOGGING.PREFIX} Programmatic scroll destroyed`);
      },
    };
  },
});
