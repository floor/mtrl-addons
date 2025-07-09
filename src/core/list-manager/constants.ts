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

  // Element reuse settings
  DEFAULT_REUSE_STRATEGY: "same-type",
  STRICT_REUSE_ATTRIBUTES: ["data-type", "data-variant"],

  // Pool statistics
  STATS_HISTORY_SIZE: 100,
  HIT_RATE_WINDOW: 1000,
} as const;

/**
 * Additional recycling constants for element pool management
 */
export const RECYCLING = {
  // Element lifecycle
  ELEMENT_MAX_AGE: 30000, // 30 seconds - max age for unused elements
  CLEANUP_INTERVAL: 10000, // 10 seconds - how often to run cleanup

  // Element pool thresholds
  POOL_HIGH_WATER_MARK: 0.8, // Start cleanup when 80% full
  POOL_LOW_WATER_MARK: 0.2, // Stop cleanup when 20% full

  // Performance settings
  MAX_ELEMENTS_PER_CLEANUP: 5, // Limit elements cleaned per cycle
  CLEANUP_TIME_BUDGET: 5, // Max 5ms per cleanup cycle
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
 * Height measurement constants
 */
export const SIZE_MEASUREMENT = {
  // Measurement strategies
  DEFAULT_STRATEGY: "dynamic",
  FIXED_SIZE_FALLBACK: 40,
  ESTIMATED_SIZE_FALLBACK: 40,

  // Estimated size settings
  DEFAULT_ESTIMATION_ACCURACY: 0.9,
  ESTIMATION_SAMPLE_SIZE: 10,
  ESTIMATION_UPDATE_THRESHOLD: 0.2,

  // Dynamic measurement
  DEFAULT_MEASUREMENT_DEBOUNCE: 100,
  MEASUREMENT_THROTTLE: 16,
  REMEASURE_ON_RESIZE: true,

  // Caching settings
  DEFAULT_CACHE_SIZE: 1000,
  DEFAULT_CACHE_EXPIRY: 60 * 60 * 1000, // 1 hour
  CACHE_CLEANUP_INTERVAL: 5 * 60 * 1000, // 5 minutes
  PERSIST_CACHE: false,

  // Size estimation
  SIZE_SAMPLE_COUNT: 20,
  SIZE_VARIANCE_THRESHOLD: 0.15,
  MIN_SAMPLE_SIZE: 5,
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
  MEMORY_WARNING_THRESHOLD: 100 * 1024 * 1024, // 100MB

  // Render performance
  DEFAULT_RENDER_TIME_THRESHOLD: 16, // 16ms for 60fps
  RENDER_TIME_SAMPLE_SIZE: 100,
  SLOW_RENDER_THRESHOLD: 33, // 33ms for 30fps

  // Scroll performance
  DEFAULT_SCROLL_FPS_TARGET: 60,
  SCROLL_SAMPLE_SIZE: 30,
  SCROLL_JANK_THRESHOLD: 100, // 100ms

  // Reporting
  DEFAULT_REPORTING_INTERVAL: 5000, // 5 seconds
  REPORT_HISTORY_SIZE: 20,
  PERFORMANCE_BUDGET: {
    INITIAL_RENDER: 100, // 100ms
    SCROLL_RESPONSE: 8, // 8ms
    LAYOUT_THRASH: 5, // 5 layout calculations per frame
  },
} as const;

/**
 * Template rendering constants
 */
export const TEMPLATE = {
  // Template caching
  DEFAULT_TEMPLATE_CACHE_SIZE: 100,
  TEMPLATE_CACHE_EXPIRY: 10 * 60 * 1000, // 10 minutes

  // Template lifecycle
  CREATE_TIMEOUT: 1000, // 1 second
  UPDATE_TIMEOUT: 500, // 500ms
  DESTROY_TIMEOUT: 200, // 200ms

  // Template optimization
  BATCH_UPDATE_SIZE: 10,
  BATCH_UPDATE_DELAY: 16, // ~60fps

  // Template validation
  VALIDATE_TEMPLATES: true,
  REQUIRED_ATTRIBUTES: ["data-item-id"],

  // Template interpolation
  INTERPOLATION_PATTERN: /\{\{([^}]+)\}\}/g,
  MAX_INTERPOLATION_DEPTH: 5,
} as const;

/**
 * Scroll behavior constants
 */
