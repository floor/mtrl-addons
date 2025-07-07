/**
 * Base Collection (Minimal Core)
 *
 * Pure data storage with zero features - everything else is plugins
 */

import type { CollectionItem, CollectionConfig, BaseCollection } from "./types";
import { createCollectionState, type CollectionDataState } from "./state";
import { createCollectionEventEmitter } from "./events";
import { COLLECTION_DEFAULTS, DATA_LOGGING } from "./constants";

/**
 * Creates the minimal base collection
 * All features (persistence, validation, etc.) are added via plugins
 */
export function createBaseCollection<T extends CollectionItem = CollectionItem>(
  config: CollectionConfig<T> = {}
): BaseCollection<T> {
  // Initialize minimal state
  const stateStore = createCollectionState<T>({
    items: config.items || [],
    totalCount: config.items?.length || 0,
    pageSize: config.pageSize || COLLECTION_DEFAULTS.PAGE_SIZE,
  });

  // Event system
  const eventEmitter = createCollectionEventEmitter<T>();

  // Lifecycle tracking
  let isDestroyed = false;

  /**
   * Base collection API - minimal data operations only
   */
  const baseCollection: BaseCollection<T> = {
    // Core data access
    getItems(): T[] {
      return stateStore.get().items;
    },

    getItem(id: string): T | undefined {
      return stateStore.get().items.find((item) => item.id === id);
    },

    getSize(): number {
      return stateStore.get().items.length;
    },

    getTotalCount(): number {
      return stateStore.get().totalCount;
    },

    // Basic state
    isLoading(): boolean {
      return stateStore.get().loading;
    },

    getError(): Error | null {
      return stateStore.get().error;
    },

    // State management (for plugins)
    getState(): CollectionDataState<T> {
      return stateStore.get();
    },

    setState(newState: Partial<CollectionDataState<T>>): void {
      stateStore.set(newState);
    },

    // Event system (for plugins)
    subscribe(observer: (payload: any) => void) {
      return eventEmitter.subscribe(observer);
    },

    emit(event: string, data: any): void {
      eventEmitter.emit(event as any, data);
    },

    // Lifecycle
    destroy(): void {
      if (isDestroyed) return;

      stateStore.destroy();
      eventEmitter.destroy();
      isDestroyed = true;

      console.log(`${DATA_LOGGING.PREFIX} Base collection destroyed`);
    },

    // Plugin support
    _config: config,
    _stateStore: stateStore,
    _eventEmitter: eventEmitter,
  };

  console.log(`${DATA_LOGGING.PREFIX} Base collection created`);

  return baseCollection;
}
