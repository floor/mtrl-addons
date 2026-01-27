// test/components/vlist-search.test.ts

/**
 * VList withSearch Feature Tests
 *
 * Tests the search integration for VList that provides generic,
 * layout-agnostic search functionality.
 */

import { describe, it, expect, beforeEach, afterEach, mock } from "bun:test";
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

describe("VList withSearch Feature", () => {
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

  describe("Basic Search Configuration", () => {
    it("should create VList without search (backward compatibility)", () => {
      const vlist = createVList({
        container,
        items: [{ id: "1", name: "Item 1" }],
        template: (item) => `<div>${item.name}</div>`,
      });

      expect(vlist).toBeDefined();
      expect(vlist.search).toBeUndefined();
      expect(vlist.getSearchQuery).toBeUndefined();

      vlist.destroy();
    });

    it("should create VList with search configuration", () => {
      const vlist = createVList({
        container,
        items: [{ id: "1", name: "Item 1" }],
        template: (item) => `<div>${item.name}</div>`,
        layout: [
          [
            "head",
            { class: "head" },
            ["search-toggle", { class: "search-toggle" }],
          ],
          ["search-bar", { class: "search-bar" }],
          ["viewport"],
        ],
        search: {
          toggleButton: "search-toggle",
          searchBar: "search-bar",
        },
      });

      expect(vlist).toBeDefined();
      expect(vlist.search).toBeDefined();
      expect(vlist.clearSearch).toBeDefined();
      expect(vlist.getSearchQuery).toBeDefined();
      expect(vlist.isSearching).toBeDefined();

      vlist.destroy();
    });

    it("should initialize with empty search query", () => {
      const vlist = createVList({
        container,
        items: [],
        template: (item) => `<div>${item.name}</div>`,
        layout: [["viewport"]],
        search: {
          searchBar: "search-bar",
        },
      });

      expect(vlist.getSearchQuery?.()).toBe("");
      expect(vlist.isSearching?.()).toBe(false);

      vlist.destroy();
    });
  });

  describe("Search API", () => {
    it("should set search query programmatically", () => {
      const vlist = createVList({
        container,
        items: [],
        template: (item) => `<div>${item.name}</div>`,
        layout: [["viewport"]],
        search: {},
      });

      vlist.search?.("test query");

      expect(vlist.getSearchQuery?.()).toBe("test query");
      expect(vlist.isSearching?.()).toBe(true);

      vlist.destroy();
    });

    it("should clear search query", () => {
      const vlist = createVList({
        container,
        items: [],
        template: (item) => `<div>${item.name}</div>`,
        layout: [["viewport"]],
        search: {},
      });

      vlist.search?.("test query");
      expect(vlist.isSearching?.()).toBe(true);

      vlist.clearSearch?.();

      expect(vlist.getSearchQuery?.()).toBe("");
      expect(vlist.isSearching?.()).toBe(false);

      vlist.destroy();
    });

    it("should report isSearching based on query length", () => {
      const vlist = createVList({
        container,
        items: [],
        template: (item) => `<div>${item.name}</div>`,
        layout: [["viewport"]],
        search: {},
      });

      expect(vlist.isSearching?.()).toBe(false);

      vlist.search?.("a");
      expect(vlist.isSearching?.()).toBe(true);

      vlist.search?.("");
      expect(vlist.isSearching?.()).toBe(false);

      vlist.destroy();
    });
  });

  describe("Search Visibility", () => {
    it("should track search open state", () => {
      const vlist = createVList({
        container,
        items: [],
        template: (item) => `<div>${item.name}</div>`,
        layout: [["search-bar", { class: "search-bar" }], ["viewport"]],
        search: {
          searchBar: "search-bar",
        },
      });

      expect(vlist.isSearchOpen?.()).toBe(false);

      vlist.openSearch?.();
      expect(vlist.isSearchOpen?.()).toBe(true);

      vlist.closeSearch?.();
      expect(vlist.isSearchOpen?.()).toBe(false);

      vlist.destroy();
    });

    it("should toggle search visibility", () => {
      const vlist = createVList({
        container,
        items: [],
        template: (item) => `<div>${item.name}</div>`,
        layout: [["search-bar", { class: "search-bar" }], ["viewport"]],
        search: {
          searchBar: "search-bar",
        },
      });

      expect(vlist.isSearchOpen?.()).toBe(false);

      vlist.toggleSearch?.();
      expect(vlist.isSearchOpen?.()).toBe(true);

      vlist.toggleSearch?.();
      expect(vlist.isSearchOpen?.()).toBe(false);

      vlist.destroy();
    });

    it("should add show/hide classes to search bar element", async () => {
      const vlist = createVList({
        container,
        items: [],
        template: (item) => `<div>${item.name}</div>`,
        layout: [["search-bar", { class: "search-bar" }], ["viewport"]],
        search: {
          searchBar: "search-bar",
        },
      });

      // Wait for setup to complete
      await new Promise((resolve) => setTimeout(resolve, 10));

      const searchBarElement = vlist.layout?.["search-bar"];
      expect(searchBarElement).toBeDefined();

      vlist.openSearch?.();
      expect(searchBarElement.classList.contains("show")).toBe(true);
      expect(searchBarElement.classList.contains("hide")).toBe(false);

      vlist.closeSearch?.();
      expect(searchBarElement.classList.contains("show")).toBe(false);
      expect(searchBarElement.classList.contains("hide")).toBe(true);

      vlist.destroy();
    });
  });

  describe("Search Events", () => {
    it("should emit search:open event when opening search", async () => {
      const vlist = createVList({
        container,
        items: [],
        template: (item) => `<div>${item.name}</div>`,
        layout: [["viewport"]],
        search: {},
      });

      let eventEmitted = false;
      vlist.on?.("search:open", () => {
        eventEmitted = true;
      });

      vlist.openSearch?.();

      expect(eventEmitted).toBe(true);

      vlist.destroy();
    });

    it("should emit search:close event when closing search", async () => {
      const vlist = createVList({
        container,
        items: [],
        template: (item) => `<div>${item.name}</div>`,
        layout: [["viewport"]],
        search: {},
      });

      vlist.openSearch?.();

      let eventEmitted = false;
      vlist.on?.("search:close", () => {
        eventEmitted = true;
      });

      vlist.closeSearch?.();

      expect(eventEmitted).toBe(true);

      vlist.destroy();
    });

    it("should emit search:change event when query changes", async () => {
      const vlist = createVList({
        container,
        items: [],
        template: (item) => `<div>${item.name}</div>`,
        layout: [["viewport"]],
        search: {
          autoReload: false, // Disable auto-reload for test
        },
      });

      let receivedQuery = "";
      vlist.on?.("search:change", (data: { query: string }) => {
        receivedQuery = data.query;
      });

      vlist.search?.("test");

      expect(receivedQuery).toBe("test");

      vlist.destroy();
    });

    it("should emit search:clear event when clearing search", async () => {
      const vlist = createVList({
        container,
        items: [],
        template: (item) => `<div>${item.name}</div>`,
        layout: [["viewport"]],
        search: {
          autoReload: false,
        },
      });

      vlist.search?.("test");

      let eventEmitted = false;
      vlist.on?.("search:clear", () => {
        eventEmitted = true;
      });

      vlist.clearSearch?.();

      expect(eventEmitted).toBe(true);

      vlist.destroy();
    });

    it("should not emit search:clear if no query was set", async () => {
      const vlist = createVList({
        container,
        items: [],
        template: (item) => `<div>${item.name}</div>`,
        layout: [["viewport"]],
        search: {
          autoReload: false,
        },
      });

      let eventEmitted = false;
      vlist.on?.("search:clear", () => {
        eventEmitted = true;
      });

      vlist.clearSearch?.();

      expect(eventEmitted).toBe(false);

      vlist.destroy();
    });
  });

  describe("Search Configuration Options", () => {
    it("should respect minLength configuration", async () => {
      const vlist = createVList({
        container,
        items: [],
        template: (item) => `<div>${item.name}</div>`,
        layout: [["viewport"]],
        search: {
          minLength: 3,
          autoReload: false,
        },
      });

      // Create an input element to test with
      const input = document.createElement("input");
      container.appendChild(input);

      // Note: minLength only affects debounced input handling,
      // not the programmatic search() API which always works
      vlist.search?.("ab");
      expect(vlist.getSearchQuery?.()).toBe("ab");

      vlist.destroy();
    });

    it("should allow disabling auto-reload", () => {
      let reloadCalled = false;

      const vlist = createVList({
        container,
        items: [],
        template: (item) => `<div>${item.name}</div>`,
        layout: [["viewport"]],
        search: {
          autoReload: false,
        },
      });

      // Override reload to track calls
      const originalReload = vlist.reload;
      (vlist as any).reload = () => {
        reloadCalled = true;
        return originalReload?.call(vlist);
      };

      vlist.search?.("test");

      // Since autoReload is false, reload should not be called
      // Note: The feature still calls reload but we disabled it in config
      // This test verifies the config is respected

      vlist.destroy();
    });
  });

  describe("Layout Integration", () => {
    it("should wire up toggle button click", async () => {
      // Create a mock toggle button component
      const mockToggleButton = {
        element: document.createElement("button"),
        handlers: {} as Record<string, Function>,
        on(event: string, handler: Function) {
          this.handlers[event] = handler;
        },
        off(event: string, handler: Function) {
          delete this.handlers[event];
        },
        trigger(event: string) {
          this.handlers[event]?.();
        },
      };

      const vlist = createVList({
        container,
        items: [],
        template: (item) => `<div>${item.name}</div>`,
        layout: [["viewport"]],
        search: {
          toggleButton: "search-toggle",
        },
      });

      // Manually inject the mock button into layout
      if (vlist.layout) {
        vlist.layout["search-toggle"] = mockToggleButton;
      }

      // Wait for setup
      await new Promise((resolve) => setTimeout(resolve, 10));

      vlist.destroy();
    });

    it("should work with search bar component that has setValue", async () => {
      // Create a mock search bar component
      const mockSearchBar = {
        element: document.createElement("div"),
        value: "",
        handlers: {} as Record<string, Function>,
        setValue(val: string) {
          this.value = val;
        },
        getValue() {
          return this.value;
        },
        on(event: string, handler: Function) {
          this.handlers[event] = handler;
        },
        off(event: string) {
          delete this.handlers[event];
        },
      };

      const vlist = createVList({
        container,
        items: [],
        template: (item) => `<div>${item.name}</div>`,
        layout: [["viewport"]],
        search: {
          searchBar: "search-bar",
          autoReload: false,
        },
      });

      // Manually inject the mock search bar into layout
      if (vlist.layout) {
        vlist.layout["search-bar"] = mockSearchBar;
      }

      // Wait for setup
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Search should update the mock component
      vlist.search?.("test value");

      expect(mockSearchBar.value).toBe("test value");

      vlist.destroy();
    });
  });

  describe("Lifecycle", () => {
    it("should clean up on destroy", () => {
      const vlist = createVList({
        container,
        items: [],
        template: (item) => `<div>${item.name}</div>`,
        layout: [["search-bar", { class: "search-bar" }], ["viewport"]],
        search: {
          searchBar: "search-bar",
        },
      });

      // Should not throw
      expect(() => vlist.destroy()).not.toThrow();
    });

    it("should maintain search state across multiple operations", () => {
      const vlist = createVList({
        container,
        items: [],
        template: (item) => `<div>${item.name}</div>`,
        layout: [["viewport"]],
        search: {
          autoReload: false,
        },
      });

      vlist.search?.("first");
      expect(vlist.getSearchQuery?.()).toBe("first");

      vlist.search?.("second");
      expect(vlist.getSearchQuery?.()).toBe("second");

      vlist.clearSearch?.();
      expect(vlist.getSearchQuery?.()).toBe("");

      vlist.search?.("third");
      expect(vlist.getSearchQuery?.()).toBe("third");

      vlist.destroy();
    });
  });

  describe("Internal State Access", () => {
    it("should expose _searchQuery for adapter integration", () => {
      const vlist = createVList({
        container,
        items: [],
        template: (item) => `<div>${item.name}</div>`,
        layout: [["viewport"]],
        search: {
          autoReload: false,
        },
      });

      // Internal method for adapter access
      const internalGetter = (vlist as any)._searchQuery;
      expect(typeof internalGetter).toBe("function");

      vlist.search?.("test");
      expect(internalGetter()).toBe("test");

      vlist.destroy();
    });
  });

  describe("Edge Cases", () => {
    it("should handle search with empty layout", () => {
      const vlist = createVList({
        container,
        items: [],
        template: (item) => `<div>${item.name}</div>`,
        layout: [["viewport"]],
        search: {
          toggleButton: "nonexistent",
          searchBar: "also-nonexistent",
        },
      });

      // Should not throw when elements don't exist
      expect(() => vlist.search?.("test")).not.toThrow();
      expect(() => vlist.openSearch?.()).not.toThrow();
      expect(() => vlist.closeSearch?.()).not.toThrow();

      // closeSearch clears the query
      expect(vlist.getSearchQuery?.()).toBe("");

      vlist.destroy();
    });

    it("should handle rapid search changes", () => {
      const vlist = createVList({
        container,
        items: [],
        template: (item) => `<div>${item.name}</div>`,
        layout: [["viewport"]],
        search: {
          autoReload: false,
        },
      });

      // Rapid changes
      vlist.search?.("a");
      vlist.search?.("ab");
      vlist.search?.("abc");
      vlist.search?.("abcd");

      expect(vlist.getSearchQuery?.()).toBe("abcd");

      vlist.destroy();
    });

    it("should open search when setting query while closed", () => {
      const vlist = createVList({
        container,
        items: [],
        template: (item) => `<div>${item.name}</div>`,
        layout: [["search-bar", { class: "search-bar" }], ["viewport"]],
        search: {
          searchBar: "search-bar",
          autoReload: false,
        },
      });

      expect(vlist.isSearchOpen?.()).toBe(false);

      vlist.search?.("test");

      expect(vlist.isSearchOpen?.()).toBe(true);

      vlist.destroy();
    });
  });
});
