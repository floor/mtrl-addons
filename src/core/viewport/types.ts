// src/core/viewport/types.ts

/**
 * Core type definitions for Viewport
 * Virtual scrolling and rendering types
 */

import type { CollectionComponent } from "./features/collection";

/**
 * Core Range and Item Types
 */
export interface ItemRange {
  start: number;
  end: number;
}

export interface ViewportInfo {
  containerSize: number;
  totalVirtualSize: number;
  visibleRange: ItemRange;
  virtualScrollPosition: number;
}

/**
 * Viewport context interface - provides context for viewport features
 */
export interface ViewportContext {
  element: HTMLElement;
  items: any[];
  totalItems: number;
  template?: (item: any, index: number) => string | HTMLElement;
  emit?: (event: string, data?: any) => void;
  on?: (event: string, handler: Function) => () => void;
  once?: (event: string, handler: Function) => () => void;
  off?: (event: string, handler: Function) => void;
  getClass?: (name: string) => string;
}

/**
 * Viewport configuration
 */
export interface ViewportConfig {
  element?: HTMLElement;
  orientation?: "vertical" | "horizontal";
  estimatedItemSize?: number;
  overscan?: number;
  enableScrollbar?: boolean;
  autoHideScrollbar?: boolean;
  scrollSensitivity?: number;
  smoothScrolling?: boolean;
  collection?: any;
  rangeSize?: number;
  paginationStrategy?: "page" | "offset" | "cursor";
  transformItem?: (item: any) => any;
  maxConcurrentRequests?: number;
  cancelLoadThreshold?: number;
  enableRequestQueue?: boolean;
  enablePlaceholders?: boolean;
  placeholderTemplate?: (index: number) => string | HTMLElement;
  className?: string;
  debug?: boolean;
}

/**
 * Enhanced component after viewport is applied
 */
export interface ViewportComponent extends ViewportContext {
  viewport: {
    // Core API
    initialize(): void;
    destroy(): void;
    updateViewport(): void;

    // Scrolling
    scrollToIndex(index: number, alignment?: "start" | "center" | "end"): void;
    scrollToPosition(position: number): void;
    getScrollPosition(): number;

    // Collection feature (optional)
    collection?: CollectionComponent["collection"];

    // Info
    getVisibleRange(): ItemRange;
    getViewportInfo(): ViewportInfo;

    // Rendering
    renderItems(): void;
  };
}
