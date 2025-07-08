// src/core/list-manager/features/viewport/index.ts

/**
 * Main viewport feature - Pure virtual scrolling & display management
 *
 * This is the core viewport management system that handles:
 * - Virtual scrolling calculations
 * - Custom scrollbar
 * - Item sizing and positioning
 * - Element recycling
 * - Placeholder management
 * - Speed tracking for performance
 * - Template rendering
 */

export { withViewport } from "./viewport";
export { withPlaceholders } from "./placeholders";
export { withSpeedTracking } from "./speed-tracking";
export { scrollbar } from "./scrollbar";
export {
  getDefaultTemplate,
  getLoadingTemplate,
  getEmptyTemplate,
  getErrorTemplate,
  convertRenderItemToTemplate,
  createElementFromTemplate,
  substituteVariables,
} from "./template";

// TODO: Create these core viewport utilities
// export { orientation } from "./orientation";
// export { virtual } from "./virtual";
// export { itemSizing } from "./item-sizing";
// export { recycling } from "./recycling";
