/**
 * Viewport - Core virtual scrolling engine
 */

import type {
  ViewportConfig,
  ViewportContext,
  ViewportComponent,
  ItemRange,
  ViewportInfo,
} from "./types";
import { pipe } from "mtrl";
import { withBase } from "./features/base";
import { withVirtual } from "./features/virtual";
import { withScrolling } from "./features/scrolling";
import { withMomentum } from "./features/momentum";
import { withScrollbar } from "./features/scrollbar";
import { withCollection } from "./features/collection";
import { withPlaceholders } from "./features/placeholders";
import { withRendering } from "./features/rendering";
import { withEvents } from "./features/events";

// Internal viewport state
interface ViewportState {
  scrollPosition: number;
  totalItems: number;
  itemSize: number;
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
    // Track if viewport has been initialized to prevent multiple initializations
    let isInitialized = false;

    // No normalization needed - we'll use the nested structure directly

    // Create shared viewport state
    const state: ViewportState = {
      scrollPosition: 0,
      totalItems: component.totalItems || 0,
      itemSize: config.virtual?.itemSize || 50,
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
        // Prevent multiple initializations
        if (isInitialized) {
          return false;
        }
        isInitialized = true;

        // console.log("[Viewport] Initializing with state:", {
        //   element: !!component.element,
        //   totalItems: component.totalItems,
        //   itemSize: config.virtual?.itemSize,
        // });

        // Initialize container size
        if (component.element) {
          state.containerSize =
            config.scrolling?.orientation === "horizontal"
              ? component.element.offsetWidth
              : component.element.offsetHeight;

          // console.log("[Viewport] Container size:", state.containerSize);
        }

        // Calculate initial virtual size
        state.virtualTotalSize = state.totalItems * state.itemSize;

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

      // Check if already initialized
      isInitialized: () => isInitialized,

      // Allow features to check if init should proceed
      _shouldInit: () => !isInitialized,

      // Scrolling API (will be overridden by scrolling feature)
      scrollToIndex: (
        index: number,
        alignment?: "start" | "center" | "end",
      ) => {
        // Placeholder - will be implemented by scrolling feature
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
      const itemSize = state.itemSize;
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
      }),
    );

    // Base setup (creates DOM structure)
    enhancers.push(
      withBase({
        className: config.className,
        orientation: config.scrolling?.orientation,
      }),
    );

    // Virtual scrolling (required for most features)
    enhancers.push(
      withVirtual({
        itemSize: config.virtual?.itemSize,
        overscan: config.virtual?.overscan,
        orientation: config.scrolling?.orientation,
        autoDetectItemSize: config.virtual?.autoDetectItemSize,
        initialScrollIndex: (config as any).initialScrollIndex,
      }),
    );

    // Scrolling behavior
    enhancers.push(
      withScrolling({
        orientation: config.scrolling?.orientation,
        sensitivity: config.scrolling?.sensitivity,
        smoothing: config.scrolling?.animation,
        stopOnClick: config.scrolling?.stopOnClick,
      }),
    );

    // Momentum scrolling (touch/drag support for mobile)
    enhancers.push(
      withMomentum({
        enabled: true,
        stopOnClick: config.scrolling?.stopOnClick,
      }),
    );

    // Scrollbar (optional)
    if (config.scrollbar?.enabled !== false) {
      enhancers.push(
        withScrollbar({
          enabled: true,
          autoHide: config.scrollbar?.autoHide,
        }),
      );
    }

    // Add collection if configured
    if (config.collection?.adapter) {
      enhancers.push(
        withCollection({
          collection: config.collection.adapter,
          rangeSize: config.pagination?.limit,
          strategy: config.pagination?.strategy as
            | "offset"
            | "page"
            | "cursor"
            | undefined,
          transform: config.collection?.transform,
          cancelLoadThreshold: config.performance?.cancelLoadThreshold,
          maxConcurrentRequests: config.performance?.maxConcurrentRequests,
          enableRequestQueue: config.performance?.enableRequestQueue !== false,
          initialScrollIndex: (config as any).initialScrollIndex,
          selectId: (config as any).selectId,
          autoLoad: (config as any).autoLoad !== false,
          autoSelectFirst: (config as any).autoSelectFirst,
        }),
      );
    }

    // Placeholders (optional, requires collection)
    if (config.collection?.adapter && config.placeholders?.enabled !== false) {
      enhancers.push(
        withPlaceholders({
          enabled: true,
          analyzeFirstLoad: config.placeholders?.analyzeFirstLoad ?? true,
          maskCharacter: config.placeholders?.maskCharacter,
        }),
      );
    }

    // Rendering (always last to have access to all features)
    enhancers.push(
      withRendering({
        template: config.template,
        overscan: config.virtual?.overscan,
        maintainDomOrder: config.rendering?.maintainDomOrder,
      }),
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
