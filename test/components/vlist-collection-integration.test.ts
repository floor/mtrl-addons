// test/components/vlist-collection-integration.test.ts

/**
 * VList Collection Adapter Integration Tests
 *
 * Tests that search and filter values are automatically passed
 * to the collection adapter's read function.
 */

import { describe, it, expect, beforeEach, afterEach, mock } from "bun:test";
import { JSDOM } from "jsdom";

// Mock DOM environment for testing
const dom = new JSDOM("<!DOCTYPE html><html><body></body></html>");
global.document = dom.window.document;
global.HTMLElement = dom.window.HTMLElement;
global.HTMLInputElement = dom.window.HTMLInputElement;
global.HTMLSelectElement = dom.window.HTMLSelectElement;
global.HTMLTextAreaElement = dom.window.HTMLTextAreaElement;
global.window = dom.window as any;
global.navigator = dom.window.navigator;
global.requestAnimationFrame = (cb: FrameRequestCallback) => {
  setTimeout(cb, 0);
  return 0;
};

// Import VList after DOM setup
import { createVList } from "../../src/components/vlist";

describe("VList Collection Adapter Integration", () => {
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

  describe("Search Integration with Adapter", () => {
    it("should pass search query to adapter read function", async () => {
      let capturedParams: any = null;

      const mockAdapter = {
        read: async (params: any) => {
          capturedParams = params;
          return {
            items: [{ id: "1", name: "Test Item" }],
            meta: { total: 1 },
          };
        },
      };

      const vlist = createVList({
        container,
        template: (item) => `<div>${item.name}</div>`,
        layout: [
          ["head", { class: "head" }, ["search-toggle", { class: "toggle" }]],
          ["search-bar", { class: "search-bar" }],
          ["viewport"],
        ],
        search: {
          toggleButton: "search-toggle",
          searchBar: "search-bar",
          autoReload: false, // Disable auto-reload for manual control
        },
        collection: {
          adapter: mockAdapter,
        },
        autoLoad: false,
      });

      // Set search query
      vlist.search?.("test query");

      // Wait for setup
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Trigger a reload to fetch with the search query
      await vlist.reload?.();

      // Wait for the adapter call
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(capturedParams).not.toBeNull();
      expect(capturedParams.search).toBe("test query");

      vlist.destroy();
    });

    it("should not include search param when query is empty", async () => {
      let capturedParams: any = null;

      const mockAdapter = {
        read: async (params: any) => {
          capturedParams = params;
          return {
            items: [{ id: "1", name: "Test Item" }],
            meta: { total: 1 },
          };
        },
      };

      const vlist = createVList({
        container,
        template: (item) => `<div>${item.name}</div>`,
        layout: [
          ["head", { class: "head" }, ["search-toggle", { class: "toggle" }]],
          ["search-bar", { class: "search-bar" }],
          ["viewport"],
        ],
        search: {
          toggleButton: "search-toggle",
          searchBar: "search-bar",
          autoReload: false,
        },
        collection: {
          adapter: mockAdapter,
        },
        autoLoad: false,
      });

      // Don't set any search query

      // Wait for setup
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Trigger a reload
      await vlist.reload?.();

      // Wait for the adapter call
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(capturedParams).not.toBeNull();
      expect(capturedParams.search).toBeUndefined();

      vlist.destroy();
    });

    it("should clear search param after clearSearch", async () => {
      let capturedParams: any = null;

      const mockAdapter = {
        read: async (params: any) => {
          capturedParams = params;
          return {
            items: [{ id: "1", name: "Test Item" }],
            meta: { total: 1 },
          };
        },
      };

      const vlist = createVList({
        container,
        template: (item) => `<div>${item.name}</div>`,
        layout: [
          ["head", { class: "head" }, ["search-toggle", { class: "toggle" }]],
          ["search-bar", { class: "search-bar" }],
          ["viewport"],
        ],
        search: {
          toggleButton: "search-toggle",
          searchBar: "search-bar",
          autoReload: false,
        },
        collection: {
          adapter: mockAdapter,
        },
        autoLoad: false,
      });

      // Set then clear search query
      vlist.search?.("test query");
      await new Promise((resolve) => setTimeout(resolve, 50));
      vlist.clearSearch?.();

      // Wait for setup
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Trigger a reload
      await vlist.reload?.();

      // Wait for the adapter call
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(capturedParams).not.toBeNull();
      expect(capturedParams.search).toBeUndefined();

      vlist.destroy();
    });
  });

  describe("Filter Integration with Adapter", () => {
    it("should pass filters to adapter read function", async () => {
      let capturedParams: any = null;

      const mockAdapter = {
        read: async (params: any) => {
          capturedParams = params;
          return {
            items: [{ id: "1", name: "Test Item" }],
            meta: { total: 1 },
          };
        },
      };

      const vlist = createVList({
        container,
        template: (item) => `<div>${item.name}</div>`,
        layout: [
          [
            "head",
            { class: "head" },
            ["filter-toggle", { class: "filter-toggle" }],
          ],
          [
            "filter-panel",
            { class: "filter-panel" },
            ["country-select", { class: "country-select" }],
          ],
          ["viewport"],
        ],
        filter: {
          toggleButton: "filter-toggle",
          panel: "filter-panel",
          controls: {
            country: "country-select",
          },
          autoReload: false, // Disable auto-reload for manual control
        },
        collection: {
          adapter: mockAdapter,
        },
        autoLoad: false,
      });

      // Set filter value
      vlist.setFilter?.("country", "FR");

      // Wait for setup
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Trigger a reload to fetch with the filter
      await vlist.reload?.();

      // Wait for the adapter call
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(capturedParams).not.toBeNull();
      expect(capturedParams.filters).toBeDefined();
      expect(capturedParams.filters.country).toBe("FR");

      vlist.destroy();
    });

    it("should pass multiple filters to adapter", async () => {
      let capturedParams: any = null;

      const mockAdapter = {
        read: async (params: any) => {
          capturedParams = params;
          return {
            items: [{ id: "1", name: "Test Item" }],
            meta: { total: 1 },
          };
        },
      };

      const vlist = createVList({
        container,
        template: (item) => `<div>${item.name}</div>`,
        layout: [
          [
            "head",
            { class: "head" },
            ["filter-toggle", { class: "filter-toggle" }],
          ],
          [
            "filter-panel",
            { class: "filter-panel" },
            ["country-select", { class: "country-select" }],
            ["decade-select", { class: "decade-select" }],
          ],
          ["viewport"],
        ],
        filter: {
          toggleButton: "filter-toggle",
          panel: "filter-panel",
          controls: {
            country: "country-select",
            decade: "decade-select",
          },
          autoReload: false,
        },
        collection: {
          adapter: mockAdapter,
        },
        autoLoad: false,
      });

      // Set multiple filter values
      vlist.setFilters?.({ country: "FR", decade: "1980" });

      // Wait for setup
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Trigger a reload
      await vlist.reload?.();

      // Wait for the adapter call
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(capturedParams).not.toBeNull();
      expect(capturedParams.filters).toBeDefined();
      expect(capturedParams.filters.country).toBe("FR");
      expect(capturedParams.filters.decade).toBe("1980");

      vlist.destroy();
    });

    it("should not include filters param when no filters are set", async () => {
      let capturedParams: any = null;

      const mockAdapter = {
        read: async (params: any) => {
          capturedParams = params;
          return {
            items: [{ id: "1", name: "Test Item" }],
            meta: { total: 1 },
          };
        },
      };

      const vlist = createVList({
        container,
        template: (item) => `<div>${item.name}</div>`,
        layout: [
          [
            "head",
            { class: "head" },
            ["filter-toggle", { class: "filter-toggle" }],
          ],
          [
            "filter-panel",
            { class: "filter-panel" },
            ["country-select", { class: "country-select" }],
          ],
          ["viewport"],
        ],
        filter: {
          toggleButton: "filter-toggle",
          panel: "filter-panel",
          controls: {
            country: "country-select",
          },
          autoReload: false,
        },
        collection: {
          adapter: mockAdapter,
        },
        autoLoad: false,
      });

      // Don't set any filters

      // Wait for setup
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Trigger a reload
      await vlist.reload?.();

      // Wait for the adapter call
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(capturedParams).not.toBeNull();
      expect(capturedParams.filters).toBeUndefined();

      vlist.destroy();
    });

    it("should clear filters param after clearFilters", async () => {
      let capturedParams: any = null;

      const mockAdapter = {
        read: async (params: any) => {
          capturedParams = params;
          return {
            items: [{ id: "1", name: "Test Item" }],
            meta: { total: 1 },
          };
        },
      };

      const vlist = createVList({
        container,
        template: (item) => `<div>${item.name}</div>`,
        layout: [
          [
            "head",
            { class: "head" },
            ["filter-toggle", { class: "filter-toggle" }],
          ],
          [
            "filter-panel",
            { class: "filter-panel" },
            ["country-select", { class: "country-select" }],
          ],
          ["viewport"],
        ],
        filter: {
          toggleButton: "filter-toggle",
          panel: "filter-panel",
          controls: {
            country: "country-select",
          },
          autoReload: false,
        },
        collection: {
          adapter: mockAdapter,
        },
        autoLoad: false,
      });

      // Set then clear filters
      vlist.setFilter?.("country", "FR");
      await new Promise((resolve) => setTimeout(resolve, 50));
      vlist.clearFilters?.();

      // Wait for setup
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Trigger a reload
      await vlist.reload?.();

      // Wait for the adapter call
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(capturedParams).not.toBeNull();
      expect(capturedParams.filters).toBeUndefined();

      vlist.destroy();
    });
  });

  describe("Combined Search and Filter Integration", () => {
    it("should pass both search and filters to adapter", async () => {
      let capturedParams: any = null;

      const mockAdapter = {
        read: async (params: any) => {
          capturedParams = params;
          return {
            items: [{ id: "1", name: "Test Item" }],
            meta: { total: 1 },
          };
        },
      };

      const vlist = createVList({
        container,
        template: (item) => `<div>${item.name}</div>`,
        layout: [
          [
            "head",
            { class: "head" },
            ["search-toggle", { class: "search-toggle" }],
            ["filter-toggle", { class: "filter-toggle" }],
          ],
          ["search-bar", { class: "search-bar" }],
          [
            "filter-panel",
            { class: "filter-panel" },
            ["country-select", { class: "country-select" }],
          ],
          ["viewport"],
        ],
        search: {
          toggleButton: "search-toggle",
          searchBar: "search-bar",
          autoReload: false,
        },
        filter: {
          toggleButton: "filter-toggle",
          panel: "filter-panel",
          controls: {
            country: "country-select",
          },
          autoReload: false,
        },
        collection: {
          adapter: mockAdapter,
        },
        autoLoad: false,
      });

      // Set both search and filter
      vlist.search?.("john");
      vlist.setFilter?.("country", "US");

      // Wait for setup
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Trigger a reload
      await vlist.reload?.();

      // Wait for the adapter call
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(capturedParams).not.toBeNull();
      expect(capturedParams.search).toBe("john");
      expect(capturedParams.filters).toBeDefined();
      expect(capturedParams.filters.country).toBe("US");

      vlist.destroy();
    });

    it("should include pagination params along with search and filters", async () => {
      let capturedParams: any = null;

      const mockAdapter = {
        read: async (params: any) => {
          capturedParams = params;
          return {
            items: Array.from({ length: 20 }, (_, i) => ({
              id: String(i),
              name: `Item ${i}`,
            })),
            meta: { total: 100 },
          };
        },
      };

      const vlist = createVList({
        container,
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
          autoReload: false,
        },
        collection: {
          adapter: mockAdapter,
        },
        pagination: {
          strategy: "offset",
          limit: 20,
        },
        autoLoad: false,
      });

      // Set search query
      vlist.search?.("test");

      // Wait for setup
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Trigger a reload
      await vlist.reload?.();

      // Wait for the adapter call
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(capturedParams).not.toBeNull();
      // Should have pagination params
      expect(
        capturedParams.offset !== undefined ||
          capturedParams.page !== undefined,
      ).toBe(true);
      expect(capturedParams.limit).toBeDefined();
      // Should also have search
      expect(capturedParams.search).toBe("test");

      vlist.destroy();
    });
  });

  describe("Backward Compatibility", () => {
    it("should work without search or filter features", async () => {
      let capturedParams: any = null;

      const mockAdapter = {
        read: async (params: any) => {
          capturedParams = params;
          return {
            items: [{ id: "1", name: "Test Item" }],
            meta: { total: 1 },
          };
        },
      };

      const vlist = createVList({
        container,
        template: (item) => `<div>${item.name}</div>`,
        collection: {
          adapter: mockAdapter,
        },
        autoLoad: false,
      });

      // Wait for setup
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Trigger a reload
      await vlist.reload?.();

      // Wait for the adapter call
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(capturedParams).not.toBeNull();
      // Should not have search or filters
      expect(capturedParams.search).toBeUndefined();
      expect(capturedParams.filters).toBeUndefined();

      vlist.destroy();
    });

    it("should work with static items (no adapter)", () => {
      const vlist = createVList({
        container,
        items: [
          { id: "1", name: "Item 1" },
          { id: "2", name: "Item 2" },
        ],
        template: (item) => `<div>${item.name}</div>`,
      });

      expect(vlist).toBeDefined();
      expect(vlist.element).toBeInstanceOf(HTMLElement);

      vlist.destroy();
    });
  });
});
