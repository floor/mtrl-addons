/**
 * Types for the mtrl-addons vlist component
 *
 * Virtual list with direct viewport integration
 */

// VList specific types
export interface VListConfig<T = any> {
  // Data
  items?: T[];

  // Container
  container?: HTMLElement | string;
  parent?: HTMLElement | string; // Alias for container (backwards compat)

  // Viewport settings
  orientation?: "vertical" | "horizontal";
  estimatedItemSize?: number;
  overscan?: number;

  // Template
  template?: (item: T, index: number) => string | HTMLElement;
  renderItem?: any; // Object-based template (backwards compat)

  // Features
  collection?: any;
  rendering?: any;
  scrolling?: any;
  loading?: any;
  placeholders?: any;

  // Collection/pagination settings
  rangeSize?: number;
  paginationStrategy?: "page" | "offset" | "cursor";
  enablePlaceholders?: boolean;
  maskCharacter?: string;
  maxConcurrentRequests?: number;

  // Data transformation
  transform?: (item: any) => T;
  transformItem?: (item: any) => T; // Alias for transform

  // Performance settings
  performance?: any;

  // Selection settings
  selection?: any;

  // Scroll settings
  scroll?: any;
  scrollSensitivity?: number;
  smoothScrolling?: boolean;
  enableScrollbar?: boolean;
  autoHideScrollbar?: boolean;

  // Styling
  className?: string;
  class?: string; // Alias for className (backwards compat)
  ariaLabel?: string;
  prefix?: string;

  // Debug
  debug?: boolean;
}

export interface VListComponent<T = any>
  extends BaseComponent,
    ElementComponent {
  viewport: any; // Viewport API

  // Data operations
  setItems(items: T[]): void;
  getItems(): T[];

  // Scrolling
  scrollToIndex(index: number, alignment?: "start" | "center" | "end"): void;
  scrollToTop(): void;
  scrollToBottom(): void;

  // State
  getState(): any;

  // Lifecycle
  destroy(): void;
}

// Re-export existing types with V prefix
export type VListItem = ListItem;
export type VListState = ListState;
export type VListEvents<T = any> = ListEvents<T>;
export type VListAPI<T = any> = ListAPI<T>;

import type {
  CollectionItem,
  CollectionConfig,
  Collection,
  TemplateDefinition,
} from "../../core/collection";
import type { BaseComponent, ElementComponent } from "mtrl/src/core/compose";
import type {
  ListManager,
  ListManagerConfig,
} from "../../core/list-manager/types";

/**
 * List item interface - extends collection item
 */
export interface ListItem extends CollectionItem {
  id: string;
  [key: string]: any;
}

/**
 * List adapter interface - extends collection adapter
 */
export interface ListAdapter<T extends ListItem = ListItem> {
  read(params?: ListAdapterParams): Promise<ListAdapterResponse<T>>;
  write?(items: T[]): Promise<ListAdapterResponse<T>>;
  delete?(ids: string[]): Promise<ListAdapterResponse<T>>;
}

/**
 * List adapter parameters
 */
export interface ListAdapterParams {
  page?: number;
  pageSize?: number;
  offset?: number;
  cursor?: string;
  search?: string;
  filters?: Record<string, any>;
  sort?: {
    field: string;
    direction: "asc" | "desc";
  }[];
}

/**
 * List adapter response
 */
export interface ListAdapterResponse<T extends ListItem = ListItem> {
  items: T[];
  meta?: {
    total?: number;
    page?: number;
    pageSize?: number;
    hasNext?: boolean;
    hasPrev?: boolean;
    cursor?: string;
  };
  error?: {
    message: string;
    code?: string;
  };
}

/**
 * List template definition
 */
export type ListTemplate = TemplateDefinition;

/**
 * List item template function
 */
export type ListItemTemplate<T = any> = (
  item: T,
  index: number
) => string | HTMLElement;

/**
 * List scroll behavior configuration
 */
export interface ListScrollConfig {
  /** Enable virtual scrolling */
  virtual?: boolean;
  /** Item size (fixed) or 'auto' for dynamic - height for vertical, width for horizontal */
  itemSize?: number | "auto";
  /** Estimated item size for dynamic sizing */
  estimatedItemSize?: number;
  /** Number of items to render outside viewport */
  overscan?: number;
  /** Enable scroll animations */
  animation?: boolean;
  /** Restore scroll position on reload */
  restorePosition?: boolean;
  /** Enable item measurement for dynamic sizing (default: false) */
  measureItems?: boolean;
}

/**
 * List styling configuration
 */
export interface ListStyleConfig {
  /** CSS class prefix */
  prefix?: string;
  /** Component name for class generation */
  componentName?: string;
  /** Additional CSS classes */
  className?: string;
  /** List variant */
  variant?: "default" | "dense" | "comfortable";
  /** List density */
  density?: "default" | "compact" | "comfortable";
}

