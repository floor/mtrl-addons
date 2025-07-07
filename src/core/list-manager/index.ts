/**
 * List Manager System (Performance Layer)
 *
 * Main exports for the mtrl-addons List Manager performance optimization system.
 * This handles virtual scrolling, element recycling, and viewport management.
 */

// Core List Manager factory
export { createListManager } from "./list-manager";

// Types and interfaces
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
} from "./types";

// Event system
export { ListManagerEvents } from "./types";

// Performance constants
export {
  VIRTUAL_SCROLLING,
  ELEMENT_RECYCLING,
  VIEWPORT,
  HEIGHT_MEASUREMENT,
  PERFORMANCE,
  TEMPLATE,
  SCROLL,
  CLASSES,
  ATTRIBUTES,
  EVENT_TIMING,
  LOGGING,
  LIST_MANAGER_DEFAULTS,
} from "./constants";

/**
 * Quick start utility for creating a basic virtual list
 */
export function createVirtualList<T extends VirtualItem>(options: {
  container: HTMLElement;
  template: (item: T, index: number) => HTMLElement | string;
  estimatedHeight?: number;
  windowSize?: number;
  bufferSize?: number;
  enablePerformanceMonitoring?: boolean;
}) {
  return createListManager({
    virtualization: {
      strategy: "window-based",
      windowSize: options.windowSize || 10,
      bufferSize: options.bufferSize || 5,
      overscan: 2,
    },
    template: {
      template: options.template,
    },
    heightMeasurement: {
      strategy: "estimated",
      estimatedHeight: options.estimatedHeight || 40,
    },
    performance: {
      enabled: options.enablePerformanceMonitoring || false,
    },
    recycling: {
      enabled: true,
      initialPoolSize: 20,
      maxPoolSize: 100,
    },
  });
}

/**
 * Utility for creating a high-performance list with advanced features
 */
export function createHighPerformanceList<T extends VirtualItem>(options: {
  container: HTMLElement;
  template: (item: T, index: number) => HTMLElement | string;
  estimatedHeight?: number;
  enableDynamicHeight?: boolean;
  enableCustomScrollbar?: boolean;
  performanceTarget?: "smooth" | "fast" | "extreme";
}) {
  const performanceConfig = getPerformanceConfig(
    options.performanceTarget || "smooth"
  );

  return createListManager({
    virtualization: {
      strategy: options.enableCustomScrollbar
        ? "custom-scrollbar"
        : "window-based",
      windowSize: performanceConfig.windowSize,
      bufferSize: performanceConfig.bufferSize,
      overscan: performanceConfig.overscan,
      enableGPUAcceleration: true,
      debounceMs: performanceConfig.debounceMs,
      customScrollbar: options.enableCustomScrollbar
        ? {
            enabled: true,
            trackHeight: 20,
            thumbMinHeight: 40,
          }
        : undefined,
    },
    template: {
      template: options.template,
      cacheTemplates: true,
      maxTemplateCache: performanceConfig.templateCacheSize,
    },
    heightMeasurement: {
      strategy: options.enableDynamicHeight ? "dynamic" : "estimated",
      estimatedHeight: options.estimatedHeight || 40,
      cacheSize: performanceConfig.sizeCacheSize,
      persistCache: true,
    },
    performance: {
      enabled: true,
      trackFPS: true,
      trackMemory: true,
      trackRenderTime: true,
      fpsTarget: performanceConfig.fpsTarget,
      reportingInterval: 5000,
    },
    recycling: {
      enabled: true,
      initialPoolSize: performanceConfig.poolSize,
      maxPoolSize: performanceConfig.maxPoolSize,
      strategy: "lru",
      cleanupInterval: 10000,
    },
    viewport: {
      updateStrategy: "throttled",
      updateDelay: performanceConfig.viewportUpdateDelay,
      intersectionThreshold: 0.1,
    },
  });
}

/**
 * Get performance configuration based on target
 */
function getPerformanceConfig(target: "smooth" | "fast" | "extreme") {
  switch (target) {
    case "smooth":
      return {
        windowSize: 10,
        bufferSize: 5,
        overscan: 2,
        debounceMs: 16,
        templateCacheSize: 50,
        sizeCacheSize: 500,
        fpsTarget: 60,
        poolSize: 20,
        maxPoolSize: 100,
        viewportUpdateDelay: 16,
      };
    case "fast":
      return {
        windowSize: 20,
        bufferSize: 10,
        overscan: 5,
        debounceMs: 8,
        templateCacheSize: 100,
        sizeCacheSize: 1000,
        fpsTarget: 60,
        poolSize: 50,
        maxPoolSize: 200,
        viewportUpdateDelay: 8,
      };
    case "extreme":
      return {
        windowSize: 50,
        bufferSize: 25,
        overscan: 10,
        debounceMs: 4,
        templateCacheSize: 200,
        sizeCacheSize: 2000,
        fpsTarget: 120,
        poolSize: 100,
        maxPoolSize: 500,
        viewportUpdateDelay: 4,
      };
    default:
      return getPerformanceConfig("smooth");
  }
}

/**
 * Utility for creating performance monitoring hooks
 */
export function createPerformanceMonitor(listManager: ListManager) {
  const reports: PerformanceReport[] = [];

  const unsubscribe = listManager.subscribe((payload) => {
    if (
      payload.event === ListManagerEvents.PERFORMANCE_REPORT &&
      payload.performance
    ) {
      reports.push(payload.performance);

      // Keep only last 50 reports
      if (reports.length > 50) {
        reports.shift();
      }
    }
  });

  return {
    getReports: () => [...reports],
    getLatestReport: () => reports[reports.length - 1],
    getAverageFPS: () => {
      if (reports.length === 0) return 0;
      return reports.reduce((sum, r) => sum + r.currentFPS, 0) / reports.length;
    },
    getAverageRenderTime: () => {
      if (reports.length === 0) return 0;
      return reports.reduce((sum, r) => sum + r.renderTime, 0) / reports.length;
    },
    destroy: unsubscribe,
  };
}

/**
 * Utility for creating memory-efficient templates
 */
export function createTemplate<T extends VirtualItem>(
  templateFn: (item: T, index: number) => string
) {
  const elementCache = new Map<string, HTMLElement>();

  return (item: T, index: number): HTMLElement => {
    const cacheKey = `${item.id}-${index}`;

    if (elementCache.has(cacheKey)) {
      return elementCache.get(cacheKey)!;
    }

    const htmlString = templateFn(item, index);
    const element = document.createElement("div");
    element.innerHTML = htmlString;

    elementCache.set(cacheKey, element);

    // Cleanup cache when it gets too large
    if (elementCache.size > 100) {
      const firstKey = elementCache.keys().next().value;
      elementCache.delete(firstKey);
    }

    return element;
  };
}

// NO DATA exports: adapters, collections, persistence, etc. - those belong to Collection layer
