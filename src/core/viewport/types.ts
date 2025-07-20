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
  getClass?: (name: string) => string;
}

/**
 * Viewport configuration
 */
export interface ViewportConfig {
  // Container
  container?: HTMLElement;
  className?: string;

  // Basic settings
  orientation?: "vertical" | "horizontal";
  estimatedItemSize?: number;
  overscan?: number;

  // Scrolling settings
  scrollSensitivity?: number;
  smoothScrolling?: boolean;

  // Scrollbar settings
  enableScrollbar?: boolean;
  autoHideScrollbar?: boolean;

  // Collection settings
  collection?: any; // Collection adapter
  rangeSize?: number;
  paginationStrategy?: "page" | "offset" | "cursor";
  enablePlaceholders?: boolean;
  maskCharacter?: string;
  transformItem?: (item: any) => any;

  // Loading settings
  maxConcurrentRequests?: number;

  // Rendering settings
  template?: (item: any, index: number) => string | HTMLElement;

  // Debug
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
