/**
 * Viewport - Core virtual scrolling engine
 */

import type {
  ViewportConfig,
  ViewportContext,
  ViewportComponent,
} from "./types";
import { pipe } from "mtrl/src/core/compose/pipe";
import { withBase } from "./features/base";
import { withVirtual } from "./features/virtual";
import { withScrolling } from "./features/scrolling";
import { withScrollbar } from "./features/scrollbar";
import { withCollection } from "./features/collection";
import { withPlaceholders } from "./features/placeholders";
import { withRendering } from "./features/rendering";
import { withEvents } from "./features/events";

// Internal viewport state
interface ViewportState {
  scrollPosition: number;
  totalItems: number;
  estimatedItemSize: number;
  containerSize: number;
  virtualTotalSize: number;
  visibleRange: ItemRange;
  itemsContainer: HTMLElement | null;
  velocity: number;
  scrollDirection: "forward" | "backward";
}

/**
 * Creates a viewport-enhanced component using composition
 *
 * @param config - Viewport configuration
 * @returns Function that enhances a component with viewport capabilities
 */
export const createViewport = (config: ViewportConfig = {}) => {
  return <T extends ViewportContext>(component: T): T & ViewportComponent => {
    // Create shared viewport state
    const state: ViewportState = {
      scrollPosition: 0,
      totalItems: component.totalItems || 0,
      estimatedItemSize: config.estimatedItemSize || 50,
      containerSize: 0,
      virtualTotalSize: 0,
      visibleRange: { start: 0, end: 0 },
      itemsContainer: null,
      velocity: 0,
      scrollDirection: "forward",
    };

    // Create base viewport API
    const viewportAPI = {
      // Core API
      initialize: () => {
        // console.log("[Viewport] Initializing with state:", {
        //   element: !!component.element,
        //   totalItems: component.totalItems,
        //   estimatedItemSize: config.estimatedItemSize,
        // });

        // Initialize container size
        if (component.element) {
          state.containerSize =
            config.orientation === "horizontal"
              ? component.element.offsetWidth
              : component.element.offsetHeight;

          // console.log("[Viewport] Container size:", state.containerSize);
        }

        // Calculate initial virtual size
        state.virtualTotalSize = state.totalItems * state.estimatedItemSize;

        // Calculate initial visible range
        state.visibleRange = calculateVisibleRange(state.scrollPosition);

        // console.log("[Viewport] Initial state:", {
        //   containerSize: state.containerSize,
        //   virtualTotalSize: state.virtualTotalSize,
        //   visibleRange: state.visibleRange,
        // });
      },

      destroy: () => {
        // Cleanup will be handled by features
      },

      updateViewport: () => {
        // Will be implemented by rendering feature
      },

      // Scrolling API (will be overridden by scrolling feature)
      scrollToIndex: (
        index: number,
        alignment?: "start" | "center" | "end"
      ) => {
        // Will be implemented by scrolling feature
      },

      scrollToPosition: (position: number) => {
        // Will be implemented by scrolling feature
      },

      getScrollPosition: () => state.scrollPosition,

      // Info API
      getVisibleRange: () => state.visibleRange,

      getViewportInfo: (): ViewportInfo => ({
        containerSize: state.containerSize,
        totalVirtualSize: state.virtualTotalSize,
        visibleRange: state.visibleRange,
        virtualScrollPosition: state.scrollPosition,
      }),

      // Rendering API
      renderItems: () => {
        // Will be implemented by rendering feature
      },

      // Internal state (for features to access)
      state,
    };

    // Helper function to calculate visible range
    const calculateVisibleRange = (scrollPos: number): ItemRange => {
      const itemSize = state.estimatedItemSize;
      const start = Math.floor(scrollPos / itemSize);
      const visibleCount = Math.ceil(state.containerSize / itemSize);
      const end = Math.min(start + visibleCount, state.totalItems - 1);

      return { start: Math.max(0, start), end: Math.max(0, end) };
    };

    // Add viewport API to component
    const baseComponent = {
      ...component,
      viewport: viewportAPI,
    };

    // Build the enhancement pipeline
    const enhancers: Array<(c: any) => any> = [];

    // Events system (always first - provides communication for other features)
    enhancers.push(
      withEvents({
        debug: config.debug,
      })
    );

    // Base setup (creates DOM structure)
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

    // Add collection if configured
    if (config.collection) {
      enhancers.push(
        withCollection({
          collection: config.collection,
          rangeSize: config.rangeSize,
          strategy: config.paginationStrategy,
          transform: config.transformItem,
          cancelLoadThreshold: config.cancelLoadThreshold,
          maxConcurrentRequests: config.maxConcurrentRequests,
          enableRequestQueue: config.enableRequestQueue !== false,
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

    // Rendering (always last to have access to all features)
    enhancers.push(
      withRendering({
        template: config.template,
        overscan: config.overscan,
      })
    );

    // Compose all enhancers
    const enhance = pipe(...enhancers);

    // Apply enhancements
    const enhanced = enhance(baseComponent);

    // Auto-initialize if element is provided
    if (enhanced.element) {
      enhanced.viewport.initialize();
    }

    return enhanced as T & ViewportComponent;
  };
};
