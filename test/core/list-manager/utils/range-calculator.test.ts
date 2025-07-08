import { describe, it, expect } from "bun:test";
import {
  calculateRangeIndex,
  calculateRangeBounds,
  calculateRequiredRanges,
  calculatePrefetchRanges,
  calculateRangeResult,
  rangeToPaginationParams,
  rangesToBatchParams,
  calculateOptimalRangeSize,
  isRangeInViewport,
  calculateRangePriority,
  sortRangesByPriority,
  mergeAdjacentRanges,
  calculateRangeCleanupCandidates,
  calculateRangeLoadingOrder,
  getRangeDebugInfo,
} from "../../../../src/core/list-manager/utils/range-calculator";
import type { ItemRange } from "../../../../src/core/list-manager/types";

describe("Range Calculator Utility", () => {
  describe("calculateRangeIndex", () => {
    it("should calculate range index from item index", () => {
      expect(calculateRangeIndex(0, 10)).toBe(0);
      expect(calculateRangeIndex(5, 10)).toBe(0);
      expect(calculateRangeIndex(10, 10)).toBe(1);
      expect(calculateRangeIndex(15, 10)).toBe(1);
      expect(calculateRangeIndex(25, 10)).toBe(2);
    });

    it("should handle edge cases", () => {
      expect(calculateRangeIndex(0, 1)).toBe(0);
      expect(calculateRangeIndex(100, 50)).toBe(2);
    });
  });

  describe("calculateRangeBounds", () => {
    it("should calculate range bounds", () => {
      const bounds = calculateRangeBounds(2, 10, 100);

      expect(bounds.start).toBe(20);
      expect(bounds.end).toBe(29);
    });

    it("should handle range at end of list", () => {
      const bounds = calculateRangeBounds(9, 10, 95);

      expect(bounds.start).toBe(90);
      expect(bounds.end).toBe(94); // Clamped to total items
    });

    it("should handle single item ranges", () => {
      const bounds = calculateRangeBounds(5, 1, 10);

      expect(bounds.start).toBe(5);
      expect(bounds.end).toBe(5);
    });
  });

  describe("calculateRequiredRanges", () => {
    it("should calculate required ranges for visible area", () => {
      const visibleRange: ItemRange = { start: 15, end: 35 };
      const loadedRanges = new Set([0, 1]); // Ranges 0-9, 10-19 loaded

      const required = calculateRequiredRanges({
        visibleRange,
        rangeSize: 10,
        totalItems: 100,
        loadedRanges,
        prefetchDistance: 1,
      });

      expect(required.length).toBeGreaterThan(0);
      expect(required.some((r) => r.start >= 15 && r.end <= 35)).toBe(true);
    });

    it("should include prefetch ranges", () => {
      const visibleRange: ItemRange = { start: 20, end: 30 };
      const loadedRanges = new Set<number>();

      const required = calculateRequiredRanges({
        visibleRange,
        rangeSize: 10,
        totalItems: 100,
        loadedRanges,
        prefetchDistance: 1,
      });

      // Should include ranges before and after visible range
      const allRanges = required.flatMap((r) =>
        Array.from({ length: r.end - r.start + 1 }, (_, i) => r.start + i)
      );

      expect(allRanges.some((i) => i < 20)).toBe(true); // Before visible
      expect(allRanges.some((i) => i > 30)).toBe(true); // After visible
    });

    it("should exclude already loaded ranges", () => {
      const visibleRange: ItemRange = { start: 20, end: 30 };
      const loadedRanges = new Set([2]); // Range 20-29 already loaded

      const required = calculateRequiredRanges({
        visibleRange,
        rangeSize: 10,
        totalItems: 100,
        loadedRanges,
        prefetchDistance: 0,
      });

      // Should not include range 2 (already loaded)
      expect(required.every((r) => !(r.start === 20 && r.end === 29))).toBe(
        true
      );
    });
  });

  describe("calculatePrefetchRanges", () => {
    it("should calculate prefetch ranges in both directions", () => {
      const visibleRange: ItemRange = { start: 40, end: 60 };

      const prefetch = calculatePrefetchRanges({
        visibleRange,
        direction: "forward",
        distance: 2,
        rangeSize: 20,
        totalItems: 200,
      });

      expect(prefetch.length).toBeGreaterThan(0);
      expect(prefetch.some((r) => r.start > 60)).toBe(true); // Forward ranges
    });

    it("should handle backward prefetch", () => {
      const visibleRange: ItemRange = { start: 40, end: 60 };

      const prefetch = calculatePrefetchRanges({
        visibleRange,
        direction: "backward",
        distance: 1,
        rangeSize: 20,
        totalItems: 200,
      });

      expect(prefetch.some((r) => r.end < 40)).toBe(true); // Backward ranges
    });

    it("should respect total items boundary", () => {
      const visibleRange: ItemRange = { start: 80, end: 99 };

      const prefetch = calculatePrefetchRanges({
        visibleRange,
        direction: "forward",
        distance: 5,
        rangeSize: 20,
        totalItems: 100,
      });

      // Should not exceed total items
      expect(prefetch.every((r) => r.end < 100)).toBe(true);
    });
  });

  describe("calculateRangeResult", () => {
    it("should calculate comprehensive range result", () => {
      const visibleRange: ItemRange = { start: 25, end: 45 };
      const loadedRanges = new Set([1, 2]); // Some ranges loaded

      const result = calculateRangeResult({
        visibleRange,
        rangeSize: 20,
        totalItems: 200,
        loadedRanges,
        prefetchDistance: 1,
        direction: "forward",
      });

      expect(result).toHaveProperty("required");
      expect(result).toHaveProperty("prefetch");
      expect(result).toHaveProperty("missing");
      expect(result).toHaveProperty("priority");
      expect(result).toHaveProperty("loadingOrder");

      expect(result.required.length).toBeGreaterThan(0);
      expect(result.priority.length).toBeGreaterThan(0);
    });
  });

  describe("rangeToPaginationParams", () => {
    it("should convert range to page-based pagination", () => {
      const range: ItemRange = { start: 20, end: 39 };

      const params = rangeToPaginationParams(range, "page", 10);

      expect(params.strategy).toBe("page");
      expect(params.page).toBe(3); // Page 3 for items 20-29
      expect(params.limit).toBe(20); // Range size
    });

    it("should convert range to offset-based pagination", () => {
      const range: ItemRange = { start: 50, end: 74 };

      const params = rangeToPaginationParams(range, "offset", 25);

      expect(params.strategy).toBe("offset");
      expect(params.offset).toBe(50);
      expect(params.limit).toBe(25);
    });

    it("should convert range to cursor-based pagination", () => {
      const range: ItemRange = { start: 100, end: 119 };

      const params = rangeToPaginationParams(range, "cursor", 20);

      expect(params.strategy).toBe("cursor");
      expect(params.after).toBe("item-99"); // Cursor after last item before range
      expect(params.limit).toBe(20);
    });
  });

  describe("rangesToBatchParams", () => {
    it("should convert multiple ranges to batch parameters", () => {
      const ranges: ItemRange[] = [
        { start: 0, end: 19 },
        { start: 40, end: 59 },
        { start: 80, end: 99 },
      ];

      const batch = rangesToBatchParams(ranges, "offset");

      expect(batch.strategy).toBe("batch");
      expect(batch.requests).toHaveLength(3);
      expect(batch.requests[0].offset).toBe(0);
      expect(batch.requests[1].offset).toBe(40);
      expect(batch.requests[2].offset).toBe(80);
    });

    it("should handle empty ranges", () => {
      const batch = rangesToBatchParams([], "page");

      expect(batch.requests).toHaveLength(0);
    });
  });

  describe("calculateOptimalRangeSize", () => {
    it("should calculate optimal range size based on parameters", () => {
      const size = calculateOptimalRangeSize({
        averageItemSize: 50,
        containerSize: 500,
        networkLatency: 100,
        bandwidth: 1000, // kb/s
        minRangeSize: 10,
        maxRangeSize: 100,
      });

      expect(size).toBeGreaterThanOrEqual(10);
      expect(size).toBeLessThanOrEqual(100);
    });

    it("should respect minimum range size", () => {
      const size = calculateOptimalRangeSize({
        averageItemSize: 10,
        containerSize: 100,
        networkLatency: 10,
        bandwidth: 10000,
        minRangeSize: 50,
        maxRangeSize: 200,
      });

      expect(size).toBeGreaterThanOrEqual(50);
    });

    it("should respect maximum range size", () => {
      const size = calculateOptimalRangeSize({
        averageItemSize: 200,
        containerSize: 2000,
        networkLatency: 500,
        bandwidth: 100,
        minRangeSize: 5,
        maxRangeSize: 30,
      });

      expect(size).toBeLessThanOrEqual(30);
    });
  });

  describe("isRangeInViewport", () => {
    it("should detect range in viewport", () => {
      const range: ItemRange = { start: 20, end: 40 };
      const viewport: ItemRange = { start: 10, end: 50 };

      expect(isRangeInViewport(range, viewport)).toBe(true);
    });

    it("should detect range partially in viewport", () => {
      const range: ItemRange = { start: 5, end: 25 };
      const viewport: ItemRange = { start: 20, end: 60 };

      expect(isRangeInViewport(range, viewport)).toBe(true);
    });

    it("should detect range outside viewport", () => {
      const range: ItemRange = { start: 100, end: 120 };
      const viewport: ItemRange = { start: 10, end: 50 };

      expect(isRangeInViewport(range, viewport)).toBe(false);
    });

    it("should handle edge cases", () => {
      const range: ItemRange = { start: 50, end: 70 };
      const viewport: ItemRange = { start: 70, end: 90 };

      expect(isRangeInViewport(range, viewport)).toBe(false); // Touching but not overlapping
    });
  });

  describe("calculateRangePriority", () => {
    it("should assign high priority to visible ranges", () => {
      const range: ItemRange = { start: 20, end: 40 };
      const viewport: ItemRange = { start: 15, end: 45 };

      const priority = calculateRangePriority({
        range,
        viewport,
        direction: "forward",
        loadingStrategy: "normal",
      });

      expect(priority).toBeGreaterThan(0.8); // High priority
    });

    it("should assign medium priority to prefetch ranges", () => {
      const range: ItemRange = { start: 50, end: 70 };
      const viewport: ItemRange = { start: 10, end: 30 };

      const priority = calculateRangePriority({
        range,
        viewport,
        direction: "forward",
        loadingStrategy: "normal",
      });

      expect(priority).toBeGreaterThan(0.3);
      expect(priority).toBeLessThan(0.8);
    });

    it("should assign lower priority to ranges in opposite direction", () => {
      const range: ItemRange = { start: 0, end: 20 };
      const viewport: ItemRange = { start: 50, end: 70 };

      const forwardPriority = calculateRangePriority({
        range,
        viewport,
        direction: "forward",
        loadingStrategy: "normal",
      });

      const backwardPriority = calculateRangePriority({
        range,
        viewport,
        direction: "backward",
        loadingStrategy: "normal",
      });

      expect(backwardPriority).toBeGreaterThan(forwardPriority);
    });
  });

  describe("sortRangesByPriority", () => {
    it("should sort ranges by priority", () => {
      const ranges: ItemRange[] = [
        { start: 100, end: 120 }, // Far from viewport
        { start: 20, end: 40 }, // In viewport
        { start: 50, end: 70 }, // Near viewport
      ];
      const viewport: ItemRange = { start: 15, end: 35 };

      const sorted = sortRangesByPriority({
        ranges,
        viewport,
        direction: "forward",
        loadingStrategy: "normal",
      });

      // First range should be the one in viewport
      expect(sorted[0].start).toBe(20);
      expect(sorted[0].end).toBe(40);
    });
  });

  describe("mergeAdjacentRanges", () => {
    it("should merge adjacent ranges", () => {
      const ranges: ItemRange[] = [
        { start: 0, end: 19 },
        { start: 20, end: 39 },
        { start: 40, end: 59 },
        { start: 80, end: 99 }, // Gap, should not merge
      ];

      const merged = mergeAdjacentRanges(ranges);

      expect(merged).toHaveLength(2);
      expect(merged[0]).toEqual({ start: 0, end: 59 });
      expect(merged[1]).toEqual({ start: 80, end: 99 });
    });

    it("should handle overlapping ranges", () => {
      const ranges: ItemRange[] = [
        { start: 0, end: 25 },
        { start: 20, end: 45 },
        { start: 40, end: 60 },
      ];

      const merged = mergeAdjacentRanges(ranges);

      expect(merged).toHaveLength(1);
      expect(merged[0]).toEqual({ start: 0, end: 60 });
    });

    it("should handle non-adjacent ranges", () => {
      const ranges: ItemRange[] = [
        { start: 0, end: 10 },
        { start: 20, end: 30 },
        { start: 40, end: 50 },
      ];

      const merged = mergeAdjacentRanges(ranges);

      expect(merged).toHaveLength(3); // No merging
      expect(merged).toEqual(ranges);
    });
  });

  describe("calculateRangeCleanupCandidates", () => {
    it("should identify ranges for cleanup", () => {
      const loadedRanges: ItemRange[] = [
        { start: 0, end: 19 }, // Far from viewport
        { start: 20, end: 39 }, // In viewport
        { start: 40, end: 59 }, // Near viewport
        { start: 100, end: 119 }, // Very far from viewport
      ];
      const viewport: ItemRange = { start: 25, end: 45 };

      const candidates = calculateRangeCleanupCandidates({
        loadedRanges,
        viewport,
        maxDistance: 50,
        keepMinimum: 2,
      });

      expect(candidates.length).toBeGreaterThan(0);
      expect(candidates.some((r) => r.start === 100)).toBe(true); // Far range should be candidate
    });

    it("should respect minimum keep count", () => {
      const loadedRanges: ItemRange[] = [
        { start: 0, end: 19 },
        { start: 200, end: 219 },
      ];
      const viewport: ItemRange = { start: 100, end: 120 };

      const candidates = calculateRangeCleanupCandidates({
        loadedRanges,
        viewport,
        maxDistance: 10,
        keepMinimum: 2,
      });

      expect(candidates.length).toBe(0); // Should keep all due to minimum
    });
  });

  describe("calculateRangeLoadingOrder", () => {
    it("should determine optimal loading order", () => {
      const ranges: ItemRange[] = [
        { start: 0, end: 19 }, // Far
        { start: 20, end: 39 }, // Visible
        { start: 40, end: 59 }, // Adjacent
        { start: 100, end: 119 }, // Very far
      ];
      const viewport: ItemRange = { start: 25, end: 35 };

      const order = calculateRangeLoadingOrder({
        ranges,
        viewport,
        direction: "forward",
        maxConcurrent: 2,
        loadingStrategy: "normal",
      });

      expect(order.length).toBeGreaterThan(0);
      expect(order[0].priority).toBeGreaterThan(
        order[order.length - 1].priority
      );
    });

    it("should group concurrent loads", () => {
      const ranges: ItemRange[] = [
        { start: 0, end: 19 },
        { start: 20, end: 39 },
        { start: 40, end: 59 },
        { start: 60, end: 79 },
      ];
      const viewport: ItemRange = { start: 25, end: 35 };

      const order = calculateRangeLoadingOrder({
        ranges,
        viewport,
        direction: "forward",
        maxConcurrent: 2,
        loadingStrategy: "aggressive",
      });

      // Should group some ranges for concurrent loading
      expect(order.some((item) => item.concurrentGroup !== undefined)).toBe(
        true
      );
    });
  });

  describe("getRangeDebugInfo", () => {
    it("should provide comprehensive debug information", () => {
      const ranges: ItemRange[] = [
        { start: 0, end: 19 },
        { start: 20, end: 39 },
        { start: 60, end: 79 },
      ];
      const viewport: ItemRange = { start: 25, end: 45 };
      const loadedRanges = new Set([1]);

      const debug = getRangeDebugInfo({
        ranges,
        viewport,
        loadedRanges,
        rangeSize: 20,
        totalItems: 200,
      });

      expect(debug).toHaveProperty("totalRanges");
      expect(debug).toHaveProperty("loadedCount");
      expect(debug).toHaveProperty("visibleRanges");
      expect(debug).toHaveProperty("coverage");
      expect(debug).toHaveProperty("efficiency");
      expect(debug).toHaveProperty("gaps");
      expect(debug).toHaveProperty("suggestions");

      expect(debug.totalRanges).toBe(3);
      expect(debug.loadedCount).toBe(1);
      expect(debug.visibleRanges).toBeGreaterThan(0);
    });

    it("should calculate coverage percentage", () => {
      const ranges: ItemRange[] = [
        { start: 0, end: 49 }, // 50 items
      ];
      const viewport: ItemRange = { start: 0, end: 99 }; // 100 items needed
      const loadedRanges = new Set([0]);

      const debug = getRangeDebugInfo({
        ranges,
        viewport,
        loadedRanges,
        rangeSize: 50,
        totalItems: 200,
      });

      expect(debug.coverage).toBeCloseTo(0.5, 1); // 50% coverage
    });
  });
});
