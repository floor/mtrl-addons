// src/core/viewport/constants.ts

/**
 * Viewport Constants
 * Centralized constants for all viewport functionality
 * Consolidated from viewport, viewport/features, and list-manager constants
 */

export const VIEWPORT_CONSTANTS = {
  // Virtual scrolling defaults
  VIRTUAL_SCROLL: {
    DEFAULT_ITEM_SIZE: 84,
    OVERSCAN_BUFFER: 2,
    SCROLL_SENSITIVITY: 0.2,
    MAX_VIRTUAL_SIZE: 10 * 1000 * 1000, // 10M pixels - well within browser limits
  },

  // Scrolling settings
  SCROLLING: {
    OVERSCAN: 1, // From features/constants
  },

  // Rendering settings
  RENDERING: {
    // Element recycling
    DEFAULT_MAX_POOL_SIZE: 100,
  },

  // Loading settings
  LOADING: {
    CANCEL_THRESHOLD: 1, // px/ms - velocity above which loads are cancelled
    MAX_CONCURRENT_REQUESTS: 1,
    DEFAULT_RANGE_SIZE: 20,
  },

  // Request queue configuration (from features/constants)
  REQUEST_QUEUE: {
    ENABLED: true,
    MAX_QUEUE_SIZE: 1, // Keep only a few requests in queue to avoid memory issues
    MAX_ACTIVE_REQUESTS: 2, // Sequential requests
  },

  // Placeholder settings
  PLACEHOLDER: {
    MASK_CHARACTER: "X", // Updated from list-manager
    CLASS: "viewport-item__placeholder",
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
    ENABLED: true, // Enable momentum by default
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
};

/**
 * Type for overriding constants at runtime
 */
export type ViewportConstants = typeof VIEWPORT_CONSTANTS;

/**
 * Helper function to merge user constants with defaults
 */
export function mergeConstants(
  userConstants: Partial<ViewportConstants> = {}
): ViewportConstants {
  return {
    ...VIEWPORT_CONSTANTS,
    ...userConstants,
  };
}
