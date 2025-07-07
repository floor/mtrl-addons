/**
 * Core collection implementation (Pure Data Layer)
 *
 * Main collection factory function that creates a pure data management
 * collection with zero UI concerns.
 */

import type {
  Collection,
  CollectionConfig,
  CollectionItem,
  CollectionObserver,
  CollectionUnsubscribe,
  CollectionAdapter,
  AdapterParams,
  AdapterResponse,
  CollectionPlugin,
  AggregateOperation,
} from "./types";
import { CollectionDataEvents } from "./types";

import {
  createCollectionState,
  createInitialDataState,
  type StateStore,
  type CollectionDataState,
} from "./state";

import {
  createCollectionEventEmitter,
  CollectionEvents,
  createEventPayload,
  type CollectionEventEmitter,
} from "./events";

import {
  DATA_PAGINATION,
  DATA_LOGGING,
  COLLECTION_DEFAULTS,
  API_ADAPTER,
  DATA_SEARCH,
  DATA_AGGREGATION,
} from "./constants";

/**
 * Creates a new collection instance (Pure Data Management)
 */
export function createCollection<T extends CollectionItem = CollectionItem>(
  config: CollectionConfig<T> = {}
): Collection<T> {
  // Initialize data state
  const initialState = createInitialDataState({
    items: config.items || [],
    pageSize: COLLECTION_DEFAULTS.PAGE_SIZE,
    initialCapacity: config.initialCapacity,
  });

  // Create state store for data management
  const stateStore = createCollectionState<T>(initialState);

  // Create event emitter for data events
  const eventEmitter = createCollectionEventEmitter<T>();

  // Track if collection is destroyed
  let isDestroyed = false;

  // Track pagination state
  let currentPage: number = COLLECTION_DEFAULTS.CURRENT_PAGE;
  let pageSize: number = COLLECTION_DEFAULTS.PAGE_SIZE;
  let hasMore = true;
  let isLoadingMore = false;

  // Track what data we have loaded (simple approach)
  let totalItemsExpected = 0;

  // Installed plugins
  const installedPlugins = new Map<string, CollectionPlugin>();

  // Subscribe to state changes for data event emission
  const stateUnsubscribe = stateStore.subscribe((state) => {
    if (!isDestroyed) {
      // Emit data events based on state changes
      if (state.loading && !stateStore.get().loading) {
        eventEmitter.emit(CollectionDataEvents.LOADING_END, {
          reason: "state-change",
        });
      }

      if (state.error) {
        eventEmitter.emit(CollectionEvents.ERROR_OCCURRED, {
          error: state.error,
        });
      }
    }
  });

  /**
   * Load more items using adapter (Pure Data Operation)
   */
  const loadMoreItems = async (): Promise<AdapterResponse<T>> => {
    if (!config.adapter || isLoadingMore) {
      throw new Error("No adapter configured or already loading");
    }

    isLoadingMore = true;
    const nextPage = currentPage + 1;

    try {
      console.log(`${DATA_LOGGING.PREFIX} Loading page ${nextPage}...`);

      // Emit loading start event
      eventEmitter.emit(
        CollectionEvents.LOADING_START,
        createEventPayload.loadingStart(`Loading page ${nextPage}`)
      );

      // Update loading state
      stateStore.set({ loading: true });

      const response = await config.adapter.read({
        page: nextPage,
        pageSize,
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      // Transform and validate items if configured
      let processedItems = response.items;

      if (config.transform) {
        processedItems = processedItems.map(config.transform);
      }

      if (config.validate) {
        processedItems = processedItems.filter(config.validate);
      }

      // Update data state
      const currentState = stateStore.get();
      const newItems = [...currentState.items, ...processedItems];

      stateStore.set({
        items: newItems,
        totalCount: response.meta?.total || newItems.length,
        loading: false,
        error: null,
      });

      // Update pagination state
      currentPage = nextPage;
      hasMore = determineHasMore(response, processedItems.length);

      // Emit data events
      eventEmitter.emit(
        CollectionEvents.ITEMS_LOADED,
        createEventPayload.itemsLoaded(processedItems, response.meta)
      );

      eventEmitter.emit(
        CollectionEvents.LOADING_END,
        createEventPayload.loadingEnd(`Loaded page ${nextPage}`)
      );

      console.log(
        `${DATA_LOGGING.PREFIX} Loaded page ${nextPage}, hasMore: ${hasMore}`
      );

      return response;
    } catch (error) {
      console.error(
        `${DATA_LOGGING.PREFIX} Error loading page ${nextPage}:`,
        error
      );

      const errorObj = error as Error;
      stateStore.set({
        loading: false,
        error: errorObj,
      });

      eventEmitter.emit(
        CollectionEvents.ERROR_OCCURRED,
        createEventPayload.errorOccurred(errorObj, { page: nextPage })
      );

      throw error;
    } finally {
      isLoadingMore = false;
    }
  };

  /**
   * Determine if there's more data to load
   */
  const determineHasMore = (
    response: AdapterResponse<T>,
    itemsLength: number
  ): boolean => {
    const apiHasNext = response.meta?.hasNext;
    const gotFullPage = itemsLength === pageSize;
    const apiTotal = response.meta?.total;

    console.log(`${DATA_LOGGING.PREFIX} determineHasMore debug:`, {
      apiTotal,
      apiHasNext,
      gotFullPage,
      itemsLength,
      pageSize,
      currentItemsLength: stateStore.get().items.length,
    });

    // Use multiple indicators to determine if there's more data
    if (apiTotal !== undefined) {
      const currentState = stateStore.get();
      const result = currentState.items.length + itemsLength < apiTotal;
      console.log(
        `${DATA_LOGGING.PREFIX} Using apiTotal logic: ${currentState.items.length} + ${itemsLength} < ${apiTotal} = ${result}`
      );
      return result;
    } else if (apiHasNext !== undefined) {
      console.log(
        `${DATA_LOGGING.PREFIX} Using apiHasNext logic: ${apiHasNext}`
      );
      return apiHasNext;
    } else {
      console.log(
        `${DATA_LOGGING.PREFIX} Using gotFullPage logic: ${gotFullPage}`
      );
      return gotFullPage;
    }
  };

  /**
   * Apply data transformations (normalize, transform, validate)
   */
  const applyDataTransformations = (items: any[]): T[] => {
    let processedItems = [...items];

    // Apply normalization if configured
    if (config.normalize) {
      processedItems = config.normalize(processedItems);
    }

    // Apply transformation if configured
    if (config.transform) {
      processedItems = processedItems.map(config.transform);
    }

    // Apply validation if configured
    if (config.validate) {
      processedItems = processedItems.filter(config.validate);
    }

    return processedItems;
  };

  /**
   * Apply search to items
   */
  const applySearch = (items: T[], query: string, fields: string[]): T[] => {
    if (!query || fields.length === 0) {
      return items;
    }

    const searchQuery = query.toLowerCase();
    return items.filter((item) => {
      return fields.some((field) => {
        const fieldValue = (item as any)[field];
        return (
          fieldValue &&
          fieldValue.toString().toLowerCase().includes(searchQuery)
        );
      });
    });
  };

  // Return the pure data collection interface
  const collection: Collection<T> = {
    // Data operations
    getItems(): T[] {
      return stateStore.get().items;
    },

    getItem(id: string): T | undefined {
      return stateStore.get().items.find((item) => item.id === id);
    },

    async addItems(items: T[]): Promise<T[]> {
      const processedItems = applyDataTransformations(items);
      const currentState = stateStore.get();

      // Add to existing items
      const newItems = [...currentState.items, ...processedItems];

      stateStore.set({
        items: newItems,
        totalCount: newItems.length,
      });

      // Emit data event
      eventEmitter.emit(
        CollectionEvents.ITEMS_ADDED,
        createEventPayload.itemsAdded(processedItems, [
          currentState.items.length,
        ])
      );

      return processedItems;
    },

    async updateItems(items: Partial<T>[]): Promise<T[]> {
      const currentState = stateStore.get();
      const updatedItems: T[] = [];

      // Update existing items
      const newItems = currentState.items.map((item) => {
        const update = items.find((u) => u.id === item.id);
        if (update) {
          const updatedItem = { ...item, ...update };
          updatedItems.push(updatedItem);
          return updatedItem;
        }
        return item;
      });

      stateStore.set({ items: newItems });

      // Emit data event
      eventEmitter.emit(
        CollectionEvents.ITEMS_UPDATED,
        createEventPayload.itemsUpdated(updatedItems, [])
      );

      return updatedItems;
    },

    async removeItems(ids: string[]): Promise<void> {
      const currentState = stateStore.get();

      // Remove items by ID
      const newItems = currentState.items.filter(
        (item) => !ids.includes(item.id)
      );

      stateStore.set({
        items: newItems,
        totalCount: newItems.length,
      });

      // Emit data event
      eventEmitter.emit(
        CollectionEvents.ITEMS_REMOVED,
        createEventPayload.itemsRemoved(ids)
      );
    },

    async clearItems(): Promise<void> {
      stateStore.set({
        items: [],
        filteredItems: [],
        totalCount: 0,
      });

      // Reset pagination
      currentPage = COLLECTION_DEFAULTS.CURRENT_PAGE;
      hasMore = true;

      // Emit data event
      eventEmitter.emit(CollectionEvents.ITEMS_CLEARED, {});
    },

    // Data queries
    filter(predicate: (item: T) => boolean): T[] {
      return stateStore.get().items.filter(predicate);
    },

    sort(compareFn: (a: T, b: T) => number): T[] {
      const items = [...stateStore.get().items];
      return items.sort(compareFn);
    },

    search(query: string, fields: string[] = DATA_SEARCH.DEFAULT_FIELDS): T[] {
      if (query.length < DATA_SEARCH.MIN_SEARCH_LENGTH) {
        return stateStore.get().items;
      }

      return applySearch(stateStore.get().items, query, fields);
    },

    aggregate(operations: AggregateOperation[]): any {
      const items = stateStore.get().items;
      const results: Record<string, any> = {};

      operations.forEach((op) => {
        const alias = op.alias || `${op.operation}_${op.field}`;

        switch (op.operation) {
          case "count":
            results[alias] = items.length;
            break;
          case "sum":
            results[alias] = items.reduce(
              (sum, item) => sum + ((item as any)[op.field] || 0),
              0
            );
            break;
          case "avg":
            const sum = items.reduce(
              (sum, item) => sum + ((item as any)[op.field] || 0),
              0
            );
            results[alias] = items.length > 0 ? sum / items.length : 0;
            break;
          case "min":
            results[alias] = Math.min(
              ...items.map((item) => (item as any)[op.field] || 0)
            );
            break;
          case "max":
            results[alias] = Math.max(
              ...items.map((item) => (item as any)[op.field] || 0)
            );
            break;
          case "distinct":
            results[alias] = [
              ...new Set(items.map((item) => (item as any)[op.field])),
            ];
            break;
        }
      });

      return results;
    },

    // Data loading
    async loadPage(page: number): Promise<AdapterResponse<T>> {
      if (!config.adapter) {
        throw new Error("No adapter configured");
      }

      // Calculate what data range this page represents
      const startIndex = (page - 1) * pageSize;
      const endIndex = startIndex + pageSize - 1;

      const currentState = stateStore.get();
      const currentItems = currentState.items;

      // Check if we already have this data
      const hasData = currentItems.length > endIndex;

      if (hasData) {
        console.log(
          `${DATA_LOGGING.PREFIX} Data already loaded for page ${page} (items ${startIndex}-${endIndex})`
        );

        // Return the subset we already have
        const pageItems = currentItems.slice(startIndex, startIndex + pageSize);

        currentPage = page;

        // Emit items loaded event
        eventEmitter.emit(
          CollectionEvents.ITEMS_LOADED,
          createEventPayload.itemsLoaded(pageItems, {
            page,
            total: totalItemsExpected,
          })
        );

        return {
          items: pageItems,
          meta: {
            total: totalItemsExpected,
            page: page,
            hasNext: hasMore,
            hasPrev: page > 1,
          },
        };
      }

      console.log(`${DATA_LOGGING.PREFIX} Loading page ${page} from adapter`);

      try {
        eventEmitter.emit(
          CollectionEvents.LOADING_START,
          createEventPayload.loadingStart(`Loading page ${page}`)
        );

        stateStore.set({ loading: true });

        const response = await config.adapter.read({
          page,
          pageSize,
        });

        if (response.error) {
          throw new Error(response.error.message);
        }

        const processedItems = applyDataTransformations(response.items);

        // Add to existing items (append if sequential)
        let updatedItems: T[];
        if (startIndex === currentItems.length) {
          // Sequential loading - just append
          updatedItems = [...currentItems, ...processedItems];
        } else {
          // Non-sequential - need to handle gaps (could be complex)
          updatedItems = [...currentItems, ...processedItems];
        }

        totalItemsExpected = response.meta?.total || updatedItems.length;

        stateStore.set({
          items: updatedItems,
          totalCount: totalItemsExpected,
          loading: false,
          error: null,
        });

        currentPage = page;
        hasMore = determineHasMore(response, processedItems.length);

        eventEmitter.emit(
          CollectionEvents.ITEMS_LOADED,
          createEventPayload.itemsLoaded(processedItems, response.meta)
        );

        return response;
      } catch (error) {
        const errorObj = error as Error;
        stateStore.set({
          loading: false,
          error: errorObj,
        });

        eventEmitter.emit(
          CollectionEvents.ERROR_OCCURRED,
          createEventPayload.errorOccurred(errorObj, { page })
        );

        throw error;
      }
    },

    async loadMore(): Promise<AdapterResponse<T>> {
      return loadMoreItems();
    },

    async refresh(): Promise<AdapterResponse<T>> {
      // Reset to first page and reload
      currentPage = 0; // Will be incremented to 1 in loadMoreItems
      hasMore = true;

      stateStore.set({
        items: [],
        filteredItems: [],
        totalCount: 0,
      });

      return loadMoreItems();
    },

    async prefetch(pages: number[]): Promise<void> {
      if (!config.adapter) {
        throw new Error("No adapter configured");
      }

      eventEmitter.emit(
        CollectionEvents.PREFETCH_START,
        createEventPayload.prefetchStart(pages)
      );

      // Prefetch pages in parallel
      const prefetchPromises = pages.map(async (page) => {
        try {
          const response = await config.adapter!.read({
            page,
            pageSize,
          });
          return response.items;
        } catch (error) {
          console.warn(
            `${DATA_LOGGING.PREFIX} Prefetch failed for page ${page}:`,
            error
          );
          return [];
        }
      });

      try {
        const results = await Promise.all(prefetchPromises);
        const allItems = results.flat();

        eventEmitter.emit(
          CollectionEvents.PREFETCH_COMPLETE,
          createEventPayload.prefetchComplete(allItems, pages)
        );
      } catch (error) {
        console.error(`${DATA_LOGGING.PREFIX} Prefetch error:`, error);
      }
    },

    // Data state
    getSize(): number {
      return stateStore.get().items.length;
    },

    getTotalCount(): number {
      return stateStore.get().totalCount;
    },

    isLoading(): boolean {
      return stateStore.get().loading;
    },

    getError(): Error | null {
      return stateStore.get().error;
    },

    hasNext(): boolean {
      return hasMore;
    },

    getCurrentPage(): number {
      return currentPage;
    },

    // Data persistence (Plugin methods - implemented by plugins)
    async save(): Promise<void> {
      // Will be implemented by persistence plugins
      console.warn(
        `${DATA_LOGGING.PREFIX} Save method requires persistence plugin`
      );
    },

    async load(): Promise<void> {
      // Will be implemented by persistence plugins
      console.warn(
        `${DATA_LOGGING.PREFIX} Load method requires persistence plugin`
      );
    },

    async clearCache(): Promise<void> {
      // Clear the multi-page cache
      pageCache.clear();
      console.log(`${DATA_LOGGING.PREFIX} Page cache cleared`);

      // Emit cache cleared event
      eventEmitter.emit(CollectionEvents.CACHE_CLEARED, {
        reason: "manual-clear",
        timestamp: Date.now(),
      });
    },

    async sync(): Promise<void> {
      // Will be implemented by sync plugins
      console.warn(`${DATA_LOGGING.PREFIX} Sync method requires sync plugin`);
    },

    // Events (data events only)
    subscribe(observer: CollectionObserver<T>): CollectionUnsubscribe {
      return eventEmitter.subscribe(observer);
    },

    emit(event: CollectionDataEvents, data: any): void {
      eventEmitter.emit(event, data);
    },

    // Lifecycle
    destroy(): void {
      if (isDestroyed) return;

      // Unsubscribe from state changes
      stateUnsubscribe();

      // Destroy state store
      stateStore.destroy();

      // Destroy event emitter
      eventEmitter.destroy();

      // Uninstall all plugins
      installedPlugins.forEach((plugin) => {
        if (plugin.uninstall) {
          plugin.uninstall(collection);
        }
      });
      installedPlugins.clear();

      isDestroyed = true;
      console.log(`${DATA_LOGGING.PREFIX} Collection destroyed`);
    },

    // Plugin system for data features
    use(plugin: CollectionPlugin): Collection<T> {
      if (isDestroyed) {
        throw new Error("Cannot add plugin to destroyed collection");
      }

      if (installedPlugins.has(plugin.name)) {
        console.warn(
          `${DATA_LOGGING.PREFIX} Plugin ${plugin.name} already installed`
        );
        return collection;
      }

      // Check dependencies
      if (plugin.dependencies) {
        const missingDeps = plugin.dependencies.filter(
          (dep) => !installedPlugins.has(dep)
        );
        if (missingDeps.length > 0) {
          throw new Error(
            `Plugin ${plugin.name} requires dependencies: ${missingDeps.join(
              ", "
            )}`
          );
        }
      }

      try {
        plugin.install(collection, {});
        installedPlugins.set(plugin.name, plugin);
        console.log(
          `${DATA_LOGGING.PREFIX} Plugin ${plugin.name} v${plugin.version} installed`
        );
      } catch (error) {
        console.error(
          `${DATA_LOGGING.PREFIX} Failed to install plugin ${plugin.name}:`,
          error
        );
        throw error;
      }

      return collection;
    },

    // NO UI methods: scrollTo, render, setTemplate, element, container, etc.
  };

  return collection;
}