export const SCROLL = {
  // Scroll behavior
  DEFAULT_BEHAVIOR: "smooth",
  DEFAULT_ALIGN: "start",

  // Scroll easing
  DEFAULT_EASING: "ease-out",
  DEFAULT_EASING_DURATION: 300, // 300ms

  // Scroll boundaries
  ENABLE_BOUNDARIES: true,
  BOUNDARY_BOUNCE_DURATION: 200, // 200ms
  BOUNDARY_RESISTANCE: 0.5,

  // Scroll performance
  SCROLL_DEBOUNCE: 16, // ~60fps
  SCROLL_THROTTLE: 16, // ~60fps
  MOMENTUM_THRESHOLD: 0.5,

  // Scroll animation
  ANIMATION_FRAME_BUDGET: 16, // 16ms per frame
  MAX_ANIMATION_DURATION: 1000, // 1 second
  MIN_ANIMATION_DURATION: 100, // 100ms
} as const;

/**
 * CSS classes for List Manager elements
 */
export const CLASSES = {
  // List container and items
  LIST_CONTAINER: "list-container",
  LIST_ITEM: "list-item",

  // List Manager container
  LIST_MANAGER: "list-manager",
  VIEWPORT: "list-manager__viewport",
  SCROLL_CONTAINER: "list-manager__scroll-container",

  // Virtual scrolling
  VIRTUAL_CONTAINER: "virtual-container",
  VIRTUAL_SPACER: "virtual-spacer",
  VIRTUAL_SPACER_TOP: "virtual-spacer--top",
  VIRTUAL_SPACER_BOTTOM: "virtual-spacer--bottom",

  // Element recycling
  RECYCLED_ELEMENT: "recycled-element",
  ELEMENT_POOL: "element-pool",

  // Viewport states
  VIEWPORT_MEASURING: "viewport--measuring",
  VIEWPORT_SCROLLING: "viewport--scrolling",
  VIEWPORT_IDLE: "viewport--idle",

  // Performance states
  PERFORMANCE_GOOD: "performance--good",
  PERFORMANCE_WARNING: "performance--warning",
  PERFORMANCE_CRITICAL: "performance--critical",

  // Scrollbar (inside mtrl-list element)
  SCROLLBAR: "list__scrollbar",
  SCROLLBAR_TRACK: "list__scrollbar-track",
  SCROLLBAR_THUMB: "list__scrollbar-thumb",
  SCROLLBAR_CORNER: "list__scrollbar-corner",
} as const;

/**
 * DOM attributes for List Manager
 */
export const ATTRIBUTES = {
  // List Manager attributes
  ITEM_ID: "data-item-id",
  ITEM_INDEX: "data-item-index",
  ITEM_HEIGHT: "data-item-height",
  ITEM_MEASURED: "data-item-measured",

  // Virtual scrolling attributes
  VIRTUAL_INDEX: "data-virtual-index",
  VIRTUAL_OFFSET: "data-virtual-offset",
  VIRTUAL_SIZE: "data-virtual-size",

  // Element recycling attributes
  RECYCLED: "data-recycled",
  POOL_ID: "data-pool-id",
  CREATED_AT: "data-created-at",
  LAST_USED: "data-last-used",

  // Performance attributes
  RENDER_TIME: "data-render-time",
  PERFORMANCE_MARK: "data-performance-mark",

  // Viewport attributes
  VIEWPORT_ID: "data-viewport-id",
  VISIBLE: "data-visible",
  IN_BUFFER: "data-in-buffer",
} as const;

/**
 * Event timing constants
 */
