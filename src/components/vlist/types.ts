/**
 * VList Types - Virtual List with direct viewport integration
 */

import type { BaseComponent, ElementComponent } from "mtrl";

/** Options for removeItemById */
export interface RemoveItemOptions {
  /** Track as pending removal to filter from future fetches (default: true) */
  trackPending?: boolean;
  /** Timeout in ms to clear pending removal (default: 5000) */
  pendingTimeout?: number;
}
// Collection types are not exposed by mtrl; define minimal interfaces locally
export interface CollectionItem {
  id: string | number;
  [key: string]: any;
}

export interface CollectionConfig<T = any> {
  adapter?: {
    read(params?: any): Promise<{ items: T[]; meta?: any; error?: any }>;
  };
}

export interface Collection<T = any> {
  loadMissingRanges?: (
    range: { start: number; end: number },
    reason?: string,
  ) => Promise<void>;
}
import type { ViewportComponent } from "../../core/viewport/types";
import type { SearchConfig } from "./features/search";
import type { FilterConfig } from "./features/filter";
import type { StatsConfig } from "./features/stats";
import type { VelocityConfig } from "./features/velocity";
import type { ScrollRestoreConfig } from "./features/scroll-restore";

/**
 * List item interface - extends collection item
 */
export interface ListItem extends CollectionItem {}

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
export type ListTemplate = (item: any, index: number) => string | HTMLElement;

/**
 * List item template function
 */
export type ListItemTemplate<T = any> = (
  item: T,
  index: number,
) => string | HTMLElement;

/**
 * List scroll behavior configuration
 */
export interface ListScrollConfig {
  /** Enable virtual scrolling */
  virtual?: boolean;
  /** Item size (fixed) or 'auto' for dynamic - height for vertical, width for horizontal */
  itemSize?: number | "auto";
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
  /** Require keyboard modifiers for multi-select (default: false) */
  requireModifiers?: boolean;
  /** Automatically select first item after initial load (default: false) */
  autoSelectFirst?: boolean;
}

/**
 * Keyboard navigation configuration
 *
 * Follows Material Design 3 accessibility guidelines:
 * - Arrow keys (Up/Down/Left/Right) navigate with wrapping
 * - Space/Enter activates/selects items
 * - Home/End jump to first/last
 *
 * @see https://m3.material.io/components/lists/accessibility
 */
export interface ListKeyboardConfig {
  /** Enable keyboard navigation (default: true when selection is enabled) */
  enabled?: boolean;
  /** Enable Home/End keys (default: true) */
  homeEnd?: boolean;
  /** Enable Page Up/Down keys (default: true) */
  pageUpDown?: boolean;
  /** Number of items to skip with Page Up/Down (default: 10) */
  pageSize?: number;
  /** Enable type-ahead search (default: false) */
  typeAhead?: boolean;
  /** Type-ahead search timeout in ms (default: 500) */
  typeAheadTimeout?: number;
  /** Wrap around when reaching start/end (default: true per MD3 spec) */
  wrap?: boolean;
  /** Callback when keyboard navigation occurs */
  onNavigate?: (index: number, key: string) => void;
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
export interface ListConfig<T extends ListItem = ListItem>
  extends ListStyleConfig {
  // Data layer (Collection) configuration
  collection?: Partial<CollectionConfig<T>>;

  // Performance layer (List Manager) configuration
  listManager?: Partial<any>;

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

  /** Item activated (Enter key in single selection mode) */
  "item:activate": { item: T; index: number };

  /** Item selected/deselected */
  "item:selection:change": { item: T; index: number; isSelected: boolean };

  /** Selection changed */
  "selection:change": { selectedItems: T[]; selectedIndices: number[] };

  /** Keyboard navigation occurred */
  "keyboard:navigate": {
    key: string;
    index: number;
    shiftKey: boolean;
    ctrlKey: boolean;
    metaKey: boolean;
  };

  /** List received keyboard focus */
  "keyboard:focus": Record<string, never>;

  /** List lost keyboard focus */
  "keyboard:blur": Record<string, never>;

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

  /** Item updated */
  "item:updated": {
    item: T;
    index: number;
    previousItem: T;
    wasVisible: boolean;
  };

  /** Viewport range loaded (data available for range) */
  "viewport:range-loaded": {
    range: { start: number; end: number };
  };
}

/**
 * List component API
 */
export interface ListAPI<T extends ListItem = ListItem> {
  // Data management
  /** Load data */
  loadData(): Promise<void>;

  /** Reload data */
  reload(): Promise<void>;

  /** Clear all data */
  clear(): void;

  /** Add items */
  addItems(items: T[], position?: "start" | "end"): void;

