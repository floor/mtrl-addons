/**
 * List Manager Configuration System
 *
 * Provides configuration utilities, defaults, and validation for the List Manager.
 * Follows mtrl patterns for component configuration.
 */

import type { ListManagerConfig } from "./types";
import {
  VIRTUAL_SCROLLING,
  ELEMENT_RECYCLING,
  VIEWPORT,
  HEIGHT_MEASUREMENT,
  PERFORMANCE,
  SCROLL,
  ORIENTATION,
  LIST_MANAGER_DEFAULTS,
} from "./constants";

/**
 * Default configuration for orientation management
 */
export const defaultOrientationConfig = {
  orientation: ORIENTATION.DEFAULT_ORIENTATION,
  autoDetect: false,
  reverse: ORIENTATION.REVERSE_DIRECTION,
  crossAxisAlignment: ORIENTATION.DEFAULT_CROSS_AXIS_ALIGNMENT,
} as const;

/**
 * Default configuration for virtual scrolling
 */
export const defaultVirtualConfig = {
  enabled: true,
  itemHeight: 84,
  estimatedItemHeight: 84,
  overscan: VIRTUAL_SCROLLING.DEFAULT_OVERSCAN,
  windowSize: 20,
} as const;

/**
 * Default configuration for element recycling
 */
export const defaultRecyclingConfig = {
  enabled: true,
  maxPoolSize: ELEMENT_RECYCLING.DEFAULT_MAX_POOL_SIZE,
  minPoolSize: ELEMENT_RECYCLING.DEFAULT_MIN_POOL_SIZE,
  strategy: ELEMENT_RECYCLING.DEFAULT_STRATEGY,
} as const;

/**
 * Default configuration for scroll behavior
 */
export const defaultScrollConfig = {
  smooth: false,
  restore: false,
  programmatic: true,
  behavior: SCROLL.DEFAULT_BEHAVIOR,
  easing: SCROLL.DEFAULT_EASING,
  duration: SCROLL.DEFAULT_EASING_DURATION,
} as const;

/**
 * Default configuration for intersection observers
 */
export const defaultIntersectionConfig = {
  pagination: {
    enabled: true,
    rootMargin: VIEWPORT.DEFAULT_INTERSECTION_ROOT_MARGIN,
    threshold: VIEWPORT.DEFAULT_INTERSECTION_THRESHOLD,
  },
  loading: {
    enabled: true,
    rootMargin: "100px",
    threshold: 0.1,
  },
  preload: {
    enabled: false,
    threshold: 0.8,
    prefetchPages: 2,
  },
} as const;

/**
 * Default configuration for performance features
 */
export const defaultPerformanceConfig = {
  enabled: LIST_MANAGER_DEFAULTS.PERFORMANCE_ENABLED,
  frameScheduling: true,
  memoryCleanup: true,
  fpsMonitoring: false,
  trackFPS: true,
  fpsTarget: PERFORMANCE.TARGET_FPS,
  trackMemory: false,
  memoryThreshold: PERFORMANCE.MEMORY_WARNING_THRESHOLD,
} as const;

/**
 * Default configuration for height measurement
 */
export const defaultHeightMeasurementConfig = {
  enabled: true,
  strategy: HEIGHT_MEASUREMENT.DEFAULT_STRATEGY,
  estimatedHeight: HEIGHT_MEASUREMENT.ESTIMATED_HEIGHT_FALLBACK,
  cacheSize: HEIGHT_MEASUREMENT.CACHE_SIZE,
  dynamicMeasurement: true,
} as const;

/**
 * Complete default configuration for List Manager
 */
export const defaultListManagerConfig: Required<ListManagerConfig> = {
  // Container
  container: null,

  // Component identification
  componentName: "list-manager",
  prefix: "mtrl",

  // Orientation configuration
  orientation: defaultOrientationConfig,

  // Virtual scrolling configuration
  virtual: defaultVirtualConfig,

  // Element recycling configuration
  recycling: defaultRecyclingConfig,

  // Scroll behavior configuration
  scroll: defaultScrollConfig,

  // Intersection observer configuration
  intersection: defaultIntersectionConfig,

  // Performance configuration
  performance: defaultPerformanceConfig,

  // Height measurement configuration
  heightMeasurement: defaultHeightMeasurementConfig,

  // Template configuration
  template: undefined as any,

  // Collection configuration
  collection: undefined as any,

  // Static items
  items: undefined as any,

  // Debug mode
  debug: false,
} as const;

