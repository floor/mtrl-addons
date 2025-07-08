/**
 * mtrl-addons List Component
 *
 * Next-generation list component built on the collection system.
 * Uses mtrl's compose system with addons-specific features.
 * Follows mtrl patterns for component architecture.
 */

import type {
  ListConfig,
  ListComponent,
  ListItem,
  ListPerformanceMetrics,
} from "./types";

// Import mtrl compose system
import {
  pipe,
  createBase,
  withElement,
  withEvents,
  withLifecycle,
  withCollection,
  withStyling,
  withSelection,
  withPerformance,
} from "../../core/compose";

// Import list-specific utilities
import { withApi } from "./features/api";
import { createBaseConfig, getElementConfig } from "./config";
import { LIST_CLASSES } from "./constants";
import { withListManager } from "./features/list-manager";
import { withAPI, getApiConfig } from "./api";

/**
 * Creates list-specific configuration from user config
 */
function createListConfig<T extends ListItem = ListItem>(
  config: ListConfig<T>
) {
  return {
    ...config,
    componentName: "list",
    prefix: "mtrl",
    className: config.className || "addons-list",
    ariaLabel: config.ariaLabel || "List",
    interactive: true, // Enable touch support
  };
}

/**
 * Default list item template
 */
function getDefaultListTemplate() {
  return {
    tag: "div",
    className: "mtrl-list-item",
    attributes: { "data-id": "{{id}}", role: "listitem" },
    children: [
      {
        tag: "div",
        className: "mtrl-list-item__content",
        textContent: "{{name || id}}",
      },
    ],
  };
}

/**
 * Creates a new List component using the 3-layer architecture
 *
 * The List component provides high-performance virtual scrolling with:
 * - Collection (Data Layer): Pure data management with API integration
 * - List Manager (Performance Layer): Virtual scrolling, element recycling
 * - List Component (Presentation Layer): mtrl integration and user interface
 *
 * This component supports both static data and API-driven dynamic data with
 * infinite scrolling, intelligent caching, and optimal DOM performance.
 *
 * @param {ListConfig<T>} config - List configuration options
 * @returns {ListComponent<T>} A fully configured list component instance
 *
 * @throws {Error} If list creation fails due to invalid configuration
 *
 * @example
 * ```typescript
 * // Create a simple static list
 * const simpleList = createList({
 *   items: ['Apple', 'Banana', 'Cherry'],
 *   container: '#my-list'
 * });
 *
 * // Create an API-driven list with virtual scrolling
 * const apiList = createList({
 *   collection: {
 *     baseUrl: 'https://api.example.com',
 *     endpoint: '/items',
 *     pageSize: 50
 *   },
 *   scroll: {
 *     virtual: true,
 *     itemSize: 60,
 *     overscan: 5
 *   },
 *   selection: {
 *     enabled: true,
 *     mode: 'multiple'
 *   },
 *   template: (item, index) => `
 *     <div class="item">
 *       <h3>${item.title}</h3>
 *       <p>${item.description}</p>
 *     </div>
 *   `,
 *   on: {
 *     onItemClick: (item, index) => {
 *       console.log('Clicked:', item);
 *     },
 *     onLoadMore: async (direction) => {
 *       console.log('Load more:', direction);
 *     }
 *   }
 * });
 *
 * // Add to DOM
 * document.querySelector('#app').appendChild(apiList.element);
 *
 * // Use API methods
 * await apiList.loadData();
 * apiList.selectItems([0, 1, 2]);
 * await apiList.scrollToIndex(100);
 * ```
 *
 * @category Components
 * @module components/list
 */
export const createList = <T = any>(
  config: ListConfig<T> = {}
): ListComponent<T> => {
  try {
    // Validate and create base configuration
    const baseConfig = createBaseConfig(config as any);

    console.log(`📋 Creating List component with simplified architecture:
    - List Manager (with built-in Collection): ${
      baseConfig.items && baseConfig.items.length > 0 ? "Static" : "API"
    } data source
    - Virtual scrolling: true, Element recycling: true
    - Template: ${!!baseConfig.template}, Selection: ${!!baseConfig.selection
      ?.enabled}`);

    // Create the List component through functional composition
    const component = pipe(
      // 1. Foundation layer
      createBase, // Base component with event system
      withEvents(), // Event handling capabilities
      withElement(getElementConfig(baseConfig)), // DOM element creation

      // 2. Core integration layer
      withListManager<T>(baseConfig as any), // Simplified List Manager with built-in Collection

      // 3. Component lifecycle
      withLifecycle(), // Lifecycle management

      // 4. Public API layer
      (comp) => withAPI(getApiConfig(comp))(comp) // Clean public API
    )(baseConfig);

    // Set up initial event handlers from config
    if (baseConfig.on && typeof component.on === "function") {
      // Data events
      if (baseConfig.on.onLoadMore) {
        component.on("load:more", ({ direction }: { direction: string }) => {
          baseConfig.on!.onLoadMore!(direction as any);
        });
      }

      // Scroll events
      if (baseConfig.on.onScroll) {
        component.on(
          "scroll:change",
          ({
            scrollTop,
            direction,
          }: {
            scrollTop: number;
            direction: string;
          }) => {
            baseConfig.on!.onScroll!(scrollTop, direction as any);
          }
        );
      }

      // Viewport events
      if (baseConfig.on.onViewportChange) {
        component.on(
          "viewport:change",
          ({ visibleRange }: { visibleRange: any }) => {
            baseConfig.on!.onViewportChange!(visibleRange);
          }
        );
      }

      // Selection events
      if (baseConfig.on.onSelectionChange) {
        component.on(
          "selection:change",
          ({
            selectedItems,
            selectedIndices,
          }: {
            selectedItems: T[];
            selectedIndices: number[];
          }) => {
            baseConfig.on!.onSelectionChange!(
              selectedItems as any,
              selectedIndices
            );
          }
        );
      }

      // Item events are handled in orchestration layer
    }

    // Initialize component
    if (component.lifecycle?.init) {
      component.lifecycle.init();
    }

    console.log("✅ List component created successfully");
    return component as ListComponent<T>;
  } catch (error) {
    console.error("❌ List creation error:", error);
    throw new Error(`Failed to create list: ${(error as Error).message}`);
  }
};

/**
 * Export the main component creation function
 */
export default createList;
