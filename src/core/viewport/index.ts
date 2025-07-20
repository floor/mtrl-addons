// src/core/viewport/index.ts

/**
 * Viewport Module - High-Performance Virtual Scrolling
 * A composable, feature-based virtual scrolling solution
 */

// Main viewport creator
export { createViewport } from "./viewport";
export { withViewport } from "./features/with-viewport";

// Types
export type {
  ViewportConfig,
  ViewportComponent,
  ViewportHost,
  ItemRange,
  ViewportInfo,
} from "./types";

// Constants
export { VIEWPORT_CONSTANTS } from "./constants";