/**
 * Creates a validated List Manager configuration with defaults applied
 * @param config - User provided configuration
 * @returns Complete configuration with defaults
 */
export function createListManagerConfig(
  config: ListManagerConfig = {}
): Required<ListManagerConfig> {
  console.log("🔧 [LIST-MANAGER] Creating configuration");

  // Validate container if provided
  if (config.container) {
    validateContainer(config.container);
  }

  // Deep merge configuration with defaults
  const mergedConfig = {
    ...defaultListManagerConfig,
    ...config,

    // Deep merge nested objects
    orientation: {
      ...defaultListManagerConfig.orientation,
      ...config.orientation,
    },

    virtual: {
      ...defaultListManagerConfig.virtual,
      ...config.virtual,
    },

    recycling: {
      ...defaultListManagerConfig.recycling,
      ...config.recycling,
    },

    scroll: {
      ...defaultListManagerConfig.scroll,
      ...config.scroll,
    },

    intersection: {
      pagination: {
        ...defaultListManagerConfig.intersection.pagination,
        ...config.intersection?.pagination,
      },
      loading: {
        ...defaultListManagerConfig.intersection.loading,
        ...config.intersection?.loading,
      },
      preload: {
        ...defaultListManagerConfig.intersection.preload,
        ...config.intersection?.preload,
      },
    },

    performance: {
      ...defaultListManagerConfig.performance,
      ...config.performance,
    },

    heightMeasurement: {
      ...defaultListManagerConfig.heightMeasurement,
      ...config.heightMeasurement,
    },
  } as Required<ListManagerConfig>;

  // Validate the merged configuration
  validateListManagerConfig(mergedConfig);

  console.log("✅ [LIST-MANAGER] Configuration created and validated");
  return mergedConfig;
}

/**
 * Validates container element
 * @param container - Container element or selector
 */
export function validateContainer(
  container: HTMLElement | string | null
): void {
  if (!container) return;

  if (typeof container === "string") {
    const element = document.querySelector(container);
    if (!element) {
      throw new Error(`List Manager container element not found: ${container}`);
    }
  } else if (!(container instanceof HTMLElement)) {
    throw new Error(
      "List Manager container must be an HTMLElement or CSS selector string"
    );
  }
}

/**
 * Validates complete List Manager configuration
 * @param config - Configuration to validate
 */
