// src/core/viewport/constants.ts

/**
 * Viewport Constants
 * Centralized constants for all viewport functionality
 * Consolidated from viewport, viewport/features, and list-manager constants
 */

export const VIEWPORT_CONSTANTS = {
  // Virtual scrolling defaults
  VIRTUAL_SCROLL: {
    DEFAULT_ITEM_SIZE: 48,
    OVERSCAN_BUFFER: 2,
    SCROLL_SENSITIVITY: 0.7,
    MAX_VIRTUAL_SIZE: 100 * 1000 * 1000, // 100M pixels - modern browsers can handle this
    AUTO_DETECT_ITEM_SIZE: true, // Enable automatic item size detection
  },

  // Scrolling settings
  SCROLLING: {
    OVERSCAN: 1, // From features/constants
  },

  // Rendering settings
  RENDERING: {
    // Element recycling
    DEFAULT_MAX_POOL_SIZE: 100,
    CLASSES: {
      ITEM: "viewport-item",
    },
  },

  // Loading settings
  LOADING: {
    CANCEL_THRESHOLD: 25, // px/ms - velocity above which loads cancel
    MAX_CONCURRENT_REQUESTS: 1, // Parallel requests allowed
    DEFAULT_RANGE_SIZE: 20, // Items per request
    DEBOUNCE_LOADING: 150, // Debounce delay (ms)
    MIN_RANGE_SIZE: 10, // Minimum items per load
    MAX_RANGE_SIZE: 100, // Maximum items per load
    REQUEST_TIMEOUT: 5000, // Request timeout (ms)
    RETRY_ATTEMPTS: 2, // Failed request retries
    RETRY_DELAY: 1000, // Delay between retries (ms)
  },

  // Request queue configuration (from features/constants)
  REQUEST_QUEUE: {
    ENABLED: true, // Enable request queuing
    MAX_QUEUE_SIZE: 1, // Max queued requests
    MAX_ACTIVE_REQUESTS: 2, // Max concurrent active requests
  },

  // Placeholder settings
  PLACEHOLDER: {
    MASK_CHARACTER: "X", // Updated from list-manager
    CLASS: "viewport-item--placeholder",
    MAX_SAMPLE_SIZE: 20,
    PLACEHOLDER_FLAG: "_placeholder",
    RANDOM_LENGTH_VARIANCE: true,
  },

  // Speed tracking (from list-manager)
  SPEED_TRACKING: {
    // Velocity calculation
    DECELERATION_FACTOR: 0.85, // velocity decay per frame
  },

  // Momentum settings
  MOMENTUM: {
    ENABLED: false, // Enable momentum by default
    DECELERATION_FACTOR: 0.85, // How quickly velocity decreases per frame
    MIN_VELOCITY: 0.1, // Minimum velocity before stopping (px/ms)
    MIN_DURATION: 300, // Maximum gesture duration to trigger momentum (ms)
    MIN_VELOCITY_THRESHOLD: 0.5, // Minimum velocity to trigger momentum (px/ms)
    FRAME_TIME: 16, // Assumed frame time for calculations (ms)
  },

  // Initial load configuration (from list-manager)
  INITIAL_LOAD: {
    STRATEGY: "placeholders", // "placeholders" | "direct" | "progressive"
    VIEWPORT_MULTIPLIER: 1.5, // load 1.5x viewport capacity
    MIN_ITEMS: 10,
    MAX_ITEMS: 100,
    PLACEHOLDER_COUNT: 20, // default placeholder count
    SHOW_LOADING_STATE: true,
    LOADING_DELAY: 100, // ms - delay before showing loading state
  },

  // Selection settings
  SELECTION: {
    SELECTED_CLASS: "viewport-item--selected",
  },

  // Scrollbar settings (from list-manager)
  SCROLLBAR: {
    // CSS classes
    CLASSES: {
      SCROLLBAR: "viewport__scrollbar",
      SCROLLBAR_TRACK: "viewport__scrollbar-track",
      SCROLLBAR_THUMB: "viewport__scrollbar-thumb",
      SCROLLBAR_VISIBLE: "viewport__scrollbar--visible",
      SCROLLBAR_DRAGGING: "viewport__scrollbar--dragging",
      SCROLLBAR_THUMB_DRAGGING: "viewport__scrollbar-thumb--dragging",
    },
  },

  // Orientation (from list-manager)
  ORIENTATION: {
    DEFAULT_ORIENTATION: "vertical",
    DEFAULT_CROSS_AXIS_ALIGNMENT: "stretch",
    REVERSE_DIRECTION: false,
  },

  PAGINATION: {
    DEFAULT_STRATEGY: "offset" as "offset" | "page" | "cursor",
    DEFAULT_LIMIT: 20,
    STRATEGIES: {
      PAGE: "page" as const,
      OFFSET: "offset" as const,
      CURSOR: "cursor" as const,
    },
    CURSOR_CLEANUP_INTERVAL: 60000, // Clean up old cursors every minute
    MAX_CURSOR_MAP_SIZE: 1000, // Maximum number of cursors to keep in memory
    // Cursor-specific virtual sizing
    CURSOR_SCROLL_MARGIN_MULTIPLIER: 3, // Multiply rangeSize by this for scroll margin
    CURSOR_MIN_VIRTUAL_SIZE_MULTIPLIER: 3, // Minimum virtual size as multiplier of rangeSize
  },
};

/**
 * Type for overriding constants at runtime
 */
export type ViewportConstants = typeof VIEWPORT_CONSTANTS;

/**
 * Helper function to merge user constants with defaults
 */
export function mergeConstants(
  userConstants: Partial<ViewportConstants> = {},
): ViewportConstants {
  return {
    ...VIEWPORT_CONSTANTS,
    ...userConstants,
  };
}
