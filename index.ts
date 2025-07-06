/**
 * mtrl-addons
 * Additional components and utilities for the mtrl system
 *
 * Main entry point for easy importing and testing
 */

// Export the main createLayout function for easy access
export { createLayout } from "./src/core/layout";

// Export commonly used convenience functions
export { layout, grid, row, stack, template } from "./src/core/layout";

// Export essential types for TypeScript users
export type {
  LayoutResult,
  LayoutConfig,
  LayoutItemConfig,
  LayoutOptions,
  ComponentLike,
  ElementOptions,
  ElementDefinition,
  Schema,
} from "./src/core/layout";

// Export JSX support
export { h, Fragment, jsx } from "./src/core/layout";

// Export performance utilities
export { performance } from "./src/core/layout";

// Export configuration utilities
export {
  getLayoutType,
  getLayoutPrefix,
  cleanupLayoutClasses,
  setLayoutClasses,
} from "./src/core/layout";

// Version info
export const version = "0.1.0";

// Default export for convenient usage
export { createLayout as default } from "./src/core/layout";
