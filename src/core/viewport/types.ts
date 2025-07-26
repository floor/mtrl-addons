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
 * Viewport configuration - Feature-oriented structure
 */
export interface ViewportConfig {
  // Basic configuration
  element?: HTMLElement;
  className?: string;
  debug?: boolean;

  // Template for rendering items
  template?: (
    item: any,
    index: number
  ) => string | HTMLElement | any[] | Record<string, any>;

  // Collection/data source configuration
  collection?: {
    adapter?: any; // Data adapter
    transform?: (item: any) => any; // Transform items before rendering
  };

  // Pagination configuration
  pagination?: {
    strategy?: "page" | "offset" | "cursor";
    limit?: number; // Items per page/range
  };

  // Virtual scrolling configuration
  virtual?: {
    estimatedItemSize?: number;
    overscan?: number; // Extra items to render outside viewport
  };

  // Scrolling configuration
  scrolling?: {
    orientation?: "vertical" | "horizontal";
    animation?: boolean; // Smooth scrolling
    sensitivity?: number; // Scroll sensitivity
  };

  // Scrollbar configuration
  scrollbar?: {
    enabled?: boolean;
    autoHide?: boolean;
  };

  // Performance configuration
  performance?: {
    maxConcurrentRequests?: number;
    cancelLoadThreshold?: number; // Velocity threshold for cancelling loads
    enableRequestQueue?: boolean;
    recycleElements?: boolean;
    bufferSize?: number;
    renderDebounce?: number;
  };

  // Placeholder configuration
  placeholders?: {
    enabled?: boolean;
    template?: (index: number) => string | HTMLElement;
    maskCharacter?: string;
    analyzeFirstLoad?: boolean;
  };

  // Legacy flat format support (deprecated - will be removed in v2.0)
  adapter?: any;
  transform?: (item: any) => any;
  orientation?: "vertical" | "horizontal";
  estimatedItemSize?: number;
  overscan?: number;
  rangeSize?: number;
  paginationStrategy?: "page" | "offset" | "cursor";
  transformItem?: (item: any) => any;
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
