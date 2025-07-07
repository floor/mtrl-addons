/**
 * Core types for the mtrl-addons collection system (Pure Data Layer)
 *
 * These types define the foundational interfaces and contracts
 * for pure data management with zero UI concerns.
 */

/**
 * Base item interface - all collection items must extend this
 */
export interface CollectionItem {
  id: string;
  [key: string]: any;
}

/**
 * Collection configuration options (DATA ONLY)
 */
export interface CollectionConfig<T extends CollectionItem = CollectionItem> {
  /**
   * Static array of items to display
   */
  items?: T[];

  /**
   * Data adapter for API integration
   */
  adapter?: CollectionAdapter<T>;

  /**
   * Transform function for processing items
   */
  transform?: (item: any) => T;

  /**
   * Validation function for items
   */
  validate?: (item: T) => boolean;

  /**
   * Normalization function for data consistency
   */
  normalize?: (items: T[]) => T[];

  /**
   * Data persistence configuration
   */
  persistence?: PersistenceConfig;

  /**
   * Data caching configuration
   */
  cache?: CacheConfig;

  /**
   * Web worker configuration for background processing
   */
  webWorkers?: WebWorkerConfig;

  /**
   * Data prefetching configuration
   */
  prefetch?: PrefetchConfig;

  /**
   * Initial collection capacity for optimization
   */
  initialCapacity?: number;

  /**
   * Page size for pagination
   */
  pageSize?: number;

  // NO UI properties: container, template, className, ariaLabel
}

/**
 * Data persistence configuration
 */
export interface PersistenceConfig {
  strategy: "localStorage" | "indexedDB" | "custom";
  key: string;
  version?: number;
  encryption?: boolean;
  compression?: boolean;
  syncInterval?: number;
  maxAge?: number;
}

/**
 * Data caching configuration
 */
export interface CacheConfig {
  strategy: "memory" | "lru" | "custom";
  maxSize: number;
  maxAge: number;
  invalidationStrategy?: "time" | "version" | "manual";
}

/**
 * Web worker configuration for background processing
 */
export interface WebWorkerConfig {
  enabled: boolean;
  workerScript?: string;
  operations: Array<"transform" | "validate" | "normalize" | "filter" | "sort">;
  maxWorkers?: number;
  transferableObjects?: boolean;
}

/**
 * Data prefetching configuration
 */
export interface PrefetchConfig {
  enabled: boolean;
  adjacentPages?: number;
  preloadThreshold?: number;
  maxCacheSize?: number;
}

/**
 * Data adapter interface for API integration
 */
export interface CollectionAdapter<T extends CollectionItem = CollectionItem> {
  /**
   * Read data from the source
   */
  read(params?: AdapterParams): Promise<AdapterResponse<T>>;

  /**
   * Create new items in the source (optional)
   */
  create?(items: Omit<T, "id">[]): Promise<AdapterResponse<T>>;

  /**
   * Update existing items in the source (optional)
   */
  update?(items: Partial<T>[]): Promise<AdapterResponse<T>>;

  /**
   * Delete items from the source (optional)
   */
  delete?(ids: string[]): Promise<void>;
}

/**
 * Adapter parameters for data operations
 */
export interface AdapterParams {
  // Pagination parameters
  page?: number;
  pageSize?: number;
  offset?: number;
  cursor?: string;

  // Data filtering/sorting
  search?: string;
  filters?: Record<string, any>;
  sort?: Array<{
    field: string;
    direction: "asc" | "desc";
  }>;

  // Custom parameters
  [key: string]: any;
}

/**
 * Adapter response structure
 */
export interface AdapterResponse<T extends CollectionItem = CollectionItem> {
  /**
   * Array of items
   */
  items: T[];

  /**
   * Pagination and response metadata
   */
  meta?: {
    total?: number;
    page?: number;
    pageSize?: number;
    hasNext?: boolean;
    hasPrev?: boolean;
    cursor?: string;
    filter?: Record<string, any>;
    sort?: Array<{ field: string; direction: "asc" | "desc" }>;
  };

  /**
   * Error information if operation failed
   */
  error?: {
    message: string;
    code?: string;
    details?: any;
  };
}

/**
 * Collection data events (NO UI EVENTS)
 */
export enum CollectionDataEvents {
  // Data lifecycle
  ITEMS_LOADED = "items:loaded",
  ITEMS_ADDED = "items:added",
  ITEMS_UPDATED = "items:updated",
  ITEMS_REMOVED = "items:removed",
  ITEMS_CLEARED = "items:cleared",

