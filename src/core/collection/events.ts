/**
 * Event system for mtrl-addons collection (Pure Data Layer)
 *
 * Handles data-focused events with zero UI concerns
 */

import type {
  CollectionItem,
  CollectionObserver,
  CollectionUnsubscribe,
  CollectionEventPayload,
  CollectionDataEvents,
} from "./types";
import { DATA_LOGGING, EVENT_TIMING } from "./constants";

/**
 * Data-focused collection events (NO UI EVENTS)
 */
export const CollectionEvents = {
  // Data lifecycle events
  ITEMS_LOADED: "items:loaded" as const,
  ITEMS_ADDED: "items:added" as const,
  ITEMS_UPDATED: "items:updated" as const,
  ITEMS_REMOVED: "items:removed" as const,
  ITEMS_CLEARED: "items:cleared" as const,

  // Data state events
  LOADING_START: "loading:start" as const,
  LOADING_END: "loading:end" as const,
  ERROR_OCCURRED: "error:occurred" as const,

  // Data operations events
  CACHE_HIT: "cache:hit" as const,
  CACHE_MISS: "cache:miss" as const,
  CACHE_CLEARED: "cache:cleared" as const,
  SYNC_START: "sync:start" as const,
  SYNC_COMPLETE: "sync:complete" as const,

  // Background operations events
  PREFETCH_START: "prefetch:start" as const,
  PREFETCH_COMPLETE: "prefetch:complete" as const,
  WORKER_TASK_START: "worker:task:start" as const,
  WORKER_TASK_COMPLETE: "worker:task:complete" as const,

  // Data validation events
  VALIDATION_START: "validation:start" as const,
  VALIDATION_COMPLETE: "validation:complete" as const,
  VALIDATION_ERROR: "validation:error" as const,

  // Data transformation events
  TRANSFORM_START: "transform:start" as const,
  TRANSFORM_COMPLETE: "transform:complete" as const,
  TRANSFORM_ERROR: "transform:error" as const,

  // Data persistence events
  SAVE_START: "save:start" as const,
  SAVE_COMPLETE: "save:complete" as const,
  SAVE_ERROR: "save:error" as const,
  LOAD_START: "load:start" as const,
  LOAD_COMPLETE: "load:complete" as const,
  LOAD_ERROR: "load:error" as const,

  // NO UI events: render:start, scroll:changed, viewport:changed, etc.
} as const;

/**
 * Collection event emitter interface
 */
export interface CollectionEventEmitter<
  T extends CollectionItem = CollectionItem
> {
  subscribe(observer: CollectionObserver<T>): CollectionUnsubscribe;
  emit(event: CollectionDataEvents, data?: any): void;
  removeAllListeners(): void;
  getListenerCount(): number;
  destroy(): void;
}

/**
 * Creates a data-focused event emitter for collection
 */
export function createCollectionEventEmitter<
  T extends CollectionItem = CollectionItem
