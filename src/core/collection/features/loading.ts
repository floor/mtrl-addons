/**
 * Loading Feature - Range-based data loading
 * Composable feature for collection
 */

import type {
  CollectionItem,
  CollectionAdapter,
  AdapterResponse,
} from "../types";
import { CollectionEvents } from "../types";
import type { CollectionContext } from "./api";

export interface LoadingState {
  currentPage: number;
  hasMore: boolean;
  loadedRanges: Set<number>;
  pendingRanges: Set<number>;
  failedRanges: Map<number, Error>;
  activeRequests: Map<number, Promise<any[]>>;
}

export interface LoadingFeature<T extends CollectionItem> {
  loadRange(offset: number, limit: number): Promise<T[]>;
  loadMissingRanges(range: { start: number; end: number }): Promise<void>;
  loadPage(page: number): Promise<AdapterResponse<T>>;
  loadMore(): Promise<AdapterResponse<T>>;
  refresh(): Promise<AdapterResponse<T>>;
  getLoadedRanges(): Set<number>;
  getPendingRanges(): Set<number>;
  clearFailedRanges(): void;
  retryFailedRange(rangeId: number): Promise<T[]>;
}

/**
 * Adds loading functionality to collection
 */
export function withLoading<
  T extends CollectionItem = CollectionItem
>(config?: { pageSize?: number; rangeSize?: number }) {
  return <TBase extends CollectionContext>(
    base: TBase
  ): TBase & LoadingFeature<T> => {
    const adapter = base._config.adapter;
    const transform = base._config.transform;
    const pageSize = config?.pageSize || base._config.pageSize || 20;
    const rangeSize = config?.rangeSize || base._config.rangeSize || 50;

    // Loading state
    const state: LoadingState = {
      currentPage: 1,
      hasMore: true,
      loadedRanges: new Set<number>(),
      pendingRanges: new Set<number>(),
      failedRanges: new Map<number, Error>(),
      activeRequests: new Map<number, Promise<T[]>>(),
    };

    const getRangeId = (offset: number, limit: number): number => {
      return Math.floor(offset / limit);
    };

    const transformItems = (rawItems: any[]): T[] => {
      if (!transform) return rawItems;
      return rawItems.map(transform);
    };

    const loadRange = async (offset: number, limit: number): Promise<T[]> => {
      if (!adapter) {
        console.warn("[Collection] No adapter configured");
        return [];
      }

      const rangeId = getRangeId(offset, limit);

      // Check if already loaded
      if (state.loadedRanges.has(rangeId)) {
        const items = base._stateStore.get().items;
        return items.slice(offset, offset + limit);
      }

      // Check if already pending
      if (state.pendingRanges.has(rangeId)) {
        const existingRequest = state.activeRequests.get(rangeId);
        if (existingRequest) {
          return existingRequest;
        }
      }

      // Mark as pending
      state.pendingRanges.add(rangeId);
      base._eventEmitter.emit(CollectionEvents.LOADING_START, {
        offset,
        limit,
      });

      // Create the load promise
      const loadPromise = adapter
        .read({ offset, limit })
        .then((response) => {
          if (response.error) {
            throw new Error(response.error.message);
          }

          const items = transformItems(response.items);

          // Update state
          const currentState = base._stateStore.get();
          const newItems = [...currentState.items];

          // Place items at correct positions
          for (let i = 0; i < items.length; i++) {
            newItems[offset + i] = items[i];
          }

          base._stateStore.set({
            items: newItems,
            totalCount: response.meta?.total || newItems.length,
          });

          // Mark as loaded
          state.loadedRanges.add(rangeId);
          state.pendingRanges.delete(rangeId);
          state.activeRequests.delete(rangeId);

          base._eventEmitter.emit(CollectionEvents.RANGE_LOADED, {
            offset,
            limit,
            items,
          });

          return items;
        })
        .catch((error) => {
          // Mark as failed
          state.failedRanges.set(rangeId, error);
          state.pendingRanges.delete(rangeId);
          state.activeRequests.delete(rangeId);

          base._eventEmitter.emit(CollectionEvents.RANGE_FAILED, {
            offset,
            limit,
            error,
          });

          throw error;
        })
        .finally(() => {
          base._eventEmitter.emit(CollectionEvents.LOADING_END, {
            offset,
            limit,
          });
        });

      state.activeRequests.set(rangeId, loadPromise);
      return loadPromise;
    };

    const loadMissingRanges = async (range: {
      start: number;
      end: number;
    }): Promise<void> => {
      const promises: Promise<T[]>[] = [];

      for (let offset = range.start; offset <= range.end; offset += rangeSize) {
        const limit = Math.min(rangeSize, range.end - offset + 1);
        const rangeId = getRangeId(offset, rangeSize);

        if (
          !state.loadedRanges.has(rangeId) &&
          !state.pendingRanges.has(rangeId)
        ) {
          promises.push(loadRange(offset, limit));
        }
      }

      if (promises.length > 0) {
        await Promise.all(promises);
      }
    };

    const loadPage = async (page: number): Promise<AdapterResponse<T>> => {
      if (!adapter) {
        return { items: [], error: { message: "No adapter configured" } };
      }

      const offset = (page - 1) * pageSize;

      try {
        const items = await loadRange(offset, pageSize);
        return {
          items,
          meta: {
            page,
            pageSize: pageSize,
            total: base._stateStore.get().totalCount,
          },
        };
      } catch (error) {
        return {
          items: [],
          error: {
            message: error instanceof Error ? error.message : "Unknown error",
          },
        };
      }
    };

    const loadMore = async (): Promise<AdapterResponse<T>> => {
      const result = await loadPage(state.currentPage + 1);
      if (result.items.length > 0) {
        state.currentPage++;
        state.hasMore = result.items.length === pageSize;
      } else {
        state.hasMore = false;
      }
      return result;
    };

    const refresh = async (): Promise<AdapterResponse<T>> => {
      // Clear all tracking
      state.loadedRanges.clear();
      state.pendingRanges.clear();
      state.failedRanges.clear();
      state.activeRequests.clear();
      state.currentPage = 1;
      state.hasMore = true;

      // Reset state
      base._stateStore.set({
        items: [],
        totalCount: 0,
      });

      // Load first page
      return loadPage(1);
    };

    // Return enhanced collection
    return Object.assign(base, {
      // Loading API
      loadRange,
      loadMissingRanges,
      loadPage,
      loadMore,
      refresh,
      getLoadedRanges: () => new Set(state.loadedRanges),
      getPendingRanges: () => new Set(state.pendingRanges),
      clearFailedRanges: () => state.failedRanges.clear(),
      retryFailedRange: async (rangeId: number) => {
        state.failedRanges.delete(rangeId);
        const offset = rangeId * rangeSize;
        return loadRange(offset, rangeSize);
      },
    });
  };
}
