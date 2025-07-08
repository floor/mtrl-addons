/**
 * mtrl-addons Core System
 *
 * Exports all core modules: layout, collection, and list-manager
 */

// === Layout System ===
export * from "./layout";

// === Collection System ===
export {
  // Main collection creation functions
  createCollection,
  createDataCollection,
  createBaseCollection,
  createRestAdapter,
  // Collection plugins
  withLoading,
  withDataOperations,
  // Collection events and state
  CollectionDataEvents,
  CollectionEvents,
  createEventPayload,
  createCollectionState,
} from "./collection";

// Collection types
export type {
  Collection,
  BaseCollection,
  CollectionConfig,
  CollectionItem,
  CollectionAdapter,
  AdapterParams,
  AdapterResponse,
} from "./collection";

// Collection constants (prefixed to avoid conflicts)
export * as CollectionConstants from "./collection/constants";

// === List Manager System (Phase 1 - Functional Composition) ===

// List Manager - Main exports
export {
  listManager,
  createCustomListManager,
  createListManager,
  type ListManagerComponent,
} from "./list-manager/list-manager";

// List Manager - Individual enhancers for custom composition
export {
  withViewport,
  withCollection,
  withSpeedTracking,
  withPlaceholders,
} from "./list-manager/list-manager";

// List Manager - Component interfaces after enhancement
export type { ViewportComponent } from "./list-manager/features/withViewport";
export type { CollectionComponent } from "./list-manager/features/withCollection";
export type { SpeedTrackingComponent } from "./list-manager/features/withSpeedTracking";
export type { PlaceholdersComponent } from "./list-manager/features/withPlaceholders";

export type { ViewportConfig } from "./list-manager/features/withViewport";
export type { CollectionConfig as ListManagerCollectionConfig } from "./list-manager/features/withCollection";
export type { SpeedTrackingConfig } from "./list-manager/features/withSpeedTracking";
export type {
  PlaceholdersConfig,
  PlaceholderStructure,
} from "./list-manager/features/withPlaceholders";

// List Manager - Core types and configurations
export type {
  ListManagerConfig,
  ItemRange,
  ViewportInfo,
  SpeedTracker,
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
} from "./list-manager/types";

// List Manager - Constants
export {
  LIST_MANAGER_CONSTANTS,
  PLACEHOLDER,
  type ListManagerConstants,
} from "./list-manager/constants";

// List Manager - Utility functions
export {
  calculateVisibleRange,
  calculateTotalVirtualSize,
  calculateContainerPosition,
  calculateScrollPositionForIndex,
  calculateScrollPositionForPage,
  calculateScrollbarMetrics,
  calculateViewportInfo,
  calculateInitialRangeSize,
  calculateMissingRanges,
  calculateBufferRanges,
  clamp,
  applyBoundaryResistance,
} from "./list-manager/utils/calculations";

// Re-export functional composition utilities
export { pipe } from "mtrl/src/core/compose";
