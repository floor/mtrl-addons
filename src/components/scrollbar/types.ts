// src/components/scrollbar/types.ts

/**
 * Scrollbar Component Types
 */

export interface ScrollbarConfig {
  enabled?: boolean;
  trackWidth?: number;
  thumbMinHeight?: number;
  thumbColor?: string;
  trackColor?: string;
  borderRadius?: number;
  fadeTimeout?: number;
  itemHeight?: number;
  totalItems?: number;
  totalVirtualHeight?: number;
}

export interface ScrollbarComponent {
  // Core API
  update(params: {
    scrollPosition: number;
    containerSize: number;
    totalSize: number;
  }): void;

  // State management
  setTotalItems(count: number): void;
  setItemHeight(height: number): void;
  setTotalSize(size: number): void;

  // Visibility
  show(): void;
  hide(): void;

  // Lifecycle
  destroy(): void;
}
