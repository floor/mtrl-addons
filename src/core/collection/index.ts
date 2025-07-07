/**
 * Collection System - Composition-Based Architecture
 *
 * Following the blueprint with functional composition and plugin system
 */

import type { CollectionItem } from "./types";

// New composition-based architecture exports
export { createCollection, createDataCollection } from "./collection-composer";
export { createBaseCollection } from "./base-collection";

// Plugin exports
export { withLoading } from "./features/api/loading";
export { withDataOperations } from "./features/operations/data-operations";

// Core types
export type {
  Collection,
  BaseCollection,
  CollectionConfig,
  CollectionItem,
  CollectionAdapter,
  AdapterParams,
  AdapterResponse,
} from "./types";

// Events and state
export { CollectionDataEvents } from "./types";
export { CollectionEvents, createEventPayload } from "./events";
export { createCollectionState } from "./state";

// Constants
export * from "./constants";

/**
 * Quick start utility for creating a simple REST adapter
 */
export function createRestAdapter<T extends CollectionItem>(
  baseUrl: string,
  options: {
    headers?: Record<string, string>;
    timeout?: number;
    transform?: (response: any) => { items: T[]; meta?: any };
  } = {}
) {
  return {
    async read(params: any = {}) {
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

// Collection architecture is now complete!