export const EVENT_TIMING = {
  // Event debouncing
  VIEWPORT_CHANGE_DEBOUNCE: 16, // ~60fps
  SCROLL_DEBOUNCE: 16, // ~60fps
  RESIZE_DEBOUNCE: 250, // 250ms

  // Event throttling
  PERFORMANCE_THROTTLE: 1000, // 1 second
  HEIGHT_MEASUREMENT_THROTTLE: 100, // 100ms

  // Event emission
  EMIT_TIMEOUT: 5000, // 5 seconds
  MAX_LISTENERS: 100,
  LISTENER_CLEANUP_INTERVAL: 10000, // 10 seconds
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
  // Virtual scrolling - unified strategy
  VIRTUALIZATION_STRATEGY: "virtual",
  BUFFER_SIZE: VIRTUAL_SCROLLING.DEFAULT_BUFFER_SIZE,
  OVERSCAN: VIRTUAL_SCROLLING.DEFAULT_OVERSCAN,

  // Element recycling
  RECYCLING_ENABLED: true,
  INITIAL_POOL_SIZE: ELEMENT_RECYCLING.DEFAULT_INITIAL_POOL_SIZE,
  MAX_POOL_SIZE: ELEMENT_RECYCLING.DEFAULT_MAX_POOL_SIZE,

  // Height measurement
  HEIGHT_STRATEGY: SIZE_MEASUREMENT.DEFAULT_STRATEGY,
  ESTIMATED_HEIGHT: SIZE_MEASUREMENT.ESTIMATED_SIZE_FALLBACK,
  CACHE_SIZE: SIZE_MEASUREMENT.DEFAULT_CACHE_SIZE,

  // Performance monitoring
  PERFORMANCE_ENABLED: false,
  FPS_TARGET: PERFORMANCE.DEFAULT_FPS_TARGET,
  MEMORY_THRESHOLD: PERFORMANCE.DEFAULT_MEMORY_THRESHOLD,

  // Viewport
  UPDATE_STRATEGY: VIEWPORT.DEFAULT_UPDATE_STRATEGY,
  UPDATE_DELAY: VIEWPORT.DEFAULT_UPDATE_DELAY,

  // Template
  TEMPLATE_CACHE_SIZE: TEMPLATE.DEFAULT_TEMPLATE_CACHE_SIZE,

  // Scroll
  SCROLL_BEHAVIOR: SCROLL.DEFAULT_BEHAVIOR,
  SCROLL_ALIGN: SCROLL.DEFAULT_ALIGN,
} as const;

/**
 * Orientation constants
 */
export const ORIENTATION = {
  DEFAULT_ORIENTATION: "vertical" as const,
  DEFAULT_CROSS_AXIS_ALIGNMENT: "stretch" as const,
  AUTO_DETECT_THRESHOLD: 1.5, // Width/height ratio threshold for auto-detection
  REVERSE_DIRECTION: false,
} as const;

/**
 * Speed-based loading constants for intelligent data fetching
 */
export const SPEED_TRACKING = {
  // Speed thresholds (configurable for testing)
  FAST_SCROLL_THRESHOLD: 1000, // px/ms - defer loading above this speed
  SLOW_SCROLL_THRESHOLD: 100, // px/ms - load immediately below this speed
  MEDIUM_SCROLL_THRESHOLD: 500, // px/ms - moderate speed handling

  // Speed calculation
  DECELERATION_FACTOR: 0.95, // velocity decay per frame
  MEASUREMENT_WINDOW: 100, // ms - window for speed calculation
  MIN_MEASUREMENT_INTERVAL: 16, // ms - minimum time between measurements

  // Speed smoothing
  VELOCITY_SMOOTHING: true,
  SMOOTHING_FACTOR: 0.8, // exponential smoothing coefficient
  ACCELERATION_THRESHOLD: 50, // px/ms² - when to consider acceleration

  // Direction tracking
  DIRECTION_CHANGE_THRESHOLD: 10, // px - minimum movement to register direction change
  MOMENTUM_DECAY_TIME: 150, // ms - how long momentum lasts after input stops
} as const;

/**
 * Range-based pagination constants for intelligent data loading
 */
export const RANGE_LOADING = {
  // Range size configuration
  DEFAULT_RANGE_SIZE: 20, // items per range (replaces old pageSize)
  MIN_RANGE_SIZE: 10,
  MAX_RANGE_SIZE: 100,

  // Buffer management
  BUFFER_SIZE: 10, // extra items to maintain beyond viewport
  MIN_BUFFER_SIZE: 5,
  MAX_BUFFER_SIZE: 50,

  // Preloading strategy
  PREFETCH_RANGES: 1, // ranges to load ahead of visible area
  PREFETCH_THRESHOLD: 0.8, // load more when 80% through current range
  PRELOAD_DIRECTION_BIAS: 0.3, // bias preloading in scroll direction

  // Request management
  MAX_CONCURRENT_REQUESTS: 3, // prevent request spam
  REQUEST_TIMEOUT: 10000, // 10 seconds
  RETRY_ATTEMPTS: 2,
  RETRY_DELAY: 1000, // 1 second

  // Range calculation
  RANGE_OVERLAP: 0, // items overlap between ranges
  DYNAMIC_RANGE_SIZING: false, // adjust range size based on viewport
  VIEWPORT_SIZE_MULTIPLIER: 2, // range size = viewport capacity * multiplier

  // Loading state management
  PLACEHOLDER_TIMEOUT: 5000, // 5 seconds - show placeholders if data takes too long
  EMPTY_RANGE_CACHE_TIME: 30000, // 30 seconds - cache empty ranges
} as const;

