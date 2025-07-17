/**
 * Core type definitions for List Manager
 * Performance and UI management layer types
 */

import type { ListManagerConstants } from "./constants";

/**
 * Core Range and Item Types
 */
export interface ItemRange {
  start: number;
  end: number;
}

export interface ViewportInfo {
  containerSize: number;
  totalVirtualSize: number;
  visibleRange: ItemRange;
  virtualScrollPosition: number;
}

export interface SpeedTracker {
  velocity: number; // px/ms
  direction: "forward" | "backward"; // scroll direction (vertical: down/up, horizontal: right/left)
  isAccelerating: boolean; // velocity increasing
  lastMeasurement: number; // timestamp of last measurement
}

/**
 * Feature Interfaces for Simplified Architecture
 */

/**
 * Viewport Feature - Complete Virtual Scrolling
 */
export interface ViewportFeature {
  // Orientation handling
  orientation: "vertical" | "horizontal";

  // Virtual scrolling (orientation-agnostic)
  virtualScrollPosition: number;
  totalVirtualSize: number;
  containerSize: number;

  // Item sizing (orientation-agnostic)
  estimatedItemSize: number;
  measuredSizes: Map<number, number>;

  // Custom scrollbar
  scrollbarThumb: HTMLElement | null;
  scrollbarTrack: HTMLElement | null;
  thumbPosition: number;

  // Methods
  handleWheel(event: WheelEvent): void;
  updateContainerPosition(): void;
  updateScrollbar(): void;
  calculateVisibleRange(): ItemRange;
  measureItemSize(element: HTMLElement, index: number): void;
  initialize(): void;
  destroy(): void;
}

/**
 * Collection Feature - Data Management Integration
 */
export interface CollectionFeature {
  // Speed tracking
  speedTracker: SpeedTracker;

  // Range management
  loadedRanges: Set<number>;
  pendingRanges: Set<number>;

  // Collection integration
  collection: any;

  // Pagination strategy
  paginationStrategy: "page" | "offset" | "cursor";

  // Placeholder system
  placeholderStructure: Map<string, { min: number; max: number }> | null;
  placeholderTemplate:
    | ((item: any, index: number) => string | HTMLElement)
    | null;

  // Methods
  loadMissingRanges(visibleRange: ItemRange): void;
  showPlaceholders(range: ItemRange): void;
  updateLoadedData(items: any[], offset: number): void;
  adaptPaginationStrategy(strategy: "page" | "offset" | "cursor"): void;
  analyzeDataStructure(items: any[]): void;
  generatePlaceholderItem(index: number): any;
  initialize(): void;
  destroy(): void;
}

/**
 * Configuration Types
 */
export interface CollectionConfig {
  adapter?: any;
  pageSize?: number; // becomes rangeSize
  strategy?: "page" | "offset" | "cursor";
  [key: string]: any;
}

export interface TemplateConfig {
  template: (item: any, index: number) => string | HTMLElement;
}

export interface VirtualConfig {
  enabled: boolean;
  itemSize: number | "auto";
  estimatedItemSize: number;
  overscan: number;
  measureItems?: boolean; // Optional flag to enable/disable item measurement (default: false)
}

export interface OrientationConfig {
  orientation: "vertical" | "horizontal";
  reverse: boolean;
  crossAxisAlignment: "start" | "center" | "end" | "stretch";
}

export interface InitialLoadConfig {
  strategy: "placeholders" | "direct";
  viewportMultiplier: number;
  minItems: number;
  maxItems: number;
}

export interface ErrorHandlingConfig {
  timeout: number;
  showErrorItems: boolean;
  retryAttempts: number;
  preserveScrollOnError: boolean;
}

export interface PositioningConfig {
  precisePositioning: boolean;
  allowPartialItems: boolean;
  snapToItems: boolean;
}

export interface BoundariesConfig {
  preventOverscroll: boolean;
  maintainEdgeRanges: boolean;
  boundaryResistance: number;
}

export interface RecyclingConfig {
  enabled: boolean;
  maxPoolSize: number;
  minPoolSize: number;
}

export interface PerformanceConfig {
  frameScheduling: boolean;
  memoryCleanup: boolean;
}

export interface IntersectionConfig {
  pagination: {
    enabled: boolean;
    rootMargin: string;
    threshold: number;
  };
  loading: {
    enabled: boolean;
  };
}

