/**
 * State management for mtrl-addons collection (Pure Data Layer)
 *
 * Handles reactive data state with zero UI concerns
 */

import type { CollectionItem } from "./types";
import {
  COLLECTION_STATE,
  DATA_PAGINATION,
  DATA_CACHE,
  DATA_LOGGING,
} from "./constants";

/**
 * Pure data state interface (NO UI STATE)
 */
export interface CollectionDataState<
  T extends CollectionItem = CollectionItem
> {
  // Core data
  items: T[];
  filteredItems: T[];
  totalCount: number;

  // Data loading state
  loading: boolean;
  error: Error | null;
  lastUpdate: number;

  // Pagination data
  currentPage: number;
  pageSize: number;
  hasMore: boolean;
  cursor: string | null;

  // Data operations state
  query: ((item: T) => boolean) | null;
  sort: ((a: T, b: T) => number) | null;
  searchQuery: string | null;
  searchFields: string[];

  // Cache state
  cacheHits: number;
  cacheMisses: number;
  cacheSize: number;
  lastCacheCleanup: number;

  // Background processing state
  activeWorkerTasks: number;
  prefetchQueue: number[];
  syncInProgress: boolean;
  lastSync: number;

  // Data persistence state
  isDirty: boolean;
  lastSave: number;
  persistenceError: Error | null;

  // Validation state
  validationErrors: string[];
  validationInProgress: boolean;

  // Transformation state
  transformInProgress: boolean;
  transformError: Error | null;

  // Data version for optimistic updates
  version: number;

  // NO UI state: scrollTop, containerHeight, visibleRange, renderRange, etc.
}

/**
 * State change listener type
 */
export type StateChangeListener<T extends CollectionItem = CollectionItem> = (
  state: CollectionDataState<T>
) => void;

/**
 * State store interface for collection data
 */
export interface StateStore<T extends CollectionItem = CollectionItem> {
  // State access
  get(): CollectionDataState<T>;
  set(newState: Partial<CollectionDataState<T>>): void;
  update(
    updater: (state: CollectionDataState<T>) => Partial<CollectionDataState<T>>
  ): void;

  // State subscription
  subscribe(listener: StateChangeListener<T>): () => void;

  // State utilities
  reset(): void;
  snapshot(): CollectionDataState<T>;
  restore(snapshot: CollectionDataState<T>): void;

  // State queries
  isLoading(): boolean;
  hasError(): boolean;
  isEmpty(): boolean;
  isDirty(): boolean;
  getVersion(): number;

  // State lifecycle
  destroy(): void;
}

/**
 * Creates initial data state
 */
export function createInitialDataState<
  T extends CollectionItem = CollectionItem
>(
  options: {
    items?: T[];
    pageSize?: number;
    initialCapacity?: number;
  } = {}
): CollectionDataState<T> {
  const now = Date.now();

  return {
    // Core data
    items: options.items || [],
    filteredItems: options.items || [],
    totalCount: options.items?.length || COLLECTION_STATE.INITIAL_SIZE,

    // Data loading state
    loading: COLLECTION_STATE.INITIAL_LOADING,
    error: COLLECTION_STATE.INITIAL_ERROR,
    lastUpdate: now,

    // Pagination data
    currentPage: COLLECTION_STATE.INITIAL_PAGE,
    pageSize: options.pageSize || DATA_PAGINATION.DEFAULT_PAGE_SIZE,
    hasMore: COLLECTION_STATE.INITIAL_HAS_MORE,
    cursor: null,

    // Data operations state
    query: null,
    sort: null,
    searchQuery: null,
    searchFields: [],

    // Cache state
    cacheHits: 0,
    cacheMisses: 0,
    cacheSize: 0,
    lastCacheCleanup: now,

    // Background processing state
    activeWorkerTasks: 0,
    prefetchQueue: [],
    syncInProgress: false,
    lastSync: 0,

    // Data persistence state
    isDirty: false,
    lastSave: 0,
    persistenceError: null,

    // Validation state
    validationErrors: [],
    validationInProgress: false,

    // Transformation state
    transformInProgress: false,
    transformError: null,

    // Data version
    version: 1,
  };
}

