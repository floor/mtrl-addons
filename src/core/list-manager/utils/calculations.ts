/**
 * Viewport and range calculation utilities
 * Orientation-agnostic math functions for virtual scrolling
 */

import type { ItemRange, ViewportInfo, ListManagerConfig } from "../types";
import { LIST_MANAGER_CONSTANTS } from "../constants";

/**
 * Calculate visible range based on scroll position and container size
 * Works for both vertical and horizontal orientations
 */
export function calculateVisibleRange(
  virtualScrollPosition: number,
  containerSize: number,
  estimatedItemSize: number,
  totalItems: number,
  overscan: number = LIST_MANAGER_CONSTANTS.VIRTUAL_SCROLL.OVERSCAN_BUFFER,
  measuredSizes?: Map<number, number>
): ItemRange {
  let startIndex = 0;

  // Calculate start index using measured sizes if available
  if (measuredSizes && measuredSizes.size > 0) {
    let position = 0;
    let found = false;

    for (let i = 0; i < totalItems; i++) {
      const itemSize = measuredSizes.get(i) || estimatedItemSize;

      // Check if the scroll position is within this item's range
      if (
        virtualScrollPosition >= position &&
        virtualScrollPosition < position + itemSize
      ) {
        startIndex = i;
        found = true;
        break;
      }

      position += itemSize;
    }

    // If we didn't find the item within loaded items, estimate based on position
    if (!found) {
      // Calculate based on estimated size beyond what we have
      const loadedItemsEndPosition = position; // This is where our loaded items end

      if (virtualScrollPosition >= loadedItemsEndPosition) {
        // We're scrolling beyond loaded items, use simple estimation
        // This ensures we calculate the correct index based on total scroll position
        startIndex = Math.floor(virtualScrollPosition / estimatedItemSize);
      } else {
        // Fallback to estimated calculation
        startIndex = Math.floor(virtualScrollPosition / estimatedItemSize);
      }
    }
  } else {
    // Fallback to estimated size calculation
    startIndex = Math.floor(virtualScrollPosition / estimatedItemSize);
  }

  // Calculate how many items fit in the container
  // Add extra items to ensure smooth scrolling without gaps
  const visibleItemsCount = Math.ceil(containerSize / estimatedItemSize); // Removed + 2 extra items

  // Calculate end index with overscan buffer
  const endIndex = Math.min(
    startIndex + visibleItemsCount + overscan,
    totalItems - 1
  );

  // Apply overscan to start (but don't go below 0)
  // Increase overscan for smoother scrolling
  const bufferedStartIndex = Math.max(0, startIndex - overscan); // Removed - 1 extra item

  const result = {
    start: bufferedStartIndex,
    end: Math.max(bufferedStartIndex, endIndex),
  };

  return result;
}

/**
 * Calculate total virtual size based on items and estimated size
 */
export function calculateTotalVirtualSize(
  totalItems: number,
  estimatedItemSize: number,
  measuredSizes?: Map<number, number>
): number {
  if (!measuredSizes || measuredSizes.size === 0) {
    return totalItems * estimatedItemSize;
  }

  // Use measured sizes where available, estimated for the rest
  let totalSize = 0;
  for (let i = 0; i < totalItems; i++) {
    totalSize += measuredSizes.get(i) || estimatedItemSize;
  }

  return totalSize;
}

/**
 * Calculate container position for virtual scrolling
 * Returns the transform value for the container
 */
export function calculateContainerPosition(
  virtualScrollPosition: number,
  visibleRange: ItemRange,
  measuredSizes?: Map<number, number>,
  estimatedItemSize: number = LIST_MANAGER_CONSTANTS.VIRTUAL_SCROLL
    .DEFAULT_ITEM_SIZE
): number {
  let offset = 0;

  // Calculate offset based on measured sizes if available
  if (measuredSizes && measuredSizes.size > 0) {
    for (let i = 0; i < visibleRange.start; i++) {
      offset += measuredSizes.get(i) || estimatedItemSize;
    }
  } else {
    // Use estimated size for all items before visible range
    offset = visibleRange.start * estimatedItemSize;
  }

  return offset;
}