  /**
   * Add a single item to the collection
   * Convenience method that wraps addItems for single item use case
   * @param item - Item to add
   * @param position - Where to add item: "start" (default) or "end"
   */
  addItem(item: T, position?: "start" | "end"): void;

  /** Remove items by indices */
  removeItems(indices: number[]): void;

  /**
   * Remove item at a specific index
   * Removes the item from the collection, updates totalItems, and triggers re-render
   * @param index - The index of the item to remove
   * @returns true if item was found and removed, false otherwise
   */
  removeItem(index: number): boolean;

  /**
   * Remove item by ID
   * Finds the item in the collection by its ID and removes it
   * Updates totalItems and triggers re-render of visible items
   * Optionally tracks as pending removal to filter from future fetches
   * @param id - The item ID to find and remove
   * @param options - Remove options (trackPending, pendingTimeout)
   * @returns true if item was found and removed, false otherwise
   */
  removeItemById(id: string | number, options?: RemoveItemOptions): boolean;

  /**
   * Check if an item ID is pending removal
   * @param id - The item ID to check
   * @returns true if the item is pending removal
   */
  isPendingRemoval(id: string | number): boolean;

  /**
   * Get all pending removal IDs
   * @returns Set of pending removal IDs
   */
  getPendingRemovals(): Set<string | number>;

  /**
   * Clear a specific pending removal
   * @param id - The item ID to clear from pending removals
   */
  clearPendingRemoval(id: string | number): void;

  /**
   * Clear all pending removals
   */
  clearAllPendingRemovals(): void;

  /**
   * Filter items array to exclude pending removals
   * Utility method for use in collection adapters
   * @param items - Array of items to filter
   * @returns Filtered array without pending removal items
   */
  filterPendingRemovals<I extends { id?: any; _id?: any }>(items: I[]): I[];

  /** Update item at index */
  updateItem(index: number, item: T): void;

  /**
   * Update item by ID
   * Finds the item in the collection by its ID and updates it with new data
   * Re-renders the item if currently visible in the viewport
   * @param id - The item ID to find
   * @param data - Partial data to merge with existing item, or full item replacement
   * @param options - Update options
   * @returns true if item was found and updated, false otherwise
   */
  updateItemById(
    id: string | number,
    data: Partial<T>,
    options?: {
      /** If true, replace the entire item instead of merging (default: false) */
      replace?: boolean;
      /** If true, re-render even if not visible (default: false) */
      forceRender?: boolean;
    },
  ): boolean;

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
    alignment?: "start" | "center" | "end",
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

  /** Select an item by its ID
   * @param id - The ID of the item to select
   * @param silent - If true, selection won't emit change event (default: false)
   */
  selectById(id: string | number, silent?: boolean): boolean;

  /**
   * Select item at index, scrolling and waiting for data if needed
   * Handles virtual scrolling by loading data before selecting
   */
  selectAtIndex(index: number): Promise<boolean>;

  /**
   * Select next item relative to current selection
   * Handles virtual scrolling by loading data before selecting
   * @returns Promise resolving to true if selection changed, false if at end
   */
  selectNext(): Promise<boolean>;

