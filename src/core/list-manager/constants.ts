/**
 * Constants for the mtrl-addons List Manager (Performance Layer)
 *
 * Performance-related constants only - NO DATA constants
 */

/**
 * Virtual scrolling constants - unified virtual viewport + custom scrollbar strategy
 */
export const VIRTUAL_SCROLLING = {
  // Virtual viewport strategy
  DEFAULT_OVERSCAN: 2,
} as const;

/**
 * Element recycling constants
 */
export const ELEMENT_RECYCLING = {
  // Pool management
  DEFAULT_MAX_POOL_SIZE: 100,
  DEFAULT_MIN_POOL_SIZE: 10,

  // Recycling strategies
  DEFAULT_STRATEGY: "lru",
} as const;

/**
 * Viewport management constants
 */
export const VIEWPORT = {
  // Intersection observer settings
  DEFAULT_INTERSECTION_THRESHOLD: 0.1,
  DEFAULT_INTERSECTION_ROOT_MARGIN: "50px",
} as const;

/**
 * Performance monitoring constants
 */
export const PERFORMANCE = {
  // FPS monitoring
  DEFAULT_FPS_TARGET: 60,

  // Memory monitoring
  MEMORY_WARNING_THRESHOLD: 0.8, // 80% of threshold
} as const;

/**
 * Scroll behavior constants
 */
export const SCROLL = {
  // Scroll behavior
  DEFAULT_BEHAVIOR: "smooth",

  // Scroll easing
  DEFAULT_EASING: "ease-in-out",
  DEFAULT_EASING_DURATION: 300,
} as const;

/**
 * CSS classes for List Manager components
 */
export const CLASSES = {
  // Scrollbar classes
  SCROLLBAR: "list__scrollbar",
  SCROLLBAR_TRACK: "list__scrollbar-track",
  SCROLLBAR_THUMB: "list__scrollbar-thumb",
  SCROLLBAR_ENABLED: "list__scrollbar-enabled",
  SCROLLBAR_SCROLLING: "list__scrollbar--scrolling",
  SCROLLBAR_DRAGGING: "list__scrollbar--dragging",
  SCROLLBAR_THUMB_DRAGGING: "list__scrollbar-thumb--dragging",
} as const;

/**
 * List Manager defaults for initialization
 */
export const LIST_MANAGER_DEFAULTS = {
  // Performance defaults
  PERFORMANCE_ENABLED: true,
} as const;

/**
 * Orientation constants
 */
export const ORIENTATION = {
  // Default orientation
  DEFAULT_ORIENTATION: "vertical",
  DEFAULT_CROSS_AXIS_ALIGNMENT: "stretch",
  REVERSE_DIRECTION: false,
} as const;

/**
 * Speed tracking constants for velocity-based loading
 */
export const SPEED_TRACKING = {
  // Velocity thresholds (px/ms)
  FAST_SCROLL_THRESHOLD: 3, // px/ms - typical mouse wheel fast scroll
  SLOW_SCROLL_THRESHOLD: 0.5, // px/ms - slow scrolling
  CANCEL_LOAD_THRESHOLD: 15, // px/ms - cancel loads above this speed

  // Velocity calculation
  DECELERATION_FACTOR: 0.95, // velocity decay per frame
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
} as const;

/**
 * Range loading constants
 */
export const RANGE_LOADING = {
  // Range sizing
  DEFAULT_RANGE_SIZE: 20, // items per range
  MIN_RANGE_SIZE: 10,
  MAX_RANGE_SIZE: 100,

  // Buffer management
  BUFFER_SIZE: 10, // extra items to maintain
  MIN_BUFFER_SIZE: 5,
  MAX_BUFFER_SIZE: 50,

  // Prefetching
  PREFETCH_RANGES: 0, // ranges to load ahead
  PREFETCH_THRESHOLD: 0.8, // start prefetch when 80% through current range
  PRELOAD_DIRECTION_BIAS: 0.7, // 70% in scroll direction, 30% opposite

  // Request management
  MAX_CONCURRENT_REQUESTS: 3,
  REQUEST_TIMEOUT: 5000, // 5 seconds
  RETRY_ATTEMPTS: 2,
  RETRY_DELAY: 1000, // 1 second

  // Range optimization
  RANGE_OVERLAP: 0.1, // 10% overlap between ranges
  DYNAMIC_RANGE_SIZING: true,
  VIEWPORT_SIZE_MULTIPLIER: 2, // range size = viewport * multiplier

  // Placeholder management
  PLACEHOLDER_TIMEOUT: 100, // ms - delay before showing placeholders
  EMPTY_RANGE_CACHE_TIME: 5 * 60 * 1000, // 5 minutes
} as const;

