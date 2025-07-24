// src/core/viewport/features/utils.ts

/**
 * Shared utilities for viewport features
 * Eliminates code duplication across features
 */

import type { ViewportContext, ViewportComponent } from "../types";

/**
 * Wraps viewport initialization with feature-specific logic
 * Eliminates the repeated initialization hook pattern
 */
export function wrapInitialize<T extends ViewportContext & ViewportComponent>(
  component: T,
  featureInit: () => void
): void {
  const originalInitialize = component.viewport.initialize;
  component.viewport.initialize = () => {
    originalInitialize();
    featureInit();
  };
}

/**
 * Wraps component destroy with cleanup logic
 * Eliminates the repeated destroy hook pattern
 */
export function wrapDestroy<T extends Record<string, any>>(
  component: T,
  cleanup: () => void
): void {
  if ("destroy" in component && typeof component.destroy === "function") {
    const originalDestroy = component.destroy;
    (component as any).destroy = () => {
      cleanup();
      originalDestroy?.();
    };
  }
}

/**
 * Gets viewport state with proper typing
 * Eliminates repeated (component.viewport as any).state
 */
export function getViewportState(component: ViewportComponent): any {
  return (component.viewport as any).state;
}

/**
 * Checks if an item is a placeholder
 * Eliminates duplicated placeholder detection logic
 */
export function isPlaceholder(item: any): boolean {
  return (
    item &&
    typeof item === "object" &&
    (item._placeholder === true || item["_placeholder"] === true) // Support both access patterns
  );
}

/**
 * Creates a range key for deduplication
 * Used by multiple features for tracking ranges
 */
export function getRangeKey(range: { start: number; end: number }): string {
  return `${range.start}-${range.end}`;
}

/**
 * Clamps a value between min and max
 * Used by multiple features for boundary checking
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Stores a function reference on the component for later access
 * Eliminates pattern like (component as any)._featureFunction = fn
 */
export function storeFeatureFunction<T extends Record<string, any>>(
  component: T,
  name: string,
  fn: Function
): void {
  (component as any)[name] = fn;
}
