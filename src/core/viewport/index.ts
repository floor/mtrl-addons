// src/core/viewport/index.ts

/**
 * Viewport Module - High-Performance Virtual Scrolling
 * A composable, feature-based virtual scrolling solution
 */

// Main viewport creator
export * from "./viewport";

// Feature enhancers (for custom composition)
export { withBase } from "./features/base";
export { withVirtual } from "./features/virtual";
export { withScrolling } from "./features/scrolling";
export { withScrollbar } from "./features/scrollbar";
export { withRendering } from "./features/rendering";
export { withCollection } from "./features/collection";
export { withPlaceholders } from "./features/placeholders";
export { withEvents } from "./features/events";

// Types
export type {
  ViewportConfig,
  ViewportComponent,
  ViewportContext,
  ItemRange,
  ViewportInfo,
} from "./types";

// Constants
export { VIEWPORT_CONSTANTS } from "./constants";
