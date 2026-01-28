/**
 * VList Component Features
 *
 * List-specific features and enhancements.
 */

// VList-specific features
export { withViewport } from "./viewport";
export { withAPI } from "./api";
export { withSelection } from "./selection";
export { withLayout } from "./layout";
export { withSearch } from "./search";
export { withFilter } from "./filter";
export { withStats } from "./stats";
export { withVelocity } from "./velocity";
export { withScrollRestore } from "./scroll-restore";

// Type exports
export type { LayoutSchema, LayoutResult, WithLayoutComponent } from "./layout";
export type { SearchConfig, WithSearchComponent } from "./search";
export type { FilterConfig, WithFilterComponent } from "./filter";
export type { StatsConfig, WithStatsComponent } from "./stats";
export type { VelocityConfig, WithVelocityComponent } from "./velocity";
export type {
  ScrollRestoreConfig,
  PendingScrollPosition,
  PendingScrollLookup,
  WithScrollRestoreComponent,
} from "./scroll-restore";
