// test/components/vlist-velocity.test.ts

/**
 * VList withVelocity Feature Tests
 *
 * Tests the velocity tracking integration for VList that provides
 * scroll velocity display in layout elements.
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

describe("VList withVelocity Feature", () => {
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

  describe("Basic Velocity Configuration", () => {
    it("should create VList without velocity (backward compatibility)", () => {
      const vlist = createVList({
        container,
        items: [{ id: "1", name: "Item 1" }],
        template: (item) => `<div>${item.name}</div>`,
      });

      expect(vlist).toBeDefined();
      expect(vlist.getVelocity).toBeUndefined();

      vlist.destroy();
    });

    it("should create VList with velocity configuration", () => {
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
            ["velocity-current", { class: "velocity-current", text: "0.00" }],
            ["velocity-avg", { class: "velocity-avg", text: "0.00" }],
          ],
        ],
        velocity: {
          elements: {
            current: "velocity-current",
            average: "velocity-avg",
          },
        },
      });

      expect(vlist).toBeDefined();
      expect(vlist.getVelocity).toBeDefined();
      expect(vlist.getAverageVelocity).toBeDefined();
      expect(vlist.getVelocityDirection).toBeDefined();
      expect(vlist.getVelocityStats).toBeDefined();
      expect(vlist.resetVelocityAverage).toBeDefined();

      vlist.destroy();
    });

    it("should initialize with zero velocity", () => {
      const vlist = createVList({
        container,
        items: [],
        template: (item) => `<div>${item.name}</div>`,
        layout: [["viewport"]],
        velocity: {
          elements: {},
        },
      });

      expect(vlist.getVelocity?.()).toBe(0);
      expect(vlist.getAverageVelocity?.()).toBe(0);

      vlist.destroy();
    });
  });

  describe("Velocity API", () => {
    it("should return current velocity via getVelocity()", () => {
      const vlist = createVList({
        container,
        items: [],
        template: (item) => `<div>${item.name}</div>`,
        layout: [["viewport"]],
        velocity: {
          elements: {},
        },
      });

      expect(vlist.getVelocity?.()).toBe(0);

      vlist.destroy();
    });

    it("should return direction via getVelocityDirection()", () => {
      const vlist = createVList({
        container,
        items: [],
        template: (item) => `<div>${item.name}</div>`,
        layout: [["viewport"]],
        velocity: {
          elements: {},
        },
      });

      expect(vlist.getVelocityDirection?.()).toBe("forward");

      vlist.destroy();
    });

    it("should return average velocity via getAverageVelocity()", () => {
      const vlist = createVList({
        container,
        items: [],
        template: (item) => `<div>${item.name}</div>`,
        layout: [["viewport"]],
        velocity: {
          elements: {},
          trackAverage: true,
        },
      });

      expect(vlist.getAverageVelocity?.()).toBe(0);

      vlist.destroy();
    });

    it("should return complete stats via getVelocityStats()", () => {
      const vlist = createVList({
        container,
        items: [],
        template: (item) => `<div>${item.name}</div>`,
        layout: [["viewport"]],
        velocity: {
          elements: {},
        },
      });

      const stats = vlist.getVelocityStats?.();
      expect(stats).toEqual({
        current: 0,
        direction: "forward",
        average: 0,
        sampleCount: 0,
      });

      vlist.destroy();
    });

    it("should reset average via resetVelocityAverage()", async () => {
      const vlist = createVList({
        container,
        items: [],
        template: (item) => `<div>${item.name}</div>`,
        layout: [["viewport"]],
        velocity: {
          elements: {},
          trackAverage: true,
        },
      });

      await new Promise((resolve) => setTimeout(resolve, 10));

      // Simulate some velocity updates
      vlist.emit?.("viewport:velocity-changed", {
        velocity: 5,
        direction: "forward",
      });

      vlist.emit?.("viewport:velocity-changed", {
        velocity: 10,
        direction: "forward",
      });

      // Reset
      vlist.resetVelocityAverage?.();

      expect(vlist.getAverageVelocity?.()).toBe(0);
      expect(vlist.getVelocityStats?.().sampleCount).toBe(0);

      vlist.destroy();
    });

    it("should allow manual average display update via setAverageVelocityDisplay()", async () => {
      const vlist = createVList({
        container,
        items: [],
        template: (item) => `<div>${item.name}</div>`,
        layout: [
          ["viewport"],
          [
            "foot",
            { class: "foot" },
            ["velocity-avg", { class: "velocity-avg", text: "0.00" }],
          ],
        ],
        velocity: {
          elements: {
            average: "velocity-avg",
          },
        },
      });

      await new Promise((resolve) => setTimeout(resolve, 10));

      vlist.setAverageVelocityDisplay?.(12.34);

      const avgElement = vlist.layout?.["velocity-avg"];
      expect(avgElement?.textContent).toBe("12.34");

      vlist.destroy();
    });
  });

  describe("Velocity Events", () => {
    it("should emit velocity:change event when velocity changes", async () => {
      const vlist = createVList({
        container,
        items: [],
        template: (item) => `<div>${item.name}</div>`,
        layout: [["viewport"]],
        velocity: {
          elements: {},
        },
      });

      let receivedData: any = null;
      vlist.on("velocity:change", (data: any) => {
        receivedData = data;
      });

      await new Promise((resolve) => setTimeout(resolve, 10));

      vlist.emit?.("viewport:velocity-changed", {
        velocity: 5.5,
        direction: "forward",
      });

      expect(receivedData).toBeDefined();
      expect(receivedData?.velocity).toBe(5.5);
      expect(receivedData?.direction).toBe("forward");

      vlist.destroy();
    });

    it("should include average in velocity:change event", async () => {
      const vlist = createVList({
        container,
        items: [],
        template: (item) => `<div>${item.name}</div>`,
        layout: [["viewport"]],
        velocity: {
          elements: {},
          trackAverage: true,
        },
      });

      let receivedData: any = null;
      vlist.on("velocity:change", (data: any) => {
        receivedData = data;
      });

      await new Promise((resolve) => setTimeout(resolve, 10));

      vlist.emit?.("viewport:velocity-changed", {
        velocity: 5,
        direction: "forward",
      });

      expect(receivedData).toHaveProperty("average");

      vlist.destroy();
    });

    it("should emit velocity:idle event when viewport becomes idle", async () => {
      const vlist = createVList({
        container,
        items: [],
        template: (item) => `<div>${item.name}</div>`,
        layout: [["viewport"]],
        velocity: {
          elements: {},
        },
      });

      let idleEmitted = false;
      vlist.on("velocity:idle", () => {
        idleEmitted = true;
      });

      await new Promise((resolve) => setTimeout(resolve, 10));

      vlist.emit?.("viewport:idle", {});

      expect(idleEmitted).toBe(true);

      vlist.destroy();
    });

    it("should reset current velocity to 0 on idle", async () => {
      const vlist = createVList({
        container,
        items: [],
        template: (item) => `<div>${item.name}</div>`,
        layout: [["viewport"]],
        velocity: {
          elements: {},
        },
      });

      await new Promise((resolve) => setTimeout(resolve, 10));

      // Set some velocity
      vlist.emit?.("viewport:velocity-changed", {
        velocity: 10,
        direction: "forward",
      });

      expect(vlist.getVelocity?.()).toBe(10);

      // Go idle
      vlist.emit?.("viewport:idle", {});

      expect(vlist.getVelocity?.()).toBe(0);

      vlist.destroy();
    });
  });

  describe("Layout Element Updates", () => {
    it("should update current velocity element", async () => {
      const vlist = createVList({
        container,
        items: [],
        template: (item) => `<div>${item.name}</div>`,
        layout: [
          ["viewport"],
          [
            "foot",
            { class: "foot" },
            ["velocity-current", { class: "velocity-current", text: "0.00" }],
          ],
        ],
        velocity: {
          elements: {
            current: "velocity-current",
          },
        },
      });

      await new Promise((resolve) => setTimeout(resolve, 10));

      vlist.emit?.("viewport:velocity-changed", {
        velocity: 7.5,
        direction: "forward",
      });

      const currentElement = vlist.layout?.["velocity-current"];
      expect(currentElement).toBeDefined();
      expect(currentElement?.textContent).toBe("7.50");

      vlist.destroy();
    });

    it("should update average velocity element when tracking", async () => {
      const vlist = createVList({
        container,
        items: [],
        template: (item) => `<div>${item.name}</div>`,
        layout: [
          ["viewport"],
          [
            "foot",
            { class: "foot" },
            ["velocity-avg", { class: "velocity-avg", text: "0.00" }],
          ],
        ],
        velocity: {
          elements: {
            average: "velocity-avg",
          },
          trackAverage: true,
        },
      });

      await new Promise((resolve) => setTimeout(resolve, 10));

      // Send velocities that should be included in average
      vlist.emit?.("viewport:velocity-changed", {
        velocity: 5,
        direction: "forward",
      });

      vlist.emit?.("viewport:velocity-changed", {
        velocity: 15,
        direction: "forward",
      });

      const avgElement = vlist.layout?.["velocity-avg"];
      expect(avgElement).toBeDefined();
      // Average of 5 and 15 = 10
      expect(avgElement?.textContent).toBe("10.00");

      vlist.destroy();
    });

    it("should display absolute velocity value (negative becomes positive)", async () => {
      const vlist = createVList({
        container,
        items: [],
        template: (item) => `<div>${item.name}</div>`,
        layout: [
          ["viewport"],
          [
            "foot",
            { class: "foot" },
            ["velocity-current", { class: "velocity-current", text: "0.00" }],
          ],
        ],
        velocity: {
          elements: {
            current: "velocity-current",
          },
        },
      });

      await new Promise((resolve) => setTimeout(resolve, 10));

      vlist.emit?.("viewport:velocity-changed", {
        velocity: -5.5,
        direction: "backward",
      });

      const currentElement = vlist.layout?.["velocity-current"];
      expect(currentElement?.textContent).toBe("5.50");

      vlist.destroy();
    });
  });

  describe("Custom Format Function", () => {
    it("should use custom format function", async () => {
      const vlist = createVList({
        container,
        items: [],
        template: (item) => `<div>${item.name}</div>`,
        layout: [
          ["viewport"],
          [
            "foot",
            { class: "foot" },
            ["velocity-current", { class: "velocity-current", text: "0" }],
          ],
        ],
        velocity: {
          elements: {
            current: "velocity-current",
          },
          format: (v: number) => `${Math.round(v)} px/ms`,
        },
      });

      await new Promise((resolve) => setTimeout(resolve, 10));

      vlist.emit?.("viewport:velocity-changed", {
        velocity: 7.8,
        direction: "forward",
      });

      const currentElement = vlist.layout?.["velocity-current"];
      expect(currentElement?.textContent).toBe("8 px/ms");

      vlist.destroy();
    });
  });

  describe("Average Tracking Configuration", () => {
    it("should not track average when trackAverage is false", async () => {
      const vlist = createVList({
        container,
        items: [],
        template: (item) => `<div>${item.name}</div>`,
        layout: [["viewport"]],
        velocity: {
          elements: {},
          trackAverage: false,
        },
      });

      await new Promise((resolve) => setTimeout(resolve, 10));

      vlist.emit?.("viewport:velocity-changed", {
        velocity: 5,
        direction: "forward",
      });

      vlist.emit?.("viewport:velocity-changed", {
        velocity: 15,
        direction: "forward",
      });

      // Average should remain 0 since tracking is disabled
      expect(vlist.getAverageVelocity?.()).toBe(0);
      expect(vlist.getVelocityStats?.().sampleCount).toBe(0);

      vlist.destroy();
    });

    it("should exclude velocities above maxVelocityForAverage", async () => {
      const vlist = createVList({
        container,
        items: [],
        template: (item) => `<div>${item.name}</div>`,
        layout: [["viewport"]],
        velocity: {
          elements: {},
          trackAverage: true,
          maxVelocityForAverage: 20,
        },
      });

      await new Promise((resolve) => setTimeout(resolve, 10));

      // This should be included
      vlist.emit?.("viewport:velocity-changed", {
        velocity: 10,
        direction: "forward",
      });

      // This should be excluded (above max)
      vlist.emit?.("viewport:velocity-changed", {
        velocity: 100,
        direction: "forward",
      });

      // Average should be 10 (only the first one counted)
      expect(vlist.getAverageVelocity?.()).toBe(10);
      expect(vlist.getVelocityStats?.().sampleCount).toBe(1);

      vlist.destroy();
    });

    it("should exclude velocities below minVelocityForAverage", async () => {
      const vlist = createVList({
        container,
        items: [],
        template: (item) => `<div>${item.name}</div>`,
        layout: [["viewport"]],
        velocity: {
          elements: {},
          trackAverage: true,
          minVelocityForAverage: 1,
        },
      });

      await new Promise((resolve) => setTimeout(resolve, 10));

      // This should be excluded (below min)
      vlist.emit?.("viewport:velocity-changed", {
        velocity: 0.05,
        direction: "forward",
      });

      // This should be included
      vlist.emit?.("viewport:velocity-changed", {
        velocity: 5,
        direction: "forward",
      });

      // Average should be 5 (only the second one counted)
      expect(vlist.getAverageVelocity?.()).toBe(5);
      expect(vlist.getVelocityStats?.().sampleCount).toBe(1);

      vlist.destroy();
    });
  });

  describe("External Velocity Callback", () => {
    it("should call onVelocityUpdate callback when velocity changes", async () => {
      let callbackVelocity: number | null = null;

      const vlist = createVList({
        container,
        items: [],
        template: (item) => `<div>${item.name}</div>`,
        layout: [["viewport"]],
        velocity: {
          elements: {},
          onVelocityUpdate: (velocity: number) => {
            callbackVelocity = velocity;
          },
        },
      });

      await new Promise((resolve) => setTimeout(resolve, 10));

      vlist.emit?.("viewport:velocity-changed", {
        velocity: 8.5,
        direction: "forward",
      });

      expect(callbackVelocity).toBe(8.5);

      vlist.destroy();
    });

    it("should pass absolute velocity to callback", async () => {
      let callbackVelocity: number | null = null;

      const vlist = createVList({
        container,
        items: [],
        template: (item) => `<div>${item.name}</div>`,
        layout: [["viewport"]],
        velocity: {
          elements: {},
          onVelocityUpdate: (velocity: number) => {
            callbackVelocity = velocity;
          },
        },
      });

      await new Promise((resolve) => setTimeout(resolve, 10));

      vlist.emit?.("viewport:velocity-changed", {
        velocity: -5.5,
        direction: "backward",
      });

      expect(callbackVelocity).toBe(5.5);

      vlist.destroy();
    });
  });

  describe("Reload Behavior", () => {
    it("should reset current velocity on reload:start", async () => {
      const vlist = createVList({
        container,
        items: [],
        template: (item) => `<div>${item.name}</div>`,
        layout: [["viewport"]],
        velocity: {
          elements: {},
        },
      });

      await new Promise((resolve) => setTimeout(resolve, 10));

      vlist.emit?.("viewport:velocity-changed", {
        velocity: 10,
        direction: "forward",
      });

      expect(vlist.getVelocity?.()).toBe(10);

      vlist.emit?.("reload:start");

      expect(vlist.getVelocity?.()).toBe(0);

      vlist.destroy();
    });

    it("should preserve average on reload:start", async () => {
      const vlist = createVList({
        container,
        items: [],
        template: (item) => `<div>${item.name}</div>`,
        layout: [["viewport"]],
        velocity: {
          elements: {},
          trackAverage: true,
        },
      });

      await new Promise((resolve) => setTimeout(resolve, 10));

      vlist.emit?.("viewport:velocity-changed", {
        velocity: 10,
        direction: "forward",
      });

      const avgBefore = vlist.getAverageVelocity?.();

      vlist.emit?.("reload:start");

      // Average should be preserved
      expect(vlist.getAverageVelocity?.()).toBe(avgBefore);

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
        velocity: {
          elements: {},
        },
      });

      // Should not throw
      expect(() => vlist.destroy()).not.toThrow();
    });

    it("should handle rapid velocity updates", async () => {
      const vlist = createVList({
        container,
        items: [],
        template: (item) => `<div>${item.name}</div>`,
        layout: [["viewport"]],
        velocity: {
          elements: {},
          trackAverage: true,
        },
      });

      await new Promise((resolve) => setTimeout(resolve, 10));

      // Rapid updates
      for (let i = 0; i < 100; i++) {
        vlist.emit?.("viewport:velocity-changed", {
          velocity: i % 20 + 1, // Values 1-20
          direction: i % 2 === 0 ? "forward" : "backward",
        });
      }

      // Should have final velocity
      expect(vlist.getVelocity?.()).toBeGreaterThan(0);

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
        velocity: {
          elements: {
            current: "nonexistent",
            average: "also-nonexistent",
          },
        },
      });

      await new Promise((resolve) => setTimeout(resolve, 10));

      // Should not throw
      expect(() => {
        vlist.emit?.("viewport:velocity-changed", {
          velocity: 5,
          direction: "forward",
        });
      }).not.toThrow();

      vlist.destroy();
    });

    it("should handle empty elements config", () => {
      const vlist = createVList({
        container,
        items: [],
        template: (item) => `<div>${item.name}</div>`,
        layout: [["viewport"]],
        velocity: {
          elements: {},
        },
      });

      expect(vlist.getVelocity).toBeDefined();
      expect(vlist.getVelocity?.()).toBe(0);

      vlist.destroy();
    });

    it("should handle zero velocity update", async () => {
      const vlist = createVList({
        container,
        items: [],
        template: (item) => `<div>${item.name}</div>`,
        layout: [["viewport"]],
        velocity: {
          elements: {},
        },
      });

      await new Promise((resolve) => setTimeout(resolve, 10));

      vlist.emit?.("viewport:velocity-changed", {
        velocity: 0,
        direction: "forward",
      });

      expect(vlist.getVelocity?.()).toBe(0);

      vlist.destroy();
    });

    it("should track direction correctly", async () => {
      const vlist = createVList({
        container,
        items: [],
        template: (item) => `<div>${item.name}</div>`,
        layout: [["viewport"]],
        velocity: {
          elements: {},
        },
      });

      await new Promise((resolve) => setTimeout(resolve, 10));

      vlist.emit?.("viewport:velocity-changed", {
        velocity: 5,
        direction: "backward",
      });

      expect(vlist.getVelocityDirection?.()).toBe("backward");

      vlist.emit?.("viewport:velocity-changed", {
        velocity: 3,
        direction: "forward",
      });

      expect(vlist.getVelocityDirection?.()).toBe("forward");

      vlist.destroy();
    });
  });
});
