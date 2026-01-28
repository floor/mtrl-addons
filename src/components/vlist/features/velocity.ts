// src/components/vlist/features/velocity.ts

/**
 * Velocity feature for VList
 *
 * Displays scroll velocity in layout elements. Listens to viewport velocity
 * events and updates designated layout elements with formatted velocity values.
 *
 * This feature provides the display mechanism. Application-specific features
 * like global averaging across lists and localStorage persistence should be
 * handled at the application level.
 *
 * @example
 * ```typescript
 * const vlist = createVList({
 *   layout: [
 *     ['head', { class: 'head' },
 *       ['title', { text: 'Users' }]
 *     ],
 *     ['viewport'],
 *     ['foot', { class: 'foot' },
 *       ['velocity', { class: 'velocity' },
 *         ['velocity-current', { text: '0.00' }],
 *         ['velocity-sep', { text: '/' }],
 *         ['velocity-avg', { text: '0.00' }],
 *         ['velocity-label', { text: 'px/ms' }]
 *       ]
 *     ]
 *   ],
 *
 *   velocity: {
 *     elements: {
 *       current: 'velocity-current',
 *       average: 'velocity-avg'
 *     },
 *     format: (v) => v.toFixed(2),
 *     // Optional: track average within this list instance
 *     trackAverage: true,
 *     // Optional: max velocity to include in average (filters out scrollbar drag)
 *     maxVelocityForAverage: 50
 *   },
 *
 *   collection: { ... }
 * })
 *
 * // Events
 * vlist.on('velocity:change', ({ velocity, direction, average }) => {
 *   console.log(`Velocity: ${velocity} px/ms (avg: ${average})`)
 * })
 *
 * // API
 * const velocity = vlist.getVelocity()
 * const average = vlist.getAverageVelocity()
 * vlist.resetVelocityAverage()
 * ```
 */

import type { VListConfig, VListItem } from "../types";

/**
 * Velocity configuration
 */
export interface VelocityConfig {
  /** Layout element names to update */
  elements?: {
    /** Element name for current velocity display */
    current?: string;
    /** Element name for average velocity display */
    average?: string;
  };

  /** Format function for velocity values (default: toFixed(2)) */
  format?: (velocity: number) => string;

  /** Whether to track average velocity within this instance (default: false) */
  trackAverage?: boolean;

  /**
   * Maximum velocity to include in average calculation (default: 50)
   * Higher velocities (e.g., from scrollbar dragging) are excluded
   */
  maxVelocityForAverage?: number;

  /**
   * Minimum velocity to include in average calculation (default: 0.1)
   * Filters out noise from near-zero velocities
   */
  minVelocityForAverage?: number;

  /**
   * Callback for external average tracking (e.g., global across lists)
   * When provided, allows the app to manage its own averaging logic
   */
  onVelocityUpdate?: (velocity: number) => void;
}

/**
 * Velocity state
 */
interface VelocityState {
  current: number;
  direction: "forward" | "backward";
  // For internal average tracking
  sum: number;
  count: number;
}

/**
 * Default format function
 */
const defaultFormat = (velocity: number): string => velocity.toFixed(2);

/**
 * Get DOM element from layout item (handles both raw elements and components)
 */
const getElement = (layoutItem: any): HTMLElement | null => {
  if (!layoutItem) return null;
  if (layoutItem instanceof HTMLElement) return layoutItem;
  if (layoutItem.element instanceof HTMLElement) return layoutItem.element;
  return null;
};

/**
 * Update an element's text content
 */
const updateElementText = (element: HTMLElement | null, text: string): void => {
  if (element) {
    element.textContent = text;
  }
};

/**
 * Adds velocity display functionality to VList component
 *
 * This feature:
 * 1. Listens to viewport:velocity-changed events
 * 2. Updates layout elements with formatted velocity values
 * 3. Optionally tracks average velocity within the instance
 * 4. Emits 'velocity:change' event for app-specific handling
 * 5. Provides API for getting velocity and average
 *
 * @param config - VList configuration with velocity options
 * @returns Feature function that enhances the VList component
 */