/**
 * Placeholder and empty state constants - Enhanced from old list-manager
 */
export const PLACEHOLDER = {
  // Core functionality
  ENABLED: true,
  PLACEHOLDER_FLAG: "__isPlaceholder",

  // Visual appearance modes (from old system)
  PLACEHOLDER_MODE: "masked" as
    | "masked"
    | "skeleton"
    | "blank"
    | "dots"
    | "realistic",

  // Content generation
  MASK_CHARACTER: "░", // Masked character replacement

  // Skeleton characters for different content lengths
  SKELETON_CHARS: {
    SHORT: "▁▁▁▁▁", // 5 blocks
    MEDIUM: "▁▁▁▁▁▁▁▁", // 8 blocks
    LONG: "▁▁▁▁▁▁▁▁▁▁▁▁", // 12 blocks
    EMAIL: "▁▁▁▁@▁▁▁.▁▁▁", // Email pattern
  },

  // Blank characters (invisible placeholders)
  BLANK_CHARS: {
    SHORT: "     ", // 5 spaces
    MEDIUM: "        ", // 8 spaces
    LONG: "            ", // 12 spaces
    EMAIL: "     @   .   ", // Spaced email pattern
  },

  // Dot characters for subtle indication
  DOT_CHARS: {
    SHORT: "• • •",
    MEDIUM: "• • • • •",
    LONG: "• • • • • • •",
    EMAIL: "• • • @ • • •",
  },

  // Fallback data when no patterns can be analyzed
  FALLBACK_NAMES: ["Alex", "Jordan", "Taylor", "Casey", "Riley", "Morgan"],
  FALLBACK_DOMAINS: ["example.com", "company.com", "service.org"],

  // Pattern analysis
  PATTERN_ANALYSIS: {
    ENABLED: true, // Enable intelligent pattern learning
    SAMPLE_SIZE: 10, // Number of real items to analyze
    CACHE_SIZE: 50, // Maximum cached placeholder items
    CACHE_EXPIRY: 300000, // 5 minutes cache expiry
    MIN_PATTERN_SIZE: 3, // Minimum items for pattern detection
  },

  // Replacement system
  REPLACEMENT: {
    USE_REAL_IDS: true, // Placeholders use actual virtual IDs
    DIRECT_ID_MATCHING: true, // O(1) replacement by ID matching
    PRESERVE_SCROLL_POSITION: true, // Maintain scroll during replacement
    SMOOTH_TRANSITIONS: true, // Animate placeholder→real transitions
  },

  // CSS and styling
  CSS: {
    BASE_CLASS: "mtrl-item-placeholder",
    MODE_CLASS_PREFIX: "mtrl-item-placeholder--",
    ARIA_BUSY: true, // Add aria-busy="true"
    ARIA_LABEL: "Loading content...", // Accessibility label
  },

  // Performance
  PERFORMANCE: {
    LAZY_GENERATION: true, // Generate placeholders on-demand
    MEMORY_CLEANUP: true, // Auto-cleanup unused placeholders
    DEBOUNCE_REPLACEMENT: 16, // 60fps replacement rate
  },
} as const;

/**
 * Collection integration constants
 */
export const COLLECTION_INTEGRATION = {
  // Event coordination
  EVENT_DEBOUNCE: 50, // ms - debounce collection events
  MAX_EVENT_QUEUE: 100, // maximum queued events
  EVENT_PROCESSING_BATCH: 10, // events processed per batch

  // Data synchronization
  SYNC_THROTTLE: 100, // ms - throttle data sync operations
  BATCH_UPDATE_SIZE: 20, // items updated per batch
  UPDATE_ANIMATION_DURATION: 200, // ms - data update animations

  // Loading coordination
  LOADING_STATE_DELAY: 100, // ms - delay before showing loading state
  LOADING_TIMEOUT: 30000, // 30 seconds - maximum loading time
  STALE_DATA_THRESHOLD: 60000, // 1 minute - when to refresh data

  // Error handling
  ERROR_RETRY_DELAY: 2000, // 2 seconds
  MAX_ERROR_RETRIES: 3,
  ERROR_DISPLAY_DURATION: 5000, // 5 seconds
} as const;

/**
 * Initial loading strategy constants
 */
