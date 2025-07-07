import type { ViewportInfo, VirtualItem } from "../../types";
import { VIRTUAL_SCROLLING } from "../../constants";

/**
 * Item range interface
 */
export interface ItemRange {
  start: number;
  end: number;
  count: number;
}

/**
 * Viewport calculation configuration
 */
export interface ViewportCalculationConfig {
  itemHeight: number | "auto";
  estimatedItemHeight: number;
  overscan: number;
  bufferSize: number;
  containerHeight: number;
  totalItems: number;
}

/**
 * Viewport mathematical calculations
 * Pure functions for viewport-related calculations
 */
export class ViewportMath {
  /**
   * Calculate visible range based on scroll position
   */
  static calculateVisibleRange(
    scrollTop: number,
    config: ViewportCalculationConfig
  ): ItemRange {
    if (config.totalItems === 0) {
      return { start: 0, end: 0, count: 0 };
    }

    const itemHeight =
      typeof config.itemHeight === "number"
        ? config.itemHeight
        : config.estimatedItemHeight;

    const startIndex = Math.floor(scrollTop / itemHeight);
    const visibleCount =
      Math.ceil(config.containerHeight / itemHeight) + config.overscan;
    const endIndex = Math.min(startIndex + visibleCount, config.totalItems - 1);

    return {
      start: startIndex,
      end: endIndex,
      count: endIndex - startIndex + 1,
    };
  }

  /**
   * Calculate render range with buffer around visible range
   */
  static calculateRenderRange(
    visibleRange: ItemRange,
    bufferSize: number,
    totalItems: number
  ): ItemRange {
    const start = Math.max(0, visibleRange.start - bufferSize);
    const end = Math.min(totalItems - 1, visibleRange.end + bufferSize);

    return {
      start,
      end,
      count: end - start + 1,
    };
  }

  /**
   * Calculate item offset position
   */
  static calculateItemOffset(
    index: number,
    itemHeight: number | "auto",
    estimatedItemHeight: number,
    heightCache?: Map<number, number>
  ): number {
    if (typeof itemHeight === "number") {
      // Fixed height - simple calculation
      return index * itemHeight;
    }

    // Dynamic height - use cache or estimation
    let offset = 0;
    for (let i = 0; i < index; i++) {
      const cachedHeight = heightCache?.get(i);
      offset += cachedHeight || estimatedItemHeight;
    }
    return offset;
  }

  /**
   * Calculate total content height
   */
  static calculateTotalHeight(
    itemCount: number,
    itemHeight: number | "auto",
    estimatedItemHeight: number,
    heightCache?: Map<number, number>
  ): number {
    if (typeof itemHeight === "number") {
      // Fixed height - simple calculation
      return itemCount * itemHeight;
    }

    // Dynamic height - sum all cached/estimated heights
    let totalHeight = 0;
    for (let i = 0; i < itemCount; i++) {
      const cachedHeight = heightCache?.get(i);
      totalHeight += cachedHeight || estimatedItemHeight;
    }
    return totalHeight;
  }

  /**
   * Find item index at specific scroll position
   */
  static findItemAtPosition(
    scrollTop: number,
    itemHeight: number | "auto",
    estimatedItemHeight: number,
    totalItems: number,
    heightCache?: Map<number, number>
  ): number {
    if (typeof itemHeight === "number") {
      // Fixed height - simple calculation
      return Math.floor(scrollTop / itemHeight);
    }

    // Dynamic height - accumulate until we reach scroll position
    let currentOffset = 0;
    for (let i = 0; i < totalItems; i++) {
      const cachedHeight = heightCache?.get(i);
      const height = cachedHeight || estimatedItemHeight;

      if (currentOffset + height > scrollTop) {
        return i;
      }
      currentOffset += height;
    }

    return Math.max(0, totalItems - 1);
  }

