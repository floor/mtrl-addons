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
  DEFAULT_BUFFER_SIZE: 5,
  MIN_OVERSCAN: 1,
  MAX_OVERSCAN: 10,

  // Custom scrollbar strategy
  SCROLLBAR: {
    DEFAULT_TRACK_WIDTH: 12,
    DEFAULT_THUMB_MIN_HEIGHT: 20,
    DEFAULT_THUMB_MAX_HEIGHT: 200,
    THUMB_PADDING: 4,
    TRACK_PADDING: 2,
  },

  // Performance settings
  DEFAULT_DEBOUNCE_MS: 16, // ~60fps
  DEFAULT_THROTTLE_MS: 16, // ~60fps
  GPU_ACCELERATION: true,
} as const;

/**
 * Element recycling constants
 */
export const ELEMENT_RECYCLING = {
  // Pool management
  DEFAULT_INITIAL_POOL_SIZE: 20,
  DEFAULT_MAX_POOL_SIZE: 100,
  DEFAULT_MIN_POOL_SIZE: 10,
  POOL_GROWTH_FACTOR: 1.5,
  POOL_SHRINK_THRESHOLD: 0.25,

  // Recycling strategies
  DEFAULT_STRATEGY: "lru",
  FIFO_QUEUE_SIZE: 50,
  LRU_CACHE_SIZE: 100,
  SIZE_BASED_THRESHOLD: 1000,

  // Cleanup settings
  DEFAULT_CLEANUP_INTERVAL: 5000, // 5 seconds
  DEFAULT_IDLE_TIMEOUT: 10000, // 10 seconds
  CLEANUP_BATCH_SIZE: 10,

  // Reuse settings
  DEFAULT_REUSE_STRATEGY: "strict",
  STRICT_REUSE_ATTRIBUTES: ["data-type", "data-template"],

  // Performance monitoring
  STATS_HISTORY_SIZE: 100,
  HIT_RATE_WINDOW: 1000,
} as const;

/**
 * Viewport management constants
 */
export const VIEWPORT = {
  // Container settings
  DEFAULT_CONTAINER_SELECTOR: "[data-list-container]",
  CONTAINER_ATTRIBUTES: {
    LIST_CONTAINER: "data-list-container",
    VIEWPORT: "data-viewport",
    SCROLL_CONTAINER: "data-scroll-container",
  },

  // Viewport calculation
  INCLUDE_MARGINS: true,
  INCLUDE_PADDING: true,
  MEASUREMENT_PRECISION: 2,

  // Intersection observer settings
  DEFAULT_INTERSECTION_THRESHOLD: 0.1,
  DEFAULT_INTERSECTION_ROOT_MARGIN: "50px",
  INTERSECTION_DEBOUNCE: 100,

  // Viewport updates
  DEFAULT_UPDATE_STRATEGY: "throttled",
  DEFAULT_UPDATE_DELAY: 16, // ~60fps
  VIEWPORT_RESIZE_DEBOUNCE: 250,

  // Scroll boundaries
  DEFAULT_TOP_BOUNDARY: 0,
  DEFAULT_BOTTOM_BOUNDARY: 0,
  BOUNDARY_TOLERANCE: 5,
} as const;

/**
 * Performance monitoring constants
 */
