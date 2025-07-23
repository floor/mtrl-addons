// src/core/collection/features/adapter.ts

/**
 * Route Adapter Feature - REST API integration for collections
 *
 * Provides advanced API communication with pagination strategies,
 * query operators, caching, and intelligent response parsing
 */

import type {
  Collection,
  CollectionAdapter,
  AdapterParams,
  AdapterResponse,
} from "../types";

/**
 * Query operators for filtering data
 */
export const OPERATORS = {
  EQ: "eq",
  NE: "ne",
  GT: "gt",
  GTE: "gte",
  LT: "lt",
  LTE: "lte",
  IN: "in",
  NIN: "nin",
  CONTAINS: "contains",
  STARTS_WITH: "startsWith",
  ENDS_WITH: "endsWith",
} as const;

/**
 * Pagination strategies supported by the route adapter
 */
export type PaginationStrategy = "cursor" | "offset" | "page";

/**
 * Pagination configuration
 */
export interface PaginationConfig {
  strategy: PaginationStrategy;
  indexName?: string;
  limitParam?: string;
  limitSize?: number;
}

/**
 * Route adapter configuration
 */
export interface RouteAdapterConfig {
  base?: string;
  endpoints?: {
    create?: string;
    list?: string;
    update?: string;
    delete?: string;
  };
  headers?: Record<string, string>;
  cache?: boolean;
  onError?: (error: Error, context?: any) => void;
  adapter?: {
    parseResponse?: (response: any) => any;
  };
  pagination?: PaginationConfig;
}

/**
 * Response metadata interface
 */
export interface ResponseMeta {
  cursor: string | null;
  hasNext: boolean;
  total?: number;
  page?: number;
  pages?: number;
  offset?: number;
}

/**
 * Parsed response interface
 */
export interface ParsedResponse<T = any> {
  items: T[];
  meta: ResponseMeta;
}

/**
 * Creates a route adapter for REST API integration
 */
