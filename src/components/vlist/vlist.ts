// src/components/vlist/vlist.ts

/**
 * VList Component - Virtual List with direct viewport integration
 *
 * A simplified virtual list that uses the viewport feature directly
 * without the list-manager abstraction layer.
 */

import type { VListConfig, VListComponent, VListItem } from "./types";

// Import mtrl compose system
import { pipe } from "mtrl";
import { createBase, withElement } from "mtrl";
import { withEvents, withLifecycle } from "mtrl";

// Import viewport feature
import { withViewport } from "./features/viewport";
import { withAPI } from "./features/api";
import { withSelection } from "./features/selection";

/**
 * Creates a new VList component using direct viewport integration
 *
 * @param {VListConfig} config - List configuration options
 * @returns {VListComponent} A fully configured virtual list component
 *
 * @example
 * ```typescript
 * const vlist = createVList({
 *   container: '#my-list',
 *   collection: myAdapter,
 *   rangeSize: 20,
 *   paginationStrategy: 'page',
 *   template: (item, index) => [
 *     { class: 'viewport-item', attributes: { 'data-id': item.id }},
 *     [{ class: 'viewport-item__name', text: item.name }],
 *     [{ class: 'viewport-item__value', text: item.value }]
 *   ]
 * });
 * ```
 */
export const createVList = <T extends VListItem = VListItem>(
  config: VListConfig<T> = {}
): VListComponent<T> => {
  try {
    // console.log(`📋 Creating VList component with direct viewport integration`);

    // Note: Transform should be applied by the collection feature in viewport
    // VList should not intercept collection reads as it bypasses the loading manager

    // Create the component through functional composition
    const enhancers = [
      // 1. Foundation layer
      createBase,
      withEvents(),
      withElement({
        tag: "div",
        className: config.className || "mtrl-vlist",
        attributes: {
          role: "list",
          "aria-label": config.ariaLabel || "Virtual List",
        },
      }),

      // 2. Viewport integration
      withViewport(config),

      // 3. Component lifecycle
      withLifecycle(),

      // 4. Public API layer
      withAPI(config),
    ];

    // 4.5. Selection capabilities (if enabled) - must be after API
    if (config.selection?.enabled) {
      enhancers.push(withSelection(config));
    }

    const component = pipe(...enhancers)({
      ...config,
      componentName: "vlist",
      prefix: config.prefix || "mtrl",
    });

    return component as VListComponent<T>;
  } catch (error) {
    console.error("❌ [VLIST] Failed to create VList component:", error);
    throw error;
  }
};
