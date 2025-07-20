// src/components/vlist/features/viewport.ts

/**
 * Viewport feature for VList
 * Integrates the core viewport functionality with VList component
 */

import type { VListConfig } from "../types";
import { createViewport } from "../../../core/viewport";

/**
 * Adds viewport functionality to VList
 */
export const withViewport = <T = any>(config: VListConfig<T>) => {
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

    // Pass VList config directly to viewport
    // The viewport will use the same config structure
    const viewportEnhanced = createViewport(config as any)(component);

    // Handle parent element if provided
    if (config.parent || config.container) {
      const container = config.parent || config.container;
      const element =
        typeof container === "string"
          ? document.querySelector(container)
          : container;

      if (element && viewportEnhanced.element) {
        element.appendChild(viewportEnhanced.element);
      }
    }

    return viewportEnhanced;
  };
};
