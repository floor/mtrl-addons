/**
 * mtrl-addons List Component Configuration
 *
 * Configuration utilities and defaults for the list component.
 * Follows mtrl patterns for component configuration.
 */

import { LIST_DEFAULTS, LIST_CLASSES } from "./constants";
import type { ListConfig, ListItem } from "./types";
import type { ElementConfig } from "mtrl/src/core/compose";
import type { ListComponent } from "./types";
import { DATA_PAGINATION } from "../../core/collection/constants";
import { VIRTUAL_SCROLLING } from "../../core/list-manager/constants";

/**
 * Default configuration for the mtrl-addons List component
 */
export const defaultConfig: Partial<ListConfig> = {
  // Collection settings (for API-connected lists)
  adapter: undefined,
  transform: (item: any) => item,
  validate: (item: any) => true,

  // Static data (for in-memory lists)
  items: [],

  // Template settings
  template: undefined, // Will use default template if not provided
  templateEngine: "object",

  // Rendering settings
  initialCapacity: LIST_DEFAULTS.INITIAL_CAPACITY,

  // Selection settings
  selection: {
    enabled: false,
    multiple: false,
    selectableFilter: undefined,
  },

  // Styling settings
  listStyle: {
    itemHeight: "auto",
    gap: 0,
    padding: 0,
    striped: false,
    hoverable: true,
    bordered: false,
  },

  // Performance settings
  performance: {
    recycleElements: true,
    bufferSize: LIST_DEFAULTS.RENDER_BUFFER_SIZE,
    renderDebounce: LIST_DEFAULTS.RENDER_DEBOUNCE,
  },

  // Virtual scrolling settings
  virtualScroll: {
    enabled: false,
    strategy: "window-based",
    itemHeight: "auto",
  },

  // Component settings
  className: LIST_CLASSES.BASE,
  ariaLabel: "List",
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

  // Deep merge configuration with defaults
  const mergedConfig = {
    ...defaultConfig,
    ...config,

    // Deep merge nested objects
    selection: {
      ...defaultConfig.selection,
      ...config.selection,
    },

    listStyle: {
      ...defaultConfig.listStyle,
      ...config.listStyle,
    },

    performance: {
      ...defaultConfig.performance,
      ...config.performance,
    },

    virtualScroll: {
      ...defaultConfig.virtualScroll,
      ...config.virtualScroll,
    },
  } as Required<ListConfig<T>>;

  // Validate selection configuration
  if (
    mergedConfig.selection.enabled &&
    mergedConfig.selection.multiple === undefined
  ) {
    mergedConfig.selection.multiple = false;
  }

  console.log("✅ [MTRL-ADDONS-LIST] Base configuration created");
  return mergedConfig;
}

/**
 * Creates element configuration for withElement
 * @param {ListConfig} config - List configuration
 * @returns {Object} Element configuration
 */
export function getElementConfig<T extends ListItem = ListItem>(
  config: ListConfig<T>
): any {
  return {
    tag: "div",
    className: `${LIST_CLASSES.BASE} ${LIST_CLASSES.ADDONS}`, // Clean: list list-addons
    attributes: {
      "data-component": "list",
      "data-addons": "true",
      role: "list",
      "aria-label": config.ariaLabel || "List",
      ...(config.id && { id: config.id }),
    },
    // Fixed: Use 'parent' for DOM mounting (mtrl convention)
    parent: config.container || null,
    // Styling
    style: {
      position: "relative",
      overflow: "hidden",
      ...config.style,
    },
  };
}

/**
 * Creates API configuration for the List component
 * @param {Object} component - Component with list functionality
 * @param {ListConfig} config - Base configuration
 * @returns {Object} API configuration object for withApi
 */
export function getApiConfig<T extends ListItem = ListItem>(
  component: any,
  config: Required<ListConfig<T>>
) {
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
    selection: config.selection.enabled
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
      selection: config.selection,
      listStyle: config.listStyle,
      performance: config.performance,
      virtualScroll: config.virtualScroll,
    },
  };
}

export default defaultConfig;

/**
 * Default list configuration
 */