/**
 * Placeholder configuration
 */
export const PLACEHOLDER = {
  // Feature flags
  PLACEHOLDER_FLAG: "_placeholder",

  // Pattern analysis
  PATTERN_ANALYSIS: {
    SAMPLE_SIZE: 50, // analyze first N items
  },
} as const;

/**
 * Initial load configuration
 */
export const INITIAL_LOAD = {
  // Load strategy
  STRATEGY: "placeholders", // "placeholders" | "direct" | "progressive"
  VIEWPORT_MULTIPLIER: 1.5, // load 1.5x viewport capacity
  MIN_INITIAL_ITEMS: 10,
  MAX_INITIAL_ITEMS: 100,

  // Placeholder generation
  PLACEHOLDER_COUNT: 20, // default placeholder count
  SHOW_LOADING_STATE: true,
  LOADING_DELAY: 100, // ms - delay before showing loading state
} as const;

/**
 * Boundary handling constants
 */
export const BOUNDARIES = {
  // Overscroll prevention
  PREVENT_OVERSCROLL: true,
  MAINTAIN_EDGE_RANGES: true,

  // Boundary physics
  BOUNDARY_RESISTANCE: 0.3,
  BOUNCE_BACK_DURATION: 300,
  EDGE_TOLERANCE: 5,

  // Scroll limits
  MIN_SCROLL_POSITION: 0,
  MAX_SCROLL_BUFFER: 100, // px - extra scroll at bottom
} as const;

/**
 * Configurable constants for List Manager performance and behavior
 * All values are configurable to allow fine-tuning for different use cases
 */
export const LIST_MANAGER_CONSTANTS = {
  VIRTUAL_SCROLL: {
    DEFAULT_ITEM_SIZE: 84, // Updated to 84px per user request
    OVERSCAN_BUFFER: 2, // Reduced from 5 to 2 for fewer visible items
    SCROLL_SENSITIVITY: 1.0,
  },

  SPEED_TRACKING: {
    FAST_SCROLL_THRESHOLD: 20, // px/ms - reduced from 1000 to realistic wheel scroll speeds
    SLOW_SCROLL_THRESHOLD: 10, // px/ms - reduced proportionally
    DECELERATION_FACTOR: 0.85, // velocity decay per frame (more aggressive decay)
    MEASUREMENT_WINDOW: 100, // ms - window for speed calculation
  },

  RANGE_LOADING: {
    DEFAULT_RANGE_SIZE: 20, // items per range (old pageSize)
    BUFFER_SIZE: 3, // extra items to maintain
    PREFETCH_RANGES: 0, // ranges to load ahead
    MAX_CONCURRENT_REQUESTS: 1, // prevent request spam
  },

  SCROLLBAR: {
    THUMB_MIN_SIZE: 20, // minimum thumb size
  },

  PLACEHOLDER: {
    MASK_CHARACTER: "░", // Character used for masking
    RANDOM_LENGTH_VARIANCE: true, // Use random lengths within detected ranges
  },

  PERFORMANCE: {
    THROTTLE_SCROLL: 8, // ms - scroll event throttling
    DEBOUNCE_LOADING: 150, // ms - increased from 50ms to prevent rapid deferred loads
  },

  // Initial load configuration
  INITIAL_LOAD: {
    VIEWPORT_MULTIPLIER: 1.5, // load 1.5x viewport capacity
    MIN_ITEMS: 10,
    MAX_ITEMS: 100,
  },

  // Boundaries configuration
  BOUNDARIES: {
    BOUNDARY_RESISTANCE: 0.3,
  },
} as const;

/**
 * Type for overriding constants at runtime
 */
export type ListManagerConstants = typeof LIST_MANAGER_CONSTANTS;

/**
 * Helper function to merge user constants with defaults
 */
export function mergeConstants(
  userConstants: Partial<ListManagerConstants> = {}
): ListManagerConstants {
  return {
    ...LIST_MANAGER_CONSTANTS,
    ...userConstants,
  };
}

// NO DATA constants: API_ADAPTER, DATA_CACHE, DATA_PERSISTENCE, etc. - those belong to Collection
