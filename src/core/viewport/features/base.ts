// src/core/viewport/features/base.ts

/**
 * Base Viewport Feature - Sets up core viewport structure
 * Provides the foundation for other viewport features
 */

import type { ViewportContext, ViewportComponent } from "../types";
import { wrapInitialize, getViewportState } from "./utils";

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

    // Use the shared wrapper utility
    wrapInitialize(component, () => {
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

        // Update viewport state with containers using utility
        const state = getViewportState(component);
        if (state) {
          state.viewportElement = viewportElement;
          state.itemsContainer = itemsContainer;
        }

        // Store references on component
        (component as any).viewportElement = viewportElement;
        (component as any).itemsContainer = itemsContainer;
      }
    });

    return component;
  };
};
