/**
 * Types for the mtrl-addons List Manager (Performance Layer)
 *
 * These types define the interfaces for virtual scrolling, element recycling,
 * viewport management, and performance optimization.
 */

import type { CollectionItem } from "../collection/types";
import type { OrientationConfig } from "./features/orientation";

/**
 * Base item interface for List Manager
 */
export interface VirtualItem extends CollectionItem {
  // Virtual scrolling properties
  height?: number;
  estimatedHeight?: number;
  measured?: boolean;

  // Element recycling properties
  element?: HTMLElement;
  recycled?: boolean;

  // Viewport properties
  visible?: boolean;
  index?: number;
}

/**
 * List Manager configuration (Performance/UI Only)
 */
export interface ListManagerConfig<T extends VirtualItem = VirtualItem> {
  /** Container element */
  container?: HTMLElement | string | null;

  /** Component identification */
  componentName?: string;
  prefix?: string;

  /** Orientation configuration */
  orientation?: OrientationConfig;

  /** Virtual scrolling configuration */
  virtual?: {
    enabled?: boolean;
    itemHeight?: number | "auto";
    estimatedItemHeight?: number;
    overscan?: number;
    windowSize?: number;
  };

  /** Element recycling configuration */
  recycling?: {
    enabled?: boolean;
    maxPoolSize?: number;
    minPoolSize?: number;
    strategy?: "fifo" | "lru" | "size-based";
  };

  /** Scroll behavior configuration */
  scroll?: {
    smooth?: boolean;
    restore?: boolean;
    programmatic?: boolean;
    behavior?: "smooth" | "instant" | "auto";
    easing?: "ease" | "ease-in" | "ease-out" | "ease-in-out" | "linear";
    duration?: number;
  };

  /** Intersection observer configuration */
  intersection?: {
    pagination?: {
      enabled?: boolean;
      rootMargin?: string;
      threshold?: number;
    };
    loading?: {
      enabled?: boolean;
      rootMargin?: string;
      threshold?: number;
    };
    preload?: {
      enabled?: boolean;
      threshold?: number;
      prefetchPages?: number;
    };
  };

  /** Performance optimization configuration */
  performance?: {
    enabled?: boolean;
    frameScheduling?: boolean;
    memoryCleanup?: boolean;
    fpsMonitoring?: boolean;
    trackFPS?: boolean;
    fpsTarget?: number;
    trackMemory?: boolean;
    memoryThreshold?: number;
  };

  /** Height measurement configuration */
  heightMeasurement?: {
    enabled?: boolean;
    strategy?: "fixed" | "estimated" | "dynamic" | "cached";
    estimatedHeight?: number;
    cacheSize?: number;
    dynamicMeasurement?: boolean;
  };

  /** Template configuration (for rendering) */
  template?: {
    template?: (item: T, index: number) => HTMLElement | string;
    onTemplateCreate?: (element: HTMLElement, item: T) => void;
    onTemplateUpdate?: (element: HTMLElement, item: T) => void;
    onTemplateDestroy?: (element: HTMLElement, item: T) => void;
  };

  /** Debug mode */
  debug?: boolean;
}

/**
 * Virtual scrolling configuration
 */
export interface VirtualizationConfig {
  strategy: "window-based" | "infinite-scroll" | "custom-scrollbar";

  // Window-based settings
  windowSize?: number;
  bufferSize?: number;
  overscan?: number;

  // Infinite scroll settings
  threshold?: number;
  rootMargin?: string;

  // Custom scrollbar settings
  customScrollbar?: {
    enabled: boolean;
    trackHeight?: number;
    thumbMinHeight?: number;
    thumbMaxHeight?: number;
  };

  // Performance settings
  debounceMs?: number;
  throttleMs?: number;
  enableGPUAcceleration?: boolean;
}

/**
 * Element recycling configuration
 */
export interface RecyclingConfig {
  enabled: boolean;

  // Pool management
  initialPoolSize?: number;
  maxPoolSize?: number;
  minPoolSize?: number;

  // Recycling strategy
  strategy?: "fifo" | "lru" | "size-based";

  // Cleanup settings
  cleanupInterval?: number;
  idleTimeout?: number;

  // Element reuse settings
  reuseStrategy?: "same-type" | "any-type" | "strict";
}

/**
 * Viewport management configuration
 */
export interface ViewportConfig {
  // Container settings
  containerSelector?: string;
  containerElement?: HTMLElement;

  // Viewport calculation
  includeMargins?: boolean;
  includePadding?: boolean;

  // Intersection observer settings
  intersectionThreshold?: number;
  intersectionRootMargin?: string;

  // Viewport updates
  updateStrategy?: "immediate" | "debounced" | "throttled";
  updateDelay?: number;
}

/**
 * Height measurement configuration
 */
export interface HeightMeasurementConfig {
  // Measurement strategy
  strategy: "fixed" | "estimated" | "dynamic" | "cached";