export function validateListManagerConfig(
  config: Required<ListManagerConfig>
): void {
  // Validate virtual scrolling configuration
  if (config.virtual.enabled) {
    if (
      typeof config.virtual.estimatedItemHeight === "number" &&
      config.virtual.estimatedItemHeight <= 0
    ) {
      throw new Error("List Manager estimated item height must be positive");
    }

    if (config.virtual.overscan < 0) {
      throw new Error("List Manager overscan must be non-negative");
    }

    if (config.virtual.windowSize && config.virtual.windowSize <= 0) {
      throw new Error("List Manager window size must be positive");
    }
  }

  // Validate recycling configuration
  if (config.recycling.enabled) {
    if (config.recycling.maxPoolSize <= 0) {
      throw new Error("List Manager max pool size must be positive");
    }

    if (config.recycling.minPoolSize < 0) {
      throw new Error("List Manager min pool size must be non-negative");
    }

    if (config.recycling.minPoolSize > config.recycling.maxPoolSize) {
      throw new Error("List Manager min pool size cannot exceed max pool size");
    }
  }

  // Validate intersection observer configuration
  if (config.intersection.pagination.enabled) {
    if (
      config.intersection.pagination.threshold < 0 ||
      config.intersection.pagination.threshold > 1
    ) {
      throw new Error(
        "List Manager pagination threshold must be between 0 and 1"
      );
    }
  }

  if (config.intersection.loading.enabled) {
    if (
      config.intersection.loading.threshold < 0 ||
      config.intersection.loading.threshold > 1
    ) {
      throw new Error("List Manager loading threshold must be between 0 and 1");
    }
  }

  // Validate performance configuration
  if (config.performance.enabled) {
    if (config.performance.fpsTarget && config.performance.fpsTarget <= 0) {
      throw new Error("List Manager FPS target must be positive");
    }

    if (
      config.performance.memoryThreshold &&
      config.performance.memoryThreshold <= 0
    ) {
      throw new Error("List Manager memory threshold must be positive");
    }
  }

  // Validate height measurement configuration
  if (config.heightMeasurement.enabled) {
    if (config.heightMeasurement.estimatedHeight <= 0) {
      throw new Error("List Manager estimated height must be positive");
    }

    if (config.heightMeasurement.cacheSize < 0) {
      throw new Error("List Manager cache size must be non-negative");
    }
  }

  // Validate orientation configuration
  const validOrientations = ["vertical", "horizontal"];
  if (!validOrientations.includes(config.orientation.orientation)) {
    throw new Error(
      `List Manager orientation must be one of: ${validOrientations.join(", ")}`
    );
  }

  const validAlignments = ["start", "center", "end", "stretch"];
  if (!validAlignments.includes(config.orientation.crossAxisAlignment)) {
    throw new Error(
      `List Manager cross axis alignment must be one of: ${validAlignments.join(
        ", "
      )}`
    );
  }
}

/**
 * Creates configuration for specific features
 */
export const getFeatureConfigs = (config: Required<ListManagerConfig>) => ({
  /**
   * Gets orientation feature configuration
   */
  orientation: () => ({
    orientation: config.orientation.orientation,
    autoDetect: config.orientation.autoDetect,
    reverse: config.orientation.reverse,
    crossAxisAlignment: config.orientation.crossAxisAlignment,
    prefix: config.prefix,
    componentName: config.componentName,
  }),

  /**
   * Gets viewport feature configuration
   */
  viewport: () => ({
    heightStrategy: "dynamic" as const,
    heightBuffer: 2,
    itemHeight: config.virtual.itemHeight,
    estimatedItemHeight: config.virtual.estimatedItemHeight,
    overscan: config.virtual.overscan,
    windowSize: config.virtual.windowSize,
    enabled: config.virtual.enabled,
    prefix: config.prefix,
    componentName: config.componentName,
  }),

  /**
   * Gets item size management configuration
   */
  itemSize: () => ({
    strategy: (config.virtual.itemHeight === "auto"
      ? "dynamic"
      : "fixed") as const,
    defaultHeight:
      typeof config.virtual.itemHeight === "number"
        ? config.virtual.itemHeight
        : config.virtual.estimatedItemHeight,
    estimatedHeight: config.virtual.estimatedItemHeight,
    cacheSize: config.heightMeasurement.cacheSize,
    enabled: config.heightMeasurement.enabled,
    prefix: config.prefix,
    componentName: config.componentName,
  }),

  /**
   * Gets recycling feature configuration
   */
  recycling: () => ({
    enabled: config.recycling.enabled,
    maxPoolSize: config.recycling.maxPoolSize,
    minPoolSize: config.recycling.minPoolSize,
    recyclingStrategy: config.recycling.strategy,
    prefix: config.prefix,
    componentName: config.componentName,
  }),

  /**
   * Gets scroll behavior configuration
   */
  scroll: () => ({
    smooth: config.scroll.smooth,
    restorePosition: config.scroll.restore,
    behavior: config.scroll.behavior,
    easing: config.scroll.easing,
    duration: config.scroll.duration,
    programmatic: config.scroll.programmatic,
    prefix: config.prefix,
    componentName: config.componentName,
  }),

  /**
   * Gets intersection observer configurations
   */
  intersection: () => ({
    pagination: {
      enabled: config.intersection.pagination.enabled,
      rootMargin: config.intersection.pagination.rootMargin,
      threshold: config.intersection.pagination.threshold,
      prefix: config.prefix,
      componentName: config.componentName,
    },
    loading: {
      enabled: config.intersection.loading.enabled,
      rootMargin: config.intersection.loading.rootMargin,
      threshold: config.intersection.loading.threshold,
      prefix: config.prefix,
      componentName: config.componentName,
    },
    preload: {
      enabled: config.intersection.preload.enabled,
      threshold: config.intersection.preload.threshold,
      prefetchPages: config.intersection.preload.prefetchPages,
      prefix: config.prefix,
      componentName: config.componentName,
    },
  }),

  /**
   * Gets performance feature configuration
   */
  performance: () => ({
    enabled: config.performance.enabled,
    frameScheduling: config.performance.frameScheduling,
    memoryCleanup: config.performance.memoryCleanup,
    fpsMonitoring: config.performance.fpsMonitoring,
    trackFPS: config.performance.trackFPS,
    fpsTarget: config.performance.fpsTarget,
    trackMemory: config.performance.trackMemory,
    memoryThreshold: config.performance.memoryThreshold,
    prefix: config.prefix,
    componentName: config.componentName,
  }),
});