export const PERFORMANCE = {
  // FPS monitoring
  DEFAULT_FPS_TARGET: 60,
  FPS_SAMPLE_SIZE: 60,
  FPS_WARNING_THRESHOLD: 30,
  FPS_CRITICAL_THRESHOLD: 15,

  // Memory monitoring
  DEFAULT_MEMORY_THRESHOLD: 50 * 1024 * 1024, // 50MB
  MEMORY_SAMPLE_INTERVAL: 1000, // 1 second
  MEMORY_WARNING_THRESHOLD: 0.8, // 80% of threshold

  // Render time monitoring
  DEFAULT_RENDER_TIME_THRESHOLD: 16.67, // 60fps
  RENDER_TIME_SAMPLE_SIZE: 100,
  SLOW_RENDER_THRESHOLD: 33.33, // 30fps

  // Scroll performance
  DEFAULT_SCROLL_FPS_TARGET: 60,
  SCROLL_SAMPLE_SIZE: 30,
  SCROLL_JANK_THRESHOLD: 50, // 50ms

  // Performance reporting
  DEFAULT_REPORTING_INTERVAL: 5000, // 5 seconds
  REPORT_HISTORY_SIZE: 20,
  PERFORMANCE_BUDGET: {
    INITIAL_RENDER: 100, // 100ms
    SCROLL_RESPONSE: 8, // 8ms
    LAYOUT_THRASH: 5, // 5 layout calculations per frame
  },
} as const;

/**
 * Scroll behavior constants
 */
export const SCROLL = {
  // Scroll behavior
  DEFAULT_BEHAVIOR: "smooth",
  DEFAULT_ALIGN: "center",

  // Scroll easing
  DEFAULT_EASING: "ease-in-out",
  DEFAULT_EASING_DURATION: 300,

  // Scroll boundaries
  ENABLE_BOUNDARIES: true,
  BOUNDARY_BOUNCE_DURATION: 300,
  BOUNDARY_RESISTANCE: 0.3,

  // Scroll performance
  SCROLL_DEBOUNCE: 16, // ~60fps
  SCROLL_THROTTLE: 16, // ~60fps
  MOMENTUM_THRESHOLD: 0.1,

  // Scroll animation
  ANIMATION_FRAME_BUDGET: 16.67, // 60fps
  MAX_ANIMATION_DURATION: 1000, // 1 second
  MIN_ANIMATION_DURATION: 100, // 100ms
} as const;

/**
 * CSS classes for List Manager components
 */
export const CLASSES = {
  // Container classes
  LIST_CONTAINER: "mtrl-list-container",
  LIST_ITEM: "mtrl-list-item",
  LIST_MANAGER: "mtrl-list-manager",

  // Viewport classes
  VIEWPORT: "mtrl-viewport",
  SCROLL_CONTAINER: "mtrl-scroll-container",

  // Virtual scrolling classes
  VIRTUAL_CONTAINER: "mtrl-virtual-container",
  VIRTUAL_SPACER: "mtrl-virtual-spacer",
  VIRTUAL_SPACER_TOP: "mtrl-virtual-spacer-top",
  VIRTUAL_SPACER_BOTTOM: "mtrl-virtual-spacer-bottom",

  // Element recycling classes
  RECYCLED_ELEMENT: "mtrl-recycled",
  ELEMENT_POOL: "mtrl-element-pool",

  // State classes
  VIEWPORT_MEASURING: "mtrl-viewport-measuring",
  VIEWPORT_SCROLLING: "mtrl-viewport-scrolling",
  VIEWPORT_IDLE: "mtrl-viewport-idle",

  // Performance classes
  PERFORMANCE_GOOD: "mtrl-performance-good",
  PERFORMANCE_WARNING: "mtrl-performance-warning",
  PERFORMANCE_CRITICAL: "mtrl-performance-critical",

  // Scrollbar classes
  SCROLLBAR: "list__scrollbar",
  SCROLLBAR_TRACK: "list__scrollbar-track",
  SCROLLBAR_THUMB: "list__scrollbar-thumb",
  SCROLLBAR_CORNER: "list__scrollbar-corner",
  SCROLLBAR_ENABLED: "list__scrollbar-enabled",
  SCROLLBAR_SCROLLING: "list__scrollbar--scrolling",
  SCROLLBAR_DRAGGING: "list__scrollbar--dragging",
  SCROLLBAR_THUMB_DRAGGING: "list__scrollbar-thumb--dragging",
} as const;

/**
 * Logging constants for List Manager
 */