/**
 * Main List Manager Configuration
 */
export interface ListManagerConfig {
  // Container
  container: HTMLElement;

  // Collection integration
  collection?: CollectionConfig;
  items?: any[];

  // Template
  template?: TemplateConfig;

  // Virtual scrolling
  virtual: VirtualConfig;

  // Orientation
  orientation: OrientationConfig;

  // Initial loading
  initialLoad: InitialLoadConfig;

  // Error handling
  errorHandling: ErrorHandlingConfig;

  // Positioning
  positioning: PositioningConfig;

  // Boundaries
  boundaries: BoundariesConfig;

  // Element recycling (Phase 2)
  recycling: RecyclingConfig;

  // Performance
  performance: PerformanceConfig;

  // Intersection observers
  intersection: IntersectionConfig;

  // Debug
  debug: boolean;
  prefix: string;
  componentName: string;

  // Constants override
  constants?: Partial<ListManagerConstants>;
}

/**
 * Event System
 */
export enum ListManagerEvents {
  // Virtual scrolling
  VIEWPORT_CHANGED = "viewport:changed",
  SCROLL_POSITION_CHANGED = "scroll:position:changed",
  VIRTUAL_RANGE_CHANGED = "virtual:range:changed",
  RANGE_RENDERED = "range:rendered",

  // Collection coordination
  LOADING_TRIGGERED = "loading:triggered",
  SPEED_CHANGED = "speed:changed",
  RANGE_LOADED = "range:loaded",

  // Orientation
  ORIENTATION_CHANGED = "orientation:changed",
  DIMENSIONS_CHANGED = "orientation:dimensions:changed",

  // Placeholder system
  STRUCTURE_ANALYZED = "placeholder:structure:analyzed",
  PLACEHOLDERS_SHOWN = "placeholder:shown",
  PLACEHOLDERS_REPLACED = "placeholder:replaced",

  // Element recycling events
  ELEMENT_RENDERED = "element:rendered",
  ELEMENT_UPDATED = "element:updated",
  ELEMENT_RECYCLED = "element:recycled",
  RECYCLING_INITIALIZED = "recycling:initialized",
  RECYCLING_DESTROYED = "recycling:destroyed",

  // Error handling
  ERROR_OCCURRED = "error:occurred",
  ERROR_RECOVERED = "error:recovered",

  // Lifecycle
  INITIALIZED = "lifecycle:initialized",
  DESTROYED = "lifecycle:destroyed",
}

export interface ListManagerEventData {
  [ListManagerEvents.VIEWPORT_CHANGED]: ViewportInfo;
  [ListManagerEvents.SCROLL_POSITION_CHANGED]: {
    position: number;
    direction: "forward" | "backward";
  };
  [ListManagerEvents.VIRTUAL_RANGE_CHANGED]: ItemRange;
  [ListManagerEvents.RANGE_RENDERED]: { range: ItemRange };
  [ListManagerEvents.LOADING_TRIGGERED]: { range: ItemRange; strategy: string };
  [ListManagerEvents.SPEED_CHANGED]: {
    speed: number;
    direction: "forward" | "backward";
  };
  [ListManagerEvents.RANGE_LOADED]: { range: ItemRange; items: any[] };
  [ListManagerEvents.ORIENTATION_CHANGED]: {
    orientation: "vertical" | "horizontal";
  };
  [ListManagerEvents.DIMENSIONS_CHANGED]: {
    containerSize: number;
    totalVirtualSize: number;
  };
  [ListManagerEvents.STRUCTURE_ANALYZED]: {
    structure: Map<string, { min: number; max: number }>;
  };
  [ListManagerEvents.PLACEHOLDERS_SHOWN]: { range: ItemRange; count: number };
  [ListManagerEvents.PLACEHOLDERS_REPLACED]: { range: ItemRange; items: any[] };
  [ListManagerEvents.ELEMENT_RENDERED]: { element: HTMLElement };
  [ListManagerEvents.ELEMENT_UPDATED]: { element: HTMLElement };
  [ListManagerEvents.ELEMENT_RECYCLED]: { element: HTMLElement };
  [ListManagerEvents.RECYCLING_INITIALIZED]: { config: ListManagerConfig };
  [ListManagerEvents.RECYCLING_DESTROYED]: { reason?: string };
  [ListManagerEvents.ERROR_OCCURRED]: { error: Error; context: string };
  [ListManagerEvents.ERROR_RECOVERED]: {
    previousError: Error;
    context: string;
  };
  [ListManagerEvents.INITIALIZED]: { config: ListManagerConfig };
  [ListManagerEvents.DESTROYED]: { reason?: string };
}

