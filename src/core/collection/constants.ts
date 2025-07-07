/**
 * Constants for the mtrl-addons collection system (Pure Data Layer)
 *
 * Data-related constants only - NO UI constants
 */

/**
 * Data pagination constants
 */
export const DATA_PAGINATION = {
  DEFAULT_PAGE_SIZE: 20,
  DEFAULT_CURRENT_PAGE: 1,
  MAX_PREFETCH_PAGES: 5,
  MIN_PAGE_SIZE: 1,
  MAX_PAGE_SIZE: 1000,
} as const;

/**
 * Data caching constants
 */
export const DATA_CACHE = {
  DEFAULT_MAX_SIZE: 1000,
  DEFAULT_MAX_AGE: 60 * 60 * 1000, // 1 hour
  CLEANUP_INTERVAL: 5 * 60 * 1000, // 5 minutes
  DEFAULT_STRATEGY: "memory",
  LRU_DEFAULT_SIZE: 500,
} as const;

/**
 * Data persistence constants
 */
export const DATA_PERSISTENCE = {
  DEFAULT_KEY_PREFIX: "mtrl-collection-",
  DEFAULT_VERSION: 1,
  SYNC_DEBOUNCE: 1000, // 1 second
  DEFAULT_STRATEGY: "localStorage",
  MAX_LOCALSTORAGE_SIZE: 5 * 1024 * 1024, // 5MB
  INDEXED_DB_VERSION: 1,
} as const;

/**
 * Web worker constants
 */
export const WEB_WORKERS = {
  MAX_WORKERS:
    typeof navigator !== "undefined" ? navigator.hardwareConcurrency || 4 : 4,
  TASK_TIMEOUT: 30000, // 30 seconds
  CHUNK_SIZE: 1000, // Items per worker task
  DEFAULT_PRIORITY: "normal",
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000, // 1 second
} as const;

/**
 * Data validation constants
 */
export const DATA_VALIDATION = {
  DEFAULT_STRICT_MODE: false,
  MAX_VALIDATION_ERRORS: 100,
  VALIDATION_TIMEOUT: 5000, // 5 seconds
  DEFAULT_SANITIZE: true,
} as const;

/**
 * Data transformation constants
 */
export const DATA_TRANSFORMATION = {
  MAX_TRANSFORM_TIME: 10000, // 10 seconds
  BATCH_SIZE: 500,
  DEFAULT_NORMALIZE: true,
  MAX_DEPTH: 10, // For nested object transformation
} as const;

/**
 * API adapter constants
 */
export const API_ADAPTER = {
  DEFAULT_TIMEOUT: 30000, // 30 seconds
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000, // 1 second
  MAX_CONCURRENT_REQUESTS: 5,
  DEFAULT_HEADERS: {
    "Content-Type": "application/json",
  },
} as const;

/**
 * Background processing constants
 */
export const BACKGROUND_PROCESSING = {
  PREFETCH_THRESHOLD: 0.8, // Start prefetching when 80% through current data
  MAX_PREFETCH_QUEUE: 10,
  PREFETCH_DEBOUNCE: 500, // 500ms
  BACKGROUND_SYNC_INTERVAL: 30000, // 30 seconds
} as const;

/**
 * Data logging constants
 */
export const DATA_LOGGING = {
  PREFIX: "[COLLECTION]",
  LEVELS: {
    ERROR: "ERROR",
    WARN: "WARN",
    INFO: "INFO",
    DEBUG: "DEBUG",
  },
  ENABLE_DEBUG: false, // Set to true for development
} as const;

/**
 * Collection state constants
 */
export const COLLECTION_STATE = {
  INITIAL_SIZE: 0,
  INITIAL_PAGE: 1,
  INITIAL_LOADING: false,
  INITIAL_ERROR: null,
  INITIAL_HAS_MORE: true,
} as const;

/**
 * Data event timing constants
 */
export const EVENT_TIMING = {
  DEBOUNCE_DELAY: 100, // 100ms
  THROTTLE_DELAY: 16, // ~60fps
  EMIT_TIMEOUT: 5000, // 5 seconds
  MAX_LISTENERS: 100,
} as const;

/**
 * Data aggregation constants
 */
export const DATA_AGGREGATION = {
  SUPPORTED_OPERATIONS: [
    "sum",
    "count",
    "avg",
    "min",
    "max",
    "distinct",
  ] as const,
  MAX_FIELD_DEPTH: 5,
  AGGREGATION_TIMEOUT: 10000, // 10 seconds
} as const;

/**
 * Data search constants
 */
export const DATA_SEARCH = {
  DEFAULT_FIELDS: ["id"],
  MAX_SEARCH_FIELDS: 20,
  SEARCH_DEBOUNCE: 300, // 300ms
  MIN_SEARCH_LENGTH: 1,
  MAX_SEARCH_LENGTH: 1000,
} as const;

/**
 * Collection defaults for initialization
 */
export const COLLECTION_DEFAULTS = {
  PAGE_SIZE: DATA_PAGINATION.DEFAULT_PAGE_SIZE,
  CURRENT_PAGE: DATA_PAGINATION.DEFAULT_CURRENT_PAGE,
  CACHE_STRATEGY: DATA_CACHE.DEFAULT_STRATEGY,
  PERSISTENCE_STRATEGY: DATA_PERSISTENCE.DEFAULT_STRATEGY,
  WEB_WORKERS_ENABLED: false,
  VALIDATION_STRICT: DATA_VALIDATION.DEFAULT_STRICT_MODE,
  PREFETCH_ENABLED: false,
} as const;

// NO UI constants: STYLING, DOM, TEMPLATE, SCROLL, INTERSECTION - those belong to List Manager/Component
