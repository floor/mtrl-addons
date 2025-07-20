// src/core/viewport/viewport.ts

/**
 * Viewport - Composable virtual scrolling system
 *
 * Uses feature composition to build a complete viewport from individual features:
 * - Base: Core structure and event system
 * - Virtual: Virtual scrolling calculations
 * - Scrolling: Wheel events and scroll management
 * - Scrollbar: Visual scrollbar
 * - Rendering: DOM element creation and positioning
 * - Collection: Data loading and pagination
 * - Placeholders: Smart placeholder generation
 * - Loading: Velocity-based load management
 */

import { pipe } from "mtrl/src/core";
import type {
  ViewportConfig,
  ViewportComponent,
  ViewportContext,
} from "./types";

// Import feature enhancers
import { withBase } from "./features/base";
import { withVirtual } from "./features/virtual";
import { withScrolling } from "./features/scrolling";
import { withScrollbar } from "./features/scrollbar";
import { withRendering } from "./features/rendering";
import { withCollection } from "./features/collection";
import { withPlaceholders } from "./features/placeholders";
import { withLoadingManager } from "./features/loading-manager";

/**
 * Creates a viewport-enhanced component using composition
 *
 * @param config - Viewport configuration
 * @returns Function that enhances a component with viewport capabilities
 */
export const createViewport = (config: ViewportConfig = {}) => {
  return <T extends ViewportContext>(component: T): T & ViewportComponent => {
    // Build the enhancement pipeline
    const enhancers: Array<(c: any) => any> = [];

    // Base setup (always first)
    enhancers.push(
      withBase({
        className: config.className,
        orientation: config.orientation,
      })
    );

    // Virtual scrolling (required for most features)
    enhancers.push(
      withVirtual({
        estimatedItemSize: config.estimatedItemSize,
        overscan: config.overscan,
        orientation: config.orientation,
      })
    );

    // Scrolling behavior
    enhancers.push(
      withScrolling({
        orientation: config.orientation,
        sensitivity: config.scrollSensitivity,
        smoothing: config.smoothScrolling,
      })
    );

    // Scrollbar (optional)
    if (config.enableScrollbar !== false) {
      enhancers.push(
        withScrollbar({
          enabled: true,
          autoHide: config.autoHideScrollbar,
        })
      );
    }

    // Collection management (optional)
    if (config.collection) {
      enhancers.push(
        withCollection({
          collection: config.collection,
          rangeSize: config.rangeSize,
          strategy: config.paginationStrategy,
          transform: config.transformItem || (config as any).transform,
        })
      );
    }

    // Placeholders (optional, requires collection)
    if (config.collection && config.enablePlaceholders !== false) {
      enhancers.push(
        withPlaceholders({
          enabled: true,
          analyzeFirstLoad: true,
          maskCharacter: config.maskCharacter,
        })
      );
    }

    // Loading manager (optional, requires collection)
    if (config.collection) {
      enhancers.push(
        withLoadingManager({
          maxConcurrentRequests: config.maxConcurrentRequests,
          enableRequestQueue: true,
        })
      );
    }

    // Rendering (always last to have access to all features)
    enhancers.push(
      withRendering({
        template: config.template,
        debug: config.debug,
      })
    );

    // Compose all enhancers
    const enhance = pipe(...enhancers);

    // Apply enhancements
    const enhanced = enhance(component);

    // Initialize all features
    const initialize = () => {
      // Call all initialize functions in order
      const initFunctions = [
        "_baseInitialize",
        "_virtualInitialize",
        "_scrollingInitialize",
        "_scrollbarInitialize",
        "_collectionInitialize",
        "_placeholdersInitialize",
        "_loadingInitialize",
        "_renderingInitialize",
      ];

      for (const funcName of initFunctions) {
        const initFunc = (enhanced as any)[funcName];
        if (typeof initFunc === "function") {
          initFunc();
        }
      }
    };

    // Destroy all features
    const destroy = () => {
      // Call all destroy functions in reverse order
      const destroyFunctions = [
        "_renderingDestroy",
        "_loadingDestroy",
        "_placeholdersDestroy",
        "_collectionDestroy",
        "_scrollbarDestroy",
        "_scrollingDestroy",
        "_virtualDestroy",
      ];

      for (const funcName of destroyFunctions) {
        const destroyFunc = (enhanced as any)[funcName];
        if (typeof destroyFunc === "function") {
          destroyFunc();
        }
      }
    };

    // Add viewport API
    (enhanced as any).viewport = {
      initialize,
      destroy,

      // Expose feature APIs for direct access if needed
      scrolling: (enhanced as any).scrolling,
      scrollbar: (enhanced as any).scrollbar,
      virtual: (enhanced as any).virtual,
      rendering: (enhanced as any).rendering,
      collection: (enhanced as any).collection,
      placeholders: (enhanced as any).placeholders,
      loadingManager: (enhanced as any).loadingManager,

      // Expose commonly used methods directly
      scrollToIndex: (enhanced as any).scrolling?.scrollToIndex,
      scrollToPosition: (enhanced as any).scrolling?.scrollToPosition,
      getScrollPosition: (enhanced as any).scrolling?.getScrollPosition,
      calculateVisibleRange: (enhanced as any).virtual?.calculateVisibleRange,
    };

    // Auto-initialize if element is provided
    if (enhanced.element) {
      initialize();
    }

    return enhanced as T & ViewportComponent;
  };
};