/**
 * Creates a reactive data state store
 */
export function createCollectionState<
  T extends CollectionItem = CollectionItem
>(initialState?: Partial<CollectionDataState<T>>): StateStore<T> {
  let state: CollectionDataState<T> = {
    ...createInitialDataState<T>(),
    ...initialState,
  };

  const listeners = new Set<StateChangeListener<T>>();
  let isDestroyed = false;

  /**
   * Get current state (immutable copy)
   */
  const get = (): CollectionDataState<T> => {
    if (isDestroyed) {
      throw new Error("Cannot access destroyed state store");
    }
    return { ...state };
  };

  /**
   * Set partial state with validation
   */
  const set = (newState: Partial<CollectionDataState<T>>): void => {
    if (isDestroyed) {
      console.warn(
        `${DATA_LOGGING.PREFIX} Cannot set state on destroyed store`
      );
      return;
    }

    // Validate state changes
    if (newState.items && !Array.isArray(newState.items)) {
      throw new Error("Items must be an array");
    }

    if (newState.currentPage && newState.currentPage < 1) {
      throw new Error("Current page must be >= 1");
    }

    if (newState.pageSize && newState.pageSize < 1) {
      throw new Error("Page size must be >= 1");
    }

    // Apply state changes
    const previousState = { ...state };
    state = {
      ...state,
      ...newState,
      lastUpdate: Date.now(),
      version: state.version + 1,
    };

    // Auto-update filtered items if items changed
    if (newState.items && newState.items !== previousState.items) {
      state.filteredItems = applyFiltersAndSort(state.items, state);
    }

    // Mark as dirty if data changed
    if (newState.items || newState.filteredItems) {
      state.isDirty = true;
    }

    // Notify listeners
    notifyListeners();

    // Debug logging
    if (DATA_LOGGING.ENABLE_DEBUG) {
      console.log(`${DATA_LOGGING.PREFIX} State updated:`, {
        changes: Object.keys(newState),
        version: state.version,
        listenerCount: listeners.size,
      });
    }
  };

  /**
   * Update state using updater function
   */
  const update = (
    updater: (state: CollectionDataState<T>) => Partial<CollectionDataState<T>>
  ): void => {
    if (isDestroyed) {
      console.warn(
        `${DATA_LOGGING.PREFIX} Cannot update state on destroyed store`
      );
      return;
    }

    try {
      const changes = updater({ ...state });
      set(changes);
    } catch (error) {
      console.error(`${DATA_LOGGING.PREFIX} Error in state updater:`, error);
      set({ error: error as Error });
    }
  };

  /**
   * Subscribe to state changes
   */
  const subscribe = (listener: StateChangeListener<T>): (() => void) => {
    if (isDestroyed) {
      console.warn(
        `${DATA_LOGGING.PREFIX} Cannot subscribe to destroyed state store`
      );
      return () => {};
    }

    if (typeof listener !== "function") {
      throw new Error("State listener must be a function");
    }

    listeners.add(listener);

    // Return unsubscribe function
    return () => {
      listeners.delete(listener);
    };
  };

  /**
   * Notify all listeners of state changes
   */
  const notifyListeners = (): void => {
    const currentState = { ...state };

    listeners.forEach((listener) => {
      try {
        listener(currentState);
      } catch (error) {
        console.error(`${DATA_LOGGING.PREFIX} Error in state listener:`, error);
        // Remove problematic listener
        listeners.delete(listener);
      }
    });
  };

  /**
   * Apply filters and sorting to items
   */
  const applyFiltersAndSort = (
    items: T[],
    currentState: CollectionDataState<T>
  ): T[] => {
    let result = [...items];

    // Apply query filter
    if (currentState.query) {
      result = result.filter(currentState.query);
    }

    // Apply search filter
    if (currentState.searchQuery && currentState.searchFields.length > 0) {
      const searchQuery = currentState.searchQuery.toLowerCase();
      result = result.filter((item) => {
        return currentState.searchFields.some((field) => {
          const fieldValue = (item as any)[field];
          return (
            fieldValue &&
            fieldValue.toString().toLowerCase().includes(searchQuery)
          );
        });
      });
    }

    // Apply sorting
    if (currentState.sort) {
      result.sort(currentState.sort);
    }

    return result;
  };

  /**
   * Reset state to initial values
   */
  const reset = (): void => {
    const initialState = createInitialDataState<T>();
    state = { ...initialState };
    notifyListeners();
  };

  /**
   * Create state snapshot
   */
  const snapshot = (): CollectionDataState<T> => {
    return JSON.parse(JSON.stringify(state));
  };

  /**
   * Restore from snapshot
   */
  const restore = (snapshot: CollectionDataState<T>): void => {
    state = { ...snapshot };
    notifyListeners();
  };

  /**
   * State query utilities
   */
  const isLoading = (): boolean => state.loading;
  const hasError = (): boolean => state.error !== null;
  const isEmpty = (): boolean => state.items.length === 0;
  const isDirty = (): boolean => state.isDirty;
  const getVersion = (): number => state.version;

  /**
   * Destroy state store
   */
  const destroy = (): void => {
    listeners.clear();
    isDestroyed = true;
  };

  return {
    get,
    set,
    update,
    subscribe,
    reset,
    snapshot,
    restore,
    isLoading,
    hasError,
    isEmpty,
    isDirty,
    getVersion,
    destroy,
  };
}