export interface ListManagerObserver {
  <T extends ListManagerEvents>(event: T, data: ListManagerEventData[T]): void;
}

export type ListManagerUnsubscribe = () => void;

/**
 * Main List Manager Interface
 */
export interface ListManager {
  // Virtual scrolling (orientation-agnostic)
  scrollToIndex(index: number, alignment?: "start" | "center" | "end"): void;
  scrollToPage(page: number, alignment?: "start" | "center" | "end"): void;
  getScrollPosition(): number;

  // Viewport management
  getVisibleRange(): ItemRange;
  getViewportInfo(): ViewportInfo;
  updateViewport(): void;

  // Collection integration
  setItems(items: any[]): void;
  setTotalItems(total: number): void;
  getItems(): any[];
  getTotalItems(): number;

  // Pagination strategy
  setPaginationStrategy(strategy: "page" | "offset" | "cursor"): void;
  getPaginationStrategy(): "page" | "offset" | "cursor";

  // Configuration
  updateConfig(config: Partial<ListManagerConfig>): void;
  getConfig(): ListManagerConfig;

  // Events
  subscribe(observer: ListManagerObserver): ListManagerUnsubscribe;
  emit<T extends ListManagerEvents>(
    event: T,
    data: ListManagerEventData[T]
  ): void;

  // Lifecycle
  initialize(): void;
  destroy(): void;
}

/**
 * Utility Types
 */
export type ListManagerConfigUpdate = Partial<ListManagerConfig>;

export interface FeatureContext {
  config: ListManagerConfig;
  constants: ListManagerConstants;
  emit: <T extends ListManagerEvents>(
    event: T,
    data: ListManagerEventData[T]
  ) => void;
}

export interface RangeCalculationResult {
  visibleRange: ItemRange;
  loadedRanges: Set<number>;
  missingRanges: ItemRange[];
  bufferRanges: ItemRange[];
}

/**
 * Type for the base List Manager component
 */
export interface ListManagerComponent {
  // mtrl base properties
  element: HTMLElement;
  config: ListManagerConfig;
  componentName: string;
  getClass: (name: string) => string;
  emit?: (event: string, data?: any) => void;
  on?: (event: string, handler: Function) => () => void;

  // List Manager specific
  items: any[];
  totalItems: number;
  template: ((item: any, index: number) => string | HTMLElement) | null;
  isInitialized: boolean;
  isDestroyed: boolean;

  // Core methods
  initialize(): void;
  destroy(): void;
  updateConfig(config: Partial<ListManagerConfig>): void;
  getConfig(): ListManagerConfig;
}

export interface TemplateFunction {
  (item: any, index: number): string | HTMLElement;
}

export interface CollectionComponent extends ListManagerComponent {
  collection: {
    // Data management
    setItems: (items: any[]) => void;
    getItems: () => any[];
    setTotalItems: (total: number) => void;
    getTotalItems: () => number;

    // Range management
    loadRange: (offset: number, limit: number) => Promise<any[]>;
    loadMissingRanges: (visibleRange: ItemRange) => Promise<void>;
    getLoadedRanges: () => Set<number>;
    getPendingRanges: () => Set<number>;
    getFailedRanges: () => Map<
      number,
      { attempts: number; lastError: Error; timestamp: number }
    >;
    clearFailedRanges: () => void;
    retryFailedRange: (rangeId: number) => Promise<any[]>;

    // Pagination strategy
    setPaginationStrategy: (strategy: "page" | "offset" | "cursor") => void;
    getPaginationStrategy: () => string;

    // Placeholder system
    analyzeDataStructure: (items: any[]) => void;
    generatePlaceholderItem: (index: number) => any;
    showPlaceholders: (count: number) => void;
    getPlaceholderStructure: () => Map<
      string,
      { min: number; max: number }
    > | null;

    // State
    isInitialized: () => boolean;
    updateLoadedData: (items: any[], offset: number) => void;
  };
}