const DEFAULT_CONFIG: Partial<ListConfig> = {
  // Styling defaults
  prefix: "mtrl",
  componentName: "list",
  variant: "default",
  density: "default",

  // Orientation defaults
  orientation: {
    orientation: "vertical",
    autoDetect: false,
    reverse: false,
    crossAxisAlignment: "stretch",
  },

  // Scroll defaults
  scroll: {
    virtual: true,
    itemSize: "auto",
    estimatedItemSize: 50,
    overscan: VIRTUAL_SCROLLING.DEFAULT_OVERSCAN,
    smoothScroll: false,
    restorePosition: false,
  },

  // Selection defaults
  selection: {
    enabled: false,
    mode: "none",
    selectedIndices: [],
  },

  // Collection defaults
  collection: {
    pageSize: DATA_PAGINATION.DEFAULT_PAGE_SIZE,
    strategy: "page",
    cache: {
      enabled: true,
      maxSize: 1000,
      ttl: 300000, // 5 minutes
    },
  },

  // List Manager defaults
  listManager: {
    virtual: {
      enabled: true,
      itemHeight: "auto",
      estimatedItemHeight: 50,
      overscan: VIRTUAL_SCROLLING.DEFAULT_OVERSCAN,
    },
    recycling: {
      enabled: true,
      maxPoolSize: 100,
      minPoolSize: 10,
    },
    performance: {
      frameScheduling: true,
      memoryCleanup: true,
    },
  },

  // Accessibility
  ariaLabel: "List",

  // Debug
  debug: false,
};

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
export const getCollectionConfig = <T = any>(config: ListConfig<T>) => ({
  // Data configuration
  pageSize: config.collection?.pageSize || DATA_PAGINATION.DEFAULT_PAGE_SIZE,
  strategy: config.collection?.strategy || "page",

  // API configuration - check both top level and nested
  baseUrl: config.collection?.baseUrl,
  endpoint: config.collection?.endpoint,
  adapter: config.adapter || config.collection?.adapter,

  // Cache configuration
  cache: {
    enabled: config.collection?.cache?.enabled ?? true,
    maxSize: config.collection?.cache?.maxSize || 1000,
    ttl: config.collection?.cache?.ttl || 300000,
    ...config.collection?.cache,
  },

  // Persistence configuration
  persistence: config.collection?.persistence,

  // Data features
  validation: config.collection?.validation,
  transformation: config.collection?.transformation,

  // Static data
  items: config.items,

  // Debug
  debug: config.debug,
});

/**
 * Creates List Manager configuration from List config
 */
export const getListManagerConfig = (config: ListConfig) => ({
  // Container
  container: config.container,

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
    windowSize: config.listManager?.virtual?.windowSize,
    ...config.listManager?.virtual,
  },

  // Element recycling
  recycling: {
    enabled: config.listManager?.recycling?.enabled ?? true,
    maxPoolSize: config.listManager?.recycling?.maxPoolSize ?? 100,
    minPoolSize: config.listManager?.recycling?.minPoolSize ?? 10,
    ...config.listManager?.recycling,
  },

  // Scroll behavior
  scroll: {
    smooth: config.scroll?.smoothScroll ?? false,
    restore: config.scroll?.restorePosition ?? false,
    ...config.listManager?.scroll,
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

  // Performance features
  performance: {
    frameScheduling: config.listManager?.performance?.frameScheduling ?? true,
    memoryCleanup: config.listManager?.performance?.memoryCleanup ?? true,
    ...config.listManager?.performance,
  },

  // Debug
  debug: config.debug,
});

/**
 * Creates styling configuration
 */
export const getStylingConfig = (config: ListConfig) => ({
  prefix: config.prefix || "mtrl",
  componentName: config.componentName || "list",
  variant: config.variant || "default",
  density: config.density || "default",
  className: config.className,
});

/**
 * Gets default item template if none provided
 */
export const getDefaultTemplate = <T = any>(): ((
  item: T,
  index: number
) => string) => {
  return (item: T, index: number) => {
    if (typeof item === "string") {
      return `<div class="mtrl-list-item__content">${item}</div>`;
    }

    if (typeof item === "object" && item !== null) {
      // Try common properties
      const obj = item as any;
      const text =
        obj.text || obj.title || obj.name || obj.label || String(item);
      const subtitle = obj.subtitle || obj.description || obj.secondary;

      return `
        <div class="mtrl-list-item__content">
          <div class="mtrl-list-item__primary">${text}</div>
          ${
            subtitle
              ? `<div class="mtrl-list-item__secondary">${subtitle}</div>`
              : ""
          }
        </div>
      `;
    }

    return `<div class="mtrl-list-item__content">${String(item)}</div>`;
  };
};

/**
 * Gets loading template
 */
export const getLoadingTemplate = (config: ListConfig): string => {
  if (typeof config.loadingTemplate === "string") {
    return config.loadingTemplate;
  }

  if (typeof config.loadingTemplate === "function") {
    const result = config.loadingTemplate();
    return typeof result === "string" ? result : result.outerHTML;
  }

  return `
    <div class="mtrl-list__loading">
      <div class="mtrl-list__loading-spinner"></div>
      <div class="mtrl-list__loading-text">Loading...</div>
    </div>
  `;
};

/**
 * Gets empty template
 */
export const getEmptyTemplate = (config: ListConfig): string => {
  if (typeof config.emptyTemplate === "string") {
    return config.emptyTemplate;
  }

  if (typeof config.emptyTemplate === "function") {
    const result = config.emptyTemplate();
    return typeof result === "string" ? result : result.outerHTML;
  }

  return `
    <div class="mtrl-list__empty">
      <div class="mtrl-list__empty-icon">📋</div>
      <div class="mtrl-list__empty-text">No items to display</div>
    </div>
  `;
};

/**
 * Gets error template
 */
export const getErrorTemplate = (config: ListConfig, error: Error): string => {
  if (typeof config.errorTemplate === "string") {
    return config.errorTemplate;
  }

  if (typeof config.errorTemplate === "function") {
    const result = config.errorTemplate(error);
    return typeof result === "string" ? result : result.outerHTML;
  }

  return `
    <div class="mtrl-list__error">
      <div class="mtrl-list__error-icon">⚠️</div>
      <div class="mtrl-list__error-text">Error loading data</div>
      <div class="mtrl-list__error-message">${error.message}</div>
    </div>
  `;
};