export const LOGGING = {
  PREFIX: "[LIST-MANAGER]",
  LEVELS: {
    ERROR: "ERROR",
    WARN: "WARN",
    INFO: "INFO",
    DEBUG: "DEBUG",
    PERF: "PERF",
  },
  ENABLE_DEBUG: false,
  ENABLE_PERFORMANCE_LOGGING: false,

  // Performance logging
  PERFORMANCE_MARKS: {
    RENDER_START: "list-manager-render-start",
    RENDER_END: "list-manager-render-end",
    SCROLL_START: "list-manager-scroll-start",
    SCROLL_END: "list-manager-scroll-end",
    MEASURE_START: "list-manager-measure-start",
    MEASURE_END: "list-manager-measure-end",
  },
} as const;

/**
 * List Manager defaults for initialization
 */
export const LIST_MANAGER_DEFAULTS = {
  // Virtualization defaults
  VIRTUALIZATION_STRATEGY: "virtual",
  BUFFER_SIZE: 5,
  OVERSCAN: 2,

  // Recycling defaults
  RECYCLING_ENABLED: false,
  INITIAL_POOL_SIZE: 20,
  MAX_POOL_SIZE: 100,

  // Height measurement defaults
  HEIGHT_STRATEGY: "dynamic",
  ESTIMATED_HEIGHT: 40,
  CACHE_SIZE: 1000,

  // Performance defaults
  PERFORMANCE_ENABLED: true,
  FPS_TARGET: 60,
  MEMORY_THRESHOLD: 50 * 1024 * 1024, // 50MB

  // Viewport defaults
  UPDATE_STRATEGY: "throttled",
  UPDATE_DELAY: 16, // ~60fps

  // Template defaults
  TEMPLATE_CACHE_SIZE: 100,

  // Scroll defaults
  SCROLL_BEHAVIOR: "smooth",
  SCROLL_ALIGN: "center",
} as const;

/**
 * Orientation constants
 */