>(): CollectionEventEmitter<T> {
  const listeners = new Map<string, Set<CollectionObserver<T>>>();
  let isDestroyed = false;

  /**
   * Subscribe to data events
   */
  const subscribe = (
    observer: CollectionObserver<T>
  ): CollectionUnsubscribe => {
    if (isDestroyed) {
      console.warn(
        `${DATA_LOGGING.PREFIX} Cannot subscribe to destroyed event emitter`
      );
      return () => {};
    }

    // Validate observer
    if (typeof observer !== "function") {
      throw new Error("Observer must be a function");
    }

    // Check listener limit
    const totalListeners = Array.from(listeners.values()).reduce(
      (sum, set) => sum + set.size,
      0
    );

    if (totalListeners >= EVENT_TIMING.MAX_LISTENERS) {
      console.warn(
        `${DATA_LOGGING.PREFIX} Maximum listeners (${EVENT_TIMING.MAX_LISTENERS}) reached`
      );
    }

    // Add observer to all data events
    Object.values(CollectionEvents).forEach((event) => {
      if (!listeners.has(event)) {
        listeners.set(event, new Set());
      }
      listeners.get(event)!.add(observer);
    });

    // Return unsubscribe function
    return () => {
      Object.values(CollectionEvents).forEach((event) => {
        const eventListeners = listeners.get(event);
        if (eventListeners) {
          eventListeners.delete(observer);
          if (eventListeners.size === 0) {
            listeners.delete(event);
          }
        }
      });
    };
  };

  /**
   * Emit data events to subscribers
   */
  const emit = (event: CollectionDataEvents, data?: any): void => {
    if (isDestroyed) {
      console.warn(
        `${DATA_LOGGING.PREFIX} Cannot emit on destroyed event emitter`
      );
      return;
    }

    const eventListeners = listeners.get(event);
    if (!eventListeners || eventListeners.size === 0) {
      return; // No listeners for this event
    }

    const payload: CollectionEventPayload<T> = {
      event,
      data,
      timestamp: Date.now(),
      source: "collection",
    };

    // Emit to all listeners with error handling
    eventListeners.forEach((observer) => {
      try {
        // Use timeout to prevent blocking
        const timeoutId = setTimeout(() => {
          observer(payload);
        }, 0);

        // Clear timeout after emit timeout
        setTimeout(() => {
          clearTimeout(timeoutId);
        }, EVENT_TIMING.EMIT_TIMEOUT);
      } catch (error) {
        console.error(`${DATA_LOGGING.PREFIX} Error in event observer:`, error);

        // Remove problematic observer
        eventListeners.delete(observer);

        // Emit error event
        if (event !== CollectionEvents.ERROR_OCCURRED) {
          emit(CollectionEvents.ERROR_OCCURRED, {
            error,
            originalEvent: event,
            observer: observer.name || "anonymous",
          });
        }
      }
    });

    // Debug logging
    if (DATA_LOGGING.ENABLE_DEBUG) {
      console.log(`${DATA_LOGGING.PREFIX} Event emitted:`, {
        event,
        data,
        listenerCount: eventListeners.size,
      });
    }
  };

  /**
   * Remove all listeners
   */
  const removeAllListeners = (): void => {
    listeners.clear();
  };

  /**
   * Get total listener count
   */
  const getListenerCount = (): number => {
    return Array.from(listeners.values()).reduce(
      (sum, set) => sum + set.size,
      0
    );
  };

  /**
   * Destroy the event emitter
   */
  const destroy = (): void => {
    removeAllListeners();
    isDestroyed = true;
  };

  return {
    subscribe,
    emit,
    removeAllListeners,
    getListenerCount,
    destroy,
  };
}

/**
 * Event payload factory functions for type safety
 */