export function createRouteAdapter(
  config: RouteAdapterConfig = {}
): CollectionAdapter & { disconnect: () => void } {
  const activeControllers = new Set<AbortController>();
  const cache = new Map<string, { data: any; timestamp: number }>();
  const urlCache = new Map<string, string>();

  // Initialize pagination config
  const paginationConfig: Required<PaginationConfig> = {
    strategy: config.pagination?.strategy || "cursor",
    indexName:
      config.pagination?.indexName ||
      getDefaultIndexName(config.pagination?.strategy || "cursor"),
    limitParam: config.pagination?.limitParam || "limit",
    limitSize: config.pagination?.limitSize || 20,
  };

  function getDefaultIndexName(strategy: PaginationStrategy): string {
    switch (strategy) {
      case "offset":
        return "offset";
      case "page":
        return "page";
      case "cursor":
        return "cursor";
      default:
        return "cursor";
    }
  }

  function handleError(error: Error, context?: any): never {
    config.onError?.(error, context);
    throw error;
  }

  function normalizeBaseUrl(baseUrl?: string): string {
    if (!baseUrl) return "http://localhost";
    if (/^https?:\/\//i.test(baseUrl)) return baseUrl;
    if (baseUrl.startsWith("/")) {
      // In browser environment
      if (typeof window !== "undefined") {
        return `${window.location.origin}${baseUrl}`;
      }
      // In test/node environment, just return the path
      return baseUrl;
    }
    return `http://${baseUrl}`;
  }

  function buildUrl(
    endpoint: string,
    params: Record<string, any> = {}
  ): string {
    const cacheKey = endpoint + JSON.stringify(params);
    if (urlCache.has(cacheKey)) return urlCache.get(cacheKey)!;

    const normalizedBase = normalizeBaseUrl(config.base);

    // Handle relative paths in test environment
    if (normalizedBase.startsWith("/") && typeof window === "undefined") {
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (Array.isArray(value)) {
          value.forEach((v) => searchParams.append(key, v));
        } else if (value !== null && value !== undefined) {
          searchParams.append(key, String(value));
        }
      });

      const urlString =
        normalizedBase +
        endpoint +
        (searchParams.toString() ? `?${searchParams.toString()}` : "");
      urlCache.set(cacheKey, urlString);
      return urlString;
    }

    // Normal URL construction
    const url = new URL(normalizedBase + endpoint);
    Object.entries(params).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        value.forEach((v) => url.searchParams.append(key, v));
      } else if (value !== null && value !== undefined) {
        url.searchParams.append(key, String(value));
      }
    });

    const urlString = url.toString();
    urlCache.set(cacheKey, urlString);
    return urlString;
  }

  function transformQuery(query: Record<string, any>): Record<string, any> {
    const params: Record<string, any> = {};

    Object.entries(query).forEach(([field, conditions]) => {
      if (
        typeof conditions === "object" &&
        !Array.isArray(conditions) &&
        conditions !== null
      ) {
        Object.entries(conditions).forEach(([op, value]) => {
          const operator = op.toUpperCase();
          if (OPERATORS[operator as keyof typeof OPERATORS]) {
            params[
              `${field}_${OPERATORS[operator as keyof typeof OPERATORS]}`
            ] = value;
          }
        });
      } else {
        params[field] = conditions;
      }
    });

    return params;
  }

  async function request(url: string, options: RequestInit = {}): Promise<any> {
    const controller = new AbortController();
    activeControllers.add(controller);

    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          "Content-Type": "application/json",
          ...config.headers,
          ...options.headers,
        },
        signal: controller.signal,
      });

      if (!response.ok) {
        let errorData: any;
        try {
          errorData = await response.json();
        } catch {
          errorData = { message: `HTTP error ${response.status}` };
        }
        return handleError(
          new Error(errorData.message || "API request failed")
        );
      }

      const contentType = response.headers.get("content-type");
      if (contentType?.includes("application/json")) {
        return await response.json();
      }
      return await response.text();
    } catch (error) {
      if ((error as Error).name === "AbortError") return null;
      return handleError(error as Error);
    } finally {
      activeControllers.delete(controller);
    }
  }

  function getCache(key: string): any | null {
    if (!config.cache) return null;
    const cached = cache.get(key);
    if (!cached) return null;

    const { data, timestamp } = cached;
    if (Date.now() - timestamp > 5 * 60 * 1000) {
      cache.delete(key);
      return null;
    }
    return data;
  }

  function setCache(key: string, data: any): void {
    if (!config.cache) return;
    cache.set(key, { data, timestamp: Date.now() });
  }

  function createPaginationParams(params: AdapterParams): Record<string, any> {
    const result: Record<string, any> = {};

    switch (paginationConfig.strategy) {
      case "cursor":
        if (params.cursor) result[paginationConfig.indexName] = params.cursor;
        result[paginationConfig.limitParam] =
          params.limit || paginationConfig.limitSize;
        break;

      case "offset":
        result[paginationConfig.indexName] = params.offset || 0;
        result[paginationConfig.limitParam] =
          params.limit || paginationConfig.limitSize;
        break;

      case "page":
        const page =
          params.page ||
          (params.offset
            ? Math.floor(
                params.offset / (params.limit || paginationConfig.limitSize)
              ) + 1
            : 1);
        result[paginationConfig.indexName] = page;
        result[paginationConfig.limitParam] =
          params.limit || paginationConfig.limitSize;
        break;
    }

    return result;
  }

  function parseResponse(
    response: any,
    params: AdapterParams
  ): AdapterResponse {
    if (!response) {
      return { items: [] };
    }

    // Custom parser
    if (config.adapter?.parseResponse) {
      return config.adapter.parseResponse(response);
    }

    // Standard format
    if (response.items && response.meta) {
      return response;
    }

    // Array response
    if (Array.isArray(response)) {
      return {
        items: response,
        meta: {
          total: response.length,
          hasNext:
            response.length >= (params.limit || paginationConfig.limitSize),
        },
      };
    }

    // Common API formats
    const data = response.data || response.results || response.content || [];
    const meta = response.meta || response.pagination || {};

    return {
      items: data,
      meta: {
        total: meta.total || response.total || data.length,
        hasNext:
          meta.hasNext ||
          meta.hasMore ||
          data.length >= (params.limit || paginationConfig.limitSize),
        cursor: meta.cursor || meta.nextCursor || meta.next,
      },
    };
  }

  // Return the adapter implementation with disconnect method
  return {
    async read(params: AdapterParams): Promise<AdapterResponse> {
      // Transform filters
      const filters = params.filters ? transformQuery(params.filters) : {};

      // Create pagination params
      const paginationParams = createPaginationParams(params);

      // Build final params
      const queryParams = {
        ...filters,
        ...paginationParams,
        ...(params.sort && { sort: params.sort }),
        ...(params.search && { search: params.search }),
      };

      const url = buildUrl(config.endpoints?.list || "/list", queryParams);

      // Check cache
      const cached = getCache(url);
      if (cached) return cached;

      // Make request
      const response = await request(url);
      const parsed = parseResponse(response, params);

      // Cache result
      setCache(url, parsed);

      return parsed;
    },

    disconnect() {
      // Abort all active requests
      activeControllers.forEach((controller) => controller.abort());
      activeControllers.clear();
      cache.clear();
      urlCache.clear();
    },
  };
}

/**
 * Adds route adapter to collection
 */
export function withRouteAdapter<T extends Collection>(
  config: RouteAdapterConfig = {}
) {
  return (collection: T): T => {
    const adapter = createRouteAdapter(config);

    // Set the adapter on the collection
    if (
      "setAdapter" in collection &&
      typeof collection.setAdapter === "function"
    ) {
      collection.setAdapter(adapter);
    }

    // Extend collection with disconnect method from adapter
    return Object.assign(collection, {
      disconnect: adapter.disconnect,
    });
  };
}