/**
 * List event handlers
 */
export interface ListEventHandlers<T = any> {
  /** Item click handler */
  onItemClick?: (item: T, index: number, event: MouseEvent) => void;
  /** Item selection change */
  onSelectionChange?: (selectedItems: T[], selectedIndices: number[]) => void;
  /** Scroll event */
  onScroll?: (scrollTop: number, direction: "up" | "down" | "none") => void;
  /** Viewport change event */
  onViewportChange?: (visibleRange: { start: number; end: number }) => void;
  /** Load more data event */
  onLoadMore?: (direction: "forward" | "backward") => void | Promise<void>;
}

/**
 * List selection configuration
 */
export interface ListSelectionConfig {
  /** Enable selection */
  enabled?: boolean;
  /** Selection mode */
  mode?: "single" | "multiple" | "none";
  /** Initially selected indices */
  selectedIndices?: number[];
  /** Selection change callback */
  onSelectionChange?: (selectedItems: any[], selectedIndices: number[]) => void;
}

/**
 * List orientation configuration
 */
export interface ListOrientationConfig {
  /** List orientation */
  orientation?: "horizontal" | "vertical";
  /** Whether to auto-detect orientation based on container */
  autoDetect?: boolean;
  /** Reverse direction (RTL for horizontal, bottom-to-top for vertical) */
  reverse?: boolean;
  /** Cross-axis alignment */
  crossAxisAlignment?: "start" | "center" | "end" | "stretch";
}

/**
 * List pagination configuration
 */
export interface ListPaginationConfig {
  /** Pagination strategy */
  strategy?: "page" | "offset" | "cursor";
  /** Fixed page size/limit (overrides viewport-based calculation) */
  limit?: number;
}

/**
 * Complete List component configuration
 */
export interface ListConfig<T = any> extends ListStyleConfig {
  // Data layer (Collection) configuration
  collection?: Partial<CollectionConfig<T>>;

  // Performance layer (List Manager) configuration
  listManager?: Partial<ListManagerConfig>;

  // Pagination configuration
  pagination?: ListPaginationConfig;

  // Presentation layer configuration
  /** Container element or selector */
  container?: HTMLElement | string;

  /** List orientation configuration */
  orientation?: ListOrientationConfig;

  /** Item template function */
  template?: ListItemTemplate<T>;

  /** Static items (for non-API lists) */
  items?: T[];

  /** Data adapter (can be passed at top level or nested under collection) */
  adapter?: ListAdapter<T>;

  /** Scroll behavior configuration */
  scroll?: ListScrollConfig;

  /** Selection configuration */
  selection?: ListSelectionConfig;

  /** Event handlers */
  on?: ListEventHandlers<T>;

  /** Enable debugging */
  debug?: boolean;

  /** Accessibility label */
  ariaLabel?: string;

  /** Loading message template */
  loadingTemplate?: string | (() => string | HTMLElement);

  /** Empty state template */
  emptyTemplate?: string | (() => string | HTMLElement);

  /** Error state template */
  errorTemplate?: string | ((error: Error) => string | HTMLElement);
}

/**
 * List state interface
 */
export interface ListState {
  /** Current loading state */
  isLoading: boolean;

  /** Current error state */
  error: Error | null;

  /** Whether list is empty */
  isEmpty: boolean;

  /** Current scroll position */
  scrollTop: number;

  /** Current visible range */
  visibleRange: { start: number; end: number; count: number };

  /** Current render range */
  renderRange: { start: number; end: number; count: number };

  /** Selected item indices */
  selectedIndices: number[];

  /** Total number of items */
  totalItems: number;

  /** Whether virtual scrolling is active */
  isVirtual: boolean;

  /** Whether scrolling animations are enabled */
  animationEnabled: boolean;
}

/**
 * List item rendering context
 */
export interface ListItemContext<T = any> {
  /** Item data */
  item: T;

  /** Item index */
  index: number;

  /** Whether item is selected */
  isSelected: boolean;

  /** Whether item is visible in viewport */
  isVisible: boolean;

  /** Whether item is in render range */
  isInRenderRange: boolean;

  /** Item element (if rendered) */
  element?: HTMLElement;
}

/**
 * List component events
 */
export interface ListEvents<T = any> {
  /** Item clicked */
  "item:click": { item: T; index: number; event: MouseEvent };

  /** Item selected/deselected */
  "item:selection:change": { item: T; index: number; isSelected: boolean };

  /** Selection changed */
  "selection:change": { selectedItems: T[]; selectedIndices: number[] };

  /** Scroll position changed */
  "scroll:change": { scrollTop: number; direction: "up" | "down" | "none" };