  /**
   * Calculate scroll position for item index
   */
  static calculateScrollPosition(
    targetIndex: number,
    alignment: "start" | "center" | "end",
    itemHeight: number | "auto",
    estimatedItemHeight: number,
    containerHeight: number,
    heightCache?: Map<number, number>
  ): number {
    let itemOffset: number;
    let itemHeight_: number;

    if (typeof itemHeight === "number") {
      // Fixed height
      itemOffset = targetIndex * itemHeight;
      itemHeight_ = itemHeight;
    } else {
      // Dynamic height
      itemOffset = this.calculateItemOffset(
        targetIndex,
        itemHeight,
        estimatedItemHeight,
        heightCache
      );
      itemHeight_ = heightCache?.get(targetIndex) || estimatedItemHeight;
    }

    let scrollPosition = itemOffset;

    // Adjust for alignment
    switch (alignment) {
      case "center":
        scrollPosition = itemOffset - containerHeight / 2 + itemHeight_ / 2;
        break;
      case "end":
        scrollPosition = itemOffset - containerHeight + itemHeight_;
        break;
      case "start":
      default:
        scrollPosition = itemOffset;
        break;
    }

    return Math.max(0, scrollPosition);
  }

  /**
   * Check if item is in visible range
   */
  static isItemVisible(itemIndex: number, visibleRange: ItemRange): boolean {
    return itemIndex >= visibleRange.start && itemIndex <= visibleRange.end;
  }

  /**
   * Check if item is in render range
   */
  static isItemInRenderRange(
    itemIndex: number,
    renderRange: ItemRange
  ): boolean {
    return itemIndex >= renderRange.start && itemIndex <= renderRange.end;
  }

  /**
   * Calculate viewport utilization ratio
   */
  static calculateUtilization(
    visibleRange: ItemRange,
    renderRange: ItemRange
  ): number {
    if (renderRange.count === 0) return 0;
    return visibleRange.count / renderRange.count;
  }

  /**
   * Determine scroll direction
   */
  static getScrollDirection(
    currentScrollTop: number,
    previousScrollTop: number,
    threshold: number = 5
  ): "up" | "down" | "none" {
    const delta = currentScrollTop - previousScrollTop;

    if (Math.abs(delta) < threshold) {
      return "none";
    }

    return delta > 0 ? "down" : "up";
  }

  /**
   * Calculate overscan range
   */
  static calculateOverscanRange(
    visibleRange: ItemRange,
    overscan: number,
    totalItems: number
  ): ItemRange {
    const start = Math.max(0, visibleRange.start - overscan);
    const end = Math.min(totalItems - 1, visibleRange.end + overscan);

    return {
      start,
      end,
      count: end - start + 1,
    };
  }

  /**
   * Validate range boundaries
   */
  static validateRange(range: ItemRange, totalItems: number): ItemRange {
    const start = Math.max(0, Math.min(range.start, totalItems - 1));
    const end = Math.max(start, Math.min(range.end, totalItems - 1));

    return {
      start,
      end,
      count: end - start + 1,
    };
  }

  /**
   * Calculate intersection ratio for viewport
   */
  static calculateIntersectionRatio(
    itemTop: number,
    itemBottom: number,
    viewportTop: number,
    viewportBottom: number
  ): number {
    const intersectionTop = Math.max(itemTop, viewportTop);
    const intersectionBottom = Math.min(itemBottom, viewportBottom);

    if (intersectionTop >= intersectionBottom) {
      return 0; // No intersection
    }

    const intersectionHeight = intersectionBottom - intersectionTop;
    const itemHeight = itemBottom - itemTop;

    return itemHeight > 0 ? intersectionHeight / itemHeight : 0;
  }

  /**
   * Calculate viewport metrics for performance monitoring
   */
  static calculateViewportMetrics(
    viewportInfo: ViewportInfo,
    config: ViewportCalculationConfig
  ): {
    visibilityRatio: number;
    scrollPercentage: number;
    itemsPerViewport: number;
    averageItemHeight: number;
  } {
    const { visibleRange, containerHeight, totalHeight } = viewportInfo;

    const visibilityRatio = visibleRange.count / config.totalItems;
    const scrollPercentage =
      totalHeight > 0 ? viewportInfo.scrollTop / totalHeight : 0;
    const itemsPerViewport = containerHeight / config.estimatedItemHeight;
    const averageItemHeight =
      visibleRange.count > 0
        ? containerHeight / visibleRange.count
        : config.estimatedItemHeight;

    return {
      visibilityRatio,
      scrollPercentage,
      itemsPerViewport,
      averageItemHeight,
    };
  }
}