  // Fixed height settings
  fixedHeight?: number;

  // Estimated height settings
  estimatedHeight?: number;
  estimationAccuracy?: number;

  // Dynamic measurement
  measurementDebounce?: number;
  remeasureOnResize?: boolean;

  // Caching settings
  cacheSize?: number;
  cacheExpiry?: number;
  persistCache?: boolean;
}

/**
 * Performance monitoring configuration
 */
export interface PerformanceConfig {
  enabled: boolean;

  // FPS monitoring
  trackFPS?: boolean;
  fpsTarget?: number;

  // Memory monitoring
  trackMemory?: boolean;
  memoryThreshold?: number;

  // Render performance
  trackRenderTime?: boolean;
  renderTimeThreshold?: number;

  // Scroll performance
  trackScrollPerformance?: boolean;
  scrollFPSTarget?: number;

  // Reporting
  reportingInterval?: number;
  onPerformanceReport?: (report: PerformanceReport) => void;
}

/**
 * Template configuration for rendering
 */
export interface TemplateConfig {
  // Template function
  template: (item: VirtualItem, index: number) => HTMLElement | string;

  // Template caching
  cacheTemplates?: boolean;
  maxTemplateCache?: number;

  // Template lifecycle
  onTemplateCreate?: (element: HTMLElement, item: VirtualItem) => void;
  onTemplateUpdate?: (element: HTMLElement, item: VirtualItem) => void;
  onTemplateDestroy?: (element: HTMLElement, item: VirtualItem) => void;
}

/**
 * Scroll behavior configuration
 */
export interface ScrollConfig {
  // Scroll behavior
  behavior?: "smooth" | "instant" | "auto";

  // Scroll alignment
  align?: "start" | "center" | "end" | "nearest";

  // Scroll easing
  easing?: "ease" | "ease-in" | "ease-out" | "ease-in-out" | "linear";
  easingDuration?: number;

  // Scroll boundaries
  enableBoundaries?: boolean;
  topBoundary?: number;
  bottomBoundary?: number;
}

/**
 * Viewport information
 */
export interface ViewportInfo {
  // Viewport dimensions
  width: number;
  height: number;

  // Container dimensions (orientation-dependent)
  // For vertical lists: containerHeight is primary axis, containerWidth is cross-axis
  // For horizontal lists: containerWidth is primary axis, containerHeight is cross-axis
  containerHeight?: number;
  containerWidth?: number;

  // Scroll position
  scrollTop: number;
  scrollLeft: number;

  // Visible range
  startIndex: number;
  endIndex: number;
  visibleRange?: { startIndex: number; endIndex: number };

  // Visible items
  visibleItems: VirtualItem[];

  // Buffer information
  bufferStart: number;
  bufferEnd: number;

  // Total dimensions (orientation-dependent)
  // For vertical lists: totalHeight is scroll content size, totalWidth is cross-axis
  // For horizontal lists: totalWidth is scroll content size, totalHeight is cross-axis
  totalHeight: number;
  totalWidth: number;

  // Performance metrics
  fps?: number;
  renderTime?: number;
  memoryUsage?: number;
}

/**
 * Performance report
 */
export interface PerformanceReport {
  timestamp: number;

  // FPS metrics
  currentFPS: number;
  averageFPS: number;
  minFPS: number;
  maxFPS: number;

  // Memory metrics
  memoryUsage: number;
  memoryDelta: number;
  gcCount: number;

  // Render metrics
  renderTime: number;
  averageRenderTime: number;
  slowRenders: number;

  // Scroll metrics
  scrollFPS: number;
  scrollEvents: number;
  scrollDistance: number;

  // Element metrics
  totalElements: number;
  visibleElements: number;
  recycledElements: number;
  poolSize: number;

  // Viewport metrics
  viewportChanges: number;
  intersectionUpdates: number;
  heightMeasurements: number;
}

/**
 * List Manager performance events
 */
export enum ListManagerEvents {
  // Viewport events
  VIEWPORT_CHANGED = "viewport:changed",
  VIEWPORT_RESIZE = "viewport:resize",
  SCROLL_START = "scroll:start",
  SCROLL_END = "scroll:end",

  // Virtual scrolling events
  VIRTUAL_RANGE_CHANGED = "virtual:range:changed",
  VIRTUAL_ITEM_RENDERED = "virtual:item:rendered",
  VIRTUAL_ITEM_RECYCLED = "virtual:item:recycled",

  // Element recycling events
  ELEMENT_CREATED = "element:created",
  ELEMENT_RECYCLED = "element:recycled",
  ELEMENT_DESTROYED = "element:destroyed",
  POOL_RESIZED = "pool:resized",

  // Performance events
  PERFORMANCE_REPORT = "performance:report",
  FPS_DROP = "fps:drop",
  MEMORY_THRESHOLD = "memory:threshold",
  RENDER_SLOW = "render:slow",

