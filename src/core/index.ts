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

// === List Manager System ===
export {
  // Main list manager functions
  createListManager,
  createVirtualList,
  createHighPerformanceList,
  createPerformanceMonitor,
  createTemplate,
  // List manager events
  ListManagerEvents,
} from "./list-manager";

// List manager types
export type {
  ListManager,
  ListManagerConfig,
  VirtualItem,
  ViewportInfo,
  ListManagerObserver,
  ListManagerUnsubscribe,
  PerformanceReport,
  ListManagerEventPayload,
  ElementPool,
  SizeCache,
  VirtualScrollingStrategy,
  VirtualizationConfig,
  RecyclingConfig,
  ViewportConfig,
  HeightMeasurementConfig,
  PerformanceConfig,
  TemplateConfig,
  ScrollConfig,
} from "./list-manager";

// List manager constants (prefixed to avoid conflicts)
export * as ListManagerConstants from "./list-manager/constants";
