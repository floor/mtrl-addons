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
export const HEIGHT_MEASUREMENT = {
  // Measurement strategies
  DEFAULT_STRATEGY: "dynamic",
  FIXED_HEIGHT_FALLBACK: 40,
  ESTIMATED_HEIGHT_FALLBACK: 40,

  // Estimated height settings
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

  // Height estimation
  HEIGHT_SAMPLE_COUNT: 20,
  HEIGHT_VARIANCE_THRESHOLD: 0.15,
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
  HEIGHT_STRATEGY: HEIGHT_MEASUREMENT.DEFAULT_STRATEGY,
  ESTIMATED_HEIGHT: HEIGHT_MEASUREMENT.ESTIMATED_HEIGHT_FALLBACK,
  CACHE_SIZE: HEIGHT_MEASUREMENT.DEFAULT_CACHE_SIZE,

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

// NO DATA constants: API_ADAPTER, DATA_CACHE, DATA_PERSISTENCE, etc. - those belong to Collection
