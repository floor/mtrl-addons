// src/components/vlist/features/viewport.ts

/**
 * Viewport feature for VList
 * Integrates the core viewport functionality with VList component
 *
 * When used with withLayout, this feature respects the viewport container
 * defined in the layout schema, rendering virtual scrolling content inside it.
 */

import type { VListConfig, VListItem } from "../types";
import { createViewport } from "../../../core/viewport";

/**
 * Adds viewport functionality to VList
 *
 * This feature:
 * 1. Configures the viewport for virtual scrolling
 * 2. When withLayout is used, renders into the layout's viewport container
 * 3. Handles parent/container attachment for standalone usage
 */
export const withViewport = <T extends VListItem = VListItem>(
  config: VListConfig<T>,
) => {
  return (component: any) => {
    // Set initial items if provided
    if (config.items) {
      component.items = config.items;
      component.totalItems = config.items.length;
    }

    // Set template if provided
    if (config.template) {
      component.template = config.template;
    }

    // Check if withLayout has set a viewport container
    // This is set by withLayout when processing ['viewport'] in the layout schema
    const viewportContainer = component._viewportContainer as
      | HTMLElement
      | undefined;

    // When layout is used, we need to tell the viewport to use
    // the layout's viewport container instead of creating its own
    const viewportConfig = {
      ...config,
      className: "mtrl-viewport",
    };

    // If we have a viewport container from layout, we need to:
    // 1. Use that container as the element for viewport creation
    // 2. The viewport base feature will create its structure inside it
    let viewportEnhanced: any;

    if (viewportContainer) {
      // When layout provides viewport container, create viewport using it
      // We temporarily swap the element so viewport renders inside the container
      const originalElement = component.element;

      // Create a component context that uses the viewport container as its element
      const viewportComponent = {
        ...component,
        element: viewportContainer,
      };

      // Create viewport - it will build its structure inside viewportContainer
      viewportEnhanced = createViewport(viewportConfig as any)(
        viewportComponent,
      );

      // Restore the original root element reference
      // The VList's element should remain the root (mtrl-vlist)
      // but the viewport internals are now inside the layout's viewport container
      viewportEnhanced.element = originalElement;

      // Store reference to the actual viewport container for features that need it
      viewportEnhanced._viewportContainer = viewportContainer;

      // Initialize viewport now that DOM structure is ready
      if (viewportEnhanced.viewport && viewportEnhanced.viewport.initialize) {
        viewportEnhanced.viewport.initialize();
      }
    } else {
      // Standard behavior - no layout, viewport manages its own container
      viewportEnhanced = createViewport(viewportConfig as any)(component);

      // Handle parent element if provided (standalone usage without layout)
      if (config.parent || config.container) {
        const container = config.parent || config.container;
        const element =
          typeof container === "string"
            ? document.querySelector(container)
            : container;

        if (element && viewportEnhanced.element) {
          element.appendChild(viewportEnhanced.element);

          // Ensure viewport is initialized after DOM attachment
          if (
            viewportEnhanced.viewport &&
            viewportEnhanced.viewport.initialize
          ) {
            viewportEnhanced.viewport.initialize();
          }
        }
      }
    }

    return viewportEnhanced;
  };
};
