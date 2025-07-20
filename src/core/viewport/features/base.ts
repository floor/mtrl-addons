// src/core/viewport/features/base.ts

/**
 * Base Viewport Feature - Sets up core viewport structure
 * Provides the foundation for other viewport features
 */

import type { ViewportContext, ViewportComponent } from "../types";

export interface BaseConfig {
  className?: string;
  orientation?: "vertical" | "horizontal";
}

/**
 * Base feature for viewport
 * Sets up the DOM structure and core styles
 */
export const withBase = (config: BaseConfig = {}) => {
  return <T extends ViewportContext & ViewportComponent>(component: T): T => {
    const { className = "mtrl-viewport", orientation = "vertical" } = config;

    // Override initialize to set up DOM
    const originalInitialize = component.viewport.initialize;
    component.viewport.initialize = () => {
      // Call original first
      originalInitialize();

      const element = component.element;
      if (!element) return;

      // Create viewport structure
      let viewportElement = element.querySelector(
        ".mtrl-viewport"
      ) as HTMLElement;

      if (!viewportElement) {
        viewportElement = document.createElement("div");
        viewportElement.className = className;
        viewportElement.style.cssText = `
          position: relative;
          width: 100%;
          height: 100%;
          overflow: hidden;
        `;

        // Set orientation
        viewportElement.setAttribute("data-orientation", orientation);

        // Create items container
        const itemsContainer = document.createElement("div");
        itemsContainer.className = "mtrl-viewport-items";
        itemsContainer.style.cssText = `
          position: relative;
          width: 100%;
        `;

        viewportElement.appendChild(itemsContainer);
        element.appendChild(viewportElement);

        // Update viewport state with containers
        const state = (component.viewport as any).state;
        if (state) {
          state.viewportElement = viewportElement;
          state.itemsContainer = itemsContainer;

          // Update container size after DOM is ready
          const size =
            orientation === "horizontal"
              ? viewportElement.offsetWidth
              : viewportElement.offsetHeight;

          if (size > 0) {
            state.containerSize = size;
            console.log("[Base] Updated container size:", size);
          }
        }

        // Store reference to viewport element for other features
        (component as any).viewportElement = viewportElement;
      }

      // Emit initialized event
      component.emit?.("viewport:initialized", {
        element,
        viewportElement,
        orientation,
      });
    };

    return component;
  };
};