/**
 * Calculate scroll position for specific index
 */
export function calculateScrollPositionForIndex(
  targetIndex: number,
  estimatedItemSize: number,
  measuredSizes?: Map<number, number>,
  alignment: "start" | "center" | "end" = "start",
  containerSize: number = 0
): number {
  let scrollPosition = 0;

  // Calculate position based on measured sizes if available
  if (measuredSizes && measuredSizes.size > 0) {
    for (let i = 0; i < targetIndex; i++) {
      scrollPosition += measuredSizes.get(i) || estimatedItemSize;
    }
  } else {
    scrollPosition = targetIndex * estimatedItemSize;
  }

  // Apply alignment
  if (alignment === "center") {
    const itemSize = measuredSizes?.get(targetIndex) || estimatedItemSize;
    scrollPosition -= (containerSize - itemSize) / 2;
  } else if (alignment === "end") {
    const itemSize = measuredSizes?.get(targetIndex) || estimatedItemSize;
    scrollPosition -= containerSize - itemSize;
  }

  return Math.max(0, scrollPosition);
}

/**
 * Calculate page-based scroll position
 */
export function calculateScrollPositionForPage(
  targetPage: number,
  pageSize: number,
  estimatedItemSize: number,
  measuredSizes?: Map<number, number>,
  alignment: "start" | "center" | "end" = "start",
  containerSize: number = 0
): number {
  const targetIndex = (targetPage - 1) * pageSize;
  return calculateScrollPositionForIndex(
    targetIndex,
    estimatedItemSize,
    measuredSizes,
    alignment,
    containerSize
  );
}

/**
 * Calculate scrollbar thumb position and size
 */
export function calculateScrollbarMetrics(
  virtualScrollPosition: number,
  totalVirtualSize: number,
  containerSize: number,
  scrollbarTrackSize: number
): { thumbPosition: number; thumbSize: number } {
  // Calculate thumb size based on container to total ratio
  const thumbSize = Math.max(
    LIST_MANAGER_CONSTANTS.SCROLLBAR.THUMB_MIN_SIZE,
    (containerSize / totalVirtualSize) * scrollbarTrackSize
  );

  // Calculate thumb position based on scroll position
  const scrollRatio =
    virtualScrollPosition / (totalVirtualSize - containerSize);
  const thumbPosition = scrollRatio * (scrollbarTrackSize - thumbSize);

  return {
    thumbPosition: Math.max(0, thumbPosition),
    thumbSize: Math.min(thumbSize, scrollbarTrackSize),
  };
}

/**
 * Calculate viewport info for current state
 */
export function calculateViewportInfo(
  virtualScrollPosition: number,
  containerSize: number,
  totalItems: number,
  estimatedItemSize: number,
  measuredSizes?: Map<number, number>,
  overscan: number = LIST_MANAGER_CONSTANTS.VIRTUAL_SCROLL.OVERSCAN_BUFFER
): ViewportInfo {
  const visibleRange = calculateVisibleRange(
    virtualScrollPosition,
    containerSize,
    estimatedItemSize,
    totalItems,
    overscan,
    measuredSizes
  );

  const totalVirtualSize = calculateTotalVirtualSize(
    totalItems,
    estimatedItemSize,
    measuredSizes
  );

  return {
    containerSize,
    totalVirtualSize,
    visibleRange,
    virtualScrollPosition,
  };
}

/**
 * Calculate optimal overscan based on viewport capacity
 * Uses a percentage-based approach that scales with viewport size
 */
