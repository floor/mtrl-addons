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

    // Apply viewport with all config options
    const viewportEnhanced = createViewport({
      container: config.container || config.parent,
      orientation: config.orientation || "vertical",
      estimatedItemSize: config.estimatedItemSize || 50,
      overscan: config.overscan || 3,
      template: config.template,
      // Pass collection configuration if adapter is provided
      collection: config.collection
        ? {
            adapter: config.collection,
            rangeSize: config.rangeSize || 20,
            strategy: config.paginationStrategy || "page",
            enablePlaceholders: config.enablePlaceholders !== false,
          }
        : undefined,
      debug: config.debug || false,
    })(component);

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
