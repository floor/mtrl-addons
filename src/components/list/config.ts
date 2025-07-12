/**
 * mtrl-addons List Component Configuration
 *
 * Configuration utilities and defaults for the list component.
 * Follows mtrl patterns for component configuration.
 */

import {
  createComponentConfig,
  createElementConfig as coreCreateElementConfig,
} from "mtrl/src/core/config/component";
import { LIST_DEFAULTS, LIST_CLASSES } from "./constants";
import type { ListConfig, ListItem } from "./types";
import type { ListComponent } from "./types";
import { DATA_PAGINATION } from "../../core/collection/constants";
import { VIRTUAL_SCROLLING } from "../../core/list-manager/constants";
import {
  convertRenderItemToTemplate,
  getDefaultTemplate,
} from "../../core/list-manager/features/viewport/template";

/**
 * Default configuration for the mtrl-addons List component
 */
export const defaultConfig: Partial<ListConfig> = {
  // Collection settings (for API-connected lists)
  adapter: undefined,

  // Static data (for in-memory lists)
  items: [],

  // Template settings
  template: undefined, // Will use default template if not provided

  // Selection settings
  selection: {
    enabled: false,
    mode: "none",
    selectedIndices: [],
  },

  // Scroll settings
  scroll: {
    virtual: true,
    itemSize: "auto",
    estimatedItemSize: 50,
    overscan: 5,
    animation: false,
    restorePosition: false,
  },

  // Component settings
  className: LIST_CLASSES.BASE,
  prefix: "mtrl",
  componentName: "list",
  ariaLabel: "List",
  debug: false,
};

/**
 * Creates the base configuration for List component
 * @param {ListConfig} config - User provided configuration
 * @returns {ListConfig} Complete configuration with defaults applied
 */
export function createBaseConfig<T extends ListItem = ListItem>(
  config: ListConfig<T> = {}
): Required<ListConfig<T>> {
  console.log("🔧 [MTRL-ADDONS-LIST] Creating base configuration");

  // Validate required configuration
  if (!config.items && !config.adapter) {
    throw new Error(
      "List requires either static items or an adapter for data loading"
    );
  }

  // If static items are provided but no template, we'll use the default template
  if (Array.isArray(config.items) && !config.template) {
    console.log(
      "📝 [MTRL-ADDONS-LIST] Using default template for static items"
    );
  }

  // Use mtrl core config system for proper merging and validation
  const mergedConfig = createComponentConfig(defaultConfig, config, "list");

  // Convert renderItem object to template function if provided
  if (
    (config as any).renderItem &&
    typeof (config as any).renderItem === "object" &&
    !mergedConfig.template
  ) {
    console.log(
      "🔄 [MTRL-ADDONS-LIST] Converting renderItem object to template function"
    );
    mergedConfig.template = convertRenderItemToTemplate(
      (config as any).renderItem
    );
  }

  // Validate selection configuration
  if (
    mergedConfig.selection?.enabled &&
    mergedConfig.selection?.mode === undefined
  ) {
    mergedConfig.selection.mode = "single";
  }

  console.log("✅ [MTRL-ADDONS-LIST] Base configuration created");
  return mergedConfig as Required<ListConfig<T>>;
}

/**
 * Creates element configuration for withElement
 * @param {ListConfig} config - List configuration
 * @returns {Object} Element configuration
 */
export function getElementConfig<T extends ListItem = ListItem>(
  config: ListConfig<T>
): any {
  const attributes = {
    "data-component": "list",
    "data-addons": "true",
    role: "list",
    "aria-label": config.ariaLabel || "List",
  };

  // Create element config using mtrl core system
  return coreCreateElementConfig(config, {
    tag: "div",
    attributes,
    className: [LIST_CLASSES.BASE, LIST_CLASSES.ADDONS], // Clean: list list-addons
  });
}

/**
 * Creates API configuration for the List component
 * @param {Object} component - Component with list functionality
 * @returns {Object} API configuration object for withApi
 */
