/**
 * @module core/layout
 * @description Unified layout system for mtrl-addons
 * Provides array, object, and JSX-based layout creation with integrated optimizations
 */

// Import for use in convenience functions
import { createLayout, clearClassCache, clearFragmentPool } from "./schema";

// Core schema processor and utilities
export {
  createLayout,
  processClassNames,
  isComponent,
  flattenLayout,
  applyLayoutClasses,
  applyLayoutItemClasses,
  createLayoutResult,
  clearClassCache,
  clearFragmentPool,
} from "./schema";

// Essential types
export type {
  LayoutConfig,
  LayoutItemConfig,
  LayoutOptions,
  LayoutResult,
  ComponentLike,
  ElementOptions,
  ElementDefinition,
  Schema,
} from "./types";

// Configuration utilities
export {
  cleanupLayoutClasses,
  getLayoutType,
  getLayoutPrefix,
  setLayoutClasses,
} from "./config";

// JSX support
export {
  h,
  Fragment,
  createJsxLayout,
  component,
  renderElements,
  jsx,
} from "./jsx";

// Default export for convenient usage
export { createLayout as default } from "./schema";

/**
 * Convenience function to create a layout with common patterns
 * Provides a simpler API for common use cases
 */
export function layout(
  type: "stack" | "row" | "grid" | "flex" = "stack",
  options: Record<string, any> = {}
): any {
  return createLayout([
    "div",
    {
      layout: { type },
      ...options,
    },
  ]);
}

/**
 * Creates a responsive grid layout
 * Automatically handles responsive breakpoints
 */
export function grid(
  columns: number | "auto-fit" | "auto-fill" = "auto-fit",
  options: Record<string, any> = {}
): any {
  return createLayout([
    "div",
    {
      layout: {
        type: "grid",
        columns,
        gap: options.gap || "1rem",
        ...options.layout,
      },
      ...options,
    },
  ]);
}

/**
 * Creates a flexible row layout
 * Automatically handles mobile stacking
 */
export function row(options: Record<string, any> = {}): any {
  return createLayout([
    "div",
    {
      layout: {
        type: "row",
        gap: options.gap || "1rem",
        mobileStack: options.mobileStack !== false,
        ...options.layout,
      },
      ...options,
    },
  ]);
}

/**
 * Creates a vertical stack layout
 * Default layout type with consistent spacing
 */
export function stack(options: Record<string, any> = {}): any {
  return createLayout([
    "div",
    {
      layout: {
        type: "stack",
        gap: options.gap || "1rem",
        ...options.layout,
      },
      ...options,
    },
  ]);
}

/**
 * Creates a layout from a template function
 * Useful for dynamic layouts
 */
export function template(
  fn: (props: Record<string, any>) => any,
  props: Record<string, any> = {}
): any {
  const schema = fn(props);
  return createLayout(schema);
}

/**
 * Performance utilities for layout management
 */
export const performance = {
  clearCache: clearClassCache,
  clearFragmentPool,

  /**
   * Clears all cached resources
   */
  clearAll(): void {
    clearClassCache();
    clearFragmentPool();
  },

  /**
   * Gets current cache stats
   */
  getStats(): Record<string, any> {
    return {
      // Stats would be implemented in the actual cache system
      message: "Performance stats available in browser console",
    };
  },
};
