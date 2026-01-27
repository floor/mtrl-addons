// test/components/vlist-filter.test.ts

/**
 * VList withFilter Feature Tests
 *
 * Tests the filter integration for VList that provides generic,
 * layout-agnostic filter functionality.
 */

import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { JSDOM } from "jsdom";

// Mock DOM environment for testing
const dom = new JSDOM("<!DOCTYPE html><html><body></body></html>");
global.document = dom.window.document;
global.HTMLElement = dom.window.HTMLElement;
global.HTMLInputElement = dom.window.HTMLInputElement;
global.HTMLSelectElement = dom.window.HTMLSelectElement;
global.window = dom.window as any;
global.navigator = dom.window.navigator;
global.requestAnimationFrame = (cb: FrameRequestCallback) => {
  setTimeout(cb, 0);
  return 0;
};

// Import VList after DOM setup
import { createVList } from "../../src/components/vlist";

describe("VList withFilter Feature", () => {
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

  describe("Basic Filter Configuration", () => {
    it("should create VList without filter (backward compatibility)", () => {
      const vlist = createVList({
        container,
        items: [{ id: "1", name: "Item 1" }],
        template: (item) => `<div>${item.name}</div>`,
      });

      expect(vlist).toBeDefined();
      expect(vlist.setFilter).toBeUndefined();
      expect(vlist.getFilters).toBeUndefined();

      vlist.destroy();
    });

    it("should create VList with filter configuration", () => {
      const vlist = createVList({
        container,
        items: [{ id: "1", name: "Item 1" }],
        template: (item) => `<div>${item.name}</div>`,
        layout: [
          [
            "head",
            { class: "head" },
            ["filter-toggle", { class: "filter-toggle" }],
          ],
          ["filter-panel", { class: "filter-panel" }],
          ["viewport"],
        ],
        filter: {
          toggleButton: "filter-toggle",
          panel: "filter-panel",
        },
      });

      expect(vlist).toBeDefined();
      expect(vlist.setFilter).toBeDefined();
      expect(vlist.setFilters).toBeDefined();
      expect(vlist.clearFilters).toBeDefined();
      expect(vlist.getFilters).toBeDefined();
      expect(vlist.getFilter).toBeDefined();
      expect(vlist.isFiltered).toBeDefined();

      vlist.destroy();
    });

    it("should initialize with empty filters", () => {
      const vlist = createVList({
        container,
        items: [],
        template: (item) => `<div>${item.name}</div>`,
        layout: [["viewport"]],
        filter: {
          panel: "filter-panel",
        },
      });

      expect(vlist.getFilters?.()).toEqual({});
      expect(vlist.isFiltered?.()).toBe(false);

      vlist.destroy();
    });
  });

  describe("Filter API - Single Filter", () => {
    it("should set a single filter value", () => {
      const vlist = createVList({
        container,
        items: [],
        template: (item) => `<div>${item.name}</div>`,
        layout: [["viewport"]],
        filter: {
          autoReload: false,
        },
      });

      vlist.setFilter?.("country", "FR");

      expect(vlist.getFilter?.("country")).toBe("FR");
      expect(vlist.getFilters?.()).toEqual({ country: "FR" });
      expect(vlist.isFiltered?.()).toBe(true);

      vlist.destroy();
    });

    it("should update an existing filter", () => {
      const vlist = createVList({
        container,
        items: [],
        template: (item) => `<div>${item.name}</div>`,
        layout: [["viewport"]],
        filter: {
          autoReload: false,
        },
      });

      vlist.setFilter?.("country", "FR");
      expect(vlist.getFilter?.("country")).toBe("FR");

      vlist.setFilter?.("country", "DE");
      expect(vlist.getFilter?.("country")).toBe("DE");

      vlist.destroy();
    });

    it("should remove filter when value is empty", () => {
      const vlist = createVList({
        container,
        items: [],
        template: (item) => `<div>${item.name}</div>`,
        layout: [["viewport"]],
        filter: {
          autoReload: false,
        },
      });

      vlist.setFilter?.("country", "FR");
      expect(vlist.isFiltered?.()).toBe(true);

      vlist.setFilter?.("country", "");
      expect(vlist.getFilter?.("country")).toBeUndefined();
      expect(vlist.isFiltered?.()).toBe(false);

      vlist.destroy();
    });

    it("should remove filter when value is null", () => {
      const vlist = createVList({
        container,
        items: [],
        template: (item) => `<div>${item.name}</div>`,
        layout: [["viewport"]],
        filter: {
          autoReload: false,
        },
      });

      vlist.setFilter?.("country", "FR");
      vlist.setFilter?.("country", null);

      expect(vlist.getFilter?.("country")).toBeUndefined();
      expect(vlist.isFiltered?.()).toBe(false);

      vlist.destroy();
    });

    it("should remove filter when value is empty array", () => {
      const vlist = createVList({
        container,
        items: [],
        template: (item) => `<div>${item.name}</div>`,
        layout: [["viewport"]],
        filter: {
          autoReload: false,
        },
      });

      vlist.setFilter?.("tags", ["tag1", "tag2"]);
      expect(vlist.isFiltered?.()).toBe(true);

      vlist.setFilter?.("tags", []);
      expect(vlist.getFilter?.("tags")).toBeUndefined();
      expect(vlist.isFiltered?.()).toBe(false);

      vlist.destroy();
    });
  });

  describe("Filter API - Multiple Filters", () => {
    it("should set multiple filters at once", () => {
      const vlist = createVList({
        container,
        items: [],
        template: (item) => `<div>${item.name}</div>`,
        layout: [["viewport"]],
        filter: {
          autoReload: false,
        },
      });

      vlist.setFilters?.({
        country: "FR",
        decade: "1980",
        mood: "happy",
      });

      expect(vlist.getFilters?.()).toEqual({
        country: "FR",
        decade: "1980",
        mood: "happy",
      });

      vlist.destroy();
    });

    it("should update some filters while keeping others", () => {
      const vlist = createVList({
        container,
        items: [],
        template: (item) => `<div>${item.name}</div>`,
        layout: [["viewport"]],
        filter: {
          autoReload: false,
        },
      });

      vlist.setFilters?.({
        country: "FR",
        decade: "1980",
      });

      vlist.setFilters?.({
        decade: "1990",
      });

      expect(vlist.getFilters?.()).toEqual({
        country: "FR",
        decade: "1990",
      });

      vlist.destroy();
    });

    it("should handle mixed set and clear in setFilters", () => {
      const vlist = createVList({
        container,
        items: [],
        template: (item) => `<div>${item.name}</div>`,
        layout: [["viewport"]],
        filter: {
          autoReload: false,
        },
      });

      vlist.setFilters?.({
        country: "FR",
        decade: "1980",
        mood: "happy",
      });

      vlist.setFilters?.({
        decade: "", // Clear this one
        mood: "sad", // Update this one
      });

      expect(vlist.getFilters?.()).toEqual({
        country: "FR",
        mood: "sad",
      });

      vlist.destroy();
    });
  });

  describe("Clear Filters", () => {
    it("should clear all filters", () => {
      const vlist = createVList({
        container,
        items: [],
        template: (item) => `<div>${item.name}</div>`,
        layout: [["viewport"]],
        filter: {
          autoReload: false,
        },
      });

      vlist.setFilters?.({
        country: "FR",
        decade: "1980",
        mood: "happy",
      });

      expect(vlist.isFiltered?.()).toBe(true);

      vlist.clearFilters?.();

      expect(vlist.getFilters?.()).toEqual({});
      expect(vlist.isFiltered?.()).toBe(false);

      vlist.destroy();
    });

    it("should not emit event when clearing already empty filters", () => {
      const vlist = createVList({
        container,
        items: [],
        template: (item) => `<div>${item.name}</div>`,
        layout: [["viewport"]],
        filter: {
          autoReload: false,
        },
      });

      let eventEmitted = false;
      vlist.on?.("filter:clear", () => {
        eventEmitted = true;
      });

      vlist.clearFilters?.();

      expect(eventEmitted).toBe(false);

      vlist.destroy();
    });
  });

  describe("Filter Visibility", () => {
    it("should track filter panel open state", () => {
      const vlist = createVList({
        container,
        items: [],
        template: (item) => `<div>${item.name}</div>`,
        layout: [["filter-panel", { class: "filter-panel" }], ["viewport"]],
        filter: {
          panel: "filter-panel",
        },
      });

      expect(vlist.isFilterOpen?.()).toBe(false);

      vlist.openFilter?.();
      expect(vlist.isFilterOpen?.()).toBe(true);

      vlist.closeFilter?.();
      expect(vlist.isFilterOpen?.()).toBe(false);

      vlist.destroy();
    });

    it("should toggle filter panel visibility", () => {
      const vlist = createVList({
        container,
        items: [],
        template: (item) => `<div>${item.name}</div>`,
        layout: [["filter-panel", { class: "filter-panel" }], ["viewport"]],
        filter: {
          panel: "filter-panel",
        },
      });

      expect(vlist.isFilterOpen?.()).toBe(false);

      vlist.toggleFilter?.();
      expect(vlist.isFilterOpen?.()).toBe(true);

      vlist.toggleFilter?.();
      expect(vlist.isFilterOpen?.()).toBe(false);

      vlist.destroy();
    });

    it("should add show/hide classes to filter panel element", async () => {
      const vlist = createVList({
        container,
        items: [],
        template: (item) => `<div>${item.name}</div>`,
        layout: [["filter-panel", { class: "filter-panel" }], ["viewport"]],
        filter: {
          panel: "filter-panel",
        },
      });

      // Wait for setup to complete
      await new Promise((resolve) => setTimeout(resolve, 10));

      const panelElement = vlist.layout?.["filter-panel"];
      expect(panelElement).toBeDefined();

      vlist.openFilter?.();
      expect(panelElement.classList.contains("show")).toBe(true);
      expect(panelElement.classList.contains("hide")).toBe(false);

      vlist.closeFilter?.();
      expect(panelElement.classList.contains("show")).toBe(false);
      expect(panelElement.classList.contains("hide")).toBe(true);

      vlist.destroy();
    });
  });

  describe("Filter Events", () => {
    it("should emit filter:open event when opening filter panel", () => {
      const vlist = createVList({
        container,
        items: [],
        template: (item) => `<div>${item.name}</div>`,
        layout: [["viewport"]],
        filter: {},
      });

      let eventEmitted = false;
      vlist.on?.("filter:open", () => {
        eventEmitted = true;
      });

      vlist.openFilter?.();

      expect(eventEmitted).toBe(true);

      vlist.destroy();
    });

    it("should emit filter:close event when closing filter panel", () => {
      const vlist = createVList({
        container,
        items: [],
        template: (item) => `<div>${item.name}</div>`,
        layout: [["viewport"]],
        filter: {},
      });

      vlist.openFilter?.();

      let eventEmitted = false;
      vlist.on?.("filter:close", () => {
        eventEmitted = true;
      });

      vlist.closeFilter?.();

      expect(eventEmitted).toBe(true);

      vlist.destroy();
    });

    it("should emit filter:change event when filter changes", () => {
      const vlist = createVList({
        container,
        items: [],
        template: (item) => `<div>${item.name}</div>`,
        layout: [["viewport"]],
        filter: {
          autoReload: false,
        },
      });

      let receivedData: any = null;
      vlist.on?.("filter:change", (data: any) => {
        receivedData = data;
      });

      vlist.setFilter?.("country", "FR");

      expect(receivedData).toBeDefined();
      expect(receivedData.name).toBe("country");
      expect(receivedData.value).toBe("FR");
      expect(receivedData.filters).toEqual({ country: "FR" });

      vlist.destroy();
    });

    it("should emit filter:clear event when clearing filters", () => {
      const vlist = createVList({
        container,
        items: [],
        template: (item) => `<div>${item.name}</div>`,
        layout: [["viewport"]],
        filter: {
          autoReload: false,
        },
      });

      vlist.setFilter?.("country", "FR");

      let eventEmitted = false;
      vlist.on?.("filter:clear", () => {
        eventEmitted = true;
      });

      vlist.clearFilters?.();

      expect(eventEmitted).toBe(true);

      vlist.destroy();
    });

    it("should include all filters in change event", () => {
      const vlist = createVList({
        container,
        items: [],
        template: (item) => `<div>${item.name}</div>`,
        layout: [["viewport"]],
        filter: {
          autoReload: false,
        },
      });

      vlist.setFilter?.("country", "FR");
      vlist.setFilter?.("decade", "1980");

      let receivedFilters: any = null;
      vlist.on?.("filter:change", (data: any) => {
        receivedFilters = data.filters;
      });

      vlist.setFilter?.("mood", "happy");

      expect(receivedFilters).toEqual({
        country: "FR",
        decade: "1980",
        mood: "happy",
      });

      vlist.destroy();
    });
  });

  describe("Filter Controls Configuration", () => {
    it("should map filter names to layout element names", async () => {
      // Create mock select components
      const mockCountrySelect = {
        element: document.createElement("select"),
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
        clear() {
          this.value = "";
        },
      };

      const vlist = createVList({
        container,
        items: [],
        template: (item) => `<div>${item.name}</div>`,
        layout: [["viewport"]],
        filter: {
          controls: {
            country: "country-select",
          },
          autoReload: false,
        },
      });

      // Inject mock control
      if (vlist.layout) {
        vlist.layout["country-select"] = mockCountrySelect;
      }

      // Wait for setup
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Setting filter should update the control
      vlist.setFilter?.("country", "DE");

      expect(mockCountrySelect.value).toBe("DE");

      vlist.destroy();
    });

    it("should clear all control values when clearFilters is called", async () => {
      const mockSelect = {
        element: document.createElement("select"),
        value: "FR",
        handlers: {} as Record<string, Function>,
        setValue(val: string) {
          this.value = val;
        },
        on(event: string, handler: Function) {
          this.handlers[event] = handler;
        },
        off() {},
        clear() {
          this.value = "";
        },
      };

      const vlist = createVList({
        container,
        items: [],
        template: (item) => `<div>${item.name}</div>`,
        layout: [["viewport"]],
        filter: {
          controls: {
            country: "country-select",
          },
          autoReload: false,
        },
      });

      // Inject mock control
      if (vlist.layout) {
        vlist.layout["country-select"] = mockSelect;
      }

      // Wait for setup
      await new Promise((resolve) => setTimeout(resolve, 10));

      vlist.setFilter?.("country", "FR");
      vlist.clearFilters?.();

      expect(mockSelect.value).toBe("");

      vlist.destroy();
    });
  });

  describe("Lifecycle", () => {
    it("should clean up on destroy", () => {
      const vlist = createVList({
        container,
        items: [],
        template: (item) => `<div>${item.name}</div>`,
        layout: [["filter-panel", { class: "filter-panel" }], ["viewport"]],
        filter: {
          panel: "filter-panel",
        },
      });

      // Should not throw
      expect(() => vlist.destroy()).not.toThrow();
    });

    it("should maintain filter state across multiple operations", () => {
      const vlist = createVList({
        container,
        items: [],
        template: (item) => `<div>${item.name}</div>`,
        layout: [["viewport"]],
        filter: {
          autoReload: false,
        },
      });

      vlist.setFilter?.("country", "FR");
      vlist.setFilter?.("decade", "1980");
      expect(vlist.getFilters?.()).toEqual({ country: "FR", decade: "1980" });

      vlist.setFilter?.("decade", "1990");
      expect(vlist.getFilters?.()).toEqual({ country: "FR", decade: "1990" });

      vlist.clearFilters?.();
      expect(vlist.getFilters?.()).toEqual({});

      vlist.setFilters?.({ mood: "happy", country: "DE" });
      expect(vlist.getFilters?.()).toEqual({ mood: "happy", country: "DE" });

      vlist.destroy();
    });
  });

  describe("Internal State Access", () => {
    it("should expose _filters for adapter integration", () => {
      const vlist = createVList({
        container,
        items: [],
        template: (item) => `<div>${item.name}</div>`,
        layout: [["viewport"]],
        filter: {
          autoReload: false,
        },
      });

      // Internal method for adapter access
      const internalGetter = (vlist as any)._filters;
      expect(typeof internalGetter).toBe("function");

      vlist.setFilters?.({ country: "FR", decade: "1980" });
      expect(internalGetter()).toEqual({ country: "FR", decade: "1980" });

      vlist.destroy();
    });

    it("should return a copy of filters to prevent mutation", () => {
      const vlist = createVList({
        container,
        items: [],
        template: (item) => `<div>${item.name}</div>`,
        layout: [["viewport"]],
        filter: {
          autoReload: false,
        },
      });

      vlist.setFilter?.("country", "FR");

      const filters = vlist.getFilters?.();
      filters.country = "DE"; // Mutate the returned object

      // Original should be unchanged
      expect(vlist.getFilter?.("country")).toBe("FR");

      vlist.destroy();
    });
  });

  describe("Edge Cases", () => {
    it("should handle filter with empty layout", () => {
      const vlist = createVList({
        container,
        items: [],
        template: (item) => `<div>${item.name}</div>`,
        layout: [["viewport"]],
        filter: {
          toggleButton: "nonexistent",
          panel: "also-nonexistent",
          clearButton: "missing-too",
          controls: {
            country: "no-such-control",
          },
        },
      });

      // Should not throw when elements don't exist
      expect(() => vlist.openFilter?.()).not.toThrow();
      expect(() => vlist.closeFilter?.()).not.toThrow();
      expect(() => vlist.setFilter?.("country", "FR")).not.toThrow();

      // Filter should be set even though control doesn't exist
      expect(vlist.getFilter?.("country")).toBe("FR");

      // Clear filters should also not throw
      expect(() => vlist.clearFilters?.()).not.toThrow();
      expect(vlist.getFilter?.("country")).toBeUndefined();

      vlist.destroy();
    });

    it("should handle array filter values", () => {
      const vlist = createVList({
        container,
        items: [],
        template: (item) => `<div>${item.name}</div>`,
        layout: [["viewport"]],
        filter: {
          autoReload: false,
        },
      });

      vlist.setFilter?.("tags", ["rock", "pop", "jazz"]);

      expect(vlist.getFilter?.("tags")).toEqual(["rock", "pop", "jazz"]);
      expect(vlist.isFiltered?.()).toBe(true);

      vlist.destroy();
    });

    it("should handle object filter values", () => {
      const vlist = createVList({
        container,
        items: [],
        template: (item) => `<div>${item.name}</div>`,
        layout: [["viewport"]],
        filter: {
          autoReload: false,
        },
      });

      vlist.setFilter?.("range", { min: 1980, max: 1990 });

      expect(vlist.getFilter?.("range")).toEqual({ min: 1980, max: 1990 });

      vlist.destroy();
    });

    it("should handle rapid filter changes", () => {
      const vlist = createVList({
        container,
        items: [],
        template: (item) => `<div>${item.name}</div>`,
        layout: [["viewport"]],
        filter: {
          autoReload: false,
        },
      });

      // Rapid changes
      vlist.setFilter?.("country", "FR");
      vlist.setFilter?.("country", "DE");
      vlist.setFilter?.("country", "IT");
      vlist.setFilter?.("country", "ES");

      expect(vlist.getFilter?.("country")).toBe("ES");

      vlist.destroy();
    });

    it("should handle undefined filter value", () => {
      const vlist = createVList({
        container,
        items: [],
        template: (item) => `<div>${item.name}</div>`,
        layout: [["viewport"]],
        filter: {
          autoReload: false,
        },
      });

      vlist.setFilter?.("country", "FR");
      vlist.setFilter?.("country", undefined);

      expect(vlist.getFilter?.("country")).toBeUndefined();
      expect(vlist.isFiltered?.()).toBe(false);

      vlist.destroy();
    });
  });

  describe("Combined Search and Filter", () => {
    it("should work alongside search feature", () => {
      const vlist = createVList({
        container,
        items: [],
        template: (item) => `<div>${item.name}</div>`,
        layout: [
          ["search-bar", { class: "search-bar" }],
          ["filter-panel", { class: "filter-panel" }],
          ["viewport"],
        ],
        search: {
          searchBar: "search-bar",
          autoReload: false,
        },
        filter: {
          panel: "filter-panel",
          autoReload: false,
        },
      });

      // Both features should be available
      expect(vlist.search).toBeDefined();
      expect(vlist.setFilter).toBeDefined();

      // Both should work independently
      vlist.search?.("test query");
      vlist.setFilter?.("country", "FR");

      expect(vlist.getSearchQuery?.()).toBe("test query");
      expect(vlist.getFilter?.("country")).toBe("FR");

      vlist.destroy();
    });
  });
});