  // Height measurement events
  HEIGHT_MEASURED = "height:measured",
  HEIGHT_CACHED = "height:cached",
  HEIGHT_ESTIMATION_UPDATED = "height:estimation:updated",

  // NO DATA events: items:loaded, cache:hit, etc. - those belong to Collection
}

/**
 * List Manager event payload
 */
export interface ListManagerEventPayload {
  event: ListManagerEvents;
  data?: any;
  viewport?: ViewportInfo;
  performance?: PerformanceReport;
  timestamp: number;
  source: "list-manager";
}

/**
 * List Manager observer type
 */
export type ListManagerObserver = (payload: ListManagerEventPayload) => void;

/**
 * List Manager unsubscribe function
 */
export type ListManagerUnsubscribe = () => void;

/**
 * Element recycling pool interface
 */
export interface ElementPool {
  // Pool management
  acquire(): HTMLElement | null;
  release(element: HTMLElement): void;
  clear(): void;

  // Pool information
  size(): number;
  capacity(): number;
  utilizationRatio(): number;

  // Pool optimization
  optimize(): void;
  resize(newCapacity: number): void;

  // Pool statistics
  getStats(): {
    totalCreated: number;
    totalRecycled: number;
    currentPoolSize: number;
    peakPoolSize: number;
    hitRate: number;
  };
}

/**
 * Height measurement cache interface
 */
export interface HeightCache {
  // Cache operations
  set(key: string, height: number): void;
  get(key: string): number | undefined;
  has(key: string): boolean;
  delete(key: string): void;
  clear(): void;

  // Cache statistics
  size(): number;
  hitRate(): number;

  // Cache persistence
  save(): Promise<void>;
  load(): Promise<void>;
}

/**
 * Virtual scrolling strategy interface
 */
export interface VirtualScrollingStrategy {
  // Strategy identification
  name: string;

  // Strategy methods
  calculateVisibleRange(
    viewport: ViewportInfo,
    items: VirtualItem[]
  ): {
    startIndex: number;
    endIndex: number;
    bufferStart: number;
    bufferEnd: number;
  };

  calculateScrollOffset(targetIndex: number, items: VirtualItem[]): number;

  updateViewport(viewport: ViewportInfo): void;

  // Strategy lifecycle
  initialize(config: VirtualizationConfig): void;
  destroy(): void;
}

/**
 * List Manager Plugin interface
 *
 * Defines the standard interface for List Manager plugins that provide features
 * like virtual scrolling, element recycling, etc.
 */
export interface ListManagerPlugin {
  /** Plugin name for identification */
  name: string;

  /** Plugin version */
  version: string;

  /** Dependencies on other plugins */
  dependencies: string[];

  /** Plugin installation function */
  install: (
    listManager: {
      emit: (event: ListManagerEvents, data?: any) => void;
      subscribe: (observer: ListManagerObserver) => ListManagerUnsubscribe;
      getConfig?: () => any;
    },
    pluginConfig: any
  ) => any;
}

/**
 * Main List Manager interface (Performance/UI Only)
 */
export interface ListManager<T extends VirtualItem = VirtualItem> {
  // Virtual scrolling
  setItems(items: T[]): void;
  getVisibleItems(): T[];
  getVisibleRange(): { startIndex: number; endIndex: number };
  scrollToIndex(
    index: number,
    align?: "start" | "center" | "end",
    animate?: boolean
  ): void;
  scrollToItem(
    item: T,
    align?: "start" | "center" | "end",
    animate?: boolean
  ): void;

  // Element recycling
  recycleElement(element: HTMLElement): void;
  getPoolStats(): any;
  optimizePool(): void;

  // Viewport management
  getViewportInfo(): ViewportInfo;
  updateViewport(): void;
  onViewportChange(
    callback: (viewport: ViewportInfo) => void
  ): ListManagerUnsubscribe;

  // Height measurement
  measureHeight(item: T): number;
  estimateHeight(item: T): number;
  cacheHeight(item: T, height: number): void;

  // Performance monitoring
  getPerformanceReport(): PerformanceReport;
  enablePerformanceMonitoring(): void;
  disablePerformanceMonitoring(): void;

  // Scroll animation control
  setScrollAnimation(enabled: boolean): void;
  getScrollAnimation(): boolean;
  toggleScrollAnimation(): void;

  // Template rendering
  renderItem(item: T, index: number): HTMLElement;
  updateItem(element: HTMLElement, item: T, index: number): void;

  // Events
  subscribe(observer: ListManagerObserver): ListManagerUnsubscribe;
  emit(event: ListManagerEvents, data?: any): void;

  // Lifecycle
  destroy(): void;

  // NO DATA methods: getItems, loadMore, filter, search, etc. - those belong to Collection
}
