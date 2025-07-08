/**
 * Range calculation utility for pagination and data loading
 * Handles range-based pagination strategies and loading logic
 */

import type { ItemRange, RangeCalculationResult } from "../types";
import { LIST_MANAGER_CONSTANTS } from "../constants";

/**
 * Calculate range index from item index
 */
export function calculateRangeIndex(
  itemIndex: number,
  rangeSize: number = LIST_MANAGER_CONSTANTS.RANGE_LOADING.DEFAULT_RANGE_SIZE
): number {
  return Math.floor(itemIndex / rangeSize);
}

/**
 * Calculate range bounds from range index
 */
export function calculateRangeBounds(
  rangeIndex: number,
  rangeSize: number = LIST_MANAGER_CONSTANTS.RANGE_LOADING.DEFAULT_RANGE_SIZE
): ItemRange {
  const start = rangeIndex * rangeSize;
  const end = start + rangeSize - 1;

  return { start, end };
}

/**
 * Calculate all required ranges for a visible range
 */
export function calculateRequiredRanges(
  visibleRange: ItemRange,
  rangeSize: number = LIST_MANAGER_CONSTANTS.RANGE_LOADING.DEFAULT_RANGE_SIZE
): number[] {
  const ranges: number[] = [];

  const startRange = calculateRangeIndex(visibleRange.start, rangeSize);
  const endRange = calculateRangeIndex(visibleRange.end, rangeSize);

  for (let range = startRange; range <= endRange; range++) {
    ranges.push(range);
  }

  return ranges;
}

/**
 * Calculate missing ranges that need to be loaded
 */
export function calculateMissingRanges(
  visibleRange: ItemRange,
  loadedRanges: Set<number>,
  rangeSize: number = LIST_MANAGER_CONSTANTS.RANGE_LOADING.DEFAULT_RANGE_SIZE
): ItemRange[] {
  const requiredRanges = calculateRequiredRanges(visibleRange, rangeSize);
  const missingRanges: ItemRange[] = [];

  for (const rangeIndex of requiredRanges) {
    if (!loadedRanges.has(rangeIndex)) {
      missingRanges.push(calculateRangeBounds(rangeIndex, rangeSize));
    }
  }

  return missingRanges;
}

/**
 * Calculate prefetch ranges based on scroll direction and speed
 */
export function calculatePrefetchRanges(
  visibleRange: ItemRange,
  loadedRanges: Set<number>,
  direction: "forward" | "backward",
  prefetchCount: number = LIST_MANAGER_CONSTANTS.RANGE_LOADING.PREFETCH_RANGES,
  rangeSize: number = LIST_MANAGER_CONSTANTS.RANGE_LOADING.DEFAULT_RANGE_SIZE
): ItemRange[] {
  const prefetchRanges: ItemRange[] = [];

  const startRange = calculateRangeIndex(visibleRange.start, rangeSize);
  const endRange = calculateRangeIndex(visibleRange.end, rangeSize);

  if (direction === "forward") {
    // Prefetch ranges after visible range
    for (let i = 1; i <= prefetchCount; i++) {
      const rangeIndex = endRange + i;
      if (!loadedRanges.has(rangeIndex)) {
        prefetchRanges.push(calculateRangeBounds(rangeIndex, rangeSize));
      }
    }
  } else {
    // Prefetch ranges before visible range
    for (let i = 1; i <= prefetchCount; i++) {
      const rangeIndex = startRange - i;
      if (rangeIndex >= 0 && !loadedRanges.has(rangeIndex)) {
        prefetchRanges.push(calculateRangeBounds(rangeIndex, rangeSize));
      }
    }
  }

  return prefetchRanges;
}

/**
 * Calculate comprehensive range result
 */
export function calculateRangeResult(
  visibleRange: ItemRange,
  loadedRanges: Set<number>,
  direction: "forward" | "backward",
  prefetchCount: number = LIST_MANAGER_CONSTANTS.RANGE_LOADING.PREFETCH_RANGES,
  rangeSize: number = LIST_MANAGER_CONSTANTS.RANGE_LOADING.DEFAULT_RANGE_SIZE
): RangeCalculationResult {
  const missingRanges = calculateMissingRanges(
    visibleRange,
    loadedRanges,
    rangeSize
  );
  const bufferRanges = calculatePrefetchRanges(
    visibleRange,
    loadedRanges,
    direction,
    prefetchCount,
    rangeSize
  );

  return {
    visibleRange,
    loadedRanges,
    missingRanges,
    bufferRanges,
  };
}

/**
 * Convert range to pagination parameters (page strategy)
 */
export function rangeToPaginationParams(
  range: ItemRange,
  strategy: "page" | "offset" | "cursor" = "page"
): { page?: number; offset?: number; limit: number } {
  const limit = range.end - range.start + 1;

  switch (strategy) {
    case "page":
      return {
        page: Math.floor(range.start / limit) + 1,
        limit,
      };

    case "offset":
      return {
        offset: range.start,
        limit,
      };

    case "cursor":
      return {
        limit,
        // cursor would be handled separately based on last item
      };

    default:
      return { page: 1, limit };
  }
}

/**
 * Convert multiple ranges to batch pagination parameters
 */
export function rangesToBatchParams(
  ranges: ItemRange[],
  strategy: "page" | "offset" | "cursor" = "page"
): Array<{ page?: number; offset?: number; limit: number }> {
  return ranges.map((range) => rangeToPaginationParams(range, strategy));
}

