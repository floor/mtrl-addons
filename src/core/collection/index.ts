/**
 * Collection System - Simplified Architecture
 * Direct feature composition without plugin system
 */

import type { CollectionItem } from "./types";

// Main collection export
export { createCollection } from "./collection";

// Types
export type {
  Collection,
  CollectionConfig,
  CollectionItem,
  CollectionAdapter,
  AdapterParams,
  AdapterResponse,
} from "./types";

export { CollectionEvents } from "./types";

// State and events (for advanced usage)
export { createCollectionState } from "./state";
export { createCollectionEventEmitter } from "./events";

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
      if (params.offset !== undefined) {
        url.searchParams.set("offset", params.offset.toString());
      }
      if (params.limit !== undefined) {
        url.searchParams.set("limit", params.limit.toString());
      }
      if (params.page) {
        url.searchParams.set("page", params.page.toString());
      }
      if (params.pageSize) {
        url.searchParams.set("pageSize", params.pageSize.toString());
      }
      if (params.search) {
        url.searchParams.set("q", params.search);
      }

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
          items: data.items || data.data || [],
          meta: {
            total: data.total,
            page: data.page,
            pageSize: data.pageSize || data.limit,
            hasNext: data.hasNext,
            hasPrev: data.hasPrev,
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
