/**
 * API Feature - Core collection functionality
 * Provides base data access, state management, and events
 */

import type { CollectionItem, CollectionConfig } from "../types";
import { createCollectionState } from "../state";
import { createCollectionEventEmitter } from "../events";
import { COLLECTION_DEFAULTS, DATA_LOGGING } from "../constants";

export interface CollectionContext {
  // Internal state and config
  _config: CollectionConfig<any>;
  _stateStore: ReturnType<typeof createCollectionState<any>>;
  _eventEmitter: ReturnType<typeof createCollectionEventEmitter<any>>;
}

export interface CollectionAPI<T extends CollectionItem = CollectionItem> {
  // Core data access
  getItems(): T[];
  getItem(id: string): T | undefined;
  getSize(): number;
  getTotalCount(): number;

  // State
  isLoading(): boolean;
  getError(): Error | null;

  // Event system
  on(event: string, handler: (data: any) => void): () => void;
  off(event: string, handler: (data: any) => void): void;
  emit(event: string, data: any): void;

  // Lifecycle
  destroy(): void;
}

/**
 * Adds core API functionality to collection
 */
export function withAPI<T extends CollectionItem = CollectionItem>(
  config: CollectionConfig<T>
) {
  return <TBase extends CollectionContext>(
    base: TBase
  ): TBase & CollectionAPI<T> => {
    // Initialize state
    const stateStore = createCollectionState<T>({
      items: config.items || [],
      totalCount: config.items?.length || 0,
      pageSize: config.pageSize || COLLECTION_DEFAULTS.PAGE_SIZE,
    });

    // Event system
    const eventEmitter = createCollectionEventEmitter<T>();

    // Lifecycle
    let isDestroyed = false;

    // Add internal properties
    base._config = config;
    base._stateStore = stateStore;
    base._eventEmitter = eventEmitter;

    // Return enhanced collection
    return Object.assign(base, {
      // Core data access
      getItems: () => stateStore.get().items,
      getItem: (id: string) =>
        stateStore.get().items.find((item) => item.id === id),
      getSize: () => stateStore.get().items.length,
      getTotalCount: () => stateStore.get().totalCount,

      // State
      isLoading: () => stateStore.get().loading,
      getError: () => stateStore.get().error,

      // Event system
      on: (event: string, handler: (data: any) => void) => {
        return eventEmitter.subscribe((payload: any) => {
          if (payload.event === event) {
            handler(payload.data);
          }
        });
      },
      off: (event: string, handler: (data: any) => void) => {
        // Note: This is a simplified implementation
        console.warn("off() not fully implemented");
      },
      emit: (event: string, data: any) => {
        eventEmitter.emit(event as any, data);
      },

      // Lifecycle
      destroy: () => {
        if (isDestroyed) return;

        stateStore.destroy();
        eventEmitter.destroy();
        isDestroyed = true;

        console.log(`${DATA_LOGGING.PREFIX} Collection destroyed`);
      },
    });
  };
}
