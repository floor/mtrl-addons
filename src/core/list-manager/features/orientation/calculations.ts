import type { ViewportInfo } from "../../types";
import type { ItemRange } from "../viewport/math";

/**
 * Orientation-aware viewport calculation configuration
 */
export interface OrientationViewportConfig {
  orientation: "horizontal" | "vertical";
  itemSize: number | "auto";
  estimatedItemSize: number;
  containerSize: number;
  totalItems: number;
  overscan: number;
  reverse?: boolean;
}

/**
 * Orientation-aware viewport calculations
 * Adapts viewport math for horizontal and vertical orientations
 */
export class OrientationCalculations {
  /**
   * Calculate visible range for current orientation
   */
  static calculateVisibleRange(
    scrollPosition: number,
    config: OrientationViewportConfig
  ): ItemRange {
    if (config.totalItems === 0) {
      return { start: 0, end: 0, count: 0 };
    }

    const itemSize =
      typeof config.itemSize === "number"
        ? config.itemSize
        : config.estimatedItemSize;

    let startIndex = Math.floor(scrollPosition / itemSize);
    const visibleCount =
      Math.ceil(config.containerSize / itemSize) + config.overscan;
    let endIndex = Math.min(startIndex + visibleCount, config.totalItems - 1);

    // Handle reverse orientation
    if (config.reverse) {
      const totalSize = config.totalItems * itemSize;
      const reverseScrollPosition =
        totalSize - scrollPosition - config.containerSize;
      startIndex = Math.floor(reverseScrollPosition / itemSize);
      endIndex = Math.min(startIndex + visibleCount, config.totalItems - 1);
    }

    // Ensure valid range
    startIndex = Math.max(0, startIndex);
    endIndex = Math.max(startIndex, Math.min(endIndex, config.totalItems - 1));

    return {
      start: startIndex,
      end: endIndex,
      count: endIndex - startIndex + 1,
    };
  }

  /**
   * Calculate item offset for current orientation
   */
  static calculateItemOffset(
    index: number,
    config: OrientationViewportConfig,
    heightCache?: Map<number, number>
  ): number {
    if (typeof config.itemSize === "number") {
      // Fixed size calculation
      let offset = index * config.itemSize;

      if (config.reverse) {
        const totalSize = config.totalItems * config.itemSize;
        offset = totalSize - offset - config.itemSize;
      }

      return Math.max(0, offset);
    }

    // Dynamic size calculation with cache
    let offset = 0;
    const indices = config.reverse
      ? Array.from(
          { length: config.totalItems - index },
          (_, i) => config.totalItems - 1 - i
        )
      : Array.from({ length: index }, (_, i) => i);

    for (const i of indices) {
      const cachedSize = heightCache?.get(i);
      offset += cachedSize || config.estimatedItemSize;
    }

    return offset;
  }

  /**
   * Calculate total content size for current orientation
   */
  static calculateTotalSize(
    config: OrientationViewportConfig,
    sizeCache?: Map<number, number>
  ): number {
    if (typeof config.itemSize === "number") {
      return config.totalItems * config.itemSize;
    }

    // Dynamic size - sum all cached/estimated sizes
    let totalSize = 0;
    for (let i = 0; i < config.totalItems; i++) {
      const cachedSize = sizeCache?.get(i);
      totalSize += cachedSize || config.estimatedItemSize;
    }
    return totalSize;
  }

  /**
   * Find item index at specific position for current orientation
   */
  static findItemAtPosition(
    position: number,
    config: OrientationViewportConfig,
    sizeCache?: Map<number, number>
  ): number {
    if (typeof config.itemSize === "number") {
      // Fixed size calculation
      let index = Math.floor(position / config.itemSize);

      if (config.reverse) {
        const totalSize = config.totalItems * config.itemSize;
        const reversePosition = totalSize - position;
        index = Math.floor(reversePosition / config.itemSize);
      }

      return Math.max(0, Math.min(index, config.totalItems - 1));
    }

    // Dynamic size - accumulate until we reach position
    let currentOffset = 0;
    const indices = config.reverse
      ? Array.from(
          { length: config.totalItems },
          (_, i) => config.totalItems - 1 - i
        )
      : Array.from({ length: config.totalItems }, (_, i) => i);

    for (const i of indices) {
      const cachedSize = sizeCache?.get(i);
      const itemSize = cachedSize || config.estimatedItemSize;

      if (currentOffset + itemSize > position) {
        return i;
      }
      currentOffset += itemSize;
    }

    return Math.max(0, config.totalItems - 1);
  }