export const INITIAL_LOAD = {
  // Loading strategy (configurable)
  STRATEGY: "placeholders" as "placeholders" | "direct", // show placeholders first or load data directly

  // Viewport-based calculation
  VIEWPORT_MULTIPLIER: 1.5, // load 1.5x viewport capacity initially
  MIN_INITIAL_ITEMS: 10, // minimum items to load
  MAX_INITIAL_ITEMS: 100, // maximum items to load initially

  // Placeholder configuration
  PLACEHOLDER_COUNT: 10, // fallback number of placeholders
  SHOW_LOADING_STATE: true, // show loading indicators
  LOADING_DELAY: 200, // ms - delay before showing loading state
} as const;

/**
 * Error handling constants
 */
export const ERROR_HANDLING = {
  // Timeout configuration
  LOADING_TIMEOUT: 3000, // 3 seconds - maximum loading time
  RETRY_ATTEMPTS: 2, // number of retry attempts
  RETRY_DELAY: 1000, // 1 second between retries

  // Error display
  SHOW_ERROR_ITEMS: true, // show error items for debugging
  ERROR_ITEM_DURATION: 5000, // 5 seconds - how long to show errors
  ERROR_PLACEHOLDER_TEXT: "Failed to load",

  // Fallback behavior
  FALLBACK_TO_EMPTY: true, // show empty items on persistent errors
  PRESERVE_SCROLL_ON_ERROR: true, // maintain scroll position on errors
} as const;

/**
 * Boundary and scrolling constraints
 */
export const BOUNDARIES = {
  // Overscroll prevention
  PREVENT_OVERSCROLL: true, // prevent scrolling past edges
  MAINTAIN_EDGE_RANGES: true, // keep first/last ranges visible at boundaries

  // Boundary behavior
  BOUNDARY_RESISTANCE: 0.3, // resistance when approaching boundaries
  BOUNCE_BACK_DURATION: 200, // ms - bounce back animation
  EDGE_TOLERANCE: 5, // px - tolerance for edge detection

  // Scroll constraints
  MIN_SCROLL_POSITION: 0, // minimum virtual scroll position
  MAX_SCROLL_BUFFER: 100, // px - buffer beyond last item
} as const;

/**
 * Precise positioning constants for scrollbar
 */
export const PRECISE_POSITIONING = {
  // Scrollbar positioning
  THUMB_IS_SOURCE_OF_TRUTH: true, // scrollbar position determines virtual position
  NO_ITEM_SNAPPING: true, // don't snap to item boundaries
  ALLOW_PARTIAL_ITEMS: true, // allow partial items at viewport edges

  // Position calculation
  POSITION_PRECISION: 1, // decimal places for position precision
  SMOOTH_THUMB_MOVEMENT: true, // smooth thumb movement during drag
  UPDATE_FREQUENCY: 60, // fps - position update frequency

  // Drag behavior
  IMMEDIATE_UPDATE: true, // update position immediately during drag
  CANCEL_MOMENTUM_ON_DRAG: true, // stop any momentum when user drags
} as const;

/**
 * Viewport-based initial loading calculation
 */
export const VIEWPORT_CALCULATION = {
  // Size calculation
  MEASURE_VIEWPORT_ON_INIT: true, // measure viewport size during initialization
  REMEASURE_ON_RESIZE: true, // recalculate on window resize

  // Initial load calculation
  CALCULATE_FROM_VIEWPORT: true, // base initial load on viewport size
  INCLUDE_BUFFER_IN_CALCULATION: true, // include buffer in viewport calculation

  // Estimation fallbacks
  FALLBACK_VIEWPORT_HEIGHT: 500, // px - fallback if measurement fails
  FALLBACK_VIEWPORT_WIDTH: 300, // px - fallback for horizontal lists
  ESTIMATED_ITEM_SIZE_RATIO: 0.1, // estimate item size as 10% of viewport
} as const;

/**
 * Configurable constants for List Manager performance and behavior
 * All values are configurable to allow fine-tuning for different use cases
 */
export const LIST_MANAGER_CONSTANTS = {
  VIRTUAL_SCROLL: {
    DEFAULT_ITEM_SIZE: 50, // works for both width/height depending on orientation
    OVERSCAN_BUFFER: 5,
    SCROLL_SENSITIVITY: 1.0,
  },

  SPEED_TRACKING: {
    FAST_SCROLL_THRESHOLD: 1000, // px/ms - defer loading above this
    SLOW_SCROLL_THRESHOLD: 100, // px/ms - load immediately below this
    DECELERATION_FACTOR: 0.95, // velocity decay per frame
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
    BORDER_RADIUS: 4,
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
    DEBOUNCE_LOADING: 50, // ms - loading request debouncing
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
