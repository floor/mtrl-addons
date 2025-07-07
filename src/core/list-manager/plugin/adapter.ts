/**
 * Plugin Adapter Utility
 *
 * Converts List Manager plugins to pipe-compatible functions for mtrl's compose system.
 * This bridges the gap between the plugin architecture and the functional composition pattern.
 */

import type { ElementComponent } from "mtrl/src/core/compose";
import type { ListManagerPlugin } from "../types";

/**
 * Mock List Manager interface for plugin installation
 * This provides the minimal interface that plugins expect
 */
interface MockListManager {
  getConfig(): any;
  emit(event: string, data?: any): void;
  subscribe(callback: (event: any) => void): () => void;
  getViewportInfo(): any;
}

/**
 * Creates a mock List Manager instance for plugin installation
 */
const createMockListManager = (
  component: ElementComponent
): MockListManager => ({
  getConfig() {
    return component.config || {};
  },

  emit(event: string, data?: any) {
    // Use component's event system if available
    if ("emit" in component && typeof component.emit === "function") {
      component.emit(event, data);
    } else {
      console.log(`🔧 [PLUGIN-ADAPTER] Event: ${event}`, data);
    }
  },

  subscribe(callback: (event: any) => void) {
    // Use component's event system if available
    if ("subscribe" in component && typeof component.subscribe === "function") {
      return component.subscribe(callback);
    } else {
      // Return empty unsubscribe function
      return () => {};
    }
  },

  getViewportInfo() {
    // Try to get viewport info from the container if available
    const config = component.config || {};
    const container = config.container;
    const orientation = config.orientation?.orientation || "vertical";
    const isVertical = orientation === "vertical";

    let viewportInfo = {
      width: 0,
      height: 0,
      scrollTop: 0,
      scrollLeft: 0,
      startIndex: 0,
      endIndex: 0,
      visibleItems: [],
      bufferStart: 0,
      bufferEnd: 0,
      // Orientation-aware defaults
      totalHeight: isVertical ? 1000 : 0, // Primary axis for vertical
      totalWidth: isVertical ? 0 : 1000, // Primary axis for horizontal
      containerHeight: isVertical ? 400 : 0, // Primary axis for vertical
      containerWidth: isVertical ? 0 : 400, // Primary axis for horizontal
    };

    if (container) {
      const containerElement =
        typeof container === "string"
          ? (document.querySelector(container) as HTMLElement)
          : container;

      if (containerElement) {
        const rect = containerElement.getBoundingClientRect();
        const scrollHeight = containerElement.scrollHeight;
        const scrollWidth = containerElement.scrollWidth;

        viewportInfo = {
          ...viewportInfo,
          width: rect.width,
          height: rect.height,
          scrollTop: containerElement.scrollTop || 0,
          scrollLeft: containerElement.scrollLeft || 0,
          // Provide both dimensions but prioritize based on orientation
          containerWidth: rect.width,
          containerHeight: rect.height,
          totalWidth: scrollWidth || rect.width,
          totalHeight: scrollHeight || (isVertical ? 1000 : rect.height),
        };
      }
    }

    return viewportInfo;
  },
});

/**
 * Converts a List Manager plugin to a pipe-compatible function
 *
 * @param plugin - The plugin to convert
 * @returns A function that can be used in pipe composition
 */
export const withPlugin =
  (plugin: ListManagerPlugin) =>
  <C extends ElementComponent>(component: C): C => {
    try {
      // Create mock List Manager for plugin installation
      const mockListManager = createMockListManager(component);

      // Install the plugin
      const pluginAPI = plugin.install(mockListManager, {});

      // Enhance the component with plugin API
      const enhanced = {
        ...component,
        [`plugin_${plugin.name}`]: pluginAPI,
      } as C;

      console.log(`✅ [PLUGIN-ADAPTER] Plugin "${plugin.name}" installed`);
      return enhanced;
    } catch (error) {
      console.error(
        `❌ [PLUGIN-ADAPTER] Failed to install plugin "${plugin.name}":`,
        error
      );
      return component;
    }
  };

/**
 * Converts multiple plugins to pipe-compatible functions
 *
 * @param plugins - Array of plugins to convert
 * @returns Array of pipe-compatible functions
 */
export const withPlugins = (plugins: ListManagerPlugin[]) =>
  plugins.map((plugin) => withPlugin(plugin));

/**
 * Creates a plugin-aware pipe function that handles both plugins and regular functions
 *
 * @param items - Mix of plugins and functions
 * @returns Array of pipe-compatible functions
 */
export const adaptForPipe = (
  items: (ListManagerPlugin | Function)[]
): Function[] => {
  return items.map((item) => {
    // Check if it's a plugin object
    if (typeof item === "object" && item !== null && "install" in item) {
      return withPlugin(item as ListManagerPlugin);
    }

    // It's already a function
    if (typeof item === "function") {
      return item;
    }

    // Fallback: return passthrough
    console.warn(
      `[PLUGIN-ADAPTER] Unknown item type, using passthrough:`,
      item
    );
    return <T>(comp: T): T => comp;
  });
};
