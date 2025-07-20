/**
 * Rendering Feature - Item rendering and positioning for viewport
 * Handles DOM element creation, positioning, recycling, and updates
 */

import type { ViewportContext } from "../types";
import type { VirtualComponent } from "./virtual";
import type { ScrollingComponent } from "./scrolling";
import { VIEWPORT_CONSTANTS } from "../constants";

export interface RenderingConfig {
  template?: (item: any, index: number) => string | HTMLElement;
  debug?: boolean;
}

export interface RenderingComponent {
  rendering: {
    render: () => void;
    updatePositions: () => void;
    clear: () => void;
    getRenderedElements: () => Map<number, HTMLElement>;
  };
}

/**
 * Adds rendering functionality to viewport component
 */
export function withRendering(config: RenderingConfig = {}) {
  return <T extends ViewportContext & VirtualComponent & ScrollingComponent>(
    component: T
  ): T & RenderingComponent => {
    const { template, debug = false } = config;

    // State
    let itemsContainer: HTMLElement | null = null;
    let renderedElements = new Map<number, HTMLElement>();
    let elementPool: HTMLElement[] = [];
    let lastRenderedRange = { start: -1, end: -1 };
    let isRendering = false;

    /**
     * Get default template if none provided
     */
    const getTemplate = (): ((
      item: any,
      index: number
    ) => string | HTMLElement) => {
      if (template) return template;

      return (item: any, index: number) => {
        if (typeof item === "string") return item;
        if (typeof item === "object" && item.label) return item.label;
        if (typeof item === "object" && item.name) return item.name;
        if (typeof item === "object" && item.title) return item.title;
        return `Item ${index}`;
      };
    };

    /**
     * Create or reuse an element for an item
     */
    const getOrCreateElement = (index: number): HTMLElement => {
      // Try to reuse from pool
      let element = elementPool.pop();

      if (!element) {
        element = document.createElement("div");
        element.className = "mtrl-viewport-item";
        element.style.position = "absolute";
        element.style.width = "100%";
        element.style.willChange = "transform";
      }

      element.setAttribute("data-index", index.toString());
      return element;
    };

    /**
     * Return element to pool for reuse
     */
    const returnToPool = (element: HTMLElement): void => {
      element.innerHTML = "";
      element.removeAttribute("data-index");
      element.style.transform = "";

      if (
        elementPool.length < VIEWPORT_CONSTANTS.RENDERING.DEFAULT_MAX_POOL_SIZE
      ) {
        elementPool.push(element);
      }
    };

    /**
     * Update element position using GPU-accelerated transforms
     */
    const updateElementPosition = (
      element: HTMLElement,
      index: number
    ): void => {
      const position = component.virtual.calculatePositionForIndex(index);
      const orientation =
        component.element?.getAttribute("data-orientation") || "vertical";

      if (orientation === "horizontal") {
        element.style.transform = `translateX(${position}px)`;
      } else {
        element.style.transform = `translateY(${position}px)`;
      }
    };

    /**
     * Render items in the visible range
     */
    const render = (): void => {
      if (isRendering || !itemsContainer || !component.virtual) return;

      isRendering = true;

      try {
        const scrollPosition = component.scrolling.getScrollPosition();
        const visibleRange =
          component.virtual.calculateVisibleRange(scrollPosition);

        if (debug) {
          console.log(
            `[Rendering] Range: ${visibleRange.start}-${visibleRange.end}`
          );
        }

        // Remove elements outside visible range
        const toRemove: number[] = [];
        renderedElements.forEach((element, index) => {
          if (index < visibleRange.start || index > visibleRange.end) {
            toRemove.push(index);
            element.remove();
            returnToPool(element);
          }
        });

        toRemove.forEach((index) => renderedElements.delete(index));

        // Add new elements in visible range
        for (let i = visibleRange.start; i <= visibleRange.end; i++) {
          if (!renderedElements.has(i)) {
            const item = component.items?.[i];

            if (item) {
              const element = getOrCreateElement(i);
              const renderTemplate = getTemplate();
              const rendered = renderTemplate(item, i);

              // Handle both string and HTMLElement templates
              if (typeof rendered === "string") {
                element.innerHTML = rendered;
              } else if (rendered instanceof HTMLElement) {
                element.innerHTML = "";
                element.appendChild(rendered.cloneNode(true));
              }

              updateElementPosition(element, i);
              itemsContainer.appendChild(element);
              renderedElements.set(i, element);
            }
          }
        }

        lastRenderedRange = visibleRange;

        // Emit render complete event
        component.emit?.("viewport:render-complete", {
          range: visibleRange,
          renderedCount: renderedElements.size,
        });
      } finally {
        isRendering = false;
      }
    };

    /**
     * Update positions of all rendered elements
     */
    const updatePositions = (): void => {
      renderedElements.forEach((element, index) => {
        updateElementPosition(element, index);
      });
    };

    /**
     * Clear all rendered elements
     */
    const clear = (): void => {
      renderedElements.forEach((element) => {
        element.remove();
        returnToPool(element);
      });
      renderedElements.clear();
      lastRenderedRange = { start: -1, end: -1 };
    };

    // Initialize function
    const initialize = () => {
      const viewportElement = component.element;
      if (!viewportElement) return;

      // Create items container
      itemsContainer = viewportElement.querySelector(".mtrl-viewport-items");
      if (!itemsContainer) {
        itemsContainer = document.createElement("div");
        itemsContainer.className = "mtrl-viewport-items";
        itemsContainer.style.cssText = `
          position: relative;
          width: 100%;
          will-change: contents;
        `;
        viewportElement.appendChild(itemsContainer);
      }

      // Set up virtual size
      if (component.virtual) {
        const totalSize = component.virtual.getTotalVirtualSize();
        const orientation =
          viewportElement.getAttribute("data-orientation") || "vertical";

        // Use capped virtual height to avoid browser limitations
        const maxHeight = VIEWPORT_CONSTANTS.VIRTUAL_SCROLL.MAX_VIRTUAL_SIZE;
        const cappedSize = Math.min(totalSize, maxHeight);

        if (orientation === "horizontal") {
          itemsContainer.style.width = `${cappedSize}px`;
          itemsContainer.style.height = "100%";
        } else {
          itemsContainer.style.height = `${cappedSize}px`;
          itemsContainer.style.width = "100%";
        }
      }

      // Listen for scroll events
      component.on?.("viewport:scroll", () => {
        render();
      });

      // Listen for virtual size changes
      component.on?.("viewport:virtual-size-changed", (data: any) => {
        if (itemsContainer) {
          const orientation =
            component.element?.getAttribute("data-orientation") || "vertical";

          if (orientation === "horizontal") {
            itemsContainer.style.width = `${data.totalVirtualSize}px`;
          } else {
            itemsContainer.style.height = `${data.totalVirtualSize}px`;
          }
        }
      });

      // Listen for item changes
      component.on?.("viewport:items-changed", () => {
        render();
      });

      // Initial render
      render();
    };

    // Cleanup function
    const destroy = () => {
      clear();
      elementPool = [];
      itemsContainer = null;
    };

    // Store functions for viewport to call
    (component as any)._renderingInitialize = initialize;
    (component as any)._renderingDestroy = destroy;

    // Return enhanced component
    return {
      ...component,
      rendering: {
        render,
        updatePositions,
        clear,
        getRenderedElements: () => renderedElements,
      },
    };
  };
}
