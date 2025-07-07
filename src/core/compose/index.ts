/**
 * @module core/compose
 * @description Core composition utilities and addons-specific features
 */

// Re-export mtrl compose system
export {
  pipe,
  createBase,
  withElement,
  withEvents,
  withLifecycle,
} from "mtrl/src/core/compose";

// Export addons-specific features
export {
  withCollection,
  withStyling,
  withSelection,
  withPerformance,
  type CollectionConfig,
  type CollectionComponent,
  type StylingConfig,
  type StylingComponent,
  type SelectionConfig,
  type SelectionComponent,
  type SelectableItem,
  type PerformanceConfig,
  type PerformanceComponent,
  type PerformanceMetrics,
} from "./features";
