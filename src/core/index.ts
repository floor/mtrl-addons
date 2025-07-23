/**
 * Core Module Exports
 *
 * Central export point for all core functionality
 */

export {
  createLayout,
  applyLayoutClasses,
  cleanupLayoutClasses,
} from "./layout";
export type { Layout, LayoutConfig } from "./layout";

// Collection system
export {
  createCollection,
  createRestAdapter,
  createCollectionState,
  createCollectionEventEmitter,
  CollectionEvents,
  COLLECTION_DEFAULTS,
} from "./collection";

export type {
  Collection,
  CollectionConfig,
  CollectionItem,
  CollectionAdapter,
  AdapterParams,
  AdapterResponse,
} from "./collection";

// Viewport system
export { createViewport } from "./viewport";
export type {
  ViewportConfig,
  ViewportComponent,
  ViewportContext,
  ItemRange,
  ViewportInfo,
} from "./viewport/types";
