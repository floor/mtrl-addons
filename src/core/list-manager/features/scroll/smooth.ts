import type { ListManagerPlugin } from "../../types";
import { SCROLL, LOGGING } from "../../constants";

/**
 * Smooth scroll configuration
 */
export interface SmoothScrollConfig {
  enabled: boolean;
  duration: number;
  easing: "ease" | "ease-in" | "ease-out" | "ease-in-out" | "linear";
  cancelOnUserScroll: boolean;
  respectReducedMotion: boolean;
}

/**
 * Smooth scroll plugin
 */
export const smoothScroll = (
  config: Partial<SmoothScrollConfig> = {}
): ListManagerPlugin => ({
  name: "smooth-scroll",
  version: "1.0.0",
  dependencies: [],

  install: (listManager, pluginConfig) => {
    // Configuration with defaults
    const smoothConfig: SmoothScrollConfig = {
      enabled: true,
      duration: SCROLL.DEFAULT_EASING_DURATION,
      easing: SCROLL.DEFAULT_EASING as "ease-out",
      cancelOnUserScroll: true,
      respectReducedMotion: true,
      ...config,
    };

    // Check for reduced motion preference
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    if (prefersReducedMotion && smoothConfig.respectReducedMotion) {
      smoothConfig.enabled = false;
    }

    // Animation state
    let currentAnimation: number | null = null;
    let isUserScrolling = false;

    /**
     * Cancel current animation
     */
    const cancelAnimation = (): void => {
      if (currentAnimation) {
        cancelAnimationFrame(currentAnimation);
        currentAnimation = null;
      }
    };

    /**
     * Smooth scroll to position
     */
    const smoothScrollTo = (
      target: number,
      duration: number = smoothConfig.duration,
      easing: string = smoothConfig.easing
    ): Promise<void> => {
      return new Promise((resolve) => {
        if (!smoothConfig.enabled) {
          resolve();
          return;
        }

        // Cancel any existing animation
        cancelAnimation();

        const viewport = listManager.getViewport?.();
        if (!viewport) {
          resolve();
          return;
        }

        const startPosition = viewport.scrollTop;
        const distance = target - startPosition;
        const startTime = performance.now();

        const animate = (currentTime: number) => {
          const elapsed = currentTime - startTime;
          const progress = Math.min(elapsed / duration, 1);

          // Apply easing
          const easedProgress = applyEasing(progress, easing);
          const currentPosition = startPosition + distance * easedProgress;

          viewport.scrollTop = currentPosition;

          if (progress < 1 && !isUserScrolling) {
            currentAnimation = requestAnimationFrame(animate);
          } else {
            currentAnimation = null;
            resolve();
          }
        };

        currentAnimation = requestAnimationFrame(animate);
      });
    };

    /**
     * Apply easing function
     */
    const applyEasing = (t: number, easing: string): number => {
      switch (easing) {
        case "ease-in":
          return t * t;
        case "ease-out":
          return t * (2 - t);
        case "ease-in-out":
          return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
        case "linear":
          return t;
        case "ease":
        default:
          return t * t * (3 - 2 * t);
      }
    };

    /**
     * Handle user scroll events
     */
    const handleUserScroll = (): void => {
      if (smoothConfig.cancelOnUserScroll) {
        isUserScrolling = true;
        cancelAnimation();

        // Reset user scrolling flag after a delay
        setTimeout(() => {
          isUserScrolling = false;
        }, 100);
      }
    };

    // Setup user scroll detection
    const viewport = listManager.getViewport?.();
    if (viewport) {
      viewport.addEventListener("wheel", handleUserScroll, { passive: true });
      viewport.addEventListener("touchstart", handleUserScroll, {
        passive: true,
      });
    }

    // Return smooth scroll API
    return {
      smoothScrollTo,
      cancelAnimation,

      isAnimating: () => currentAnimation !== null,

      updateConfig(newConfig: Partial<SmoothScrollConfig>): void {
        Object.assign(smoothConfig, newConfig);
      },

      destroy(): void {
        cancelAnimation();
        if (viewport) {
          viewport.removeEventListener("wheel", handleUserScroll);
          viewport.removeEventListener("touchstart", handleUserScroll);
        }
        console.log(`${LOGGING.PREFIX} Smooth scroll destroyed`);
      },
    };
  },
});