/**
 * Configuration presets for common use cases
 */
export const configPresets = {
  /**
   * High performance configuration for large datasets
   */
  highPerformance: (): Partial<ListManagerConfig> => ({
    virtual: {
      enabled: true,
      overscan: 5,
      windowSize: 20,
    },
    recycling: {
      enabled: true,
      maxPoolSize: 200,
      minPoolSize: 20,
    },
    performance: {
      enabled: true,
      frameScheduling: true,
      memoryCleanup: true,
      fpsMonitoring: true,
      trackFPS: true,
      trackMemory: true,
    },
    intersection: {
      pagination: { enabled: true },
      loading: { enabled: true },
      preload: { enabled: true, prefetchPages: 3 },
    },
  }),

  /**
   * Simple configuration for small datasets
   */
  simple: (): Partial<ListManagerConfig> => ({
    virtual: {
      enabled: false,
    },
    recycling: {
      enabled: false,
    },
    performance: {
      enabled: false,
    },
    intersection: {
      pagination: { enabled: false },
      loading: { enabled: false },
      preload: { enabled: false },
    },
  }),

  /**
   * Balanced configuration for medium datasets
   */
  balanced: (): Partial<ListManagerConfig> => ({
    virtual: {
      enabled: true,
      overscan: 3,
      windowSize: 15,
    },
    recycling: {
      enabled: true,
      maxPoolSize: 100,
      minPoolSize: 10,
    },
    performance: {
      enabled: true,
      frameScheduling: true,
      memoryCleanup: false,
      fpsMonitoring: false,
    },
    intersection: {
      pagination: { enabled: true },
      loading: { enabled: true },
      preload: { enabled: false },
    },
  }),
};

/**
 * Configuration debugging utilities
 */
export const configDebug = {
  /**
   * Logs configuration details
   */
  logConfig: (config: Required<ListManagerConfig>): void => {
    if (!config.debug) return;

    console.group("🔧 [LIST-MANAGER] Configuration Details");
    console.log("📦 Virtual Scrolling:", config.virtual);
    console.log("♻️ Element Recycling:", config.recycling);
    console.log("📏 Scroll Behavior:", config.scroll);
    console.log("👀 Intersection:", config.intersection);
    console.log("⚡ Performance:", config.performance);
    console.log("📐 Height Measurement:", config.heightMeasurement);
    console.log("🧭 Orientation:", config.orientation);
    console.groupEnd();
  },

  /**
   * Validates configuration and reports issues
   */
  validateAndReport: (config: ListManagerConfig): string[] => {
    const issues: string[] = [];

    try {
      const fullConfig = createListManagerConfig(config);
      console.log("✅ Configuration validation passed");
      return issues;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      issues.push(message);
      console.error("❌ Configuration validation failed:", message);
      return issues;
    }
  },
};

export default createListManagerConfig;
