/**
 * List Manager Rendering Plugin
 *
 * Handles item rendering, positioning, and template processing.
 * Moves rendering logic from orchestration to List Manager layer.
 */

import type { ListManagerPlugin, VirtualItem } from "../types";
import { CLASSES, LOGGING } from "../constants";

export interface RenderingConfig {
  /** Template function for rendering items */
  template?: (item: VirtualItem, index: number) => string | HTMLElement;

  /** Item height for positioning */
  itemHeight?: number;

  /** Orientation configuration */
  orientation?: {
    orientation?: "horizontal" | "vertical";
    reverse?: boolean;
    crossAxisAlignment?: "start" | "center" | "end" | "stretch";
  };

  /** CSS prefix for classes */
  prefix?: string;

  /** Enable debug logging */
  debug?: boolean;
}

export interface RenderingState {
  renderContainer: HTMLElement | null; // Note: This is actually the viewport container (mtrl-list__viewport)
  renderedElements: Map<number, HTMLElement>;
  currentRange: { start: number; end: number; count: number } | null;
  items: VirtualItem[];
}

/**
 * Creates the rendering plugin for List Manager
 */
export const rendering = (config: RenderingConfig = {}): ListManagerPlugin => ({
  name: "rendering",
  version: "1.0.0",
  dependencies: ["orientation-manager"], // Depends on orientation for positioning

  install: (listManager, pluginConfig) => {
    // Configuration with defaults
    const renderingConfig: Required<RenderingConfig> = {
      template: (item: VirtualItem, index: number) =>
        `<div>Item ${index}: ${JSON.stringify(item)}</div>`,
      itemHeight: 50,
      orientation: {
        orientation: "vertical",
        reverse: false,
        crossAxisAlignment: "stretch",
      },
      prefix: "mtrl",
      debug: false,
      ...config,
      ...pluginConfig,
    };

    // Plugin state
    const state: RenderingState = {
      renderContainer: null,
      renderedElements: new Map(),
      currentRange: null,
      items: [],
    };

    /**
     * Debug logging
     */
    const debugLog = (message: string, ...args: any[]) => {
      if (renderingConfig.debug) {
        console.log(`🎨 [LIST-MANAGER-RENDERING] ${message}`, ...args);
      }
    };

    /**
     * Initialize viewport container inside the component element
     */
    const initializeRenderContainer = (): void => {
      const config = listManager.getConfig?.();
      if (!config) {
        throw new Error("List Manager config not available");
      }
      const container = config.container;
      if (!container) {
        throw new Error("Container is required for rendering plugin");
      }

      const containerElement =
        typeof container === "string"
          ? (document.querySelector(container) as HTMLElement)
          : container;

      if (!containerElement) {
        throw new Error("Container element not found");
      }

      // Check if this container already has the proper structure
      // The container should be the mtrl-list element, not the showcase
      let listElement = containerElement;

      // If the container is not a list element, find or create the list element
      if (
        !containerElement.classList.contains(`${renderingConfig.prefix}-list`)
      ) {
        // Look for existing list element inside container
        const existingList = containerElement.querySelector(
          `.${renderingConfig.prefix}-list`
        );
        if (existingList) {
          listElement = existingList as HTMLElement;
        } else {
          // Create the proper mtrl-list element structure
          listElement = document.createElement("div");
          listElement.className = `${renderingConfig.prefix}-list`;
          listElement.setAttribute("role", "list");

          // Apply orientation classes
          const orientation =
            renderingConfig.orientation?.orientation || "vertical";
          listElement.classList.add(
            `${renderingConfig.prefix}-list--${orientation}`
          );

          // Insert the list element into the container
          containerElement.appendChild(listElement);
        }
      }

      // Create viewport container inside the list element (not the showcase)
      let renderContainer = listElement.querySelector(
        `.${renderingConfig.prefix}-list__viewport`
      ) as HTMLElement;

      if (!renderContainer) {
        renderContainer = document.createElement("div");
        renderContainer.className = `${renderingConfig.prefix}-list__viewport`;
        renderContainer.style.cssText = `
          position: relative;
          width: 100%;
          height: 100%;
        `;

        // Clear existing content in list element and add viewport container
        listElement.innerHTML = "";
        listElement.appendChild(renderContainer);
      }

      state.renderContainer = renderContainer;

      debugLog(
        "Viewport container initialized inside proper mtrl-list element"
      );
    };

    /**
     * Position items based on virtual scroll position - TanStack Virtual approach
     */
    const positionItemsForOrientation = (
      itemElements: HTMLElement[],
      range: { start: number; end: number; count: number },
      scrollOffset: number = 0
    ): void => {
      const { orientation, reverse, crossAxisAlignment } =
        renderingConfig.orientation;
      const isHorizontal = orientation === "horizontal";
      const itemHeight = renderingConfig.itemHeight;

      debugLog(`Positioning ${itemElements.length} items (TanStack Virtual)`, {
        orientation,
        reverse,
        range,
        scrollOffset,
      });

      itemElements.forEach((element, index) => {
        const actualIndex = range.start + index;

        // Calculate VIRTUAL position (not offset by scrolling)
        let virtualPosition = actualIndex * itemHeight;

        if (reverse) {
          const totalSize = state.items.length * itemHeight;
          virtualPosition = totalSize - virtualPosition - itemHeight;
        }

        // Calculate the position relative to current scroll offset
        // This is the key difference - items are positioned at their virtual positions
        let transformPosition = virtualPosition - scrollOffset;

        if (isHorizontal) {
          // Horizontal positioning with virtual transforms
          element.style.position = "absolute";
          element.style.left = "0";
          element.style.top = "0";
          element.style.width = `${itemHeight}px`;

          const translateX = `translateX(${Math.max(0, transformPosition)}px)`;

          switch (crossAxisAlignment) {
            case "center":
              element.style.top = "50%";
              element.style.transform = `${translateX} translateY(-50%)`;
              break;
            case "end":
              element.style.bottom = "0";
              element.style.top = "auto";
              element.style.transform = translateX;
              break;
            case "stretch":
              element.style.height = "100%";
              element.style.transform = translateX;
              break;
            case "start":
            default:
              element.style.top = "0";
              element.style.transform = translateX;
              break;
          }
        } else {
          // Vertical positioning - TanStack Virtual approach with transforms
          element.style.position = "absolute";
          element.style.top = "0";
          element.style.left = "0";
          element.style.right = "0";
          element.style.height = `${itemHeight}px`;

          // CRITICAL: Use transform for virtual positioning (GPU accelerated)
          // Position at virtual location relative to scroll offset
          element.style.transform = `translateY(${Math.max(
            0,
            transformPosition
          )}px)`;
        }

        // Set data attributes for debugging and state tracking
        element.setAttribute("data-virtual-index", actualIndex.toString());
        element.setAttribute(
          "data-virtual-position",
          virtualPosition.toString()
        );
        element.setAttribute(
          "data-transform-position",
          transformPosition.toString()
        );

        // Add orientation classes
        element.classList.add(
          `${renderingConfig.prefix}-list-item--${orientation}`
        );
        if (reverse) {
          element.classList.add(
            `${renderingConfig.prefix}-list-item--reversed`
          );
        }
      });

      debugLog(
        `Positioned ${itemElements.length} items with virtual transforms (no spacers)`
      );
    };

    /**
     * Render items in the specified range with virtual positioning
     */
    const renderItems = (range: {
      start: number;
      end: number;
      count: number;
    }): void => {
      if (!state.renderContainer) {
        debugLog("No viewport container available");
        return;
      }

      // Get current scroll offset from viewport element for virtual positioning
      const config = listManager.getConfig?.();
      let scrollOffset = 0;

      if (config && config.container) {
        const containerElement =
          typeof config.container === "string"
            ? (document.querySelector(config.container) as HTMLElement)
            : config.container;

        if (containerElement) {
          // Try to find the viewport element first
          const viewportElement = containerElement.querySelector(
            ".list-manager__viewport"
          ) as HTMLElement;

          if (viewportElement) {
            // Use viewport element's scroll position
            scrollOffset = viewportElement.scrollTop || 0;
            debugLog(`Using viewport scroll offset: ${scrollOffset}px`);
          } else {
            // Fallback to container scroll position
            scrollOffset = containerElement.scrollTop || 0;
            debugLog(`Using container scroll offset: ${scrollOffset}px`);
          }
        }
      }

      debugLog(`Rendering items for range:`, range);
      debugLog(`Available items:`, state.items.length);
      debugLog(`Current scroll offset:`, scrollOffset);

      // Clear existing rendered items
      state.renderContainer.innerHTML = "";
      state.renderedElements.clear();

      // Render items in range
      for (
        let virtualIndex = range.start;
        virtualIndex <= range.end;
        virtualIndex++
      ) {
        const item = state.items[virtualIndex];

        if (!item) {
          debugLog(`⚠️ No item found for virtual index ${virtualIndex}`);
          continue;
        }

        debugLog(
          `✅ Rendering virtual index ${virtualIndex} → ${
            item.name || item.id || "Unknown"
          }`
        );

        // Create item wrapper
        const itemWrapper = document.createElement("div");
        itemWrapper.className = `${renderingConfig.prefix}-list-item`;
        itemWrapper.setAttribute("data-index", virtualIndex.toString());
        itemWrapper.setAttribute("role", "listitem");

        // Render item content using template
        let content: string | HTMLElement;
        try {
          if (typeof renderingConfig.template !== "function") {
            throw new Error(
              `Template is not a function: ${typeof renderingConfig.template}`
            );
          }
          content = renderingConfig.template(item, virtualIndex);
        } catch (error) {
          console.error(
            `❌ [RENDERING] Template error for item ${virtualIndex}:`,
            error
          );
          content = `<div class="mtrl-list-item__error">Error rendering item ${virtualIndex}</div>`;
        }

        if (typeof content === "string") {
          itemWrapper.innerHTML = content;
        } else {
          itemWrapper.appendChild(content);
        }

        // Store rendered element
        state.renderedElements.set(virtualIndex, itemWrapper);
        state.renderContainer.appendChild(itemWrapper);
      }

      // Position items using TanStack Virtual approach with scroll offset
      const itemElements = Array.from(
        state.renderContainer.children
      ) as HTMLElement[];
      positionItemsForOrientation(itemElements, range, scrollOffset);

      // Store current range
      state.currentRange = range;

      debugLog(
        `✅ Rendered ${itemElements.length} items with virtual positioning (scroll offset: ${scrollOffset}px)`
      );

      // Emit render complete event (handle potential undefined)
      try {
        if (listManager.emit) {
          listManager.emit("render:complete" as any, {
            range,
            renderedCount: itemElements.length,
            scrollOffset,
            timestamp: Date.now(),
          });
        }
      } catch (error) {
        debugLog("Error emitting render:complete event:", error);
      }
    };

    /**
     * Update rendered item
     */
    const updateItem = (index: number, item: VirtualItem): void => {
      const element = state.renderedElements.get(index);
      if (!element) {
        debugLog(`Cannot update item ${index}: element not rendered`);
        return;
      }

      // Re-render content
      const content = renderingConfig.template(item, index);
      if (typeof content === "string") {
        element.innerHTML = content;
      } else {
        element.innerHTML = "";
        element.appendChild(content);
      }

      debugLog(`Updated item ${index}`);
    };

    /**
     * Set virtual total height for proper scrolling - use existing viewport structure
     */
    const setVirtualTotalHeight = (): void => {
      if (!state.renderContainer) return;

      const config = listManager.getConfig?.();
      if (!config || !config.container) return;

      const containerElement =
        typeof config.container === "string"
          ? (document.querySelector(config.container) as HTMLElement)
          : config.container;

      if (!containerElement) return;

      // Find the list-manager__viewport element that should handle scrolling
      const viewportElement = containerElement.querySelector(
        ".list-manager__viewport"
      ) as HTMLElement;

      if (viewportElement) {
        // Use the existing viewport element - don't modify mtrl-list
        debugLog("Using existing list-manager__viewport for scrolling");

        // Just ensure viewport container is properly set up
        state.renderContainer.style.position = "relative";
        state.renderContainer.style.width = "100%";
        state.renderContainer.style.height = "100%";

        // The viewport should handle the scrolling, not the mtrl-list
        debugLog("Viewport element found - using existing scroll structure");
      } else {
        // Fallback: minimal setup without modifying parent container
        debugLog("No viewport element found - using minimal setup");

        // Only set up the viewport container, don't touch parent
        state.renderContainer.style.position = "relative";
        state.renderContainer.style.width = "100%";
        state.renderContainer.style.height = "100%";
        state.renderContainer.style.overflow = "hidden";
      }
    };

    // Initialize when plugin is installed
    initializeRenderContainer();
    setVirtualTotalHeight();

    debugLog("Rendering plugin installed");

    // Return plugin API
    return {
      // Core rendering methods
      renderItems,
      updateItem,
      setVirtualTotalHeight,

      // Item management
      setItems(items: VirtualItem[]): void {
        state.items = [...items];
        debugLog(`Items updated: ${items.length} items`);

        // Update virtual height based on new item count
        setVirtualTotalHeight();
      },

      getRenderedElements(): Map<number, HTMLElement> {
        return new Map(state.renderedElements);
      },

      getCurrentRange(): { start: number; end: number; count: number } | null {
        return state.currentRange;
      },

      // Template management
      setTemplate(
        template: (item: VirtualItem, index: number) => string | HTMLElement
      ): void {
        renderingConfig.template = template;

        // Re-render if we have a current range
        if (state.currentRange) {
          renderItems(state.currentRange);
        }
      },

      // Configuration updates
      updateConfig(newConfig: Partial<RenderingConfig>): void {
        Object.assign(renderingConfig, newConfig);
        debugLog("Rendering config updated", newConfig);
      },

      // State queries
      getRenderingState(): RenderingState {
        return { ...state };
      },

      // Lifecycle
      destroy(): void {
        if (state.renderContainer && state.renderContainer.parentNode) {
          state.renderContainer.parentNode.removeChild(state.renderContainer);
        }
        state.renderedElements.clear();
        state.renderContainer = null;
        state.currentRange = null;
        state.items = [];

        debugLog("Rendering plugin destroyed");
      },
    };
  },
});
