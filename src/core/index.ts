/**
 * @module core
 * @description Core mtrl-addons functionality
 */

// Collection system
export { createCollection, createDataCollection } from "./collection";
export type { Collection, DataCollection } from "./collection";

// Layout system
export {
  createLayout,
  applyLayoutClasses,
  cleanupLayoutClasses,
} from "./layout";
export type { Layout, LayoutConfig } from "./layout";

// List Manager system
export {
  createListManager,
  createCustomListManager,
  withViewport,
  withCollection,
  withPlaceholders,
} from "./list-manager";

// Compose system
export {
  pipe,
  createBase,
  withElement,
  withEvents,
  withLifecycle,
  withCollection as withCompose,
  withStyling,
  withSelection,
  withPerformance,
} from "./compose";

// Types
export type {
  ListManagerComponent,
  ListManagerConfig,
  ListManagerEnhancerConfig,
  ViewportFeature,
  CollectionFeature,
  ItemRange,
  ViewportInfo,
  SpeedTracker,
} from "./list-manager/types";

export type {
  CollectionConfig,
  CollectionComponent,
  StylingConfig,
  StylingComponent,
  SelectionConfig,
  SelectionComponent,
  SelectableItem,
  PerformanceConfig,
  PerformanceComponent,
  PerformanceMetrics,
} from "./compose/features";

export type { ViewportComponent } from "./list-manager/features/viewport";
export type { CollectionComponent as CollectionEnhancerComponent } from "./list-manager/features/collection";
export type { PlaceholdersComponent } from "./list-manager/features/viewport";

export type { ViewportConfig } from "./list-manager/features/viewport";
export type { CollectionConfig as CollectionEnhancerConfig } from "./list-manager/features/collection";
export type { PlaceholdersConfig } from "./list-manager/features/viewport";

// Configuration types
export type { Collection as CollectionInterface } from "./collection";
export type { Layout as LayoutInterface } from "./layout";

// Collection types
export type {
  DataAdapter,
  LoadingStrategy,
  LoadingConfig,
  ApiResponse,
  PaginationMeta,
  DataState,
  CacheStrategy,
  CacheConfig,
  LoadingState,
  ErrorState,
  EventData,
  EventHandlers,
  CollectionCreateConfig,
  CollectionUpdateConfig,
  CollectionDestroyConfig,
  CollectionSetItemsConfig,
  CollectionSetTotalItemsConfig,
  CollectionSetLoadingConfig,
  CollectionSetErrorConfig,
  CollectionSetCacheConfig,
  CollectionSetEventHandlersConfig,
  CollectionGetItemsConfig,
  CollectionGetTotalItemsConfig,
  CollectionGetLoadingConfig,
  CollectionGetErrorConfig,
  CollectionGetCacheConfig,
  CollectionGetEventHandlersConfig,
  CollectionLoadConfig,
  CollectionLoadMoreConfig,
  CollectionReloadConfig,
  CollectionUpdateItemConfig,
  CollectionUpdateItemsConfig,
  CollectionUpdateTotalItemsConfig,
  CollectionUpdateLoadingConfig,
  CollectionUpdateErrorConfig,
  CollectionUpdateCacheConfig,
  CollectionUpdateEventHandlersConfig,
  CollectionClearConfig,
  CollectionClearCacheConfig,
  CollectionClearItemsConfig,
  CollectionClearErrorConfig,
  CollectionClearLoadingConfig,
  CollectionClearEventHandlersConfig,
  CollectionDestroyAllConfig,
  CollectionDestroyAllCacheConfig,
  CollectionDestroyAllItemsConfig,
  CollectionDestroyAllErrorConfig,
  CollectionDestroyAllLoadingConfig,
  CollectionDestroyAllEventHandlersConfig,
} from "./collection";

// Layout types
export type {
  LayoutData,
  LayoutElement,
  LayoutElementData,
  LayoutArrayConfig,
  LayoutConfig as LayoutTypeConfig,
  LayoutCreateConfig,
  LayoutUpdateConfig,
  LayoutDestroyConfig,
  LayoutSetDataConfig,
  LayoutSetElementConfig,
  LayoutSetElementDataConfig,
  LayoutSetArrayConfig,
  LayoutSetConfigConfig,
  LayoutGetDataConfig,
  LayoutGetElementConfig,
  LayoutGetElementDataConfig,
  LayoutGetArrayConfig,
  LayoutGetConfigConfig,
  LayoutRenderConfig,
  LayoutRenderElementConfig,
  LayoutRenderElementDataConfig,
  LayoutRenderArrayConfig,
  LayoutRenderConfigConfig,
  LayoutClearConfig,
  LayoutClearDataConfig,
  LayoutClearElementConfig,
  LayoutClearElementDataConfig,
  LayoutClearArrayConfig,
  LayoutClearConfigConfig,
  LayoutDestroyAllConfig,
  LayoutDestroyAllDataConfig,
  LayoutDestroyAllElementConfig,
  LayoutDestroyAllElementDataConfig,
  LayoutDestroyAllArrayConfig,
  LayoutDestroyAllConfigConfig,
} from "./layout";
