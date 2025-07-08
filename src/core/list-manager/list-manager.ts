/**
 * Core List Manager implementation (Performance Layer)
 *
 * Main factory function that creates a List Manager for virtual scrolling,
 * element recycling, and viewport management with zero data concerns.
 */

import type {
  ListManager,
  ListManagerConfig,
  VirtualItem,
  ViewportInfo,
  ListManagerObserver,
  ListManagerUnsubscribe,
  PerformanceReport,
  ListManagerEvents,
  ElementPool,
} from "./types";

import {
  VIRTUAL_SCROLLING,
  ELEMENT_RECYCLING,
  VIEWPORT,
  HEIGHT_MEASUREMENT,
  PERFORMANCE,
  TEMPLATE,
  SCROLL,
  CLASSES,
  ATTRIBUTES,
  LOGGING,
  LIST_MANAGER_DEFAULTS,
  ORIENTATION,
} from "./constants";

import { orientationManager } from "./features/orientation";
import { pipe, createBase, withEvents } from "mtrl/src/core/compose";
import {
  virtualViewport,
  scrollbar,
  itemSizeManager,
} from "./features/viewport";
import { elementRecyclingPool } from "./features/recycling";
import {
  programmaticScroll,
  smoothScroll,
  scrollRestore,
} from "./features/scroll";
import { paginationTrigger, lazyLoading } from "./features/intersection";
import { frameScheduler } from "./features/performance";
import { rendering } from "./features/rendering";
// import { viewportManager } from "./features/viewport-manager"; // Replaced with windowBasedViewport
import { withListManagerAPI } from "./api";
import { withPlugin } from "./plugin/adapter";

// Import the new configuration system
import {
  createListManagerConfig,
  getFeatureConfigs,
  configDebug,
} from "./config";

// Note: This utility doesn't exist yet, will need to create it
// import { withListManagerAPI } from "./utils/list-manager-api";

// Note: Advanced features will be added as they are implemented

/**
 * Creates a List Manager with performance optimization features
 */
export const createListManager = (
  config: ListManagerConfig = {}
): ListManager => {
  try {
    // Use the new configuration system
    const listManagerConfig = createListManagerConfig(config);
    const featureConfigs = getFeatureConfigs(listManagerConfig);

    // Log configuration in debug mode
    configDebug.logConfig(listManagerConfig);

    console.log(`⚡ Creating List Manager with features:
    - Orientation: ${listManagerConfig.orientation.orientation}${
      listManagerConfig.orientation.reverse ? " (reversed)" : ""
    }
    - Virtual scrolling: ${listManagerConfig.virtual.enabled}
    - Element recycling: ${listManagerConfig.recycling.enabled}
    - Performance: frame=${
      listManagerConfig.performance.frameScheduling
    }, memory=${listManagerConfig.performance.memoryCleanup}`);

    // Helper function to create passthrough when feature is disabled
    const passthrough = <T>(comp: T): T => comp;

    // Create List Manager using mtrl's compose pattern with feature configurations
    const listManager = pipe(
      createBase,
      withEvents(),

      // Core features (order matters)
      withPlugin(orientationManager(featureConfigs.orientation())), // Orientation first - affects all other features

      // Rendering feature - depends on orientation
      withPlugin(
        rendering({
          template:
            listManagerConfig.template?.template ||
            ((item: any, index: number) =>
              `<div class="mtrl-list-item__content">${
                item.name || item.id || `Item ${index}`
              }</div>`),
          itemHeight: listManagerConfig.virtual.estimatedItemHeight || 50,
          orientation: {
            orientation: listManagerConfig.orientation.orientation,
            reverse: listManagerConfig.orientation.reverse,
            crossAxisAlignment:
              listManagerConfig.orientation.crossAxisAlignment,
          },
          prefix: listManagerConfig.prefix,
          debug: listManagerConfig.debug,
        })
      ),

      // Virtual viewport management - depends on rendering, works with custom scrollbar
      withPlugin(
        virtualViewport({
          itemHeight: listManagerConfig.virtual.estimatedItemHeight || 50,
          estimatedItemHeight:
            listManagerConfig.virtual.estimatedItemHeight || 50,
          overscan: 5,
          bufferSize: 2,
          prefix: listManagerConfig.prefix,
          debug: true, // Enable debug logging to see what's happening
        })
      ),

      // Scrollbar for unlimited dataset representation - depends on viewport
      withPlugin(
        scrollbar({
          enabled: true,
          trackWidth: 12,
          thumbMinHeight: 20,
          thumbColor: "#999999",
          trackColor: "#f0f0f0",
          borderRadius: 6,
          fadeTimeout: 1500,
          itemHeight: listManagerConfig.virtual.estimatedItemHeight || 50,
          totalItems: 0, // Will be updated dynamically
        })
      ),

      // Size management for items
      withPlugin(itemSizeManager(featureConfigs.itemSize())),

      // Element management
      listManagerConfig.recycling.enabled
        ? withPlugin(elementRecyclingPool(featureConfigs.recycling()))
        : passthrough,

      // Scroll behavior
      listManagerConfig.scroll.programmatic
        ? withPlugin(programmaticScroll(featureConfigs.scroll()))
        : passthrough,

      listManagerConfig.scroll.smooth
        ? withPlugin(
            smoothScroll({
              enabled: true,
              ...featureConfigs.scroll(),
            })
          )
        : passthrough,

      listManagerConfig.scroll.restore
        ? withPlugin(
            scrollRestore({
              enabled: true,
              autoSave: true,
              ...featureConfigs.scroll(),
            })
          )
        : passthrough,

      // Intersection observers
      listManagerConfig.intersection.pagination?.enabled
        ? withPlugin(
            paginationTrigger(featureConfigs.intersection().pagination)
          )
        : passthrough,

      listManagerConfig.intersection.loading?.enabled
        ? withPlugin(lazyLoading(featureConfigs.intersection().loading))
        : passthrough,

      // Performance features
      listManagerConfig.performance.frameScheduling
        ? withPlugin(frameScheduler(featureConfigs.performance()))
        : passthrough,

      // API layer LAST - after all plugins are attached so API can access them
      withListManagerAPI({
        prefix: listManagerConfig.prefix,
        componentName: listManagerConfig.componentName,
        debug: listManagerConfig.debug,
        container: listManagerConfig.container,
        template: listManagerConfig.template,
      })
    )({
      container: listManagerConfig.container,
      debug: listManagerConfig.debug,
      prefix: listManagerConfig.prefix,
      componentName: listManagerConfig.componentName,
    });

    console.log("✅ List Manager created with configuration-driven features");
    return listManager as ListManager;
  } catch (error) {
    console.error("❌ List Manager creation error:", error);
    throw new Error(
      `Failed to create List Manager: ${(error as Error).message}`
    );
  }
};
