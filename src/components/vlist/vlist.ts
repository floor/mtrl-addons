// src/components/vlist/vlist.ts

/**
 * VList Component - Virtual List with direct viewport integration
 *
 * A simplified virtual list that uses the viewport feature directly
 * without the list-manager abstraction layer.
 */

import type { VListConfig, VListComponent, ListConfig } from "./types";

// Import mtrl compose system
import { pipe } from "mtrl/src/core/compose/pipe";
import { createBase, withElement } from "mtrl/src/core/compose/component";
import { withEvents, withLifecycle } from "mtrl/src/core/compose/features";

// Import viewport feature
import { withViewport } from "./features/viewport";
import { withAPI } from "./features/api";
import { withSelection } from "./features/selection";

/**
 * Transforms old list config to VList config
 */
function transformConfig<T = any>(
  config: ListConfig<T> | VListConfig<T>
): VListConfig<T> {
  // If it's already a VListConfig format, return as is
  if (
    "estimatedItemSize" in config ||
    !("scroll" in config || "pagination" in config)
  ) {
    return config as VListConfig<T>;
  }

  // Transform old list config to VList config
  const oldConfig = config as ListConfig<T>;
  const vlistConfig: VListConfig<T> = {
    // Basic properties
    container: oldConfig.container || (oldConfig as any).parent,
    items: oldConfig.items,
    className: oldConfig.className || (oldConfig as any).class,
    ariaLabel: oldConfig.ariaLabel,
    prefix: oldConfig.prefix,
    debug: oldConfig.debug,

    // Template/rendering
    template:
      oldConfig.template ||
      (oldConfig as any).renderItem ||
      (oldConfig as any).template,

    // Scroll configuration
    estimatedItemSize:
      oldConfig.scroll?.estimatedItemSize ||
      (typeof oldConfig.scroll?.itemSize === "number"
        ? oldConfig.scroll.itemSize
        : 84),
    overscan: oldConfig.scroll?.overscan || 2,
    orientation: oldConfig.orientation?.orientation || "vertical",

    // Collection/adapter configuration
    collection: oldConfig.adapter,
    rangeSize: oldConfig.pagination?.limit || 20,
    paginationStrategy:
      oldConfig.pagination?.strategy === "cursor" ? "cursor" : "page",
    enablePlaceholders:
      (oldConfig.collection as any)?.enablePlaceholders !== false,

    // Transform function
    transform: (oldConfig as any).transform,

    // Performance settings
    performance: (oldConfig as any).performance,

    // Selection settings
    selection: oldConfig.selection,

    // Scroll settings
    scroll: oldConfig.scroll,
  };

  return vlistConfig;
}

/**
 * Creates a new VList component using direct viewport integration
 * Accepts both old list config and new VList config formats
 *
 * @param {ListConfig | VListConfig} config - List configuration options
 * @returns {VListComponent} A fully configured virtual list component
 *
 * @example
 * ```typescript
 * // Old list format (backwards compatible)
 * const list = createVList({
 *   parent: '#my-list',
 *   adapter: myAdapter,
 *   pagination: { strategy: 'page', limit: 20 },
 *   scroll: { animation: true }
 * });
 *
 * // New VList format
 * const vlist = createVList({
 *   container: '#my-list',
 *   collection: myAdapter,
 *   rangeSize: 20,
 *   paginationStrategy: 'page'
 * });
 * ```
 */
export const createVList = <T = any>(
  config: ListConfig<T> | VListConfig<T> = {}
): VListComponent<T> => {
  try {
    console.log(`📋 Creating VList component with direct viewport integration`);

    // Transform config if needed
    const vlistConfig = transformConfig(config);

    // Note: Transform should be applied by the collection feature in viewport
    // VList should not intercept collection reads as it bypasses the loading manager

    // Create the component through functional composition
    const enhancers = [
      // 1. Foundation layer
      createBase,
      withEvents(),
      withElement({
        tag: "div",
        className: vlistConfig.className || "mtrl-vlist",
        attributes: {
          role: "list",
          "aria-label": vlistConfig.ariaLabel || "Virtual List",
        },
      }),

      // 2. Viewport integration
      withViewport(vlistConfig),

      // 3. Component lifecycle
      withLifecycle(),

      // 4. Public API layer
      withAPI(vlistConfig),
    ];

    // 4.5. Selection capabilities (if enabled) - must be after API
    if (vlistConfig.selection?.enabled) {
      enhancers.push(withSelection(vlistConfig));
    }

    const component = pipe(...enhancers)({
      ...vlistConfig,
      componentName: "vlist",
      prefix: vlistConfig.prefix || "mtrl",
    });

    return component as VListComponent<T>;
  } catch (error) {
    console.error("❌ [VLIST] Failed to create VList component:", error);
    throw error;
  }
};
