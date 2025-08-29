/**
 * Core Module Exports
 *
 * Central export point for all core functionality
 */

export * from "./compose";

// Layout system
export {
  createLayout,
  applyLayoutClasses,
  cleanupLayoutClasses,
} from "./layout";
export type { LayoutConfig } from "./layout/types";

// Viewport system
export { createViewport } from "./viewport";
export type {
  ViewportConfig,
  ViewportComponent,
  ViewportContext,
  ItemRange,
  ViewportInfo,
} from "./viewport/types";

// Gesture system
export { createGestureManager } from "./gestures";
export type {
  GestureManager,
  GestureConfig,
  GestureEvent,
  TapEvent,
  SwipeEvent,
  LongPressEvent,
  PinchEvent,
  RotateEvent,
  PanEvent,
  AnyGestureEvent,
  GestureHandler,
} from "./gestures";

export * from "./compose";