export const withVelocity = <T extends VListItem = VListItem>(
  config: VListConfig<T> & { velocity?: VelocityConfig }
) => {
  return (component: any): any => {
    const velocityConfig = config.velocity;

    // Skip if no velocity config provided
    if (!velocityConfig) {
      return component;
    }

    // Configuration with defaults
    const elements = velocityConfig.elements || {};
    const format = velocityConfig.format || defaultFormat;
    const trackAverage = velocityConfig.trackAverage ?? false;
    const maxVelocityForAverage = velocityConfig.maxVelocityForAverage ?? 50;
    const minVelocityForAverage = velocityConfig.minVelocityForAverage ?? 0.1;
    const onVelocityUpdate = velocityConfig.onVelocityUpdate;

    // Internal state
    const state: VelocityState = {
      current: 0,
      direction: "forward",
      sum: 0,
      count: 0,
    };

    // Store cleanup functions
    const cleanupFns: Array<() => void> = [];

    /**
     * Get layout element by name
     */
    const getLayoutElement = (name: string): HTMLElement | null => {
      if (!name || !component.layout) return null;
      return getElement(component.layout[name]);
    };

    /**
     * Calculate average velocity
     */
    const getAverage = (): number => {
      return state.count > 0 ? state.sum / state.count : 0;
    };

    /**
     * Update current velocity display
     */
    const updateCurrentDisplay = (): void => {
      if (elements.current) {
        const el = getLayoutElement(elements.current);
        updateElementText(el, format(Math.abs(state.current)));
      }
    };

    /**
     * Update average velocity display
     */
    const updateAverageDisplay = (): void => {
      if (elements.average) {
        const el = getLayoutElement(elements.average);
        updateElementText(el, format(getAverage()));
      }
    };

    /**
     * Handle velocity change event
     */
    const handleVelocityChange = (data: {
      velocity: number;
      direction: "forward" | "backward";
    }): void => {
      const velocity = Math.abs(data.velocity);
      state.current = velocity;
      state.direction = data.direction;

      // Update current display
      updateCurrentDisplay();

      // Track average if enabled and velocity is in valid range
      if (trackAverage) {
        if (
          velocity > minVelocityForAverage &&
          velocity < maxVelocityForAverage
        ) {
          state.sum += velocity;
          state.count++;
          updateAverageDisplay();
        }
      }

      // Call external handler if provided
      if (onVelocityUpdate) {
        onVelocityUpdate(velocity);
      }

      // Emit velocity change event
      component.emit?.("velocity:change", {
        velocity,
        direction: data.direction,
        average: getAverage(),
      });
    };

    /**
     * Handle idle event (velocity becomes 0)
     */
    const handleIdle = (): void => {
      state.current = 0;
      updateCurrentDisplay();

      component.emit?.("velocity:idle", {
        average: getAverage(),
      });
    };

    /**
     * Wire up event listeners after component is ready
     */
    const setup = (): void => {
      // Listen for velocity changes from viewport
      if (component.on) {
        const unsubVelocity = component.on(
          "viewport:velocity-changed",
          handleVelocityChange
        );
        if (unsubVelocity) cleanupFns.push(unsubVelocity);

        const unsubIdle = component.on("viewport:idle", handleIdle);
        if (unsubIdle) cleanupFns.push(unsubIdle);

        // Listen for reload to reset current velocity (but preserve average)
        const unsubReload = component.on("reload:start", () => {
          state.current = 0;
          updateCurrentDisplay();
        });
        if (unsubReload) cleanupFns.push(unsubReload);
      }

      // Initialize displays
      updateCurrentDisplay();
      updateAverageDisplay();
    };

    // Initialize after component is ready (layout needs to be built)
    setTimeout(setup, 0);

    // Store original destroy for chaining
    const originalDestroy = component.destroy;

    // Enhanced component with velocity API
    return {
      ...component,

      /**
       * Get current velocity
       * @returns Current velocity in px/ms
       */
      getVelocity(): number {
        return state.current;
      },

      /**
       * Get current scroll direction
       * @returns 'forward' or 'backward'
       */
      getVelocityDirection(): "forward" | "backward" {
        return state.direction;
      },

      /**
       * Get average velocity (if trackAverage is enabled)
       * @returns Average velocity in px/ms
       */
      getAverageVelocity(): number {
        return getAverage();
      },

      /**
       * Get velocity statistics
       * @returns Velocity stats including count for averaging
       */
      getVelocityStats(): {
        current: number;
        direction: "forward" | "backward";
        average: number;
        sampleCount: number;
      } {
        return {
          current: state.current,
          direction: state.direction,
          average: getAverage(),
          sampleCount: state.count,
        };
      },

      /**
       * Reset average velocity tracking
       */
      resetVelocityAverage(): void {
        state.sum = 0;
        state.count = 0;
        updateAverageDisplay();
      },

      /**
       * Manually update the average display (for external average tracking)
       * @param average - The average velocity to display
       */
      setAverageVelocityDisplay(average: number): void {
        if (elements.average) {
          const el = getLayoutElement(elements.average);
          updateElementText(el, format(average));
        }
      },

      /**
       * Enhanced destroy that cleans up velocity listeners
       */
      destroy(): void {
        // Run all cleanup functions
        cleanupFns.forEach((fn) => {
          try {
            fn();
          } catch (e) {
            // Ignore cleanup errors
          }
        });
        cleanupFns.length = 0;

        // Call original destroy
        if (typeof originalDestroy === "function") {
          originalDestroy.call(this);
        }
      },
    };
  };
};

/**
 * Type helper for VList with velocity
 */
export interface WithVelocityComponent {
  /** Get current velocity in px/ms */
  getVelocity(): number;
  /** Get current scroll direction */
  getVelocityDirection(): "forward" | "backward";
  /** Get average velocity in px/ms */
  getAverageVelocity(): number;
  /** Get velocity statistics */
  getVelocityStats(): {
    current: number;
    direction: "forward" | "backward";
    average: number;
    sampleCount: number;
  };
  /** Reset average velocity tracking */
  resetVelocityAverage(): void;
  /** Manually update average display (for external tracking) */
  setAverageVelocityDisplay(average: number): void;
}