export function getApiConfig<T extends ListItem = ListItem>(component: any) {
  return {
    // Data operations
    data: {
      add: component.add,
      update: component.update,
      remove: component.remove,
      clear: component.clear,
      refresh: component.refresh,
      getItems: component.getItems,
      getItem: component.getItem,
      query: component.query,
      sort: component.sort,
      getSize: component.getSize,
      isEmpty: component.isEmpty,
      isLoading: component.isLoading,
      getError: component.getError,
    },

    // Selection operations (if enabled)
    selection: component.config?.selection?.enabled
      ? {
          selectItem: component.selectItem,
          deselectItem: component.deselectItem,
          selectAll: component.selectAll,
          deselectAll: component.deselectAll,
          getSelectedItems: component.getSelectedItems,
          getSelectedIds: component.getSelectedIds,
        }
      : undefined,

    // Scrolling operations
    scrolling: {
      scrollToItem: component.scrollToItem,
      scrollToIndex: component.scrollToIndex,
      scrollToPage: component.scrollToPage,
    },

    // Performance operations
    performance: {
      getMetrics: component.getMetrics,
      resetMetrics: component.resetMetrics,
    },

    // Template operations
    template: {
      setTemplate: component.setTemplate,
      getTemplate: component.getTemplate,
    },

    // Events system
    events: {
      on: component.on,
      off: component.off,
      emit: component.emit,
      subscribe: component.subscribe,
    },

    // Lifecycle operations
    lifecycle: {
      destroy: component.destroy,
    },

    // Configuration access
    config: {
      selection: component.config?.selection,
      scroll: component.config?.scroll,
    },
  };
}

/**
 * Validates list configuration
 */
export const validateConfig = (config: ListConfig): void => {
  // Validate container
  if (config.container) {
    if (typeof config.container === "string") {
      const element = document.querySelector(config.container);
      if (!element) {
        throw new Error(
          `List container element not found: ${config.container}`
        );
      }
    } else if (!(config.container instanceof HTMLElement)) {
      throw new Error(
        "List container must be an HTMLElement or CSS selector string"
      );
    }
  }

  // Validate template
  if (config.template && typeof config.template !== "function") {
    throw new Error("List template must be a function");
  }

  // Validate items
  if (config.items && !Array.isArray(config.items)) {
    throw new Error("List items must be an array");
  }

  // Validate selection mode
  if (
    config.selection?.mode &&
    !["single", "multiple", "none"].includes(config.selection.mode)
  ) {
    throw new Error(
      'List selection mode must be "single", "multiple", or "none"'
    );
  }

  // Validate scroll configuration
  if (
    config.scroll?.itemSize !== "auto" &&
    typeof config.scroll?.itemSize === "number" &&
    config.scroll.itemSize <= 0
  ) {
    throw new Error('List item size must be positive number or "auto"');
  }

  // Validate density
  if (
    config.density &&
    !["default", "compact", "comfortable"].includes(config.density)
  ) {
    throw new Error(
      'List density must be "default", "compact", or "comfortable"'
    );
  }

  // Validate variant
  if (
    config.variant &&
    !["default", "dense", "comfortable"].includes(config.variant)
  ) {
    throw new Error(
      'List variant must be "default", "dense", or "comfortable"'
    );
  }
};

/**
 * Creates Collection configuration from List config
 */
export const getCollectionConfig = (config: ListConfig) => ({
  adapter: config.adapter,
  items: config.items,
  pageSize: config.collection?.limit || DATA_PAGINATION.DEFAULT_PAGE_SIZE,
  cache: config.collection?.cache || {
    enabled: true,
    maxSize: 1000,
    ttl: 300000, // 5 minutes
  },
});

/**
 * Creates List Manager configuration from List config
 */
export const getListManagerConfig = (config: ListConfig) => ({
  // Container
  container: config.container,

  // Collection configuration
  collection: getCollectionConfig(config),

  // Template configuration
  template: {
    template: config.template,
  },

  // Component prefix
  prefix: config.prefix || "mtrl",

  // Orientation configuration
  orientation: {
    orientation: config.orientation?.orientation || "vertical",
    autoDetect: config.orientation?.autoDetect || false,
    reverse: config.orientation?.reverse || false,
    crossAxisAlignment: config.orientation?.crossAxisAlignment || "stretch",
  },

  // Virtual scrolling
  virtual: {
    enabled: config.scroll?.virtual ?? true,
    itemSize: config.scroll?.itemSize ?? "auto",
    estimatedItemSize: config.scroll?.estimatedItemSize ?? 50,
    overscan: config.scroll?.overscan ?? VIRTUAL_SCROLLING.DEFAULT_OVERSCAN,
    ...config.listManager?.virtual,
  },

  // Element recycling
  recycling: {
    enabled: config.listManager?.recycling?.enabled ?? true,
    maxPoolSize: config.listManager?.recycling?.maxPoolSize ?? 100,
    minPoolSize: config.listManager?.recycling?.minPoolSize ?? 10,
    ...config.listManager?.recycling,
  },

  // Intersection observers
  intersection: {
    pagination: {
      enabled: true,
      rootMargin: "200px",
      threshold: 0.1,
      ...config.listManager?.intersection?.pagination,
    },
    loading: {
      enabled: true,
      ...config.listManager?.intersection?.loading,
    },
  },

  // Performance configuration
  performance: {
    frameScheduling: true,
    memoryCleanup: true,
    ...config.listManager?.performance,
  },

  // Debug and styling
  debug: config.debug || false,
  componentName: "list-manager",
});
