// src/core/viewport/types.ts

/**
 * Core type definitions for Viewport
 * Virtual scrolling and rendering types
 */

import type { CollectionFeature } from "./features/collection";

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
 * Host component interface - minimal requirements for viewport
 */
export interface ViewportHost {
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

  // Basic settings
  orientation?: "vertical" | "horizontal";
  estimatedItemSize?: number;
  overscan?: number;

  // Features configuration
  features?: {
    collection?: any; // Collection adapter
    rendering?: any;
    scrolling?: any;
    template?: any;
    loading?: any;
    placeholders?: any;
  };

  // Collection settings
  collection?: any; // Collection adapter
  rangeSize?: number;
  paginationStrategy?: "page" | "offset" | "cursor";
  enablePlaceholders?: boolean;
  maskCharacter?: string;

  // Debug
  debug?: boolean;
}

/**
 * Enhanced component after viewport is applied
 */
export interface ViewportComponent extends ViewportHost {
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
    collection?: CollectionFeature;

    // Info
    getVisibleRange(): ItemRange;
    getViewportInfo(): ViewportInfo;

    // Rendering
    renderItems(): void;
  };
}