/**
 * Calculate optimal range size based on viewport
 */
export function calculateOptimalRangeSize(
  containerSize: number,
  estimatedItemSize: number,
  targetRanges: number = 3
): number {
  const viewportCapacity = Math.ceil(containerSize / estimatedItemSize);
  const optimalRangeSize = Math.ceil(viewportCapacity / targetRanges);

  return Math.max(
    LIST_MANAGER_CONSTANTS.RANGE_LOADING.DEFAULT_RANGE_SIZE,
    optimalRangeSize
  );
}

/**
 * Check if range is within viewport bounds
 */
export function isRangeInViewport(
  range: ItemRange,
  visibleRange: ItemRange,
  buffer: number = LIST_MANAGER_CONSTANTS.RANGE_LOADING.BUFFER_SIZE
): boolean {
  const bufferedStart = visibleRange.start - buffer;
  const bufferedEnd = visibleRange.end + buffer;

  return !(range.end < bufferedStart || range.start > bufferedEnd);
}

/**
 * Calculate range priority based on distance from visible range
 */
export function calculateRangePriority(
  range: ItemRange,
  visibleRange: ItemRange
): number {
  const rangeCenter = (range.start + range.end) / 2;
  const visibleCenter = (visibleRange.start + visibleRange.end) / 2;

  // Priority decreases with distance (lower number = higher priority)
  return Math.abs(rangeCenter - visibleCenter);
}

/**
 * Sort ranges by priority (closest to visible range first)
 */
export function sortRangesByPriority(
  ranges: ItemRange[],
  visibleRange: ItemRange
): ItemRange[] {
  return ranges.sort((a, b) => {
    const priorityA = calculateRangePriority(a, visibleRange);
    const priorityB = calculateRangePriority(b, visibleRange);
    return priorityA - priorityB;
  });
}

/**
 * Merge adjacent ranges to reduce request count
 */
export function mergeAdjacentRanges(
  ranges: ItemRange[],
  maxGap: number = LIST_MANAGER_CONSTANTS.RANGE_LOADING.DEFAULT_RANGE_SIZE
): ItemRange[] {
  if (ranges.length <= 1) return ranges;

  // Sort ranges by start position
  const sortedRanges = [...ranges].sort((a, b) => a.start - b.start);
  const mergedRanges: ItemRange[] = [];

  let currentRange = sortedRanges[0];

  for (let i = 1; i < sortedRanges.length; i++) {
    const nextRange = sortedRanges[i];

    // Check if ranges are adjacent or close enough to merge
    if (nextRange.start - currentRange.end <= maxGap) {
      // Merge ranges
      currentRange = {
        start: currentRange.start,
        end: Math.max(currentRange.end, nextRange.end),
      };
    } else {
      // Ranges are too far apart, add current and start new
      mergedRanges.push(currentRange);
      currentRange = nextRange;
    }
  }

  // Add the last range
  mergedRanges.push(currentRange);

  return mergedRanges;
}

/**
 * Calculate range cleanup candidates (far from visible range)
 */
export function calculateRangeCleanupCandidates(
  loadedRanges: Set<number>,
  visibleRange: ItemRange,
  maxDistance: number = LIST_MANAGER_CONSTANTS.RANGE_LOADING
    .DEFAULT_RANGE_SIZE * 5,
  rangeSize: number = LIST_MANAGER_CONSTANTS.RANGE_LOADING.DEFAULT_RANGE_SIZE
): number[] {
  const cleanupCandidates: number[] = [];
  const visibleCenter = (visibleRange.start + visibleRange.end) / 2;

  for (const rangeIndex of loadedRanges) {
    const range = calculateRangeBounds(rangeIndex, rangeSize);
    const rangeCenter = (range.start + range.end) / 2;
    const distance = Math.abs(rangeCenter - visibleCenter);

    if (distance > maxDistance) {
      cleanupCandidates.push(rangeIndex);
    }
  }

  return cleanupCandidates;
}

/**
 * Calculate range loading order with priority
 */
export function calculateRangeLoadingOrder(
  missingRanges: ItemRange[],
  prefetchRanges: ItemRange[],
  visibleRange: ItemRange
): { priority: "high" | "medium" | "low"; ranges: ItemRange[] }[] {
  const highPriority = sortRangesByPriority(missingRanges, visibleRange);
  const lowPriority = sortRangesByPriority(prefetchRanges, visibleRange);

  return [
    { priority: "high", ranges: highPriority },
    { priority: "low", ranges: lowPriority },
  ];
}

/**
 * Get range debug information
 */
export function getRangeDebugInfo(
  visibleRange: ItemRange,
  loadedRanges: Set<number>,
  rangeSize: number = LIST_MANAGER_CONSTANTS.RANGE_LOADING.DEFAULT_RANGE_SIZE
): {
  visibleRange: string;
  requiredRanges: number[];
  loadedRanges: number[];
  missingRanges: ItemRange[];
  rangeSize: number;
} {
  const requiredRanges = calculateRequiredRanges(visibleRange, rangeSize);
  const missingRanges = calculateMissingRanges(
    visibleRange,
    loadedRanges,
    rangeSize
  );

  return {
    visibleRange: `${visibleRange.start}-${visibleRange.end}`,
    requiredRanges,
    loadedRanges: Array.from(loadedRanges).sort((a, b) => a - b),
    missingRanges,
    rangeSize,
  };
}