  // Data state
  LOADING_START = "loading:start",
  LOADING_END = "loading:end",
  ERROR_OCCURRED = "error:occurred",

  // Data operations
  CACHE_HIT = "cache:hit",
  CACHE_MISS = "cache:miss",
  SYNC_START = "sync:start",
  SYNC_COMPLETE = "sync:complete",

  // Background operations
  PREFETCH_START = "prefetch:start",
  PREFETCH_COMPLETE = "prefetch:complete",
  WORKER_TASK_START = "worker:task:start",
  WORKER_TASK_COMPLETE = "worker:task:complete",
}

/**
 * Collection observer function type
 */
export type CollectionObserver<T extends CollectionItem = CollectionItem> = (
  payload: CollectionEventPayload<T>
) => void;

/**
 * Unsubscribe function type
 */
export type CollectionUnsubscribe = () => void;

/**
 * Collection event payload
 */
export interface CollectionEventPayload<
  T extends CollectionItem = CollectionItem
> {
  event: CollectionDataEvents;
  data?: any;
  items?: T[];
  error?: Error;
  timestamp: number;
  source: "collection";
}

/**
 * Aggregation operation types
 */
export interface AggregateOperation {
  field: string;
  operation: "sum" | "count" | "avg" | "min" | "max" | "distinct";
  alias?: string;
}

/**
 * Base collection interface (minimal core)
 * Only essential data operations - everything else is added via plugins
 */
export interface BaseCollection<T extends CollectionItem = CollectionItem> {
  // Core data access
  getItems(): T[];
  getItem(id: string): T | undefined;
  getSize(): number;
  getTotalCount(): number;

  // Basic state
  isLoading(): boolean;
  getError(): Error | null;

  // State management (for plugins)
  getState(): any;
  setState(newState: any): void;

  // Event system (for plugins)
  subscribe(observer: (payload: any) => void): () => void;
  emit(event: string, data: any): void;

  // Lifecycle
  destroy(): void;

  // Plugin internals (not part of public API)
  _config: CollectionConfig<T>;
  _stateStore: any;
  _eventEmitter: any;
}

/**
 * Main collection interface (PURE DATA MANAGEMENT)
 */
export interface Collection<T extends CollectionItem = CollectionItem> {
  // Data operations
  getItems(): T[];
  getItem(id: string): T | undefined;
  addItems(items: T[]): Promise<T[]>;
  updateItems(items: Partial<T>[]): Promise<T[]>;
  removeItems(ids: string[]): Promise<void>;
  clearItems(): Promise<void>;

  // Data queries
  filter(predicate: (item: T) => boolean): T[];
  sort(compareFn: (a: T, b: T) => number): T[];
  search(query: string, fields?: string[]): T[];
  aggregate(operations: AggregateOperation[]): any;

  // Data loading
  loadPage(page: number): Promise<AdapterResponse<T>>;
  loadMore(): Promise<AdapterResponse<T>>;
  refresh(): Promise<AdapterResponse<T>>;
  prefetch(pages: number[]): Promise<void>;

  // Data state
  getSize(): number;
  getTotalCount(): number;
  isLoading(): boolean;
  getError(): Error | null;
  hasNext(): boolean;
  getCurrentPage(): number;

  // Data persistence
  save(): Promise<void>;
  load(): Promise<void>;
  clearCache(): Promise<void>;
  sync(): Promise<void>;

  // Events (data events only)
  subscribe(observer: CollectionObserver<T>): CollectionUnsubscribe;
  emit(event: CollectionDataEvents, data: any): void;

  // Lifecycle
  destroy(): void;

  // Plugin system for data features
  use(plugin: CollectionPlugin): Collection<T>;

  // NO UI methods: scrollTo, render, setTemplate, element, etc.
}

/**
 * Plugin interface for data features
 */
export interface CollectionPlugin<T = any> {
  name: string;
  version: string;
  dependencies?: string[];

  install(collection: Collection<any>, config: T): void;
  uninstall?(collection: Collection<any>): void;
}

/**
 * Data validation types
 */
export interface ValidationConfig {
  schema?: any;
  sanitize?: boolean;
  strict?: boolean;
  customValidators?: Record<string, (value: any) => boolean>;
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
  value: any;
}

/**
 * Background processing types
 */
export interface WorkerTask {
  id: string;
  operation: string;
  data: any;
  priority: "low" | "normal" | "high";
  timeout?: number;
}

export interface WorkerResult {
  taskId: string;
  result: any;
  duration: number;
  error?: Error;
}
