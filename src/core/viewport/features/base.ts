// src/core/viewport/features/base.ts

/**
 * Base Viewport Feature - Sets up core viewport structure
 * Provides the foundation for other viewport features
 */

import type { ViewportContext } from "../types";
import { createEmitter } from "mtrl/src/core";

export interface BaseConfig {
  className?: string;
  orientation?: "vertical" | "horizontal";
}

export interface BaseComponent {
  element: HTMLElement | null;
  items: any[];
  totalItems: number;
  emit?: (event: string, data?: any) => void;
  on?: (event: string, handler: (data?: any) => void) => void;
  off?: (event: string, handler: (data?: any) => void) => void;
}

/**
 * Adds base viewport functionality to component
 */
export function withBase(config: BaseConfig = {}) {
  return <T extends ViewportContext>(component: T): T & BaseComponent => {
    const { className = "mtrl-viewport", orientation = "vertical" } = config;

    // Create emitter for events
    const emitter = createEmitter();

    // Enhanced component
    const enhanced = {
      ...component,
      element: component.element || null,
      items: component.items || [],
      totalItems: component.totalItems || 0,
      emit: emitter.emit,
      on: emitter.on,
      off: emitter.off,
    };

    // Initialize function
    const initialize = () => {
      const element = enhanced.element;
      if (!element) return;

      // Add viewport class
      element.classList.add(className);

      // Set orientation
      element.setAttribute("data-orientation", orientation);

      // Set up viewport styles
      element.style.position = "relative";
      element.style.overflow = "hidden";

      // Ensure viewport has a height if not already set
      if (!element.style.height && element.offsetHeight === 0) {
        element.style.height = "100%";
      }

      // Create viewport items container if it doesn't exist
      let itemsContainer = element.querySelector(
        ".mtrl-viewport-items"
      ) as HTMLElement;
      if (!itemsContainer) {
        itemsContainer = document.createElement("div");
        itemsContainer.className = "mtrl-viewport-items";
        itemsContainer.style.position = "absolute";
        itemsContainer.style.top = "0";
        itemsContainer.style.left = "0";
        itemsContainer.style.width = "100%";
        itemsContainer.style.height = "100%"; // Use 100% height for virtual scrolling
        element.appendChild(itemsContainer);
      }

      // Emit initialized event
      enhanced.emit?.("viewport:initialized");
    };

    // Store initialize function
    (enhanced as any)._baseInitialize = initialize;

    return enhanced as T & BaseComponent;
  };
}
