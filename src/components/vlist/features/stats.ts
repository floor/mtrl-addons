// src/components/vlist/features/stats.ts

/**
 * Stats feature for VList
 *
 * Tracks list statistics (count, position, progress) and automatically
 * updates layout elements. Provides a clean API for accessing stats and
 * emits events when stats change.
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
 *       ['position', { text: '0' }],
 *       ['slash', { text: '/' }],
 *       ['count', { text: '0' }],
 *       ['progress', { text: '0%' }]
 *     ]
 *   ],
 *
 *   stats: {
 *     elements: {
 *       count: 'count',
 *       position: 'position',
 *       progress: 'progress'
 *     },
 *     format: {
 *       count: (n) => n.toLocaleString(),
 *       position: (n) => n.toLocaleString(),
 *       progress: (p) => `${p}%`
 *     }
 *   },
 *
 *   collection: {
 *     adapter: {
 *       read: async ({ page, limit }) => {
 *         const response = await fetch(`/api/items?page=${page}&limit=${limit}`)
 *         return response.json()
 *       }
 *     }
 *   }
 * })
 *
 * // Events
 * vlist.on('stats:change', ({ count, position, progress }) => {
 *   console.log(`Viewing ${position} of ${count} (${progress}%)`)
 * })
 *
 * // API
 * const stats = vlist.getStats()
 * console.log(stats.count, stats.position, stats.progress)
 * ```
 */

import type { VListConfig, VListItem } from "../types";

/**
 * Stats configuration
 */
export interface StatsConfig {
  /** Layout element names to update */
  elements?: {
    /** Element name for total count display */
    count?: string;
    /** Element name for current position display */
    position?: string;
    /** Element name for progress percentage display */
    progress?: string;
  };

  /** Format functions for display values */
  format?: {
    /** Format count value (default: toLocaleString) */
    count?: (count: number) => string;
    /** Format position value (default: toLocaleString) */
    position?: (position: number) => string;
    /** Format progress value (default: `${p}%`) */
    progress?: (percent: number) => string;
  };
}

/**
 * Stats state
 */
interface StatsState {
  count: number;
  position: number;
  progress: number;
}

/**
 * Default format functions
 */
const defaultFormat = {
  count: (n: number): string => n.toLocaleString(),
  position: (n: number): string => n.toLocaleString(),
  progress: (p: number): string => `${p}%`,
};

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
 * Adds stats tracking functionality to VList component
 *
 * This feature:
 * 1. Tracks count (total items), position (first visible item), and progress (scroll %)
 * 2. Automatically updates layout elements when stats change
 * 3. Emits 'stats:change' event for app-specific handling
 * 4. Provides getStats() API for programmatic access
 *
 * @param config - VList configuration with stats options
 * @returns Feature function that enhances the VList component
 */
