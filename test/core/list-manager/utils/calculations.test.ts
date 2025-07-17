// test/core/list-manager/utils/calculations.test.ts

import { describe, it, expect } from "bun:test";
import {
  calculateTotalVirtualSize,
  calculateContainerPosition,
  calculateScrollPositionForIndex,
  calculateScrollPositionForPage,
  calculateScrollbarMetrics,
  calculateInitialRangeSize,
  calculateMissingRanges,
  calculateBufferRanges,
  clamp,
  applyBoundaryResistance,
} from "../../../../src/core/list-manager/utils/calculations";
import type { ItemRange } from "../../../../src/core/list-manager/types";

describe("Calculations Utility", () => {
  describe("clamp", () => {
    it("should clamp value within range", () => {
      expect(clamp(5, 0, 10)).toBe(5);
      expect(clamp(-5, 0, 10)).toBe(0);
      expect(clamp(15, 0, 10)).toBe(10);
    });

    it("should handle edge cases", () => {
      expect(clamp(0, 0, 0)).toBe(0);
      expect(clamp(5, 5, 5)).toBe(5);
      expect(clamp(3, 5, 2)).toBe(3); // Invalid range
    });
  });

  // Removed calculateVisibleRange tests - using unified index-based approach

  describe("calculateTotalVirtualSize", () => {
    it("should calculate total size for uniform items", () => {
      const size = calculateTotalVirtualSize({
        totalItems: 100,
        estimatedItemSize: 50,
        orientation: "vertical",
        measuredSizes: new Map(),
      });

      expect(size).toBe(5000); // 100 * 50
    });

    it("should calculate size with some measured items", () => {
      const measuredSizes = new Map<number, number>();
      measuredSizes.set(0, 60);
      measuredSizes.set(1, 70);
      measuredSizes.set(2, 40);

      const size = calculateTotalVirtualSize({
        totalItems: 10,
        estimatedItemSize: 50,
        orientation: "vertical",
        measuredSizes,
      });

      // First 3 items: 60 + 70 + 40 = 170
      // Remaining 7 items: 7 * 50 = 350
      // Total: 520
      expect(size).toBe(520);
    });

    it("should handle empty list", () => {
      const size = calculateTotalVirtualSize({
        totalItems: 0,
        estimatedItemSize: 50,
        orientation: "vertical",
        measuredSizes: new Map(),
      });

      expect(size).toBe(0);
    });
  });

  describe("calculateContainerPosition", () => {
    it("should calculate position for vertical orientation", () => {
      const position = calculateContainerPosition({
        index: 10,
        estimatedItemSize: 50,
        orientation: "vertical",
        measuredSizes: new Map(),
        totalItems: 100,
      });

      expect(position).toBe(500); // 10 * 50
    });

    it("should calculate position with measured sizes", () => {
      const measuredSizes = new Map<number, number>();
      measuredSizes.set(0, 60);
      measuredSizes.set(1, 70);
      measuredSizes.set(2, 40);

      const position = calculateContainerPosition({
        index: 3,
        estimatedItemSize: 50,
        orientation: "horizontal",
        measuredSizes,
        totalItems: 100,
      });

      expect(position).toBe(170); // 60 + 70 + 40
    });

    it("should handle index 0", () => {
      const position = calculateContainerPosition({
        index: 0,
        estimatedItemSize: 50,
        orientation: "vertical",
        measuredSizes: new Map(),
        totalItems: 100,
      });

      expect(position).toBe(0);
    });
  });

  describe("calculateScrollPositionForIndex", () => {
    it("should calculate scroll position for 'start' alignment", () => {
      const position = calculateScrollPositionForIndex({
        index: 10,
        alignment: "start",
        containerSize: 300,
        estimatedItemSize: 50,
        orientation: "vertical",
        measuredSizes: new Map(),
        totalItems: 100,
      });

      expect(position).toBe(500); // 10 * 50
    });

    it("should calculate scroll position for 'center' alignment", () => {
      const position = calculateScrollPositionForIndex({
        index: 10,
        alignment: "center",
        containerSize: 300,
        estimatedItemSize: 50,
        orientation: "vertical",
        measuredSizes: new Map(),
        totalItems: 100,
      });

      // Item at 500, center in 300px container = 500 - 150 + 25 = 375
      expect(position).toBe(375);
    });

    it("should calculate scroll position for 'end' alignment", () => {
      const position = calculateScrollPositionForIndex({
        index: 10,
        alignment: "end",
        containerSize: 300,
        estimatedItemSize: 50,
        orientation: "vertical",
        measuredSizes: new Map(),
        totalItems: 100,
      });

      // Item at 500, end in 300px container = 500 - 300 + 50 = 250
      expect(position).toBe(250);
    });

    it("should not scroll past beginning", () => {
      const position = calculateScrollPositionForIndex({
        index: 0,
        alignment: "center",
        containerSize: 300,
        estimatedItemSize: 50,
        orientation: "vertical",
        measuredSizes: new Map(),
        totalItems: 100,
      });

      expect(position).toBeGreaterThanOrEqual(0);
    });
  });

  describe("calculateScrollPositionForPage", () => {
    it("should calculate position for page", () => {
      const position = calculateScrollPositionForPage({
        page: 3,
        pageSize: 10,
        alignment: "start",
        containerSize: 300,
        estimatedItemSize: 50,
        orientation: "vertical",
        measuredSizes: new Map(),
        totalItems: 100,
      });

      // Page 3, item 20 (0-indexed), position 1000
      expect(position).toBe(1000);
    });

    it("should handle page 1 (first page)", () => {
      const position = calculateScrollPositionForPage({
        page: 1,
        pageSize: 10,
        alignment: "start",
        containerSize: 300,
        estimatedItemSize: 50,
        orientation: "vertical",
        measuredSizes: new Map(),
        totalItems: 100,
      });

      expect(position).toBe(0);
    });
  });

  describe("calculateScrollbarMetrics", () => {
    it("should calculate scrollbar metrics", () => {
      const metrics = calculateScrollbarMetrics({
        containerSize: 300,
        totalVirtualSize: 1500,
        scrollPosition: 300,
        orientation: "vertical",
      });

      expect(metrics.trackSize).toBe(300);
      expect(metrics.thumbSize).toBeGreaterThan(0);
      expect(metrics.thumbPosition).toBeGreaterThan(0);
      expect(metrics.scrollRatio).toBe(0.2); // 300/1500
    });

    it("should handle case where content fits in container", () => {
      const metrics = calculateScrollbarMetrics({
        containerSize: 500,
        totalVirtualSize: 300,
        scrollPosition: 0,
        orientation: "vertical",
      });

      expect(metrics.thumbSize).toBe(500); // Full size
      expect(metrics.thumbPosition).toBe(0);
      expect(metrics.scrollRatio).toBe(0);
    });

    it("should handle horizontal scrollbar", () => {
      const metrics = calculateScrollbarMetrics({
        containerSize: 400,
        totalVirtualSize: 1200,
        scrollPosition: 200,
        orientation: "horizontal",
      });

      expect(metrics.trackSize).toBe(400);
      expect(metrics.scrollRatio).toBeCloseTo(0.167, 2); // 200/1200
    });
  });

  // Removed calculateViewportInfo tests - viewport.ts now uses virtualManager directly

  describe("calculateInitialRangeSize", () => {
    it("should calculate initial range size", () => {
      const size = calculateInitialRangeSize({
        containerSize: 300,
        estimatedItemSize: 50,
        viewportMultiplier: 2,
        minItems: 5,
        maxItems: 50,
      });

      // Container fits 6 items (300/50), * 2 = 12 items
      expect(size).toBe(12);
    });

    it("should respect min items constraint", () => {
      const size = calculateInitialRangeSize({
        containerSize: 100,
        estimatedItemSize: 50,
        viewportMultiplier: 1,
        minItems: 10,
        maxItems: 50,
      });

      expect(size).toBe(10); // Min constraint
    });

    it("should respect max items constraint", () => {
      const size = calculateInitialRangeSize({
        containerSize: 1000,
        estimatedItemSize: 10,
        viewportMultiplier: 2,
        minItems: 5,
        maxItems: 50,
      });

      expect(size).toBe(50); // Max constraint
    });
  });

  describe("calculateMissingRanges", () => {
    it("should find missing ranges", () => {
      const loadedRanges = new Set([0, 1, 2, 5, 6, 7]);
      const requiredRange: ItemRange = { start: 0, end: 10 };

      const missing = calculateMissingRanges(requiredRange, loadedRanges);

      expect(missing).toEqual([
        { start: 3, end: 4 },
        { start: 8, end: 10 },
      ]);
    });

    it("should handle no missing ranges", () => {
      const loadedRanges = new Set([0, 1, 2, 3, 4, 5]);
      const requiredRange: ItemRange = { start: 0, end: 5 };

      const missing = calculateMissingRanges(requiredRange, loadedRanges);

      expect(missing).toEqual([]);
    });

    it("should handle completely missing range", () => {
      const loadedRanges = new Set<number>();
      const requiredRange: ItemRange = { start: 10, end: 15 };

      const missing = calculateMissingRanges(requiredRange, loadedRanges);

      expect(missing).toEqual([{ start: 10, end: 15 }]);
    });
  });

  describe("calculateBufferRanges", () => {
    it("should calculate buffer ranges", () => {
      const visibleRange: ItemRange = { start: 10, end: 20 };
      const bufferSize = 5;
      const totalItems = 100;

      const bufferRanges = calculateBufferRanges(
        visibleRange,
        bufferSize,
        totalItems
      );

      expect(bufferRanges.before).toEqual({ start: 5, end: 9 });
      expect(bufferRanges.after).toEqual({ start: 21, end: 25 });
    });

    it("should handle buffer at beginning", () => {
      const visibleRange: ItemRange = { start: 0, end: 10 };
      const bufferSize = 5;
      const totalItems = 100;

      const bufferRanges = calculateBufferRanges(
        visibleRange,
        bufferSize,
        totalItems
      );

      expect(bufferRanges.before).toEqual({ start: 0, end: -1 }); // Empty range
      expect(bufferRanges.after).toEqual({ start: 11, end: 15 });
    });

    it("should handle buffer at end", () => {
      const visibleRange: ItemRange = { start: 90, end: 99 };
      const bufferSize = 5;
      const totalItems = 100;

      const bufferRanges = calculateBufferRanges(
        visibleRange,
        bufferSize,
        totalItems
      );

      expect(bufferRanges.before).toEqual({ start: 85, end: 89 });
      expect(bufferRanges.after).toEqual({ start: 100, end: 99 }); // Empty range
    });
  });

  describe("applyBoundaryResistance", () => {
    it("should apply resistance at beginning", () => {
      const result = applyBoundaryResistance({
        requestedPosition: -100,
        currentPosition: 0,
        maxPosition: 1000,
        resistance: 0.5,
      });

      expect(result).toBeGreaterThan(-100);
      expect(result).toBeLessThan(0);
    });

    it("should apply resistance at end", () => {
      const result = applyBoundaryResistance({
        requestedPosition: 1100,
        currentPosition: 1000,
        maxPosition: 1000,
        resistance: 0.5,
      });

      expect(result).toBeLessThan(1100);
      expect(result).toBeGreaterThan(1000);
    });

    it("should not apply resistance within bounds", () => {
      const result = applyBoundaryResistance({
        requestedPosition: 500,
        currentPosition: 400,
        maxPosition: 1000,
        resistance: 0.5,
      });

      expect(result).toBe(500);
    });

    it("should handle zero resistance", () => {
      const result = applyBoundaryResistance({
        requestedPosition: -100,
        currentPosition: 0,
        maxPosition: 1000,
        resistance: 0,
      });

      expect(result).toBe(0); // Clamped to boundary
    });

    it("should handle full resistance", () => {
      const result = applyBoundaryResistance({
        requestedPosition: -100,
        currentPosition: 0,
        maxPosition: 1000,
        resistance: 1,
      });

      expect(result).toBe(0); // No movement beyond boundary
    });
  });
});
