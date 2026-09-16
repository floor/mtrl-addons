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
