/**
 * @module core/compose/features
 * @description Addons-specific compose features for creating and combining components
 */

// Collection feature
export {
  withCollection,
  type CollectionConfig,
  type CollectionComponent,
} from "./collection";

// Styling feature
export {
  withStyling,
  type StylingConfig,
  type StylingComponent,
} from "./styling";

// Selection feature
export {
  withSelection,
  type SelectionConfig,
  type SelectionComponent,
  type SelectableItem,
} from "./selection";

// Performance feature
export {
  withPerformance,
  type PerformanceConfig,
  type PerformanceComponent,
  type PerformanceMetrics,
} from "./performance";

// Future features will be exported here
// export { withVirtualScroll } from './virtual-scroll';
// export { withDataGrid } from './data-grid';
// export { withInfiniteScroll } from './infinite-scroll';