  /**
   * Calculate scroll position for item index in current orientation
   */
  static calculateScrollPosition(
    targetIndex: number,
    alignment: "start" | "center" | "end",
    config: OrientationViewportConfig,
    sizeCache?: Map<number, number>
  ): number {
    let itemOffset: number;
    let itemSize: number;

    if (typeof config.itemSize === "number") {
      // Fixed size
      itemOffset = this.calculateItemOffset(targetIndex, config);
      itemSize = config.itemSize;
    } else {
      // Dynamic size
      itemOffset = this.calculateItemOffset(targetIndex, config, sizeCache);
      itemSize = sizeCache?.get(targetIndex) || config.estimatedItemSize;
    }

    let scrollPosition = itemOffset;

    // Adjust for alignment
    switch (alignment) {
      case "center":
        scrollPosition = itemOffset - config.containerSize / 2 + itemSize / 2;
        break;
      case "end":
        scrollPosition = itemOffset - config.containerSize + itemSize;
        break;
      case "start":
      default:
        scrollPosition = itemOffset;
        break;
    }

    // Handle reverse orientation
    if (config.reverse) {
      const totalSize = this.calculateTotalSize(config, sizeCache);
      scrollPosition = totalSize - scrollPosition - config.containerSize;
    }

    return Math.max(0, scrollPosition);
  }

  /**
   * Calculate cross-axis positioning for orientation
   */
  static calculateCrossAxisPosition(
    alignment: "start" | "center" | "end" | "stretch",
    containerCrossSize: number,
    itemCrossSize?: number
  ): { position: number; size: number | "auto" } {
    switch (alignment) {
      case "start":
        return { position: 0, size: itemCrossSize || "auto" };

      case "center":
        if (itemCrossSize) {
          return {
            position: (containerCrossSize - itemCrossSize) / 2,
            size: itemCrossSize,
          };
        }
        return { position: 0, size: "auto" };

      case "end":
        if (itemCrossSize) {
          return {
            position: containerCrossSize - itemCrossSize,
            size: itemCrossSize,
          };
        }
        return { position: 0, size: "auto" };

      case "stretch":
      default:
        return { position: 0, size: containerCrossSize };
    }
  }

  /**
   * Convert viewport info between orientations
   */
  static adaptViewportInfo(
    viewportInfo: ViewportInfo,
    orientation: "horizontal" | "vertical"
  ): ViewportInfo {
    if (orientation === "horizontal") {
      // Swap width/height properties for horizontal orientation
      return {
        ...viewportInfo,
        scrollTop: viewportInfo.scrollLeft || 0,
        scrollLeft: viewportInfo.scrollTop,
        containerHeight: viewportInfo.containerWidth,
        containerWidth: viewportInfo.containerHeight,
        totalHeight: viewportInfo.totalWidth || 0,
        totalWidth: viewportInfo.totalHeight,
      };
    }

    return viewportInfo;
  }

  /**
   * Calculate orientation-aware overscan range
   */
  static calculateOverscanRange(
    visibleRange: ItemRange,
    overscan: number,
    totalItems: number,
    reverse: boolean = false
  ): ItemRange {
    let start: number;
    let end: number;

    if (reverse) {
      // For reverse orientation, overscan in opposite direction
      start = Math.max(0, visibleRange.start - overscan);
      end = Math.min(totalItems - 1, visibleRange.end + overscan);
    } else {
      // Normal overscan
      start = Math.max(0, visibleRange.start - overscan);
      end = Math.min(totalItems - 1, visibleRange.end + overscan);
    }

    return {
      start,
      end,
      count: end - start + 1,
    };
  }

  /**
   * Get CSS transform for item positioning in current orientation
   */
  static getCSSTransform(
    orientation: "horizontal" | "vertical",
    position: number,
    crossPosition?: number
  ): string {
    if (orientation === "horizontal") {
      const translateX = `translateX(${position}px)`;
      const translateY = crossPosition ? `translateY(${crossPosition}px)` : "";
      return translateY ? `${translateX} ${translateY}` : translateX;
    } else {
      const translateY = `translateY(${position}px)`;
      const translateX = crossPosition ? `translateX(${crossPosition}px)` : "";
      return translateX ? `${translateY} ${translateX}` : translateY;
    }
  }

  /**
   * Calculate item bounds for intersection detection
   */
  static calculateItemBounds(
    index: number,
    config: OrientationViewportConfig,
    sizeCache?: Map<number, number>
  ): { start: number; end: number; size: number } {
    const itemSize =
      typeof config.itemSize === "number"
        ? config.itemSize
        : sizeCache?.get(index) || config.estimatedItemSize;

    const start = this.calculateItemOffset(index, config, sizeCache);
    const end = start + itemSize;

    return { start, end, size: itemSize };
  }

  /**
   * Check if item is visible in viewport for current orientation
   */
  static isItemVisible(
    itemBounds: { start: number; end: number },
    viewportStart: number,
    viewportEnd: number
  ): boolean {
    return itemBounds.end > viewportStart && itemBounds.start < viewportEnd;
  }
}