export function calculateOptimalOverscan(
  containerSize: number,
  estimatedItemSize: number,
  scrollSpeed?: number
): number {
  // Calculate how many items fit in the viewport
  const viewportCapacity = Math.ceil(containerSize / estimatedItemSize);

  // Base overscan is 15% of viewport capacity
  let overscan = Math.ceil(viewportCapacity * 0.15);

  // Adjust based on scroll speed if provided
  if (scrollSpeed !== undefined) {
    if (scrollSpeed > 1000) {
      // Fast scrolling: increase overscan to 25% of viewport
      overscan = Math.ceil(viewportCapacity * 0.25);
    } else if (scrollSpeed < 100) {
      // Slow scrolling: reduce overscan to 10% of viewport
      overscan = Math.ceil(viewportCapacity * 0.1);
    }
  }

  // Apply min/max constraints
  const MIN_OVERSCAN = 1;
  const MAX_OVERSCAN = Math.min(10, Math.ceil(viewportCapacity * 0.3)); // Max 30% of viewport

  return Math.max(MIN_OVERSCAN, Math.min(MAX_OVERSCAN, overscan));
}

/**
 * Calculate range size based on viewport capacity
 */
export function calculateInitialRangeSize(
  containerSize: number,
  estimatedItemSize: number,
  viewportMultiplier: number = LIST_MANAGER_CONSTANTS.INITIAL_LOAD
    .VIEWPORT_MULTIPLIER
): number {
  const viewportCapacity = Math.ceil(containerSize / estimatedItemSize);
  const rangeSize = Math.ceil(viewportCapacity * viewportMultiplier);

  return Math.max(
    LIST_MANAGER_CONSTANTS.INITIAL_LOAD.MIN_ITEMS,
    Math.min(rangeSize, LIST_MANAGER_CONSTANTS.INITIAL_LOAD.MAX_ITEMS)
  );
}

/**
 * Calculate missing ranges that need to be loaded
 */
export function calculateMissingRanges(
  visibleRange: ItemRange,
  loadedRanges: Set<number>,
  rangeSize: number
): ItemRange[] {
  const missingRanges: ItemRange[] = [];

  const startRange = Math.floor(visibleRange.start / rangeSize);
  const endRange = Math.floor(visibleRange.end / rangeSize);

  for (let range = startRange; range <= endRange; range++) {
    if (!loadedRanges.has(range)) {
      const rangeStart = range * rangeSize;
      const rangeEnd = Math.min(rangeStart + rangeSize - 1, visibleRange.end);

      missingRanges.push({
        start: rangeStart,
        end: rangeEnd,
      });
    }
  }

  return missingRanges;
}

/**
 * Calculate buffer ranges for preloading
 */
export function calculateBufferRanges(
  visibleRange: ItemRange,
  loadedRanges: Set<number>,
  rangeSize: number,
  prefetchRanges: number = LIST_MANAGER_CONSTANTS.RANGE_LOADING.PREFETCH_RANGES
): ItemRange[] {
  const bufferRanges: ItemRange[] = [];

  const startRange = Math.floor(visibleRange.start / rangeSize);
  const endRange = Math.floor(visibleRange.end / rangeSize);

  // Add ranges before visible range
  for (let i = 1; i <= prefetchRanges; i++) {
    const range = startRange - i;
    if (range >= 0 && !loadedRanges.has(range)) {
      const rangeStart = range * rangeSize;
      const rangeEnd = rangeStart + rangeSize - 1;

      bufferRanges.push({
        start: rangeStart,
        end: rangeEnd,
      });
    }
  }

  // Add ranges after visible range
  for (let i = 1; i <= prefetchRanges; i++) {
    const range = endRange + i;
    if (!loadedRanges.has(range)) {
      const rangeStart = range * rangeSize;
      const rangeEnd = rangeStart + rangeSize - 1;

      bufferRanges.push({
        start: rangeStart,
        end: rangeEnd,
      });
    }
  }

  return bufferRanges;
}

/**
 * Clamp value within boundaries
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Apply boundary resistance to scroll position
 */
export function applyBoundaryResistance(
  scrollPosition: number,
  totalVirtualSize: number,
  containerSize: number,
  resistance: number = LIST_MANAGER_CONSTANTS.BOUNDARIES.BOUNDARY_RESISTANCE
): number {
  const maxScroll = Math.max(0, totalVirtualSize - containerSize);

  // Apply resistance at boundaries
  if (scrollPosition < 0) {
    return scrollPosition * resistance;
  } else if (scrollPosition > maxScroll) {
    return maxScroll + (scrollPosition - maxScroll) * resistance;
  }

  return scrollPosition;
}
