/**
 * Collection System (Pure Data Layer)
 *
 * Main exports for the mtrl-addons collection data management system.
 * This is a pure data layer with zero UI concerns.
 */

// Core collection factory
export { createCollection } from "./collection";

// Types and interfaces
export type {
  Collection,
  CollectionConfig,
  CollectionItem,
  CollectionObserver,
  CollectionUnsubscribe,
  CollectionAdapter,
  AdapterParams,
  AdapterResponse,
  CollectionEventPayload,
  CollectionDataEvents,
  CollectionPlugin,
  AggregateOperation,
  PersistenceConfig,
  CacheConfig,
  WebWorkerConfig,
  PrefetchConfig,
  ValidationConfig,
  ValidationError,
  WorkerTask,
  WorkerResult,
} from "./types";

// State management
export {
  createCollectionState,
  createInitialDataState,
  stateUtils,
} from "./state";

export type {
  CollectionDataState,
  StateStore,
  StateChangeListener,
} from "./state";

// Event system
export {
  CollectionEvents,
  createCollectionEventEmitter,
  createEventPayload,
  eventUtils,
} from "./events";

export type { CollectionEventEmitter } from "./events";

// Data constants
export {
  DATA_PAGINATION,
  DATA_CACHE,
  DATA_PERSISTENCE,
  WEB_WORKERS,
  DATA_VALIDATION,
  DATA_TRANSFORMATION,
  API_ADAPTER,
  BACKGROUND_PROCESSING,
  DATA_LOGGING,
  COLLECTION_STATE,
  EVENT_TIMING,
  DATA_AGGREGATION,
  DATA_SEARCH,
  COLLECTION_DEFAULTS,
} from "./constants";

// Import for utility functions
import type { CollectionItem, CollectionAdapter, AdapterParams } from "./types";
import { createCollection } from "./collection";

// Future plugin exports (when implemented)
// export { localStorage, indexedDB, webWorkers } from './features/persistence';
// export { withValidation, withTransformation } from './features/validation';
// export { memoryCache, lruCache } from './features/caching';

/**
 * Quick start utility for creating a basic data collection
 */
export function createDataCollection<T extends CollectionItem>(options: {
  items?: T[];
  adapter?: CollectionAdapter<T>;
  transform?: (item: any) => T;
  validate?: (item: T) => boolean;
  pageSize?: number;
}) {
  return createCollection({
    items: options.items,
    adapter: options.adapter,
    transform: options.transform,
    validate: options.validate,
    initialCapacity: options.pageSize || 20,
  });
}

/**
 * Utility for creating a simple REST adapter
 */
export function createRestAdapter<T extends CollectionItem>(
  baseUrl: string,
  options: {
    headers?: Record<string, string>;
    timeout?: number;
    transform?: (response: any) => { items: T[]; meta?: any };
  } = {}
): CollectionAdapter<T> {
  return {
    async read(params: AdapterParams = {}) {
      const url = new URL(baseUrl);

      // Add query parameters
      if (params.page) url.searchParams.set("page", params.page.toString());
      if (params.pageSize)
        url.searchParams.set("limit", params.pageSize.toString());
      if (params.search) url.searchParams.set("q", params.search);
      if (params.cursor) url.searchParams.set("cursor", params.cursor);

      try {
        const response = await fetch(url.toString(), {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            ...options.headers,
          },
          signal: options.timeout
            ? AbortSignal.timeout(options.timeout)
            : undefined,
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();

        // Apply custom transform if provided
        if (options.transform) {
          return options.transform(data);
        }

        // Default transform
        return {
          items: data.items || data.data || [data].flat(),
          meta: {
            total: data.total,
            page: data.page,
            hasNext: data.hasNext || data.has_next,
            hasPrev: data.hasPrev || data.has_prev,
          },
        };
      } catch (error) {
        return {
          items: [],
          error: {
            message: error instanceof Error ? error.message : "Unknown error",
            code: "FETCH_ERROR",
          },
        };
      }
    },
  };
}

// NO UI exports: templates, DOM utilities, virtual scrolling, etc.
// Those belong to List Manager and List Component layers
