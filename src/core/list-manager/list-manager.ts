/**
 * List Manager - Performance and UI Management Layer
 * Pure virtual scrolling with functional composition
 */

import { pipe } from "mtrl/src/core/compose";
import { createBase } from "mtrl/src/core/compose";
import { withEvents } from "mtrl/src/core/compose/features/events";
import type { ListManagerConfig } from "./types";
import { LIST_MANAGER_CONSTANTS } from "./constants";

// Import all enhancers from new clean structure
import {
  withViewport,
  withSpeedTracking,
  withPlaceholders,
} from "./features/viewport";
import { withCollection } from "./features/collection";

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

/**
 * Creates the base List Manager component
 * Small factory function following mtrl patterns
 */
export const createListManager = (
  config: ListManagerConfig
): ListManagerComponent => {
  // Create mtrl base component
  const base = createBase({
    ...config,
    componentName: "list-manager",
    prefix: config.prefix || "mtrl",
  });

  // Ensure we have a container element
  if (!config.container) {
    throw new Error("List Manager requires a container element");
  }

  return {
    ...base,

    // Override to ensure componentName is always string
    componentName: "list-manager",

    // Core properties
    element: config.container,
    items: config.items || [],
    totalItems: (config as any).totalItems || 0, // Handle totalItems not being in config type
    template: config.template?.template || null,

    // Configuration
    config: {
      ...LIST_MANAGER_CONSTANTS,
      ...config,
    },

    // State
    isInitialized: false,
    isDestroyed: false,

    // Core methods
    initialize(): void {
      if (this.isInitialized) return;

      // Setup container
      this.element.style.position = "relative";
      this.element.style.overflow = "hidden";

      this.isInitialized = true;
      this.emit?.("initialized", { config: this.config });
    },

    destroy(): void {
      if (this.isDestroyed) return;

      this.isInitialized = false;
      this.isDestroyed = true;
      this.emit?.("destroyed", { reason: "manual-destroy" });
    },

    // Configuration updates
    updateConfig(newConfig: Partial<ListManagerConfig>): void {
      this.config = { ...this.config, ...newConfig };
      this.emit?.("config-updated", { config: this.config });
    },

    getConfig(): ListManagerConfig {
      return { ...this.config };
    },
  };
};

/**
 * Main factory function using pipe composition with all Phase 1 enhancers
 * This is how List Manager should be created
 */
export const listManager = (config: ListManagerConfig) => {
  return pipe(
    createListManager,
    withEvents(), // Add event system first
    withViewport({
      orientation: config.orientation?.orientation || "vertical",
      estimatedItemSize: config.virtual?.estimatedItemSize || 50,
      overscan: config.virtual?.overscan || 5,
      enableScrollbar: true,
    }),
    withCollection({
      collection: config.collection?.adapter || config.collection, // Support both nested and direct adapter
      rangeSize: config.collection?.limit || 20,
      strategy: config.collection?.strategy || "page",
      fastThreshold: 1000,
      slowThreshold: 100,
      enablePlaceholders: true,
    }),
    withSpeedTracking({
      measurementWindow: 100,
      decelerationFactor: 0.95,
      enabled: true,
    }),
    withPlaceholders({
      enabled: true,
      maskCharacter: "░",
      analyzeAfterInitialLoad: true,
      randomLengthVariance: true,
      mode: "masked",
    })
  )(config);
};

/**
 * Create List Manager with custom enhancer configuration
 * For advanced users who want to customize enhancer behavior
 */
export const createCustomListManager = (
  config: ListManagerConfig,
  enhancerConfigs: {
    viewport?: Parameters<typeof withViewport>[0];
    collection?: Parameters<typeof withCollection>[0];
    speedTracking?: Parameters<typeof withSpeedTracking>[0];
    placeholders?: Parameters<typeof withPlaceholders>[0];
  } = {}
) => {
  return pipe(
    createListManager,
    withViewport(enhancerConfigs.viewport || {}),
    withCollection(enhancerConfigs.collection || {}),
    withSpeedTracking(enhancerConfigs.speedTracking || {}),
    withPlaceholders(enhancerConfigs.placeholders || {})
  )(config);
};

// Re-export enhancers for custom composition
export { withViewport, withCollection, withSpeedTracking, withPlaceholders };

// Re-export for convenience
export { pipe } from "mtrl/src/core/compose";
