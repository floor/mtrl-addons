// test/components/vlist-scroll-restore.test.ts

/**
 * VList withScrollRestore Feature Tests
 *
 * Tests the scroll restore integration for VList that provides
 * pending scroll position and selection that gets executed on reload.
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

describe("VList withScrollRestore Feature", () => {
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

  describe("Basic ScrollRestore Configuration", () => {
    it("should create VList with scroll restore enabled by default", () => {
      const vlist = createVList({
        container,
        items: [{ id: "1", name: "Item 1" }],
        template: (item) => `<div>${item.name}</div>`,
        layout: [["viewport"]],
      });

      expect(vlist).toBeDefined();
      // ScrollRestore is enabled by default
      expect(vlist.setPendingScroll).toBeDefined();
      expect(vlist.hasPendingScroll).toBeDefined();
      expect(vlist.clearPendingScroll).toBeDefined();

      vlist.destroy();
    });

    it("should allow disabling scroll restore", () => {
      const vlist = createVList({
        container,
        items: [{ id: "1", name: "Item 1" }],
        template: (item) => `<div>${item.name}</div>`,
        layout: [["viewport"]],
        scrollRestore: {
          enabled: false,
        },
      });

      expect(vlist).toBeDefined();
      // Should not have scroll restore methods when disabled
      expect(vlist.setPendingScroll).toBeUndefined();

      vlist.destroy();
    });

    it("should initialize with no pending scroll", () => {
      const vlist = createVList({
        container,
        items: [],
        template: (item) => `<div>${item.name}</div>`,
        layout: [["viewport"]],
      });

      expect(vlist.hasPendingScroll?.()).toBe(false);
      expect(vlist.getPendingScroll?.()).toBeNull();

      vlist.destroy();
    });
  });

  describe("Pending Scroll API", () => {
    it("should set pending scroll with position", () => {
      const vlist = createVList({
        container,
        items: [],
        template: (item) => `<div>${item.name}</div>`,
        layout: [["viewport"]],
      });

      vlist.setPendingScroll?.({
        position: 100,
      });

      expect(vlist.hasPendingScroll?.()).toBe(true);

      const pending = vlist.getPendingScroll?.();
      expect(pending).toBeDefined();
      expect((pending as any)?.position).toBe(100);

      vlist.destroy();
    });

    it("should set pending scroll with position and selectId", () => {
      const vlist = createVList({
        container,
        items: [],
        template: (item) => `<div>${item.name}</div>`,
        layout: [["viewport"]],
      });

      vlist.setPendingScroll?.({
        position: 50,
        selectId: "item-123",
      });

      expect(vlist.hasPendingScroll?.()).toBe(true);

      const pending = vlist.getPendingScroll?.();
      expect((pending as any)?.position).toBe(50);
      expect((pending as any)?.selectId).toBe("item-123");

      vlist.destroy();
    });

    it("should clear pending scroll", () => {
      const vlist = createVList({
        container,
        items: [],
        template: (item) => `<div>${item.name}</div>`,
        layout: [["viewport"]],
      });

      vlist.setPendingScroll?.({
        position: 100,
        selectId: "item-1",
      });

      expect(vlist.hasPendingScroll?.()).toBe(true);

      vlist.clearPendingScroll?.();

      expect(vlist.hasPendingScroll?.()).toBe(false);
      expect(vlist.getPendingScroll?.()).toBeNull();

      vlist.destroy();
    });

    it("should overwrite previous pending scroll", () => {
      const vlist = createVList({
        container,
        items: [],
        template: (item) => `<div>${item.name}</div>`,
        layout: [["viewport"]],
      });

      vlist.setPendingScroll?.({
        position: 50,
        selectId: "first",
      });

      vlist.setPendingScroll?.({
        position: 200,
        selectId: "second",
      });

      const pending = vlist.getPendingScroll?.();
      expect((pending as any)?.position).toBe(200);
      expect((pending as any)?.selectId).toBe("second");

      vlist.destroy();
    });
  });

  describe("Pending Scroll with Lookup", () => {
    it("should set pending scroll with lookup function", () => {
      const vlist = createVList({
        container,
        items: [],
        template: (item) => `<div>${item.name}</div>`,
        layout: [["viewport"]],
      });

      const lookupFn = async (id: string | number) => {
        return 42;
      };

      vlist.setPendingScrollWithLookup?.({
        id: "user-123",
        lookupPosition: lookupFn,
      });

      expect(vlist.hasPendingScroll?.()).toBe(true);

      const pending = vlist.getPendingScroll?.();
      expect((pending as any)?.id).toBe("user-123");
      expect((pending as any)?.lookupPosition).toBeDefined();

      vlist.destroy();
    });

    it("should set pending scroll with lookup and altId", () => {
      const vlist = createVList({
        container,
        items: [],
        template: (item) => `<div>${item.name}</div>`,
        layout: [["viewport"]],
      });

      const lookupFn = async (id: string | number) => {
        return 100;
      };

      vlist.setPendingScrollWithLookup?.({
        id: "profile-123",
        altId: "user-456",
        lookupPosition: lookupFn,
      });

      const pending = vlist.getPendingScroll?.();
      expect((pending as any)?.id).toBe("profile-123");
      expect((pending as any)?.altId).toBe("user-456");

      vlist.destroy();
    });

    it("should set pending scroll with fallback position", () => {
      const vlist = createVList({
        container,
        items: [],
        template: (item) => `<div>${item.name}</div>`,
        layout: [["viewport"]],
      });

      const lookupFn = async (id: string | number) => {
        throw new Error("Lookup failed");
      };

      vlist.setPendingScrollWithLookup?.({
        id: "user-123",
        lookupPosition: lookupFn,
        fallbackPosition: 0,
      });

      const pending = vlist.getPendingScroll?.();
      expect((pending as any)?.fallbackPosition).toBe(0);

      vlist.destroy();
    });
  });

  describe("ScrollRestore Events", () => {
    it("should emit scroll-restore:pending when setting pending scroll", async () => {
      const vlist = createVList({
        container,
        items: [],
        template: (item) => `<div>${item.name}</div>`,
        layout: [["viewport"]],
      });

      let eventData: any = null;
      vlist.on("scroll-restore:pending", (data: any) => {
        eventData = data;
      });

      vlist.setPendingScroll?.({
        position: 100,
        selectId: "item-1",
      });

      expect(eventData).toBeDefined();
      expect(eventData?.type).toBe("position");
      expect(eventData?.position).toBe(100);
      expect(eventData?.selectId).toBe("item-1");

      vlist.destroy();
    });

    it("should emit scroll-restore:pending with lookup type", async () => {
      const vlist = createVList({
        container,
        items: [],
        template: (item) => `<div>${item.name}</div>`,
        layout: [["viewport"]],
      });

      let eventData: any = null;
      vlist.on("scroll-restore:pending", (data: any) => {
        eventData = data;
      });

      vlist.setPendingScrollWithLookup?.({
        id: "user-123",
        altId: "alt-456",
        lookupPosition: async () => 50,
      });

      expect(eventData).toBeDefined();
      expect(eventData?.type).toBe("lookup");
      expect(eventData?.id).toBe("user-123");
      expect(eventData?.altId).toBe("alt-456");

      vlist.destroy();
    });

    it("should emit scroll-restore:cleared when clearing pending", () => {
      const vlist = createVList({
        container,
        items: [],
        template: (item) => `<div>${item.name}</div>`,
        layout: [["viewport"]],
      });

      let cleared = false;
      vlist.on("scroll-restore:cleared", () => {
        cleared = true;
      });

      vlist.setPendingScroll?.({
        position: 100,
      });

      vlist.clearPendingScroll?.();

      expect(cleared).toBe(true);

      vlist.destroy();
    });

    it("should not emit scroll-restore:cleared if no pending scroll", () => {
      const vlist = createVList({
        container,
        items: [],
        template: (item) => `<div>${item.name}</div>`,
        layout: [["viewport"]],
      });

      let cleared = false;
      vlist.on("scroll-restore:cleared", () => {
        cleared = true;
      });

      vlist.clearPendingScroll?.();

      expect(cleared).toBe(false);

      vlist.destroy();
    });
  });

  describe("Auto-Clear Configuration", () => {
    it("should auto-clear pending scroll after apply by default", async () => {
      const vlist = createVList({
        container,
        items: [],
        template: (item) => `<div>${item.name}</div>`,
        layout: [["viewport"]],
        scrollRestore: {
          autoClear: true,
        },
      });

      vlist.setPendingScroll?.({
        position: 100,
        selectId: "item-1",
      });

      expect(vlist.hasPendingScroll?.()).toBe(true);

      // Force apply
      await vlist.applyPendingScrollNow?.();

      // Should be cleared after apply
      expect(vlist.hasPendingScroll?.()).toBe(false);

      vlist.destroy();
    });

    it("should respect autoClear: false configuration", async () => {
      const vlist = createVList({
        container,
        items: [],
        template: (item) => `<div>${item.name}</div>`,
        layout: [["viewport"]],
        scrollRestore: {
          autoClear: false,
        },
      });

      vlist.setPendingScroll?.({
        position: 100,
      });

      await vlist.applyPendingScrollNow?.();

      // Should NOT be cleared when autoClear is false
      // Note: This depends on implementation - if autoClear defaults to true,
      // we need to explicitly set it to false
      expect(vlist.hasPendingScroll?.()).toBe(true);

      vlist.destroy();
    });
  });

  describe("Force Apply", () => {
    it("should apply pending scroll immediately via applyPendingScrollNow", async () => {
      const vlist = createVList({
        container,
        items: [],
        template: (item) => `<div>${item.name}</div>`,
        layout: [["viewport"]],
      });

      let appliedEvent: any = null;
      vlist.on("scroll-restore:applied", (data: any) => {
        appliedEvent = data;
      });

      vlist.setPendingScroll?.({
        position: 100,
        selectId: "item-1",
      });

      await vlist.applyPendingScrollNow?.();

      expect(appliedEvent).toBeDefined();
      expect(appliedEvent?.position).toBe(100);
      expect(appliedEvent?.selectId).toBe("item-1");

      vlist.destroy();
    });

    it("should do nothing if no pending scroll when applying", async () => {
      const vlist = createVList({
        container,
        items: [],
        template: (item) => `<div>${item.name}</div>`,
        layout: [["viewport"]],
      });

      let appliedEvent: any = null;
      vlist.on("scroll-restore:applied", (data: any) => {
        appliedEvent = data;
      });

      // No pending scroll set
      await vlist.applyPendingScrollNow?.();

      expect(appliedEvent).toBeNull();

      vlist.destroy();
    });
  });

  describe("Lookup Function Execution", () => {
    it("should execute lookup function when applying", async () => {
      const vlist = createVList({
        container,
        items: [],
        template: (item) => `<div>${item.name}</div>`,
        layout: [["viewport"]],
      });

      let lookupCalled = false;
      let lookupId: string | number | null = null;

      vlist.setPendingScrollWithLookup?.({
        id: "user-123",
        lookupPosition: async (id) => {
          lookupCalled = true;
          lookupId = id;
          return 75;
        },
      });

      let appliedEvent: any = null;
      vlist.on("scroll-restore:applied", (data: any) => {
        appliedEvent = data;
      });

      await vlist.applyPendingScrollNow?.();

      expect(lookupCalled).toBe(true);
      expect(lookupId).toBe("user-123");
      expect(appliedEvent?.position).toBe(75);

      vlist.destroy();
    });

    it("should use altId for lookup if provided", async () => {
      const vlist = createVList({
        container,
        items: [],
        template: (item) => `<div>${item.name}</div>`,
        layout: [["viewport"]],
      });

      let lookupId: string | number | null = null;

      vlist.setPendingScrollWithLookup?.({
        id: "profile-123",
        altId: "user-456",
        lookupPosition: async (id) => {
          lookupId = id;
          return 50;
        },
      });

      await vlist.applyPendingScrollNow?.();

      // Should use altId for lookup
      expect(lookupId).toBe("user-456");

      vlist.destroy();
    });

    it("should use fallback position on lookup failure", async () => {
      const vlist = createVList({
        container,
        items: [],
        template: (item) => `<div>${item.name}</div>`,
        layout: [["viewport"]],
      });

      vlist.setPendingScrollWithLookup?.({
        id: "user-123",
        lookupPosition: async () => {
          throw new Error("Network error");
        },
        fallbackPosition: 0,
      });

      let appliedEvent: any = null;
      vlist.on("scroll-restore:applied", (data: any) => {
        appliedEvent = data;
      });

      await vlist.applyPendingScrollNow?.();

      expect(appliedEvent?.position).toBe(0);

      vlist.destroy();
    });

    it("should use original id as selectId after lookup", async () => {
      const vlist = createVList({
        container,
        items: [],
        template: (item) => `<div>${item.name}</div>`,
        layout: [["viewport"]],
      });

      vlist.setPendingScrollWithLookup?.({
        id: "profile-123",
        altId: "user-456",
        lookupPosition: async () => 100,
      });

      let appliedEvent: any = null;
      vlist.on("scroll-restore:applied", (data: any) => {
        appliedEvent = data;
      });

      await vlist.applyPendingScrollNow?.();

      // selectId should be the original id, not altId
      expect(appliedEvent?.selectId).toBe("profile-123");

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
      });

      vlist.setPendingScroll?.({
        position: 100,
      });

      // Should not throw
      expect(() => vlist.destroy()).not.toThrow();
    });
  });

  describe("Edge Cases", () => {
    it("should handle position of 0", () => {
      const vlist = createVList({
        container,
        items: [],
        template: (item) => `<div>${item.name}</div>`,
        layout: [["viewport"]],
      });

      vlist.setPendingScroll?.({
        position: 0,
        selectId: "first-item",
      });

      expect(vlist.hasPendingScroll?.()).toBe(true);

      const pending = vlist.getPendingScroll?.();
      expect((pending as any)?.position).toBe(0);

      vlist.destroy();
    });

    it("should handle numeric selectId", () => {
      const vlist = createVList({
        container,
        items: [],
        template: (item) => `<div>${item.name}</div>`,
        layout: [["viewport"]],
      });

      vlist.setPendingScroll?.({
        position: 50,
        selectId: 12345,
      });

      const pending = vlist.getPendingScroll?.();
      expect((pending as any)?.selectId).toBe(12345);

      vlist.destroy();
    });

    it("should handle undefined selectId", () => {
      const vlist = createVList({
        container,
        items: [],
        template: (item) => `<div>${item.name}</div>`,
        layout: [["viewport"]],
      });

      vlist.setPendingScroll?.({
        position: 50,
        // selectId not provided
      });

      expect(vlist.hasPendingScroll?.()).toBe(true);

      const pending = vlist.getPendingScroll?.();
      expect((pending as any)?.selectId).toBeUndefined();

      vlist.destroy();
    });

    it("should handle switching from position to lookup pending", () => {
      const vlist = createVList({
        container,
        items: [],
        template: (item) => `<div>${item.name}</div>`,
        layout: [["viewport"]],
      });

      // Set position-based first
      vlist.setPendingScroll?.({
        position: 100,
      });

      // Switch to lookup-based
      vlist.setPendingScrollWithLookup?.({
        id: "user-123",
        lookupPosition: async () => 50,
      });

      const pending = vlist.getPendingScroll?.();
      // Should have lookup properties, not position
      expect((pending as any)?.id).toBe("user-123");
      expect((pending as any)?.position).toBeUndefined();

      vlist.destroy();
    });

    it("should handle switching from lookup to position pending", () => {
      const vlist = createVList({
        container,
        items: [],
        template: (item) => `<div>${item.name}</div>`,
        layout: [["viewport"]],
      });

      // Set lookup-based first
      vlist.setPendingScrollWithLookup?.({
        id: "user-123",
        lookupPosition: async () => 50,
      });

      // Switch to position-based
      vlist.setPendingScroll?.({
        position: 200,
        selectId: "item-456",
      });

      const pending = vlist.getPendingScroll?.();
      // Should have position properties, not lookup
      expect((pending as any)?.position).toBe(200);
      expect((pending as any)?.id).toBeUndefined();

      vlist.destroy();
    });

    it("should handle async lookup that takes time", async () => {
      const vlist = createVList({
        container,
        items: [],
        template: (item) => `<div>${item.name}</div>`,
        layout: [["viewport"]],
      });

      vlist.setPendingScrollWithLookup?.({
        id: "slow-lookup",
        lookupPosition: async () => {
          // Simulate slow network
          await new Promise((resolve) => setTimeout(resolve, 50));
          return 123;
        },
      });

      let appliedEvent: any = null;
      vlist.on("scroll-restore:applied", (data: any) => {
        appliedEvent = data;
      });

      await vlist.applyPendingScrollNow?.();

      expect(appliedEvent?.position).toBe(123);

      vlist.destroy();
    });
  });
});