  /**
   * Select previous item relative to current selection
   * Handles virtual scrolling by loading data before selecting
   * @returns Promise resolving to true if selection changed, false if at start
   */
  selectPrevious(): Promise<boolean>;

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
    template: string | ((error: Error) => string | HTMLElement),
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
export interface ListComponent<T extends ListItem = ListItem>
  extends BaseComponent,
    ElementComponent,
    ListAPI<T> {
  /** Collection instance (data layer) */
  collection: Collection<T>;

  /** List manager instance (performance layer) */
  listManager: any;

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
    handler: (payload: ListEvents<T>[K]) => void,
  ): void;
  emit<K extends keyof ListEvents<T>>(
    event: K,
    payload: ListEvents<T>[K],
  ): void;
  off<K extends keyof ListEvents<T>>(
    event: K,
    handler?: (payload: ListEvents<T>[K]) => void,
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

/**
 * VList configuration interface
 */
export interface VListConfig<T extends ListItem = ListItem> {
  // Container
  parent?: HTMLElement | string;
  container?: HTMLElement | string; // Also support container

  // Basic properties
  class?: string;
  className?: string; // Also support className
  prefix?: string;
  ariaLabel?: string;
  debug?: boolean;

  /**
   * Layout schema for building complete list UI with header, footer, etc.
   *
   * When provided, VList will:
   * 1. Process the layout schema using createLayout
   * 2. Build the UI structure inside VList's root element
   * 3. Find the 'viewport' element and render virtual scrolling there
   * 4. Expose all named elements via vlist.layout flat map
   *
   * The layout must include a ['viewport'] entry to mark where virtual
   * scrolling content should be rendered.
   *
   * @example
   * ```typescript
   * layout: [
   *   ['head', { class: 'head' },
   *     ['title', { text: 'Users' }]
   *   ],
   *   ['viewport'],
   *   ['foot', { class: 'foot' },
   *     ['count', { text: '0' }]
   *   ]
   * ]
   * ```
   */
  layout?: any[];

  // Selection shorthand (also available in selection.autoSelectFirst)
  /** Automatically select first item after initial load (default: false) */
  autoSelectFirst?: boolean;

  // Initial scroll position (0-based index)
  // When set, VList will start loading from this position instead of 0
  initialScrollIndex?: number;

  // ID of item to select after initial load completes
  // Works with initialScrollIndex to scroll to position and then select the item
  selectId?: string | number;

  // Whether to automatically load data on initialization (default: true)
  // Set to false to defer loading until manually triggered
  autoLoad?: boolean;

  // Data source
  items?: T[];

  // Template for rendering items
  template?: (
    item: T,
    index: number,
  ) => string | HTMLElement | any[] | Record<string, any>;

  // Collection configuration
  collection?: {
    adapter?: ListAdapter<T>;
    transform?: (item: T) => T;
  };

  // Pagination configuration
  pagination?: {
    strategy?: "page" | "offset" | "cursor";
    limit?: number;
  };

  // Virtual scrolling configuration
  virtual?: {
    itemSize?: number;
    overscan?: number;
  };

  // Scrolling configuration
  scrolling?: {
    orientation?: "vertical" | "horizontal";
    animation?: boolean;
    measureItems?: boolean;
    /** Stop scrolling when clicking on the viewport (default: true) */
    stopOnClick?: boolean;
    /** Momentum configuration for touch/drag scrolling */
    momentum?: {
      /** How quickly velocity decreases per frame (0-1, higher = longer coast, default: 0.95) */
      deceleration?: number;
      /** Minimum velocity before stopping in px/ms (default: 0.1) */
      minVelocity?: number;
      /** Maximum gesture duration in ms to trigger momentum (default: 1000) */
      maxDuration?: number;
      /** Minimum velocity in px/ms to trigger momentum (default: 0.3) */
      velocityThreshold?: number;
    };
  };

  // Performance settings
  performance?: {
    recycleElements?: boolean;
    bufferSize?: number;
    renderDebounce?: number;
    maxConcurrentRequests?: number;
    /** Velocity threshold (px/ms) above which data loading is cancelled and placeholders are shown. Default: 2 */
    cancelLoadThreshold?: number;
  };

  // Rendering configuration
  rendering?: {
    /**
     * Maintain DOM order to match visual index order.
     * Enables CSS selectors like :first-child, :nth-child() to work correctly.
     * Default: true
     */
    maintainDomOrder?: boolean;
  };

  // Selection configuration
  selection?: ListSelectionConfig;

  // Keyboard navigation configuration
  keyboard?: ListKeyboardConfig;

  /**
   * Search configuration for the list
   *
   * When provided, VList will:
   * 1. Connect to layout elements by name (toggle button, search bar)
   * 2. Manage search state (query, open/closed)
   * 3. Emit events: search:open, search:close, search:change, search:clear
   * 4. Provide API methods: search(), clearSearch(), getSearchQuery(), isSearching()
   * 5. Trigger list reload on search changes (configurable)
   *
   * @example
   * ```typescript
   * search: {
   *   toggleButton: 'search-toggle',  // Layout element name
   *   searchBar: 'search-input',      // Layout element name
   *   debounce: 300,                  // ms
   *   minLength: 1,                   // minimum query length
   *   autoReload: true,               // reload on change
   * }
   * ```
   */
  search?: SearchConfig;

  /**
   * Filter configuration for the list
   *
   * When provided, VList will:
   * 1. Connect to layout elements by name (toggle button, panel, controls)
   * 2. Manage filter state
   * 3. Emit events: filter:open, filter:close, filter:change, filter:clear
   * 4. Provide API methods: setFilter(), setFilters(), clearFilters(), getFilters(), isFiltered()
   * 5. Trigger list reload on filter changes (configurable)
   *
   * @example
   * ```typescript
   * filter: {
   *   toggleButton: 'filter-toggle',  // Layout element name
   *   panel: 'filter-panel',          // Layout element name
   *   clearButton: 'clear-btn',       // Layout element name
   *   controls: {
   *     country: 'country-select',    // filter name → layout element name
   *     decade: 'decade-select',
   *   },
   *   autoReload: true,               // reload on change
   * }
   * ```
   */
  filter?: FilterConfig;

  /**
   * Stats configuration for the list
   *
   * When provided, VList will:
   * 1. Track count (total items), position (first visible item), and progress (scroll %)
   * 2. Automatically update layout elements when stats change
   * 3. Emit 'stats:change' event for app-specific handling
   * 4. Provide API methods: getStats(), getCount(), getPosition(), getProgress()
   *
   * @example
   * ```typescript
   * stats: {
   *   elements: {
   *     count: 'count',        // Layout element name for total count
   *     position: 'position',  // Layout element name for current position
   *     progress: 'progress',  // Layout element name for progress %
   *   },
   *   format: {
   *     count: (n) => n.toLocaleString(),
   *     position: (n) => n.toLocaleString(),
   *     progress: (p) => `${p}%`,
   *   }
   * }
   * ```
   */
  stats?: StatsConfig;

  /**
   * Velocity configuration for the list
   *
   * When provided, VList will:
   * 1. Listen to viewport:velocity-changed events
   * 2. Update layout elements with formatted velocity values
   * 3. Optionally track average velocity within the instance
   * 4. Emit 'velocity:change' event for app-specific handling
   * 5. Provide API: getVelocity(), getAverageVelocity(), resetVelocityAverage()
   *
   * @example
   * ```typescript
   * velocity: {
   *   elements: {
   *     current: 'velocity-current',  // Layout element name for current velocity
   *     average: 'velocity-avg',      // Layout element name for average velocity
   *   },
   *   format: (v) => v.toFixed(2),
   *   trackAverage: true,             // Track average within this instance
   *   maxVelocityForAverage: 50,      // Exclude scrollbar drag velocities
   * }
   * ```
   */
  velocity?: VelocityConfig;

  /**
   * Scroll restore configuration for the list
   *
   * When provided, VList will:
   * 1. Allow queuing a pending scroll position/selection
   * 2. Automatically apply pending scroll on next reload()
   * 3. Support both pre-calculated positions and async position lookups
   * 4. Emit events: scroll-restore:pending, scroll-restore:applied, scroll-restore:cleared
   * 5. Provide API: setPendingScroll(), setPendingScrollWithLookup(), clearPendingScroll()
   *
   * Enabled by default unless explicitly disabled.
   *
   * @example
   * ```typescript
   * scrollRestore: {
   *   enabled: true,   // Default: true
   *   autoClear: true, // Clear pending after successful restore (default: true)
   * }
   *
   * // Usage:
   * vlist.setPendingScroll({ position: 100, selectId: 'item-123' })
   * await vlist.reload()  // Will use reloadAt(100, 'item-123')
   * ```
   */
  scrollRestore?: ScrollRestoreConfig;

  // Event handlers
  on?: ListEventHandlers<T>;
}

export type VListComponent<T extends ListItem = ListItem> = ListComponent<T> & {
  viewport: ViewportComponent["viewport"];
  /** Focus the list for keyboard navigation */
  focus(): void;
  /** Blur the list */
  blur(): void;
  /** Check if list has focus */
  hasFocus(): boolean;
  /** Check if an item at index is fully visible in the viewport */
  isItemFullyVisible(index: number): boolean;
  /** Select first item */
  selectFirst(): Promise<boolean>;
  /** Select last item */
  selectLast(): Promise<boolean>;
  /**
   * Flat map of all named layout elements (only present when layout option is used)
   * Access elements by their name: vlist.layout.title, vlist.layout.count, etc.
   */
  layout?: Record<string, any>;
  /**
   * Get a specific layout element by name (only present when layout option is used)
   */
  getLayoutElement?(name: string): any;

  // Search API (only present when search option is used)
  /** Set search query programmatically */
  search?(query: string): void;
  /** Clear search query */
  clearSearch?(): void;
  /** Get current search query */
  getSearchQuery?(): string;
  /** Check if currently in search mode */
  isSearching?(): boolean;
  /** Check if search bar is open */
  isSearchOpen?(): boolean;
  /** Open the search bar */
  openSearch?(): void;
  /** Close the search bar */
  closeSearch?(): void;
  /** Toggle search bar visibility */
  toggleSearch?(): void;

  // Filter API (only present when filter option is used)
  /** Set a single filter value */
  setFilter?(name: string, value: any): void;
  /** Set multiple filters at once */
  setFilters?(filters: Record<string, any>): void;
  /** Clear all filters */
  clearFilters?(): void;
  /** Get all current filters */
  getFilters?(): Record<string, any>;
  /** Get a single filter value */
  getFilter?(name: string): any;
  /** Check if any filter is active */
  isFiltered?(): boolean;
  /** Check if filter panel is open */
  isFilterOpen?(): boolean;
  /** Open the filter panel */
  openFilter?(): void;
  /** Close the filter panel */
  closeFilter?(): void;
  /** Toggle filter panel visibility */
  toggleFilter?(): void;
};

export type VListItem = ListItem;
export type VListAPI<T extends ListItem = ListItem> = ListAPI<T>;
export type VListState = ListState;
export type VListEvents<T = any> = ListEvents<T>;
