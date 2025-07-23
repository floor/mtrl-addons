// test/core/collection/adapter.test.ts

import { describe, test, expect, beforeEach } from "bun:test";
import {
  createRouteAdapter,
  withRouteAdapter,
} from "../../../src/core/collection/features/adapter";
import { createCollection } from "../../../src/core/collection";

describe("Route Adapter", () => {
  let fetchMock: any;

  beforeEach(() => {
    // Mock fetch
    fetchMock = {
      calls: [] as any[],
      response: {
        items: [
          { id: "1", name: "Item 1" },
          { id: "2", name: "Item 2" },
        ],
        meta: {
          total: 100,
          hasNext: true,
          cursor: "next-cursor",
        },
      },
    };

    global.fetch = async (url: any, options: any) => {
      fetchMock.calls.push({ url, options });
      return {
        ok: true,
        headers: {
          get: () => "application/json",
        },
        json: async () => fetchMock.response,
      } as any;
    };
  });

  describe("createRouteAdapter", () => {
    test("creates adapter with default config", () => {
      const adapter = createRouteAdapter();
      expect(adapter).toBeDefined();
      expect(adapter.read).toBeDefined();
      expect(adapter.disconnect).toBeDefined();
    });

    test("makes API request with correct parameters", async () => {
      const adapter = createRouteAdapter({
        base: "/api",
        endpoints: { list: "/users" },
        headers: { Authorization: "Bearer token" },
        pagination: { strategy: "offset" }, // Use offset strategy for this test
      });

      const result = await adapter.read({
        offset: 0,
        limit: 20,
        search: "john",
        sort: "name",
      });

      expect(fetchMock.calls).toHaveLength(1);
      const [call] = fetchMock.calls;
      expect(call.url).toContain("/api/users");
      expect(call.url).toContain("offset=0");
      expect(call.url).toContain("limit=20");
      expect(call.url).toContain("search=john");
      expect(call.url).toContain("sort=name");
      expect(call.options.headers["Authorization"]).toBe("Bearer token");
    });

    test("handles different pagination strategies", async () => {
      // Cursor pagination
      const cursorAdapter = createRouteAdapter({
        base: "/api",
        endpoints: { list: "/items" },
        pagination: { strategy: "cursor" },
      });

      await cursorAdapter.read({ cursor: "abc123", limit: 10 });
      expect(fetchMock.calls[0].url).toContain("cursor=abc123");

      // Page pagination
      const pageAdapter = createRouteAdapter({
        base: "/api",
        endpoints: { list: "/items" },
        pagination: { strategy: "page" },
      });

      await pageAdapter.read({ page: 3, limit: 10 });
      expect(fetchMock.calls[1].url).toContain("page=3");
    });

    test("transforms query operators", async () => {
      const adapter = createRouteAdapter({
        base: "/api",
        endpoints: { list: "/items" },
      });

      await adapter.read({
        filters: {
          age: { GT: 18, LTE: 65 },
          status: { EQ: "active" },
          tags: { IN: ["premium", "verified"] },
        },
      });

      const url = fetchMock.calls[0].url;
      expect(url).toContain("age_gt=18");
      expect(url).toContain("age_lte=65");
      expect(url).toContain("status_eq=active");
      expect(url).toContain("tags_in=premium");
      expect(url).toContain("tags_in=verified");
    });

    test("handles caching", async () => {
      const adapter = createRouteAdapter({
        base: "/api",
        endpoints: { list: "/items" },
        cache: true,
        pagination: { strategy: "offset" }, // Use offset strategy to test offset params
      });

      // First call
      await adapter.read({ offset: 0, limit: 10 });
      expect(fetchMock.calls).toHaveLength(1);

      // Second call with same params - should use cache
      await adapter.read({ offset: 0, limit: 10 });
      expect(fetchMock.calls).toHaveLength(1);

      // Different params - should make new request
      await adapter.read({ offset: 10, limit: 10 });
      expect(fetchMock.calls).toHaveLength(2);
    });
  });

  describe("withRouteAdapter", () => {
    test("adds route adapter to collection", async () => {
      const collection = createCollection({
        pageSize: 20,
      });

      const enhancedCollection = withRouteAdapter({
        base: "/api",
        endpoints: { list: "/users" },
      })(collection);

      expect(enhancedCollection.disconnect).toBeDefined();

      // Load data
      await enhancedCollection.loadPage(1);

      expect(fetchMock.calls).toHaveLength(1);
      expect(fetchMock.calls[0].url).toContain("/api/users");
    });
  });
});