export const createEventPayload = {
  itemsLoaded: <T extends CollectionItem>(
    items: T[],
    meta?: any
  ): CollectionEventPayload<T> => ({
    event: CollectionEvents.ITEMS_LOADED,
    data: { items, meta },
    items,
    timestamp: Date.now(),
    source: "collection",
  }),

  itemsAdded: <T extends CollectionItem>(
    items: T[],
    indices: number[]
  ): CollectionEventPayload<T> => ({
    event: CollectionEvents.ITEMS_ADDED,
    data: { items, indices },
    items,
    timestamp: Date.now(),
    source: "collection",
  }),

  itemsUpdated: <T extends CollectionItem>(
    items: T[],
    indices: number[]
  ): CollectionEventPayload<T> => ({
    event: CollectionEvents.ITEMS_UPDATED,
    data: { items, indices },
    items,
    timestamp: Date.now(),
    source: "collection",
  }),

  itemsRemoved: <T extends CollectionItem>(
    ids: string[]
  ): CollectionEventPayload<T> => ({
    event: CollectionEvents.ITEMS_REMOVED,
    data: { ids },
    timestamp: Date.now(),
    source: "collection",
  }),

  loadingStart: <T extends CollectionItem>(
    reason: string
  ): CollectionEventPayload<T> => ({
    event: CollectionEvents.LOADING_START,
    data: { reason },
    timestamp: Date.now(),
    source: "collection",
  }),

  loadingEnd: <T extends CollectionItem>(
    reason: string
  ): CollectionEventPayload<T> => ({
    event: CollectionEvents.LOADING_END,
    data: { reason },
    timestamp: Date.now(),
    source: "collection",
  }),

  errorOccurred: <T extends CollectionItem>(
    error: Error,
    context?: any
  ): CollectionEventPayload<T> => ({
    event: CollectionEvents.ERROR_OCCURRED,
    data: { error, context },
    error,
    timestamp: Date.now(),
    source: "collection",
  }),

  cacheHit: <T extends CollectionItem>(
    key: string,
    size: number
  ): CollectionEventPayload<T> => ({
    event: CollectionEvents.CACHE_HIT,
    data: { key, size },
    timestamp: Date.now(),
    source: "collection",
  }),

  cacheMiss: <T extends CollectionItem>(
    key: string
  ): CollectionEventPayload<T> => ({
    event: CollectionEvents.CACHE_MISS,
    data: { key },
    timestamp: Date.now(),
    source: "collection",
  }),

  workerTaskStart: <T extends CollectionItem>(
    operation: string,
    itemCount: number
  ): CollectionEventPayload<T> => ({
    event: CollectionEvents.WORKER_TASK_START,
    data: { operation, itemCount },
    timestamp: Date.now(),
    source: "collection",
  }),

  workerTaskComplete: <T extends CollectionItem>(
    operation: string,
    duration: number,
    result?: any
  ): CollectionEventPayload<T> => ({
    event: CollectionEvents.WORKER_TASK_COMPLETE,
    data: { operation, duration, result },
    timestamp: Date.now(),
    source: "collection",
  }),

  prefetchStart: <T extends CollectionItem>(
    pages: number[]
  ): CollectionEventPayload<T> => ({
    event: CollectionEvents.PREFETCH_START,
    data: { pages },
    timestamp: Date.now(),
    source: "collection",
  }),

  prefetchComplete: <T extends CollectionItem>(
    items: T[],
    pages: number[]
  ): CollectionEventPayload<T> => ({
    event: CollectionEvents.PREFETCH_COMPLETE,
    data: { items, pages },
    items,
    timestamp: Date.now(),
    source: "collection",
  }),
};

/**
 * Event utilities for debugging and monitoring
 */
export const eventUtils = {
  /**
   * Log event for debugging
   */
  logEvent: <T extends CollectionItem>(
    payload: CollectionEventPayload<T>
  ): void => {
    if (DATA_LOGGING.ENABLE_DEBUG) {
      console.log(`${DATA_LOGGING.PREFIX} ${payload.event}:`, {
        data: payload.data,
        timestamp: new Date(payload.timestamp).toISOString(),
        source: payload.source,
      });
    }
  },

  /**
   * Check if event is a data lifecycle event
   */
  isDataLifecycleEvent: (event: string): boolean => {
    return [
      CollectionEvents.ITEMS_LOADED,
      CollectionEvents.ITEMS_ADDED,
      CollectionEvents.ITEMS_UPDATED,
      CollectionEvents.ITEMS_REMOVED,
      CollectionEvents.ITEMS_CLEARED,
    ].includes(event as any);
  },

  /**
   * Check if event is a background operation event
   */
  isBackgroundEvent: (event: string): boolean => {
    return [
      CollectionEvents.PREFETCH_START,
      CollectionEvents.PREFETCH_COMPLETE,
      CollectionEvents.WORKER_TASK_START,
      CollectionEvents.WORKER_TASK_COMPLETE,
    ].includes(event as any);
  },

  /**
   * Check if event is an error event
   */
  isErrorEvent: (event: string): boolean => {
    return [
      CollectionEvents.ERROR_OCCURRED,
      CollectionEvents.VALIDATION_ERROR,
      CollectionEvents.TRANSFORM_ERROR,
      CollectionEvents.SAVE_ERROR,
      CollectionEvents.LOAD_ERROR,
    ].includes(event as any);
  },
};