/**
 * State utilities for debugging and testing
 */
export const stateUtils = {
  /**
   * Create state diff between two states
   */
  createDiff: <T extends CollectionItem>(
    oldState: CollectionDataState<T>,
    newState: CollectionDataState<T>
  ): Record<string, { old: any; new: any }> => {
    const diff: Record<string, { old: any; new: any }> = {};

    Object.keys(newState).forEach((key) => {
      const oldValue = (oldState as any)[key];
      const newValue = (newState as any)[key];

      if (oldValue !== newValue) {
        diff[key] = { old: oldValue, new: newValue };
      }
    });

    return diff;
  },

  /**
   * Validate state integrity
   */
  validateState: <T extends CollectionItem>(
    state: CollectionDataState<T>
  ): string[] => {
    const errors: string[] = [];

    if (!Array.isArray(state.items)) {
      errors.push("Items must be an array");
    }

    if (!Array.isArray(state.filteredItems)) {
      errors.push("Filtered items must be an array");
    }

    if (state.currentPage < 1) {
      errors.push("Current page must be >= 1");
    }

    if (state.pageSize < 1) {
      errors.push("Page size must be >= 1");
    }

    if (state.totalCount < 0) {
      errors.push("Total count must be >= 0");
    }

    if (state.version < 1) {
      errors.push("Version must be >= 1");
    }

    return errors;
  },

  /**
   * Get state summary for debugging
   */
  getSummary: <T extends CollectionItem>(
    state: CollectionDataState<T>
  ): object => ({
    itemCount: state.items.length,
    filteredCount: state.filteredItems.length,
    totalCount: state.totalCount,
    currentPage: state.currentPage,
    pageSize: state.pageSize,
    hasMore: state.hasMore,
    loading: state.loading,
    hasError: !!state.error,
    hasQuery: !!state.query,
    hasSort: !!state.sort,
    hasSearch: !!state.searchQuery,
    version: state.version,
    isDirty: state.isDirty,
    cacheHits: state.cacheHits,
    cacheMisses: state.cacheMisses,
    activeWorkerTasks: state.activeWorkerTasks,
  }),
};