  /** Viewport changed */
  "viewport:change": {
    visibleRange: { start: number; end: number; count: number };
  };

  /** Load more triggered */
  "load:more": { direction: "forward" | "backward" };

  /** Data loaded */
  "data:loaded": { items: T[]; total: number };

  /** Loading state changed */
  "loading:change": { isLoading: boolean };

  /** Error occurred */
  error: { error: Error };

  /** List rendered */
  "render:complete": {
    renderRange: { start: number; end: number; count: number };
  };
}

/**
 * List component API
 */
export interface ListAPI<T = any> {
  // Data management
  /** Load data */
  loadData(): Promise<void>;

  /** Reload data */
  reload(): Promise<void>;

  /** Clear all data */
  clear(): void;

  /** Add items */
  addItems(items: T[], position?: "start" | "end"): void;

  /** Remove items by indices */
  removeItems(indices: number[]): void;

  /** Update item at index */
  updateItem(index: number, item: T): void;

  /** Get item at index */
  getItem(index: number): T | undefined;

  /** Get all items */
  getItems(): T[];

  /** Get total item count */
  getItemCount(): number;

  // Scrolling
  /** Scroll to item index */
  scrollToIndex(
    index: number,
    alignment?: "start" | "center" | "end"
  ): Promise<void>;

  /** Scroll to top */
  scrollToTop(): Promise<void>;

  /** Scroll to bottom */
  scrollToBottom(): Promise<void>;

  /** Get current scroll position */
  getScrollPosition(): number;

  // Animation control
  /** Enable or disable scroll animations */
  setAnimationEnabled(enabled: boolean): void;

  /** Get current animation enabled state */
  getAnimationEnabled(): boolean;

  /** Toggle animation on/off */
  toggleAnimation(): void;

  // Selection
  /** Select items by indices */
  selectItems(indices: number[]): void;

  /** Deselect items by indices */
  deselectItems(indices: number[]): void;

  /** Clear selection */
  clearSelection(): void;

  /** Get selected items */
  getSelectedItems(): T[];

  /** Get selected indices */
  getSelectedIndices(): number[];

  /** Check if item is selected */
  isSelected(index: number): boolean;

  // State
  /** Get current list state */
  getState(): ListState;

  /** Check if list is loading */
  isLoading(): boolean;

  /** Check if list has error */
  hasError(): boolean;

  /** Check if list is empty */
  isEmpty(): boolean;

  // Rendering
  /** Force re-render */
  render(): void;

  /** Update viewport */
  updateViewport(): void;

  /** Get visible range */
  getVisibleRange(): { start: number; end: number; count: number };

  /** Get render range */
  getRenderRange(): { start: number; end: number; count: number };

  // Templates
  /** Update item template */
  setTemplate(template: ListItemTemplate<T>): void;

  /** Set loading template */
  setLoadingTemplate(template: string | (() => string | HTMLElement)): void;

  /** Set empty template */
  setEmptyTemplate(template: string | (() => string | HTMLElement)): void;

  /** Set error template */
  setErrorTemplate(
    template: string | ((error: Error) => string | HTMLElement)
  ): void;

  // Configuration
  /** Update list configuration */
  updateConfig(config: Partial<ListConfig<T>>): void;

  /** Get current configuration */
  getConfig(): ListConfig<T>;
}

/**
 * List component interface (extends mtrl component patterns)
 */
export interface ListComponent<T = any>
  extends BaseComponent,
    ElementComponent,
    ListAPI<T> {
  /** Collection instance (data layer) */
  collection: Collection<T>;

  /** List manager instance (performance layer) */
  listManager: ListManager;

  /** Current list state */
  state: ListState;

  /** List configuration */
  config: ListConfig<T>;

  /** Component lifecycle methods */
  lifecycle: {
    init(): void;
    destroy(): void;
    update(): void;
  };

  /** Event system (inherited from BaseComponent) */
  on<K extends keyof ListEvents<T>>(
    event: K,
    handler: (payload: ListEvents<T>[K]) => void
  ): void;
  emit<K extends keyof ListEvents<T>>(
    event: K,
    payload: ListEvents<T>[K]
  ): void;
  off<K extends keyof ListEvents<T>>(
    event: K,
    handler?: (payload: ListEvents<T>[K]) => void
  ): void;
}

/**
 * List performance metrics
 */
export interface ListPerformanceMetrics {
  renderCount: number;
  scrollCount: number;
  averageRenderTime: number;
  averageScrollTime: number;
  memoryUsage: number;
  virtualizedItems: number;
  recycledElements: number;
}

/**
 * List feature options
 */
export interface ListFeatures {
  virtualScroll?: boolean;
  selection?: boolean;
  styling?: boolean;
  performance?: boolean;
}
