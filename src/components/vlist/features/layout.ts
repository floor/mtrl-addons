// src/components/vlist/features/layout.ts

/**
 * Layout feature for VList
 *
 * Processes a layout schema and builds the complete UI structure around
 * the virtual scrolling viewport. This enables VList to manage its own
 * layout (header, filters, search, viewport, footer) without requiring
 * a complex wrapper with functional composition.
 *
 * @example
 * ```typescript
 * const vlist = createVList({
 *   container: document.getElementById('app'),
 *   class: 'users',
 *   layout: [
 *     ['head', { class: 'head' },
 *       ['title', { text: 'Users' }]
 *     ],
 *     ['viewport'],
 *     ['foot', { class: 'foot' },
 *       ['count', { text: '0' }]
 *     ]
 *   ],
 *   template: userTemplate,
 *   collection: { adapter: { read: fetchUsers } }
 * })
 *
 * // Access layout elements via flat map
 * vlist.layout.title.textContent = 'Users (1,245)'
 * vlist.layout.count.textContent = '1,245'
 * ```
 */

import type { VListConfig, VListItem } from "../types";
import { createLayout } from "../../../core/layout";

/**
 * Helper to check if a value is a component-like object
 */
const isComponent = (value: unknown): value is { element: HTMLElement } => {
  return (
    value !== null &&
    typeof value === "object" &&
    "element" in value &&
    (value as any).element instanceof HTMLElement
  );
};

/**
 * Gets the DOM element from a component or element
 */
const getElement = (value: unknown): HTMLElement | null => {
  if (value instanceof HTMLElement) {
    return value;
  }
  if (isComponent(value)) {
    return value.element;
  }
  return null;
};

/**
 * Layout schema type - array-based schema compatible with createLayout
 */
export type LayoutSchema = any[];

/**
 * Layout result - flat map of all named elements from the layout
 */
export interface LayoutResult {
  [key: string]: any;
}

/**
 * Adds layout functionality to VList
 *
 * This feature:
 * 1. Processes the layout schema using createLayout
 * 2. Renders the layout inside the VList's root element
 * 3. Finds the 'viewport' element where virtual scrolling will render
 * 4. Exposes all named elements via vlist.layout flat map
 *
 * @param config - VList configuration with optional layout schema
 * @returns Feature function that enhances the VList component
 */
export const withLayout = <T extends VListItem = VListItem>(
  config: VListConfig<T> & { layout?: LayoutSchema },
) => {
  return (component: any): any => {
    // Skip if no layout provided - maintain backward compatibility
    if (!config.layout || !Array.isArray(config.layout)) {
      return component;
    }

    // Ensure component has an element to render layout into
    if (!component.element) {
      console.warn("[VList] withLayout requires component.element to exist");
      return component;
    }

    // Process layout schema and render into component's element
    const layoutResult = createLayout(config.layout, component.element);

    // Get the flat map of all named components
    const layoutComponents = layoutResult.component || layoutResult.layout || {};

    // Find the viewport element - this is where virtual scrolling will render
    const viewportEntry = layoutComponents.viewport;
    const viewportContainer = getElement(viewportEntry);

    if (!viewportContainer) {
      console.warn(
        "[VList] Layout schema must include a viewport element. " +
        "Add [\"viewport\"] to your layout schema to mark where virtual scrolling should render."
      );
      // Continue without viewport - layout still works for display purposes
    } else {
      // Store viewport container for withViewport to use
      // This allows the viewport feature to render items into the correct element
      component._viewportContainer = viewportContainer;

      // Add viewport class if not already present
      if (!viewportContainer.classList.contains("mtrl-viewport-container")) {
        viewportContainer.classList.add("mtrl-viewport-container");
      }
    }

    // Store layout destroy function for cleanup
    const layoutDestroy = layoutResult.destroy?.bind(layoutResult);

    // Enhance component with layout reference
    return {
      ...component,

      /**
       * Flat map of all named layout elements
       * Access elements by their name: vlist.layout.title, vlist.layout.count, etc.
       */
      layout: layoutComponents,

      /**
       * Get a specific layout element by name
       */
      getLayoutElement(name: string): any {
        return layoutComponents[name] ?? null;
      },

      /**
       * Enhanced destroy that also cleans up layout
       */
      destroy(): void {
        // Call layout destroy first
        if (layoutDestroy) {
          try {
            layoutDestroy();
          } catch (e) {
            // Ignore layout destroy errors
          }
        }

        // Call original destroy if it exists
        if (typeof component.destroy === "function") {
          component.destroy();
        }
      },
    };
  };
};

/**
 * Type helper for VList with layout
 */
export interface WithLayoutComponent {
  /** Flat map of all named layout elements */
  layout: LayoutResult;
  /** Get a specific layout element by name */
  getLayoutElement(name: string): any;
}
