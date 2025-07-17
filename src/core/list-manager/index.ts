/**
 * List Manager Public API
 * Main exports for the mtrl-addons List Manager system
 */

// Import types first
import type {
  ListManager,
  ListManagerConfig,
  CollectionConfig,
  ItemRange,
  ViewportInfo,
} from "./types";
import { createListManager } from "./list-manager";
import { createListManagerAPI, ListManagerAPI, ListManagerUtils } from "./api";

// Export all types
export type {
  ListManager,
  ListManagerConfig,
  ListManagerConfigUpdate,
  ListManagerObserver,
  ListManagerUnsubscribe,
  ItemRange,
  ViewportInfo,
  SpeedTracker,
  ViewportFeature,
  CollectionFeature,
  FeatureContext,
  RangeCalculationResult,

  // Configuration types
  CollectionConfig,
  TemplateConfig,
  VirtualConfig,
  OrientationConfig,
  InitialLoadConfig,
  ErrorHandlingConfig,
  PositioningConfig,
  BoundariesConfig,
  RecyclingConfig,
  PerformanceConfig,
  IntersectionConfig,

  // Event system
  ListManagerEventData,
} from "./types";

export { ListManagerEvents } from "./types";

// Export core functions
export { createListManager, ListManagerImpl } from "./list-manager";
export { createListManagerAPI, ListManagerAPI, ListManagerUtils } from "./api";

// Export constants
export { LIST_MANAGER_CONSTANTS, mergeConstants } from "./constants";
export type { ListManagerConstants } from "./constants";

// Export utility functions
export {
  calculateTotalVirtualSize,
  calculateContainerPosition,
  calculateScrollPositionForIndex,
  calculateScrollPositionForPage,
  calculateScrollbarMetrics,
  calculateInitialRangeSize,
  calculateMissingRanges,
  calculateBufferRanges,
  clamp,
  applyBoundaryResistance,
} from "./utils/calculations";

export {
  createSpeedTracker,
  updateSpeedTracker,
  isFastScrolling,
  isSlowScrolling,
  getLoadingStrategy,
  calculateScrollMomentum,
  createSpeedBasedLoadingConfig,
  resetSpeedTracker,
  getScrollThrottleInterval,
  hasSignificantDirectionChange,
  calculateAdaptiveOverscan,
  getSpeedTrackerDebugInfo,
} from "./utils/speed-tracker";

export {
  calculateRangeIndex,
  calculateRangeBounds,
  calculateRequiredRanges,
  calculatePrefetchRanges,
  calculateRangeResult,
  rangeToPaginationParams,
  rangesToBatchParams,
  calculateOptimalRangeSize,
  isRangeInViewport,
  calculateRangePriority,
  sortRangesByPriority,
  mergeAdjacentRanges,
  calculateRangeCleanupCandidates,
  calculateRangeLoadingOrder,
  getRangeDebugInfo,
} from "./utils/range-calculator";

// Export feature factories
export { createViewportFeature } from "./features/viewport";
export { createCollectionFeature } from "./features/collection";

/**
 * Default export - createListManager for convenience
 */
export { createListManager as default } from "./list-manager";

/**
 * Version information
 */
export const LIST_MANAGER_VERSION = "1.0.0";

/**
 * Feature compatibility flags
 */
export const FEATURES = {
  VIRTUAL_SCROLLING: true,
  CUSTOM_SCROLLBAR: true,
  SPEED_BASED_LOADING: true,
  PLACEHOLDER_SYSTEM: true,
  ORIENTATION_SUPPORT: true,
  RANGE_PAGINATION: true,
  ELEMENT_RECYCLING: false, // Phase 2
  SMOOTH_SCROLLING: false, // Phase 2
  PERFORMANCE_MONITORING: false, // Phase 2
} as const;

/**
 * Quick setup helpers for common use cases
 */
export const QuickSetup = {
  /**
   * Create a basic vertical list with static items
   */
  verticalList: (
    container: HTMLElement,
    items: any[],
    template: (item: any, index: number) => HTMLElement
  ): ListManager => {
    return createListManager({
      container,
      items,
      template: { template },
      virtual: {
        enabled: true,
        itemSize: "auto",
        estimatedItemSize: 84,
        overscan: 5,
      },
      orientation: {
        orientation: "vertical",
        reverse: false,
        crossAxisAlignment: "stretch",
      },
      debug: false,
      prefix: "mtrl-list",
      componentName: "List",
    });
  },

  /**
   * Create a horizontal list with static items
   */
  horizontalList: (
    container: HTMLElement,
    items: any[],
    template: (item: any, index: number) => HTMLElement
  ): ListManager => {
    return createListManager({
      container,
      items,
      template: { template },
      virtual: {
        enabled: true,
        itemSize: "auto",
        estimatedItemSize: 200,
        overscan: 3,
      },
      orientation: {
        orientation: "horizontal",
        reverse: false,
        crossAxisAlignment: "stretch",
      },
      debug: false,
      prefix: "mtrl-list",
      componentName: "HorizontalList",
    });
  },

  /**
   * Create an API-driven list with collection integration
   */
  apiList: (
    container: HTMLElement,
    collection: CollectionConfig,
    template: (item: any, index: number) => HTMLElement
  ): ListManager => {
    return createListManager({
      container,
      collection,
      template: { template },
      virtual: {
        enabled: true,
        itemSize: "auto",
        estimatedItemSize: 60,
        overscan: 5,
      },
      orientation: {
        orientation: "vertical",
        reverse: false,
        crossAxisAlignment: "stretch",
      },
      initialLoad: {
        strategy: "placeholders",
        viewportMultiplier: 1.5,
        minItems: 10,
        maxItems: 100,
      },
      debug: false,
      prefix: "mtrl-list",
      componentName: "ApiList",
    });
  },

  /**
   * Create a debug list for development
   */
  debugList: (
    container: HTMLElement,
    itemCount: number = 1000
  ): ListManagerAPI => {
    return createListManagerAPI(
      ListManagerUtils.createTestConfig(container, itemCount)
    );
  },
};

/**
 * Type guards for feature detection
 */
export const TypeGuards = {
  isListManager: (obj: any): obj is ListManager => {
    return (
      obj &&
      typeof obj.scrollToIndex === "function" &&
      typeof obj.getVisibleRange === "function" &&
      typeof obj.initialize === "function"
    );
  },

  isListManagerAPI: (obj: any): obj is ListManagerAPI => {
    return (
      TypeGuards.isListManager(obj) &&
      typeof obj.onScroll === "function" &&
      typeof obj.getDebugInfo === "function"
    );
  },

  isItemRange: (obj: any): obj is ItemRange => {
    return obj && typeof obj.start === "number" && typeof obj.end === "number";
  },

  isViewportInfo: (obj: any): obj is ViewportInfo => {
    return (
      obj &&
      typeof obj.containerSize === "number" &&
      typeof obj.totalVirtualSize === "number" &&
      TypeGuards.isItemRange(obj.visibleRange) &&
      typeof obj.virtualScrollPosition === "number"
    );
  },
};
