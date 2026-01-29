// src/core/viewport/features/events.ts

/**
 * Events Feature - Centralized event system for viewport
 * Provides event emission and subscription for inter-feature communication
 */

import type { ViewportContext, ViewportComponent } from "../types";

export interface EventsConfig {
  debug?: boolean;
}

/**
 * Events feature for viewport
 * Centralizes all event handling for viewport features
 */
export const withEvents = (config: EventsConfig = {}) => {
  return <T extends ViewportContext & ViewportComponent>(component: T): T => {
    const { debug = false } = config;

    // Event listeners map
    const listeners = new Map<string, Set<Function>>();

    // Emit an event
    const emit = (event: string, data?: any) => {
      // if (debug) {
      //   console.log(`[Events] Emit: ${event}`, data);
      // }

      const eventListeners = listeners.get(event);
      if (eventListeners) {
        let listenerIndex = 0;
        eventListeners.forEach((listener) => {
          try {
            const start = performance.now();
            listener(data);
            const duration = performance.now() - start;
            // Log slow listeners (> 10ms)
            if (duration > 10) {
              console.log(`[Events] SLOW listener for ${event}:`, {
                listenerIndex,
                duration: duration.toFixed(2) + "ms",
                listenerName: listener.name || "(anonymous)",
              });
            }
            listenerIndex++;
          } catch (error) {
            console.error(`[Events] Error in listener for ${event}:`, error);
          }
        });
      }
    };

    // Subscribe to an event
    const on = (event: string, handler: Function): (() => void) => {
      if (!listeners.has(event)) {
        listeners.set(event, new Set());
      }

      listeners.get(event)!.add(handler);

      // if (debug) {
      //   console.log(`[Events] Subscribed to: ${event}`);
      // }

      // Return unsubscribe function
      return () => {
        const eventListeners = listeners.get(event);
        if (eventListeners) {
          eventListeners.delete(handler);
          if (eventListeners.size === 0) {
            listeners.delete(event);
          }
        }
      };
    };

    // Subscribe to an event once
    const once = (event: string, handler: Function): (() => void) => {
      const wrappedHandler = (data: any) => {
        handler(data);
        off(event, wrappedHandler);
      };
      return on(event, wrappedHandler);
    };

    // Unsubscribe from an event
    const off = (event: string, handler: Function) => {
      const eventListeners = listeners.get(event);
      if (eventListeners) {
        eventListeners.delete(handler);
        if (eventListeners.size === 0) {
          listeners.delete(event);
        }
      }
    };

    // Clear all listeners for an event
    const clear = (event?: string) => {
      if (event) {
        listeners.delete(event);
      } else {
        listeners.clear();
      }
    };

    // Add event methods to component
    component.emit = emit;
    component.on = on;
    component.once = once;
    component.off = off;

    // Add events API to viewport
    (component.viewport as any).events = {
      emit,
      on,
      once,
      off,
      clear,
      getListenerCount: (event?: string) => {
        if (event) {
          return listeners.get(event)?.size || 0;
        }
        let total = 0;
        listeners.forEach((set) => (total += set.size));
        return total;
      },
    };

    // Clean up on destroy
    if ("destroy" in component && typeof component.destroy === "function") {
      const originalDestroy = component.destroy;
      component.destroy = () => {
        clear();
        originalDestroy?.();
      };
    }

    return component;
  };
};
