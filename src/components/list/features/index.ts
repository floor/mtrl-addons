/**
 * mtrl-addons List Component Features
 *
 * List-specific features and enhancements.
 * Follows mtrl patterns for component features.
 */

// Re-export core compose features that are commonly used with lists
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
  type PerformanceConfig,
  type PerformanceComponent,
} from "../../../core/compose/features";

// List-specific features
export { withApi } from "./api";

// Future list-specific features will be exported here
// export { withVirtualScroll } from './virtual-scroll';
// export { withInfiniteScroll } from './infinite-scroll';
// export { withDataGrid } from './data-grid';
