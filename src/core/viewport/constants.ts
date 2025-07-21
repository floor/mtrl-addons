// src/core/viewport/constants.ts

/**
 * Viewport Constants
 * Centralized constants for all viewport functionality
 * Consolidated from viewport, viewport/features, and list-manager constants
 */

export const VIEWPORT_CONSTANTS = {
  // Virtual scrolling defaults
  VIRTUAL_SCROLL: {
    DEFAULT_ITEM_SIZE: 84, // Updated from list-manager (was 50)
    OVERSCAN_BUFFER: 2, // Updated from list-manager (was 3)
    MIN_ITEM_SIZE: 20,
    MAX_ITEM_SIZE: 1000,
    SCROLL_SENSITIVITY: 1.0,
    MAX_VIRTUAL_SIZE: 10 * 1000 * 1000, // 10M pixels - well within browser limits
  },

  // Scrolling settings
  SCROLLING: {
    OVERSCAN: 2, // From features/constants
    WHEEL_MULTIPLIER: 1,
    TOUCH_MULTIPLIER: 1,
    THROTTLE_SCROLL: 8, // ms - from list-manager

    // Scroll behavior
    DEFAULT_BEHAVIOR: "smooth",
    DEFAULT_EASING: "ease-in-out",
    DEFAULT_EASING_DURATION: 300,
  },

  // Rendering settings
  RENDERING: {
    BATCH_SIZE: 100,
    MIN_RENDER_INTERVAL: 16, // ~60fps
    MIN_ITEM_HEIGHT: 20, // From features/constants

    // Element recycling
    DEFAULT_MAX_POOL_SIZE: 100,
    DEFAULT_MIN_POOL_SIZE: 10,
    DEFAULT_STRATEGY: "lru",
  },

  // Loading settings
  LOADING: {
    CANCEL_THRESHOLD: 1, // px/ms - velocity above which loads are cancelled
    MAX_CONCURRENT_REQUESTS: 1,
    DEFAULT_RANGE_SIZE: 20,
    DEBOUNCE_LOADING: 150, // ms - from list-manager

    // Range loading (from list-manager)
    MIN_RANGE_SIZE: 10,
    MAX_RANGE_SIZE: 100,
    BUFFER_SIZE: 3, // extra items to maintain
    PREFETCH_RANGES: 0, // ranges to load ahead
    PREFETCH_THRESHOLD: 0.8, // start prefetch when 80% through current range
    PRELOAD_DIRECTION_BIAS: 0.7, // 70% in scroll direction, 30% opposite
    REQUEST_TIMEOUT: 5000, // 5 seconds
    RETRY_ATTEMPTS: 2,
    RETRY_DELAY: 1000, // 1 second
    RANGE_OVERLAP: 0.1, // 10% overlap between ranges
    DYNAMIC_RANGE_SIZING: true,
    VIEWPORT_SIZE_MULTIPLIER: 2, // range size = viewport * multiplier
  },

  // Request queue configuration (from features/constants)
  REQUEST_QUEUE: {
    ENABLED: true,
    MAX_QUEUE_SIZE: 1, // Keep only a few requests in queue to avoid memory issues
    MAX_ACTIVE_REQUESTS: 1, // Sequential requests
  },

  // Placeholder settings
  PLACEHOLDER: {
    MASK_CHARACTER: "x", // Updated from list-manager
    CSS_CLASS: "viewport-item__placeholder",
    MIN_SAMPLE_SIZE: 5,
    MAX_SAMPLE_SIZE: 20,
    PLACEHOLDER_FLAG: "_placeholder", // From list-manager
    PLACEHOLDER_TIMEOUT: 100, // ms - delay before showing placeholders
    EMPTY_RANGE_CACHE_TIME: 5 * 60 * 1000, // 5 minutes
    RANDOM_LENGTH_VARIANCE: true, // From list-manager

    // Pattern analysis
    PATTERN_ANALYSIS: {
      SAMPLE_SIZE: 50, // analyze first N items
    },
  },

  // Performance settings
  PERFORMANCE: {
    RESIZE_DEBOUNCE: 150,

    // FPS monitoring
    DEFAULT_FPS_TARGET: 60,
    MEMORY_WARNING_THRESHOLD: 0.8, // 80% of threshold
    PERFORMANCE_ENABLED: true,
  },

  // Speed tracking (from list-manager)
  SPEED_TRACKING: {
    // Velocity thresholds (px/ms)
    FAST_SCROLL_THRESHOLD: 20, // px/ms - typical mouse wheel fast scroll
    SLOW_SCROLL_THRESHOLD: 10, // px/ms - slow scrolling
    CANCEL_LOAD_THRESHOLD: 15, // px/ms - cancel loads above this speed

    // Velocity calculation
    DECELERATION_FACTOR: 0.85, // velocity decay per frame
    MEASUREMENT_WINDOW: 100, // ms - window for speed calculation
    MIN_MEASUREMENT_INTERVAL: 16, // ms - minimum time between measurements

    // Smoothing
    VELOCITY_SMOOTHING: true,
    SMOOTHING_FACTOR: 0.3, // weight of new velocity vs smoothed

    // Direction detection
    ACCELERATION_THRESHOLD: 0.5, // px/ms² - detect acceleration
    DIRECTION_CHANGE_THRESHOLD: 0.1, // px/ms - minimum velocity to detect direction change

    // Momentum
    MOMENTUM_DECAY_TIME: 1000, // ms - time for momentum to decay
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

  // Boundary handling (from list-manager)
  BOUNDARIES: {
    PREVENT_OVERSCROLL: true,
    MAINTAIN_EDGE_RANGES: true,
    BOUNDARY_RESISTANCE: 0.3,
    BOUNCE_BACK_DURATION: 300,
    EDGE_TOLERANCE: 5,
    MIN_SCROLL_POSITION: 0,
    MAX_SCROLL_BUFFER: 100, // px - extra scroll at bottom
  },

  // Scrollbar settings (from list-manager)
  SCROLLBAR: {
    // Dimensions
    TRACK_WIDTH: 8,
    THUMB_MIN_HEIGHT: 20,
    BORDER_RADIUS: 4,

    // Colors
    THUMB_COLOR: "#999999",
    TRACK_COLOR: "#f0f0f0",

    // Behavior
    FADE_TIMEOUT: 1000,

    // CSS classes
    CLASSES: {
      SCROLLBAR: "viewport__scrollbar",
      SCROLLBAR_TRACK: "viewport__scrollbar-track",
      SCROLLBAR_THUMB: "viewport__scrollbar-thumb",
      SCROLLBAR_ENABLED: "viewport__scrollbar-enabled",
      SCROLLBAR_SCROLLING: "viewport__scrollbar--scrolling",
      SCROLLBAR_DRAGGING: "viewport__scrollbar--dragging",
      SCROLLBAR_THUMB_DRAGGING: "viewport__scrollbar-thumb--dragging",
    },
  },

  // Viewport management (from list-manager)
  VIEWPORT_MANAGEMENT: {
    // Intersection observer settings
    DEFAULT_INTERSECTION_THRESHOLD: 0.1,
    DEFAULT_INTERSECTION_ROOT_MARGIN: "50px",
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
