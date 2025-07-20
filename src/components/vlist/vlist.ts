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

/**
 * Converts object-based template to function template
 */
function convertObjectTemplate(
  renderItem: any
): (item: any, index: number) => HTMLElement {
  return (item: any, index: number) => {
    // Create element from template definition
    const createElement = (def: any): HTMLElement => {
      const el = document.createElement(def.tag || "div");

      // Set className
      if (def.className) {
        el.className = def.className;
      }

      // Set attributes
      if (def.attributes) {
        Object.entries(def.attributes).forEach(([key, value]) => {
          if (typeof value === "string") {
            // Replace template variables
            const processedValue = value.replace(
              /\{\{(\w+)\}\}/g,
              (match: string, prop: string) => {
                if (prop === "index") return String(index);
                return String(item[prop] || "");
              }
            );
            el.setAttribute(key, processedValue);
          }
        });
      }

      // Set text content
      if (def.textContent) {
        el.textContent = def.textContent.replace(
          /\{\{(\w+)\}\}/g,
          (match, prop) => {
            if (prop === "index") return String(index);
            return String(item[prop] || "");
          }
        );
      }

      // Process children
      if (def.children && Array.isArray(def.children)) {
        def.children.forEach((childDef: any) => {
          el.appendChild(createElement(childDef));
        });
      }

      return el;
    };

    return createElement(renderItem);
  };
}

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
      ((oldConfig as any).renderItem &&
      typeof (oldConfig as any).renderItem === "object"
        ? convertObjectTemplate((oldConfig as any).renderItem)
        : (oldConfig as any).renderItem),

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
    paginationStrategy: oldConfig.pagination?.strategy || "page",
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

    // Apply transform function if provided
    if (vlistConfig.transform && vlistConfig.collection) {
      console.log("📊 [VLIST] Applying transform function to collection");
      const originalRead = vlistConfig.collection.read;
      vlistConfig.collection.read = async (params: any) => {
        console.log("🔄 [VLIST] Collection read called with params:", params);
        try {
          const result = await originalRead.call(
            vlistConfig.collection,
            params
          );
          console.log("📦 [VLIST] Collection read result:", result);
          if (result && result.items && vlistConfig.transform) {
            console.log(`✨ [VLIST] Transforming ${result.items.length} items`);
            result.items = result.items.map(vlistConfig.transform);
          }
          return result;
        } catch (error) {
          console.error("❌ [VLIST] Collection read error:", error);
          throw error;
        }
      };
    }

    // Create the component through functional composition
    const component = pipe(
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
      withAPI(vlistConfig)
    )({
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
