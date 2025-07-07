/**
 * API Loading Plugin
 *
 * Handles data loading from adapters (loadPage, loadMore, refresh)
 */

import type {
  CollectionItem,
  CollectionAdapter,
  BaseCollection,
  AdapterResponse,
} from "../../types";
import { CollectionDataEvents } from "../../types";
import { DATA_LOGGING, COLLECTION_DEFAULTS } from "../../constants";
import { createEventPayload, CollectionEvents } from "../../events";

export interface LoadingConfig {
  pageSize?: number;
  sequential?: boolean; // Whether to load pages sequentially or allow random access
}

export interface LoadingFeatures<T extends CollectionItem> {
  loadPage(page: number): Promise<AdapterResponse<T>>;
  loadMore(): Promise<AdapterResponse<T>>;
  refresh(): Promise<AdapterResponse<T>>;
  getCurrentPage(): number;
  hasNext(): boolean;
}

/**
 * API Loading Plugin (Pure Data Feature)
 */
export const withLoading =
  <T extends CollectionItem = CollectionItem>(config: LoadingConfig = {}) =>
  (
    baseCollection: BaseCollection<T>
  ): BaseCollection<T> & LoadingFeatures<T> => {
    // Get adapter from config
    const adapter = baseCollection._config.adapter;
    if (!adapter) {
      console.warn(
        `${DATA_LOGGING.PREFIX} No adapter configured for loading plugin`
      );
    }

    // Plugin state
    let currentPage = COLLECTION_DEFAULTS.CURRENT_PAGE;
    let pageSize =
      config.pageSize ||
      baseCollection._config.pageSize ||
      COLLECTION_DEFAULTS.PAGE_SIZE;
    let hasMore = true;
    let isLoadingMore = false;
    let totalItemsExpected = 0;

    /**
     * Apply data transformations if configured
     */
    const applyDataTransformations = (items: any[]): T[] => {
      let processedItems = [...items];

      // Apply normalization if configured
      if (baseCollection._config.normalize) {
        processedItems = baseCollection._config.normalize(processedItems);
      }

      // Apply transformation if configured
      if (baseCollection._config.transform) {
        processedItems = processedItems.map(baseCollection._config.transform);
      }

      // Apply validation if configured
      if (baseCollection._config.validate) {
        processedItems = processedItems.filter(baseCollection._config.validate);
      }

      return processedItems;
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

      console.log(
        `${DATA_LOGGING.PREFIX} LOADING-PLUGIN determineHasMore debug:`,
        {
          apiTotal,
          apiHasNext,
          gotFullPage,
          itemsLength,
          pageSize,
          totalItemsExpected,
          currentItemsLength: baseCollection.getState().items.length,
        }
      );

      if (apiTotal !== undefined) {
        const result = totalItemsExpected < apiTotal;
        console.log(
          `${DATA_LOGGING.PREFIX} LOADING-PLUGIN Using apiTotal logic: ${totalItemsExpected} < ${apiTotal} = ${result}`
        );
        return result;
      } else if (apiHasNext !== undefined) {
        console.log(
          `${DATA_LOGGING.PREFIX} LOADING-PLUGIN Using apiHasNext logic: ${apiHasNext}`
        );
        return apiHasNext;
      } else {
        console.log(
          `${DATA_LOGGING.PREFIX} LOADING-PLUGIN Using gotFullPage logic: ${gotFullPage}`
        );
        return gotFullPage;
      }
    };

    /**
     * Load a specific page of data
     */
    const loadPage = async (page: number): Promise<AdapterResponse<T>> => {
      if (!adapter) {
        throw new Error("No adapter configured");
      }

      // Calculate what data range this page represents
      const startIndex = (page - 1) * pageSize;
      const endIndex = startIndex + pageSize - 1;

      const currentState = baseCollection.getState();
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
        baseCollection.emit(CollectionDataEvents.ITEMS_LOADED, {
          items: pageItems,
          meta: { page, total: totalItemsExpected },
        });

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
        baseCollection.emit(
          CollectionDataEvents.LOADING_START,
          createEventPayload.loadingStart(`Loading page ${page}`)
        );

        baseCollection.setState({ loading: true });

        const response = await adapter.read({
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
          // Non-sequential - for now just append (could be more sophisticated)
          updatedItems = [...currentItems, ...processedItems];
        }

        totalItemsExpected = response.meta?.total || updatedItems.length;

        baseCollection.setState({
          items: updatedItems,
          totalCount: totalItemsExpected,
          loading: false,
          error: null,
        });

        currentPage = page;
        hasMore = determineHasMore(response, processedItems.length);

        baseCollection.emit(
          CollectionDataEvents.ITEMS_LOADED,
          createEventPayload.itemsLoaded(processedItems, response.meta)
        );

        return response;
      } catch (error) {
        const errorObj = error as Error;
        baseCollection.setState({
          loading: false,
          error: errorObj,
        });

        baseCollection.emit(
          CollectionDataEvents.ERROR_OCCURRED,
          createEventPayload.errorOccurred(errorObj, { page })
        );

        throw error;
      }
    };

    /**
     * Load more items (next page)
     */
    const loadMore = async (): Promise<AdapterResponse<T>> => {
      if (!adapter || isLoadingMore) {
        throw new Error("No adapter configured or already loading");
      }

      isLoadingMore = true;
      const nextPage = currentPage + 1;

      try {
        const response = await loadPage(nextPage);
        return response;
      } finally {
        isLoadingMore = false;
      }
    };

    /**
     * Refresh all data (start from beginning)
     */
    const refresh = async (): Promise<AdapterResponse<T>> => {
      // Reset state
      currentPage = 0;
      hasMore = true;
      totalItemsExpected = 0;

      baseCollection.setState({
        items: [],
        filteredItems: [],
        totalCount: 0,
      });

      return loadMore();
    };

    console.log(`${DATA_LOGGING.PREFIX} Loading plugin installed`);

    return Object.assign(baseCollection, {
      loadPage,
      loadMore,
      refresh,
      getCurrentPage: () => currentPage,
      hasNext: () => hasMore,
    });
  };
