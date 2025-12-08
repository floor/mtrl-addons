// src/components/vlist/features/viewport.ts

/**
 * Viewport feature for VList
 * Integrates the core viewport functionality with VList component
 */

import type { VListConfig, VListItem } from "../types";
import { createViewport } from "../../../core/viewport";

/**
 * Adds viewport functionality to VList
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

    // Ensure the element has both vlist and viewport classes
    const viewportConfig = {
      ...config,
      className: "mtrl-viewport", // This will be added by viewport base feature
    };

    // Pass VList config directly to viewport
    const viewportEnhanced = createViewport(viewportConfig as any)(component);

    // Handle parent element if provided
    if (config.parent || config.container) {
      const container = config.parent || config.container;
      const element =
        typeof container === "string"
          ? document.querySelector(container)
          : container;

      if (element && viewportEnhanced.element) {
        element.appendChild(viewportEnhanced.element);

        // Ensure viewport is initialized after DOM attachment
        if (viewportEnhanced.viewport && viewportEnhanced.viewport.initialize) {
          // console.log("📋 [VList] Initializing viewport after DOM attachment");
          viewportEnhanced.viewport.initialize();
        }
      }
    }

    return viewportEnhanced;
  };
};
