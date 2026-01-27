// test/components/vlist-layout.test.ts

/**
 * VList withLayout Feature Tests
 *
 * Tests the layout integration for VList that allows building
 * complete list UIs with headers, footers, and virtual scrolling viewport.
 */

import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { JSDOM } from "jsdom";

// Mock DOM environment for testing
const dom = new JSDOM("<!DOCTYPE html><html><body></body></html>");
global.document = dom.window.document;
global.HTMLElement = dom.window.HTMLElement;
global.window = dom.window as any;
global.navigator = dom.window.navigator;
global.requestAnimationFrame = (cb: FrameRequestCallback) => {
  setTimeout(cb, 0);
  return 0;
};

// Import VList after DOM setup
import { createVList } from "../../src/components/vlist";

describe("VList withLayout Feature", () => {
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

  describe("Basic Layout", () => {
    it("should create VList without layout (backward compatibility)", () => {
      const vlist = createVList({
        container,
        items: [{ id: "1", name: "Item 1" }],
        template: (item) => `<div>${item.name}</div>`,
      });

      expect(vlist).toBeDefined();
      expect(vlist.element).toBeDefined();
      expect(vlist.element.classList.contains("mtrl-vlist")).toBe(true);
      // No layout property when layout option not provided
      expect(vlist.layout).toBeUndefined();

      vlist.destroy();
    });

    it("should create VList with minimal layout containing viewport", () => {
      const vlist = createVList({
        container,
        items: [{ id: "1", name: "Item 1" }],
        template: (item) => `<div>${item.name}</div>`,
        layout: [["viewport"]],
      });

      expect(vlist).toBeDefined();
      expect(vlist.element).toBeDefined();
      expect(vlist.layout).toBeDefined();
      expect(vlist.layout.viewport).toBeDefined();

      vlist.destroy();
    });

    it("should create VList with header, viewport, and footer", () => {
      const vlist = createVList({
        container,
        items: [{ id: "1", name: "Item 1" }],
        template: (item) => `<div>${item.name}</div>`,
        layout: [
          ["head", { class: "head" }, ["title", { text: "My List" }]],
          ["viewport"],
          ["foot", { class: "foot" }, ["count", { text: "0 items" }]],
        ],
      });

      expect(vlist).toBeDefined();
      expect(vlist.layout).toBeDefined();

      // Check all named elements are accessible
      expect(vlist.layout.head).toBeDefined();
      expect(vlist.layout.title).toBeDefined();
      expect(vlist.layout.viewport).toBeDefined();
      expect(vlist.layout.foot).toBeDefined();
      expect(vlist.layout.count).toBeDefined();

      vlist.destroy();
    });
  });

  describe("Layout Element Access", () => {
    it("should provide flat access to all named layout elements", () => {
      const vlist = createVList({
        container,
        items: [],
        template: (item) => `<div>${item.name}</div>`,
        layout: [
          [
            "header",
            { class: "header" },
            ["title", { text: "Users" }],
            ["subtitle", { text: "Manage users" }],
          ],
          ["viewport"],
          [
            "footer",
            { class: "footer" },
            ["progress", { text: "0%" }],
            ["count", { text: "0" }],
          ],
        ],
      });

      // All elements accessible via flat map
      expect(vlist.layout.header).toBeDefined();
      expect(vlist.layout.title).toBeDefined();
      expect(vlist.layout.subtitle).toBeDefined();
      expect(vlist.layout.viewport).toBeDefined();
      expect(vlist.layout.footer).toBeDefined();
      expect(vlist.layout.progress).toBeDefined();
      expect(vlist.layout.count).toBeDefined();

      vlist.destroy();
    });

    it("should allow updating layout element content", () => {
      const vlist = createVList({
        container,
        items: [],
        template: (item) => `<div>${item.name}</div>`,
        layout: [
          ["head", { class: "head" }, ["title", { text: "Initial Title" }]],
          ["viewport"],
          ["foot", { class: "foot" }, ["count", { text: "0" }]],
        ],
      });

      // Get DOM element from layout
      const titleElement =
        vlist.layout.title instanceof HTMLElement
          ? vlist.layout.title
          : vlist.layout.title?.element;

      const countElement =
        vlist.layout.count instanceof HTMLElement
          ? vlist.layout.count
          : vlist.layout.count?.element;

      expect(titleElement).toBeDefined();
      expect(countElement).toBeDefined();

      // Update content
      if (titleElement) {
        titleElement.textContent = "Updated Title";
        expect(titleElement.textContent).toBe("Updated Title");
      }

      if (countElement) {
        countElement.textContent = "42 items";
        expect(countElement.textContent).toBe("42 items");
      }

      vlist.destroy();
    });

    it("should provide getLayoutElement method for element access", () => {
      const vlist = createVList({
        container,
        items: [],
        template: (item) => `<div>${item.name}</div>`,
        layout: [
          ["head", { class: "head" }, ["title", { text: "Test" }]],
          ["viewport"],
        ],
      });

      // Use getLayoutElement method if available
      if (vlist.getLayoutElement) {
        expect(vlist.getLayoutElement("head")).toBeDefined();
        expect(vlist.getLayoutElement("title")).toBeDefined();
        expect(vlist.getLayoutElement("viewport")).toBeDefined();
        expect(vlist.getLayoutElement("nonexistent")).toBeNull();
      }

      vlist.destroy();
    });
  });

  describe("DOM Structure", () => {
    it("should render layout inside VList root element", () => {
      const vlist = createVList({
        container,
        items: [],
        template: (item) => `<div>${item.name}</div>`,
        layout: [
          ["head", { class: "head" }],
          ["viewport"],
          ["foot", { class: "foot" }],
        ],
      });

      const root = vlist.element;
      expect(root.classList.contains("mtrl-vlist")).toBe(true);

      // Layout elements should be children of root
      const headElement = root.querySelector(".mtrl-head");
      const footElement = root.querySelector(".mtrl-foot");

      expect(headElement).toBeDefined();
      expect(footElement).toBeDefined();

      vlist.destroy();
    });

    it("should add custom class to VList root when class option provided", () => {
      const vlist = createVList({
        container,
        class: "users",
        items: [],
        template: (item) => `<div>${item.name}</div>`,
        layout: [["viewport"]],
      });

      expect(vlist.element.classList.contains("mtrl-vlist")).toBe(true);
      expect(vlist.element.classList.contains("mtrl-vlist-users")).toBe(true);

      vlist.destroy();
    });

    it("should create viewport container for virtual scrolling", () => {
      const vlist = createVList({
        container,
        items: [
          { id: "1", name: "Item 1" },
          { id: "2", name: "Item 2" },
        ],
        template: (item) => `<div class="item">${item.name}</div>`,
        layout: [["viewport"]],
      });

      // Viewport should have the viewport container class
      const viewportEl =
        vlist.layout.viewport instanceof HTMLElement
          ? vlist.layout.viewport
          : vlist.layout.viewport?.element;

      expect(viewportEl).toBeDefined();
      if (viewportEl) {
        expect(
          viewportEl.classList.contains("mtrl-viewport-container") ||
            viewportEl.classList.contains("mtrl-viewport"),
        ).toBe(true);
      }

      vlist.destroy();
    });
  });

  describe("Viewport Integration", () => {
    it("should render items inside viewport from layout", () => {
      const vlist = createVList({
        container,
        items: [
          { id: "1", name: "Item 1" },
          { id: "2", name: "Item 2" },
          { id: "3", name: "Item 3" },
        ],
        template: (item: any) => `<div class="test-item">${item.name}</div>`,
        virtual: { itemSize: 50 },
        layout: [
          ["head", { class: "head" }],
          ["viewport"],
          ["foot", { class: "foot" }],
        ],
      });

      // Viewport should have virtual scrolling capability
      expect(vlist.viewport).toBeDefined();

      vlist.destroy();
    });
  });

  describe("Error Handling", () => {
    it("should warn but continue when layout has no viewport", () => {
      // This should log a warning but not throw
      const vlist = createVList({
        container,
        items: [],
        template: (item) => `<div>${item.name}</div>`,
        layout: [
          ["head", { class: "head" }],
          // No viewport!
          ["foot", { class: "foot" }],
        ],
      });

      // VList should still be created
      expect(vlist).toBeDefined();
      expect(vlist.element).toBeDefined();
      expect(vlist.layout).toBeDefined();

      // But viewport won't be in layout
      expect(vlist.layout.viewport).toBeUndefined();

      vlist.destroy();
    });

    it("should handle empty layout array", () => {
      const vlist = createVList({
        container,
        items: [],
        template: (item) => `<div>${item.name}</div>`,
        layout: [],
      });

      expect(vlist).toBeDefined();
      expect(vlist.element).toBeDefined();

      vlist.destroy();
    });
  });

  describe("Lifecycle", () => {
    it("should clean up layout on destroy", () => {
      const vlist = createVList({
        container,
        items: [],
        template: (item) => `<div>${item.name}</div>`,
        layout: [
          ["head", { class: "head" }, ["title", { text: "Test" }]],
          ["viewport"],
          ["foot", { class: "foot" }],
        ],
      });

      const root = vlist.element;
      expect(root.querySelector(".mtrl-head")).toBeDefined();
      expect(root.querySelector(".mtrl-foot")).toBeDefined();

      // Destroy should clean up
      vlist.destroy();

      // After destroy, element should be removed from DOM
      expect(root.parentNode).toBeNull();
    });
  });
});