export const withStats = <T extends VListItem = VListItem>(
  config: VListConfig<T> & { stats?: StatsConfig },
) => {
  return (component: any): any => {
    const statsConfig = config.stats;

    // Skip if no stats config provided
    if (!statsConfig) {
      return component;
    }

    // Configuration with defaults
    const elements = statsConfig.elements || {};
    const format = {
      ...defaultFormat,
      ...statsConfig.format,
    };

    // Internal state
    const state: StatsState = {
      count: 0,
      position: 0,
      progress: 0,
    };

    // Track previous state for change detection
    let previousState: StatsState = { ...state };

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
     * Calculate progress percentage
     */
    const calculateProgress = (position: number, count: number): number => {
      if (count <= 0) return 0;
      return Math.round((position / count) * 100);
    };

    /**
     * Update count display
     */
    const updateCountDisplay = (): void => {
      if (elements.count) {
        const el = getLayoutElement(elements.count);
        updateElementText(el, format.count(state.count));
      }
    };

    /**
     * Update position display
     */
    const updatePositionDisplay = (): void => {
      if (elements.position) {
        const el = getLayoutElement(elements.position);
        updateElementText(el, format.position(state.position));
      }
    };

    /**
     * Update progress display
     */
    const updateProgressDisplay = (): void => {
      if (elements.progress) {
        const el = getLayoutElement(elements.progress);
        updateElementText(el, format.progress(state.progress));
      }
    };

    /**
     * Check if state has changed and emit event if so
     */
    const emitIfChanged = (): void => {
      const hasChanged =
        state.count !== previousState.count ||
        state.position !== previousState.position ||
        state.progress !== previousState.progress;

      if (hasChanged) {
        previousState = { ...state };
        component.emit?.("stats:change", {
          count: state.count,
          position: state.position,
          progress: state.progress,
        });
      }
    };

    /**
     * Update count from total items
     */
    const setCount = (count: number): void => {
      state.count = count;
      state.progress = calculateProgress(state.position, state.count);
      updateCountDisplay();
      updateProgressDisplay();
      emitIfChanged();
    };

    /**
     * Update position from visible range
     */
    const setPosition = (position: number): void => {
      state.position = position;
      state.progress = calculateProgress(state.position, state.count);
      updatePositionDisplay();
      updateProgressDisplay();
      emitIfChanged();
    };

    /**
     * Wire up event listeners after component is ready
     */
    const setup = (): void => {
      // Listen for total items changes
      if (component.on) {
        // When total items changes (from collection or explicit set)
        const unsubTotal = component.on(
          "viewport:total-items-changed",
          (data: { total: number }) => {
            setCount(data.total);
          },
        );
        if (unsubTotal) cleanupFns.push(unsubTotal);

        // When items change (includes total count)
        const unsubItems = component.on(
          "viewport:items-changed",
          (data: { totalItems: number }) => {
            setCount(data.totalItems);
          },
        );
        if (unsubItems) cleanupFns.push(unsubItems);

        // When visible range changes (for position tracking)
        const unsubRange = component.on(
          "viewport:range-changed",
          (data: {
            range: { start: number; end: number };
            visibleRange?: { start: number; end: number };
          }) => {
            // Use visibleRange (without overscan) if available, otherwise use range
            const actualVisible = data.visibleRange || data.range;
            // Position is 1-based for display (last visible item)
            const position = actualVisible.end + 1;
            setPosition(position);
          },
        );
        if (unsubRange) cleanupFns.push(unsubRange);

        // Listen for reload to reset stats
        const unsubReload = component.on("reload:start", () => {
          state.count = 0;
          state.position = 0;
          state.progress = 0;
          updateCountDisplay();
          updatePositionDisplay();
          updateProgressDisplay();
          previousState = { ...state };
        });
        if (unsubReload) cleanupFns.push(unsubReload);
      }

      // Initialize displays with current state (0 values)
      updateCountDisplay();
      updatePositionDisplay();
      updateProgressDisplay();
    };

    // Initialize after component is ready (layout needs to be built)
    setTimeout(setup, 0);

    // Store original destroy for chaining
    const originalDestroy = component.destroy;

    // Enhanced component with stats API
    return {
      ...component,

      /**
       * Get current stats
       * @returns Current stats state
       */
      getStats(): StatsState {
        return {
          count: state.count,
          position: state.position,
          progress: state.progress,
        };
      },

      /**
       * Get total item count
       * @returns Total item count
       */
      getCount(): number {
        return state.count;
      },

      /**
       * Get current position (1-based)
       * @returns Current position
       */
      getPosition(): number {
        return state.position;
      },

      /**
       * Get current progress percentage
       * @returns Progress percentage (0-100)
       */
      getProgress(): number {
        return state.progress;
      },

      /**
       * Manually set the count (useful when count comes from external source)
       * @param count - Total item count
       */
      setStatsCount(count: number): void {
        setCount(count);
      },

      /**
       * Enhanced destroy that cleans up stats listeners
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
 * Type helper for VList with stats
 */
export interface WithStatsComponent {
  /** Get all current stats */
  getStats(): StatsState;
  /** Get total item count */
  getCount(): number;
  /** Get current position (1-based) */
  getPosition(): number;
  /** Get current progress percentage (0-100) */
  getProgress(): number;
  /** Manually set the total count */
  setStatsCount(count: number): void;
}
