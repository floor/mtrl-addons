/**
 * Core types for the mtrl-addons collection system
 * Simplified architecture with direct feature composition
 */

/**
 * Base item interface - all collection items must extend this
 */
export interface CollectionItem {
  id: string;
  [key: string]: any;
}

/**
 * Collection configuration options
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
   * Page size for pagination
   */
  pageSize?: number;

  /**
   * Range size for virtual scrolling
   */
  rangeSize?: number;
}

/**
 * Data adapter interface for loading data
 */
export interface CollectionAdapter<T extends CollectionItem = CollectionItem> {
  read(params: AdapterParams): Promise<AdapterResponse<T>>;
}

/**
 * Parameters for adapter requests
 */
export interface AdapterParams {
  offset?: number;
  limit?: number;
  page?: number;
  pageSize?: number;
  cursor?: string;
  search?: string;
  sort?: string;
  filter?: Record<string, any>;
  [key: string]: any;
}

/**
 * Response from adapter
 */
export interface AdapterResponse<T extends CollectionItem = CollectionItem> {
  items: T[];
  meta?: {
    total?: number;
    page?: number;
    pageSize?: number;
    hasNext?: boolean;
    hasPrev?: boolean;
    cursor?: string;
  };
  error?: {
    message: string;
    code?: string;
    details?: any;
  };
}

/**
 * Main Collection interface with all features composed
 */
export interface Collection<T extends CollectionItem = CollectionItem> {
  // Core data access
  getItems(): T[];
  getItem(id: string): T | undefined;
  getSize(): number;
  getTotalCount(): number;

  // State
  isLoading(): boolean;
  getError(): Error | null;

  // Data loading (from loading feature)
  loadRange(offset: number, limit: number): Promise<T[]>;
  loadPage(page: number): Promise<AdapterResponse<T>>;
  loadMore(): Promise<AdapterResponse<T>>;
  refresh(): Promise<AdapterResponse<T>>;

  // Range management (from loading feature)
  loadMissingRanges(range: { start: number; end: number }): Promise<void>;
  getLoadedRanges(): Set<number>;
  getPendingRanges(): Set<number>;
  clearFailedRanges(): void;
  retryFailedRange(rangeId: number): Promise<T[]>;

  // Data operations (from operations feature)
  filter(predicate: (item: T) => boolean): T[];
  sort(compareFn: (a: T, b: T) => number): T[];
  search(query: string, fields?: string[]): T[];

  // Event system
  on(event: string, handler: (data: any) => void): () => void;
  off(event: string, handler: (data: any) => void): void;
  emit(event: string, data: any): void;

  // Lifecycle
  destroy(): void;
}

/**
 * Collection events
 */
export enum CollectionEvents {
  // Data events
  ITEMS_LOADED = "items:loaded",
  ITEMS_ADDED = "items:added",
  ITEMS_UPDATED = "items:updated",
  ITEMS_REMOVED = "items:removed",

  // Loading events
  LOADING_START = "loading:start",
  LOADING_END = "loading:end",
  LOADING_ERROR = "loading:error",

  // Range events
  RANGE_LOADED = "range:loaded",
  RANGE_FAILED = "range:failed",
}
