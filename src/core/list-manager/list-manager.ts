/**
 * List Manager - High-Performance Virtual List Management
 * A clean, composable factory for creating optimized virtual lists
 */

import { pipe } from "../compose";
import { withViewport } from "./features/viewport";
import { withCollection } from "./features/collection";
import { withPlaceholders } from "./features/viewport";
import type { ListManagerComponent, ListManagerConfig } from "./types";

/**
 * Configuration for list manager enhancers
 */
export interface ListManagerEnhancerConfig {
  viewport?: Parameters<typeof withViewport>[0];
  collection?: Parameters<typeof withCollection>[0];
  placeholders?: Parameters<typeof withPlaceholders>[0];
}

/**
 * Creates a List Manager with all enhancers applied
 *
 * @param config - Configuration for the list manager
 * @returns Enhanced List Manager component
 */
export const createListManager = (
  config: ListManagerConfig
): ListManagerComponent => {
  // Base component factory
  const createBaseComponent = (): ListManagerComponent => {
    // Simple event system
    const eventListeners = new Map<string, Function[]>();

    const emit = (event: string, data?: any) => {
      console.log(`📡 ${event}:`, data);
      const listeners = eventListeners.get(event) || [];
      listeners.forEach((listener) => {
        try {
          listener(data);
        } catch (error) {
          console.error(`Error in event listener for ${event}:`, error);
        }
      });
    };

    const on = (event: string, listener: Function) => {
      if (!eventListeners.has(event)) {
        eventListeners.set(event, []);
      }
      eventListeners.get(event)!.push(listener);

      // Return unsubscribe function
      return () => {
        const listeners = eventListeners.get(event);
        if (listeners) {
          const index = listeners.indexOf(listener);
          if (index > -1) {
            listeners.splice(index, 1);
          }
        }
      };
    };

    return {
      element: config.container,
      config,
      componentName: "list-manager",
      items: config.items || [],
      totalItems: config.items?.length || 0,
      template: config.template?.template || null,
      isInitialized: false,
      isDestroyed: false,
      getClass: (suffix: string) => `${config.prefix || "mtrl"}-${suffix}`,
      emit,
      on,
      initialize: () => {},
      destroy: () => {},
      updateConfig: (newConfig: Partial<ListManagerConfig>) => {
        Object.assign(config, newConfig);
      },
      getConfig: () => ({ ...config }),
    };
  };

  // Compose enhancers
  const enhance = pipe(
    withViewport({
      orientation: config.orientation?.orientation,
      estimatedItemSize: config.virtual?.estimatedItemSize,
      overscan: config.virtual?.overscan,
      enableScrollbar: true,
      // Pass callback to load data for a specific range
      loadDataForRange: (range: { start: number; end: number }) => {
        console.log(
          `📡 [LIST-MANAGER] Proactive data request for range ${range.start}-${range.end}`
        );

        // This callback will be called during enhancement, we need to defer the collection access
        // until after the component is fully enhanced
        setTimeout(() => {
          const collectionComponent = component as any;
          if (
            collectionComponent.collection &&
            typeof collectionComponent.collection.loadMissingRanges ===
              "function"
          ) {
            console.log(
              `🌐 [LIST-MANAGER] Requesting collection to load range ${range.start}-${range.end}`
            );
            collectionComponent.collection
              .loadMissingRanges(range)
              .catch((error: any) => {
                console.error(
                  "❌ [LIST-MANAGER] Failed to load missing ranges:",
                  error
                );
              });
          } else {
            console.log(
              `⚠️ [LIST-MANAGER] Collection not available for proactive loading`
            );
          }
        }, 0);
      },
    }),
    withCollection({
      collection: config.collection?.adapter,
      rangeSize: config.collection?.pageSize || 20,
      strategy: config.collection?.strategy || "page",
      enablePlaceholders: true,
    }),
    withPlaceholders({
      enabled: true,
    })
  );

  // Create and enhance component
  const component = enhance(createBaseComponent());

  // Auto-initialize
  component.initialize();

  return component;
};

/**
 * Creates a List Manager with custom enhancer configuration
 */
export const createCustomListManager = (
  config: ListManagerConfig,
  enhancerConfig: ListManagerEnhancerConfig = {}
): ListManagerComponent => {
  const createBaseComponent = (): ListManagerComponent => {
    // Simple event system
    const eventListeners = new Map<string, Function[]>();

    const emit = (event: string, data?: any) => {
      console.log(`📡 ${event}:`, data);
      const listeners = eventListeners.get(event) || [];
      listeners.forEach((listener) => {
        try {
          listener(data);
        } catch (error) {
          console.error(`Error in event listener for ${event}:`, error);
        }
      });
    };

    const on = (event: string, listener: Function) => {
      if (!eventListeners.has(event)) {
        eventListeners.set(event, []);
      }
      eventListeners.get(event)!.push(listener);

      // Return unsubscribe function
      return () => {
        const listeners = eventListeners.get(event);
        if (listeners) {
          const index = listeners.indexOf(listener);
          if (index > -1) {
            listeners.splice(index, 1);
          }
        }
      };
    };

    return {
      element: config.container,
      config,
      componentName: "list-manager",
      items: config.items || [],
      totalItems: config.items?.length || 0,
      template: config.template?.template || null,
      isInitialized: false,
      isDestroyed: false,
      getClass: (suffix: string) => `${config.prefix || "mtrl"}-${suffix}`,
      emit,
      on,
      initialize: () => {},
      destroy: () => {},
      updateConfig: (newConfig: Partial<ListManagerConfig>) => {
        Object.assign(config, newConfig);
      },
      getConfig: () => ({ ...config }),
    };
  };

  const enhance = pipe(
    withViewport(enhancerConfig.viewport || {}),
    withCollection(enhancerConfig.collection || {}),
    withPlaceholders(enhancerConfig.placeholders || {})
  );

  const component = enhance(createBaseComponent());
  component.initialize();

  return component;
};

// Export enhancers for individual use
export { withViewport, withCollection, withPlaceholders };
