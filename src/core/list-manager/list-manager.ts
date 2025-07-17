/**
 * List Manager - High-Performance Virtual List Management
 * A clean, composable factory for creating optimized virtual lists
 */

import { pipe } from "../compose";
import { withCollection } from "./features/collection/collection";
import { withViewport } from "./features/viewport/viewport";
import { withPlaceholders } from "./features/viewport/placeholders";
import { createLoadingManager } from "./features/viewport/loading";
import { LIST_MANAGER_CONSTANTS } from "./constants";
import type { ListManagerConfig, ListManagerComponent } from "./types";

/**
 * Default configuration for List Manager
 */
const DEFAULT_CONFIG: Partial<ListManagerConfig> = {
  orientation: {
    orientation: "vertical",
    reverse: false,
    crossAxisAlignment: "stretch",
  },
  virtual: {
    estimatedItemSize: LIST_MANAGER_CONSTANTS.VIRTUAL_SCROLL.DEFAULT_ITEM_SIZE,
    itemSize: LIST_MANAGER_CONSTANTS.VIRTUAL_SCROLL.DEFAULT_ITEM_SIZE,
    overscan: LIST_MANAGER_CONSTANTS.VIRTUAL_SCROLL.OVERSCAN_BUFFER,
    enabled: true,
  },
  collection: {
    pageSize: LIST_MANAGER_CONSTANTS.RANGE_LOADING.DEFAULT_RANGE_SIZE,
    strategy: "page",
  },
};

/**
 * Creates a new List Manager component
 */
export const createListManager = (
  config: ListManagerConfig
): ListManagerComponent => {
  const container = config.container;

  // Merge config with defaults - handle undefined properties
  const mergedConfig: ListManagerConfig = {
    ...DEFAULT_CONFIG,
    ...config,
    orientation: {
      ...DEFAULT_CONFIG.orientation,
      ...(config.orientation || {}),
    },
    virtual: {
      ...DEFAULT_CONFIG.virtual,
      ...(config.virtual || {}),
    },
    collection: {
      ...DEFAULT_CONFIG.collection,
      ...(config.collection || {}),
    },
  } as ListManagerConfig;

  // Create base component
  const createBaseComponent = (): ListManagerComponent => {
    // Simple event system
    const eventListeners = new Map<string, Function[]>();

    const emit = (event: string, data?: any) => {
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
      element: container,
      config: mergedConfig,
      componentName: "list-manager",
      getClass: (name: string) => `mtrl-list-manager__${name}`,
      items: [],
      totalItems: config.collection?.totalItems || 0,
      template: config.template?.template || null,
      isInitialized: false,
      isDestroyed: false,
      emit,
      on,
      initialize: () => {
        console.log("🚀 [LIST-MANAGER] Initializing...");
      },
      destroy: () => {
        console.log("👋 [LIST-MANAGER] Destroying...");
      },
      updateConfig: (update: Partial<ListManagerConfig>) => {
        Object.assign(mergedConfig, update);
      },
      getConfig: () => mergedConfig,
    };
  };

  // Create loading manager
  let loadingManager: ReturnType<typeof createLoadingManager> | null = null;

  // Compose enhancers - CRITICAL: Collection must be applied before viewport
  // so that viewport can access collection.loadMissingRanges
  const enhance = pipe(
    withCollection({
      collection: config.collection?.adapter,
      rangeSize: config.collection?.pageSize || 20,
      strategy: config.collection?.strategy || "page",
      enablePlaceholders: true,
    }),
    withPlaceholders({
      enabled: true,
    }),
    withViewport({
      orientation: mergedConfig.orientation?.orientation,
      estimatedItemSize: mergedConfig.virtual?.estimatedItemSize,
      overscan: mergedConfig.virtual?.overscan,
      enableScrollbar: true,
      measureItems: mergedConfig.virtual?.measureItems, // Pass measureItems flag
      // Pass callback to load data for a specific range
      loadDataForRange: (range: { start: number; end: number }) => {
        console.log(
          `📡 [LIST-MANAGER] Proactive data request for range ${range.start}-${range.end}`
        );

        // Use loading manager if available
        if (loadingManager) {
          loadingManager.requestLoad(range, "normal");
        } else {
          // Fallback to direct loading
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
        }
      },
    })
  );

  // Create and enhance component
  const component = enhance(createBaseComponent());

  // Create loading manager after component is enhanced
  loadingManager = createLoadingManager(component, {
    maxConcurrentRequests: config.collection?.maxConcurrentRequests,
  });

  // Wire up velocity updates from scrolling to loading manager
  if (component.on) {
    component.on("speed:changed", (data: any) => {
      if (loadingManager) {
        loadingManager.updateVelocity(data.speed, data.direction);
      }
    });
  }

  // Initialize component
  if ((component as any).viewport?.initialize) {
    (component as any).viewport.initialize();
  }

  // Return the enhanced component
  return component;
};

/**
 * Configuration for list manager enhancers
 */
export interface ListManagerEnhancerConfig {
  viewport?: Parameters<typeof withViewport>[0];
  collection?: Parameters<typeof withCollection>[0];
  placeholders?: Parameters<typeof withPlaceholders>[0];
}