export const ORIENTATION = {
  // Default orientation
  DEFAULT_ORIENTATION: "vertical",
  DEFAULT_CROSS_AXIS_ALIGNMENT: "stretch",

  // Orientation detection
  AUTO_DETECT_THRESHOLD: 1.5, // aspect ratio threshold
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
  PREFETCH_RANGES: 1, // ranges to load ahead
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
  ENABLED: true,
  PLACEHOLDER_FLAG: "_placeholder",
  PLACEHOLDER_MODE: "mask", // "mask" | "skeleton" | "blank"

  // Mask mode configuration
  MASK_CHARACTER: "░", // Character used for masking
  SKELETON_CHARS: {
    SHORT: 15,
    MEDIUM: 30,
    LONG: 50,
    EMAIL: 25,
  },
  BLANK_CHARS: " ",
  DOT_CHARS: "•",

  // Placeholder data
  FALLBACK_NAMES: ["Loading...", "Placeholder", "Data"],
  FALLBACK_DOMAINS: ["example.com", "domain.com", "email.com"],

  // Pattern analysis
  PATTERN_ANALYSIS: {
    SAMPLE_SIZE: 50, // analyze first N items
    CACHE_SIZE: 100, // cache N patterns
    CACHE_EXPIRY: 5 * 60 * 1000, // 5 minutes
    MIN_PATTERN_SIZE: 5, // minimum items to establish pattern
  },

  // Replacement behavior
  REPLACEMENT: {
    USE_REAL_IDS: true, // use real IDs in placeholders
    DIRECT_ID_MATCHING: true, // match by ID when replacing
    PRESERVE_SCROLL_POSITION: true,
    SMOOTH_TRANSITIONS: true,
  },

  // CSS configuration
  CSS: {
    BASE_CLASS: "mtrl-placeholder-item",
    MODE_CLASS_PREFIX: "mtrl-placeholder-",
    ARIA_BUSY: true,
    ARIA_LABEL: "Loading content",
  },

  // Performance
  PERFORMANCE: {
    LAZY_GENERATION: true, // generate only visible placeholders
    MEMORY_CLEANUP: true, // clean up old placeholder data
    DEBOUNCE_REPLACEMENT: 16, // ms - debounce placeholder replacement
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
    FAST_SCROLL_THRESHOLD: 10, // px/ms - reduced from 1000 to realistic wheel scroll speeds
    SLOW_SCROLL_THRESHOLD: 2, // px/ms - reduced proportionally
    DECELERATION_FACTOR: 0.85, // velocity decay per frame (more aggressive decay)
    MEASUREMENT_WINDOW: 100, // ms - window for speed calculation
  },

  RANGE_LOADING: {
    DEFAULT_RANGE_SIZE: 20, // items per range (old pageSize)
    BUFFER_SIZE: 10, // extra items to maintain
    PREFETCH_RANGES: 1, // ranges to load ahead
    MAX_CONCURRENT_REQUESTS: 3, // prevent request spam
  },

  SCROLLBAR: {
    TRACK_WIDTH: 8, // for vertical scrollbar, becomes height for horizontal
    THUMB_MIN_SIZE: 20, // minimum thumb size
    FADE_TIMEOUT: 1500,
    BORDER_RADIUS: "4px",
  },

  RECYCLING: {
    ENABLED: true, // Phase 2 feature - now enabled
    POOL_SIZE: 50,
    CLEANUP_INTERVAL: 30000,
    ELEMENT_MAX_AGE: 30000, // 30 seconds - max age for unused elements
    MAX_ELEMENTS_PER_CLEANUP: 5, // Limit elements cleaned per cycle
    CLEANUP_TIME_BUDGET: 5, // Max 5ms per cleanup cycle
  },

  PLACEHOLDER: {
    CLASS_NAME: "mtrl-placeholder", // CSS class for placeholder styling (optional)
    MASK_CHARACTER: "░", // Character used for masking
    ANALYZE_AFTER_INITIAL_LOAD: true, // Analyze structure after first data load
    RANDOM_LENGTH_VARIANCE: true, // Use random lengths within detected ranges
  },

  PERFORMANCE: {
    FRAME_BUDGET: 16.67, // 60fps target
    THROTTLE_SCROLL: 16, // ms - scroll event throttling
    DEBOUNCE_LOADING: 150, // ms - increased from 50ms to prevent rapid deferred loads
  },

  // Initial load configuration
  INITIAL_LOAD: {
    STRATEGY: "placeholders" as const, // "placeholders" | "direct"
    VIEWPORT_MULTIPLIER: 1.5, // load 1.5x viewport capacity
    MIN_ITEMS: 10,
    MAX_ITEMS: 100,
  },

  // Error handling configuration
  ERROR_HANDLING: {
    TIMEOUT: 3000, // 3 seconds
    SHOW_ERROR_ITEMS: true, // debug feature
    RETRY_ATTEMPTS: 2,
    PRESERVE_SCROLL_ON_ERROR: true,
  },

  // Precise positioning configuration
  POSITIONING: {
    PRECISE_POSITIONING: true, // scrollbar is source of truth
    ALLOW_PARTIAL_ITEMS: true, // allow partial items at edges
    SNAP_TO_ITEMS: false, // false for precise positioning
  },

  // Boundaries configuration
  BOUNDARIES: {
    PREVENT_OVERSCROLL: true,
    MAINTAIN_EDGE_RANGES: true,
    BOUNDARY_RESISTANCE: 0.3,
  },

  // Viewport calculation constants
  VIEWPORT_CALCULATION: {
    MEASUREMENT_PRECISION: 1, // decimal places for measurements
    RESIZE_DEBOUNCE: 100, // ms - viewport resize debouncing
    INITIAL_LOAD_CALCULATION: 1.5, // multiplier for initial viewport calculation
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
