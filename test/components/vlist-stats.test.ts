// test/components/vlist-stats.test.ts

/**
 * VList withStats Feature Tests
 *
 * Tests the stats tracking integration for VList that provides
 * count, position, and progress tracking with automatic layout element updates.
 */

import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { JSDOM } from "jsdom";

// Mock DOM environment for testing
const dom = new JSDOM("<!DOCTYPE html><html><body></body></html>");
global.document = dom.window.document;
global.HTMLElement = dom.window.HTMLElement;
global.HTMLInputElement = dom.window.HTMLInputElement;
global.window = dom.window as any;
global.navigator = dom.window.navigator;
global.requestAnimationFrame = (cb: FrameRequestCallback) => {
  setTimeout(cb, 0);
  return 0;
};

// Import VList after DOM setup
import { createVList } from "../../src/components/vlist";

describe("VList withStats Feature", () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement("div");
    container.id = "test-container";
    container.style.width = "400px";
    container.style.height = "600px";
    document.body.appendChild(container);
  });

  afterEach(() => {
    if (container && container.parentNode) {
      container.parentNode.removeChild(container);
    }
  });

  describe("Basic Stats Configuration", () => {
    it("should create VList without stats (backward compatibility)", () => {
      const vlist = createVList({
        container,
        items: [{ id: "1", name: "Item 1" }],
        template: (item) => `<div>${item.name}</div>`,
      });

      expect(vlist).toBeDefined();
      expect(vlist.getStats).toBeUndefined();
      expect(vlist.getCount).toBeUndefined();

      vlist.destroy();
    });

    it("should create VList with stats configuration", () => {
      const vlist = createVList({
        container,
        items: [{ id: "1", name: "Item 1" }],
        template: (item) => `<div>${item.name}</div>`,
        layout: [
          ["head", { class: "head" }],
          ["viewport"],
          [
            "foot",
            { class: "foot" },
            ["count", { class: "count", text: "0" }],
            ["position", { class: "position", text: "0" }],
            ["progress", { class: "progress", text: "0%" }],
          ],
        ],
        stats: {
          elements: {
            count: "count",
            position: "position",
            progress: "progress",
          },
        },
      });

      expect(vlist).toBeDefined();
      expect(vlist.getStats).toBeDefined();
      expect(vlist.getCount).toBeDefined();
      expect(vlist.getPosition).toBeDefined();
      expect(vlist.getProgress).toBeDefined();

      vlist.destroy();
    });

    it("should initialize with zero stats", () => {
      const vlist = createVList({
        container,
        items: [],
        template: (item) => `<div>${item.name}</div>`,
        layout: [["viewport"]],
        stats: {
          elements: {
            count: "count",
          },
        },
      });

      const stats = vlist.getStats?.();
      expect(stats).toBeDefined();
      expect(stats?.count).toBe(0);
      expect(stats?.position).toBe(0);
      expect(stats?.progress).toBe(0);

      vlist.destroy();
    });
  });

  describe("Stats API", () => {
    it("should return current stats via getStats()", () => {
      const vlist = createVList({
        container,
        items: [],
        template: (item) => `<div>${item.name}</div>`,
        layout: [["viewport"]],
        stats: {
          elements: {},
        },
      });

      const stats = vlist.getStats?.();
      expect(stats).toEqual({
        count: 0,
        position: 0,
        progress: 0,
      });

      vlist.destroy();
    });

    it("should return count via getCount()", () => {
      const vlist = createVList({
        container,
        items: [],
        template: (item) => `<div>${item.name}</div>`,
        layout: [["viewport"]],
        stats: {
          elements: {},
        },
      });

      expect(vlist.getCount?.()).toBe(0);

      vlist.destroy();
    });

    it("should return position via getPosition()", () => {
      const vlist = createVList({
        container,
        items: [],
        template: (item) => `<div>${item.name}</div>`,
        layout: [["viewport"]],
        stats: {
          elements: {},
        },
      });

      expect(vlist.getPosition?.()).toBe(0);

      vlist.destroy();
    });

    it("should return progress via getProgress()", () => {
      const vlist = createVList({
        container,
        items: [],
        template: (item) => `<div>${item.name}</div>`,
        layout: [["viewport"]],
        stats: {
          elements: {},
        },
      });

      expect(vlist.getProgress?.()).toBe(0);

      vlist.destroy();
    });

    it("should allow manual count setting via setStatsCount()", () => {
      const vlist = createVList({
        container,
        items: [],
        template: (item) => `<div>${item.name}</div>`,
        layout: [["viewport"]],
        stats: {
          elements: {},
        },
      });

      vlist.setStatsCount?.(100);
      expect(vlist.getCount?.()).toBe(100);

      vlist.destroy();
    });
  });

  describe("Stats Events", () => {
    it("should emit stats:change event when count changes", async () => {
      const vlist = createVList({
        container,
        items: [],
        template: (item) => `<div>${item.name}</div>`,
        layout: [["viewport"]],
        stats: {
          elements: {},
        },
      });

      let receivedStats: any = null;
      vlist.on("stats:change", (data: any) => {
        receivedStats = data;
      });

      // Wait for setup
      await new Promise((resolve) => setTimeout(resolve, 10));

      vlist.setStatsCount?.(50);

      expect(receivedStats).toBeDefined();
      expect(receivedStats?.count).toBe(50);

      vlist.destroy();
    });

    it("should include all stats in change event", async () => {
      const vlist = createVList({
        container,
        items: [],
        template: (item) => `<div>${item.name}</div>`,
        layout: [["viewport"]],
        stats: {
          elements: {},
        },
      });

      let receivedStats: any = null;
      vlist.on("stats:change", (data: any) => {
        receivedStats = data;
      });

      await new Promise((resolve) => setTimeout(resolve, 10));

      vlist.setStatsCount?.(100);

      expect(receivedStats).toHaveProperty("count");
      expect(receivedStats).toHaveProperty("position");
      expect(receivedStats).toHaveProperty("progress");

      vlist.destroy();
    });

    it("should not emit stats:change if stats unchanged", async () => {
      const vlist = createVList({
        container,
        items: [],
        template: (item) => `<div>${item.name}</div>`,
        layout: [["viewport"]],
        stats: {
          elements: {},
        },
      });

      let emitCount = 0;
      vlist.on("stats:change", () => {
        emitCount++;
      });

      await new Promise((resolve) => setTimeout(resolve, 10));

      // Set to same value multiple times
      vlist.setStatsCount?.(50);
      const firstCount = emitCount;

      vlist.setStatsCount?.(50); // Same value
      expect(emitCount).toBe(firstCount); // Should not increment

      vlist.destroy();
    });
  });

  describe("Layout Element Updates", () => {
    it("should update count element when count changes", async () => {
      const vlist = createVList({
        container,
        items: [],
        template: (item) => `<div>${item.name}</div>`,
        layout: [
          ["viewport"],
          ["foot", { class: "foot" }, ["count", { class: "count", text: "0" }]],
        ],
        stats: {
          elements: {
            count: "count",
          },
        },
      });

      await new Promise((resolve) => setTimeout(resolve, 10));

      vlist.setStatsCount?.(42);

      const countElement = vlist.layout?.count;
      expect(countElement).toBeDefined();
      expect(countElement?.textContent).toBe("42");

      vlist.destroy();
    });

    it("should update position element when position changes", async () => {
      const vlist = createVList({
        container,
        items: [],
        template: (item) => `<div>${item.name}</div>`,
        layout: [
          ["viewport"],
          [
            "foot",
            { class: "foot" },
            ["position", { class: "position", text: "0" }],
          ],
        ],
        stats: {
          elements: {
            position: "position",
          },
        },
      });

      await new Promise((resolve) => setTimeout(resolve, 10));

      // Position is typically set by viewport events, but we can trigger via emit
      vlist.emit?.("viewport:range-changed", {
        range: { start: 10, end: 20 },
        actualRange: { start: 10, end: 20 },
      });

      await new Promise((resolve) => setTimeout(resolve, 10));

      const positionElement = vlist.layout?.position;
      expect(positionElement).toBeDefined();
      // Position should be actualRange.start + 1 (1-based)
      expect(positionElement?.textContent).toBe("11");

      vlist.destroy();
    });

    it("should update progress element when position or count changes", async () => {
      const vlist = createVList({
        container,
        items: [],
        template: (item) => `<div>${item.name}</div>`,
        layout: [
          ["viewport"],
          [
            "foot",
            { class: "foot" },
            ["progress", { class: "progress", text: "0%" }],
          ],
        ],
        stats: {
          elements: {
            progress: "progress",
          },
        },
      });

      await new Promise((resolve) => setTimeout(resolve, 10));

      // Set count first
      vlist.setStatsCount?.(100);

      // Simulate position change to 50
      vlist.emit?.("viewport:range-changed", {
        range: { start: 49, end: 59 },
        actualRange: { start: 49, end: 59 },
      });

      await new Promise((resolve) => setTimeout(resolve, 10));

      const progressElement = vlist.layout?.progress;
      expect(progressElement).toBeDefined();
      // Position 50 of 100 = 50%
      expect(progressElement?.textContent).toBe("50%");

      vlist.destroy();
    });
  });

  describe("Custom Format Functions", () => {
    it("should use custom count format function", async () => {
      const vlist = createVList({
        container,
        items: [],
        template: (item) => `<div>${item.name}</div>`,
        layout: [
          ["viewport"],
          ["foot", { class: "foot" }, ["count", { class: "count", text: "0" }]],
        ],
        stats: {
          elements: {
            count: "count",
          },
          format: {
            count: (n: number) => `Total: ${n}`,
          },
        },
      });

      await new Promise((resolve) => setTimeout(resolve, 10));

      vlist.setStatsCount?.(42);

      const countElement = vlist.layout?.count;
      expect(countElement?.textContent).toBe("Total: 42");

      vlist.destroy();
    });

    it("should use custom position format function", async () => {
      const vlist = createVList({
        container,
        items: [],
        template: (item) => `<div>${item.name}</div>`,
        layout: [
          ["viewport"],
          [
            "foot",
            { class: "foot" },
            ["position", { class: "position", text: "0" }],
          ],
        ],
        stats: {
          elements: {
            position: "position",
          },
          format: {
            position: (n: number) => `#${n}`,
          },
        },
      });

      await new Promise((resolve) => setTimeout(resolve, 10));

      vlist.emit?.("viewport:range-changed", {
        range: { start: 4, end: 14 },
        actualRange: { start: 4, end: 14 },
      });

      await new Promise((resolve) => setTimeout(resolve, 10));

      const positionElement = vlist.layout?.position;
      expect(positionElement?.textContent).toBe("#5");

      vlist.destroy();
    });

    it("should use custom progress format function", async () => {
      const vlist = createVList({
        container,
        items: [],
        template: (item) => `<div>${item.name}</div>`,
        layout: [
          ["viewport"],
          [
            "foot",
            { class: "foot" },
            ["progress", { class: "progress", text: "0%" }],
          ],
        ],
        stats: {
          elements: {
            progress: "progress",
          },
          format: {
            progress: (p: number) => `${p}% complete`,
          },
        },
      });

      await new Promise((resolve) => setTimeout(resolve, 10));

      vlist.setStatsCount?.(100);
      vlist.emit?.("viewport:range-changed", {
        range: { start: 24, end: 34 },
        actualRange: { start: 24, end: 34 },
      });

      await new Promise((resolve) => setTimeout(resolve, 10));

      const progressElement = vlist.layout?.progress;
      expect(progressElement?.textContent).toBe("25% complete");

      vlist.destroy();
    });

    it("should use default toLocaleString for count formatting", async () => {
      const vlist = createVList({
        container,
        items: [],
        template: (item) => `<div>${item.name}</div>`,
        layout: [
          ["viewport"],
          ["foot", { class: "foot" }, ["count", { class: "count", text: "0" }]],
        ],
        stats: {
          elements: {
            count: "count",
          },
        },
      });

      await new Promise((resolve) => setTimeout(resolve, 10));

      vlist.setStatsCount?.(1234567);

      const countElement = vlist.layout?.count;
      // Default uses toLocaleString
      expect(countElement?.textContent).toBe((1234567).toLocaleString());

      vlist.destroy();
    });
  });

  describe("Integration with Viewport Events", () => {
    it("should update count from viewport:total-items-changed event", async () => {
      const vlist = createVList({
        container,
        items: [],
        template: (item) => `<div>${item.name}</div>`,
        layout: [["viewport"]],
        stats: {
          elements: {},
        },
      });

      await new Promise((resolve) => setTimeout(resolve, 10));

      vlist.emit?.("viewport:total-items-changed", { total: 500 });

      expect(vlist.getCount?.()).toBe(500);

      vlist.destroy();
    });

    it("should update count from viewport:items-changed event", async () => {
      const vlist = createVList({
        container,
        items: [],
        template: (item) => `<div>${item.name}</div>`,
        layout: [["viewport"]],
        stats: {
          elements: {},
        },
      });

      await new Promise((resolve) => setTimeout(resolve, 10));

      vlist.emit?.("viewport:items-changed", { totalItems: 250 });

      expect(vlist.getCount?.()).toBe(250);

      vlist.destroy();
    });

    it("should update position from viewport:range-changed event", async () => {
      const vlist = createVList({
        container,
        items: [],
        template: (item) => `<div>${item.name}</div>`,
        layout: [["viewport"]],
        stats: {
          elements: {},
        },
      });

      await new Promise((resolve) => setTimeout(resolve, 10));

      vlist.emit?.("viewport:range-changed", {
        range: { start: 99, end: 109 },
        actualRange: { start: 99, end: 109 },
      });

      // Position is 1-based
      expect(vlist.getPosition?.()).toBe(100);

      vlist.destroy();
    });

    it("should use range if actualRange not provided", async () => {
      const vlist = createVList({
        container,
        items: [],
        template: (item) => `<div>${item.name}</div>`,
        layout: [["viewport"]],
        stats: {
          elements: {},
        },
      });

      await new Promise((resolve) => setTimeout(resolve, 10));

      vlist.emit?.("viewport:range-changed", {
        range: { start: 49, end: 59 },
        // No actualRange
      });

      expect(vlist.getPosition?.()).toBe(50);

      vlist.destroy();
    });
  });

  describe("Progress Calculation", () => {
    it("should calculate progress as (position / count) * 100", async () => {
      const vlist = createVList({
        container,
        items: [],
        template: (item) => `<div>${item.name}</div>`,
        layout: [["viewport"]],
        stats: {
          elements: {},
        },
      });

      await new Promise((resolve) => setTimeout(resolve, 10));

      vlist.setStatsCount?.(200);
      vlist.emit?.("viewport:range-changed", {
        range: { start: 99, end: 109 },
        actualRange: { start: 99, end: 109 },
      });

      // Position 100 of 200 = 50%
      expect(vlist.getProgress?.()).toBe(50);

      vlist.destroy();
    });

    it("should return 0 progress when count is 0", async () => {
      const vlist = createVList({
        container,
        items: [],
        template: (item) => `<div>${item.name}</div>`,
        layout: [["viewport"]],
        stats: {
          elements: {},
        },
      });

      await new Promise((resolve) => setTimeout(resolve, 10));

      vlist.emit?.("viewport:range-changed", {
        range: { start: 10, end: 20 },
        actualRange: { start: 10, end: 20 },
      });

      // Count is 0, so progress should be 0
      expect(vlist.getProgress?.()).toBe(0);

      vlist.destroy();
    });

    it("should round progress to nearest integer", async () => {
      const vlist = createVList({
        container,
        items: [],
        template: (item) => `<div>${item.name}</div>`,
        layout: [["viewport"]],
        stats: {
          elements: {},
        },
      });

      await new Promise((resolve) => setTimeout(resolve, 10));

      vlist.setStatsCount?.(300);
      vlist.emit?.("viewport:range-changed", {
        range: { start: 99, end: 109 },
        actualRange: { start: 99, end: 109 },
      });

      // Position 100 of 300 = 33.33...% should round to 33%
      expect(vlist.getProgress?.()).toBe(33);

      vlist.destroy();
    });
  });

  describe("Reload Reset", () => {
    it("should reset stats on reload:start event", async () => {
      const vlist = createVList({
        container,
        items: [],
        template: (item) => `<div>${item.name}</div>`,
        layout: [["viewport"]],
        stats: {
          elements: {},
        },
      });

      await new Promise((resolve) => setTimeout(resolve, 10));

      // Set some values
      vlist.setStatsCount?.(100);
      vlist.emit?.("viewport:range-changed", {
        range: { start: 49, end: 59 },
        actualRange: { start: 49, end: 59 },
      });

      expect(vlist.getCount?.()).toBe(100);
      expect(vlist.getPosition?.()).toBe(50);

      // Trigger reload
      vlist.emit?.("reload:start");

      // Stats should be reset
      expect(vlist.getCount?.()).toBe(0);
      expect(vlist.getPosition?.()).toBe(0);
      expect(vlist.getProgress?.()).toBe(0);

      vlist.destroy();
    });
  });

  describe("Lifecycle", () => {
    it("should clean up on destroy", () => {
      const vlist = createVList({
        container,
        items: [],
        template: (item) => `<div>${item.name}</div>`,
        layout: [["viewport"]],
        stats: {
          elements: {},
        },
      });

      // Should not throw
      expect(() => vlist.destroy()).not.toThrow();
    });

    it("should handle multiple stat updates", async () => {
      const vlist = createVList({
        container,
        items: [],
        template: (item) => `<div>${item.name}</div>`,
        layout: [["viewport"]],
        stats: {
          elements: {},
        },
      });

      await new Promise((resolve) => setTimeout(resolve, 10));

      // Rapid updates
      for (let i = 0; i < 10; i++) {
        vlist.setStatsCount?.(i * 100);
        vlist.emit?.("viewport:range-changed", {
          range: { start: i * 10, end: i * 10 + 10 },
          actualRange: { start: i * 10, end: i * 10 + 10 },
        });
      }

      // Should have final values
      expect(vlist.getCount?.()).toBe(900);
      expect(vlist.getPosition?.()).toBe(91);

      vlist.destroy();
    });
  });

  describe("Edge Cases", () => {
    it("should handle missing layout elements gracefully", async () => {
      const vlist = createVList({
        container,
        items: [],
        template: (item) => `<div>${item.name}</div>`,
        layout: [["viewport"]],
        stats: {
          elements: {
            count: "nonexistent-element",
            position: "also-nonexistent",
            progress: "not-here-either",
          },
        },
      });

      await new Promise((resolve) => setTimeout(resolve, 10));

      // Should not throw when elements don't exist
      expect(() => vlist.setStatsCount?.(100)).not.toThrow();

      vlist.destroy();
    });

    it("should handle empty elements config", () => {
      const vlist = createVList({
        container,
        items: [],
        template: (item) => `<div>${item.name}</div>`,
        layout: [["viewport"]],
        stats: {
          elements: {},
        },
      });

      expect(vlist.getStats).toBeDefined();
      expect(vlist.getCount?.()).toBe(0);

      vlist.destroy();
    });

    it("should handle partial elements config", async () => {
      const vlist = createVList({
        container,
        items: [],
        template: (item) => `<div>${item.name}</div>`,
        layout: [
          ["viewport"],
          ["foot", { class: "foot" }, ["count", { class: "count", text: "0" }]],
        ],
        stats: {
          elements: {
            count: "count",
            // position and progress not configured
          },
        },
      });

      await new Promise((resolve) => setTimeout(resolve, 10));

      vlist.setStatsCount?.(42);

      const countElement = vlist.layout?.count;
      expect(countElement?.textContent).toBe("42");

      // Other stats should still work
      expect(vlist.getPosition?.()).toBe(0);
      expect(vlist.getProgress?.()).toBe(0);

      vlist.destroy();
    });

    it("should handle negative position gracefully", async () => {
      const vlist = createVList({
        container,
        items: [],
        template: (item) => `<div>${item.name}</div>`,
        layout: [["viewport"]],
        stats: {
          elements: {},
        },
      });

      await new Promise((resolve) => setTimeout(resolve, 10));

      // Edge case: negative start (shouldn't happen but be defensive)
      vlist.emit?.("viewport:range-changed", {
        range: { start: -1, end: 9 },
        actualRange: { start: -1, end: 9 },
      });

      // Position should be 0 (1-based, -1 + 1 = 0)
      expect(vlist.getPosition?.()).toBe(0);

      vlist.destroy();
    });
  });
});
