import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  mock,
  spyOn,
} from "bun:test";
import { createCollectionFeature } from "../../../../src/core/list-manager/features/collection";
import { ListManagerEvents } from "../../../../src/core/list-manager/types";
import type {
  FeatureContext,
  CollectionFeature,
  ItemRange,
} from "../../../../src/core/list-manager/types";

describe("Collection Feature", () => {
  let mockContext: FeatureContext;
  let collectionFeature: CollectionFeature;
  let emitSpy: ReturnType<typeof mock>;
  let mockAdapter: any;

  beforeEach(() => {
    // Reset all mocks
    mock.restore();

    // Setup mock context
    emitSpy = mock();
    mockContext = {
      config: {
        collection: {
          strategy: "page",
          pageSize: 20,
          loadTriggerDistance: 5,
          maxConcurrentRequests: 3,
          retryAttempts: 3,
          placeholderConfig: {
            enabled: true,
            template: (index: number) => ({
              id: `placeholder-${index}`,
              loading: true,
            }),
            fields: ["id", "name", "value"],
          },
        },
        virtual: {
          enabled: true,
          itemSize: "auto",
          estimatedItemSize: 50,
          overscan: 5,
        },
        debug: true,
        prefix: "test-list",
        componentName: "TestList",
      } as any,
      constants: {
        RANGE_LOADING: {
          DEFAULT_RANGE_SIZE: 20,
          MAX_CONCURRENT_REQUESTS: 3,
          RETRY_DELAY: 1000,
          TIMEOUT: 5000,
        },
        SPEED_THRESHOLDS: {
          FAST_SCROLL: 1000,
          SLOW_SCROLL: 100,
          DIRECTION_CHANGE: 0.3,
        },
        PLACEHOLDERS: {
          ENABLED: true,
          STRUCTURE_DETECTION: true,
          MAX_FIELDS: 10,
        },
      } as any,
      emit: emitSpy,
    };

    collectionFeature = createCollectionFeature(mockContext);
  });

  afterEach(() => {
    if (collectionFeature) {
      collectionFeature.destroy();
    }
  });

  describe("Initialization", () => {
    it("should create collection feature", () => {
      expect(collectionFeature).toBeDefined();
      expect(collectionFeature.paginationStrategy).toBe("page");
    });

    it("should initialize with default pagination strategy", () => {
      const noStrategyContext = {
        ...mockContext,
        config: { ...mockContext.config, collection: undefined },
      };

      const feature = createCollectionFeature(noStrategyContext as any);
      expect(feature.paginationStrategy).toBe("page"); // Default

      feature.destroy();
    });

    it("should emit initialization event", () => {
      collectionFeature.initialize();

      expect(emitSpy).toHaveBeenCalledWith(
        ListManagerEvents.COLLECTION_INITIALIZED,
        expect.objectContaining({
          strategy: "page",
          pageSize: 20,
        })
      );
    });

    it("should setup speed tracker", () => {
      collectionFeature.initialize();

      // Speed tracker should be available
      expect(collectionFeature.getSpeedTracker).toBeDefined();
    });
  });

  describe("Template Management", () => {
    beforeEach(() => {
      collectionFeature.initialize();
    });

    it("should set and use template", () => {
      const template = (item: any, index: number) => {
        const div = document.createElement("div");
        div.textContent = `${index}: ${item.name}`;
        return div;
      };

      collectionFeature.setTemplate(template);

      // Template should be stored and accessible
      expect(collectionFeature.hasTemplate()).toBe(true);
    });

    it("should handle template rendering", () => {
      const template = mock((item: any, index: number) => {
        const div = document.createElement("div");
        div.textContent = `${index}: ${item.name}`;
        return div;
      });

      collectionFeature.setTemplate(template);

      const testItem = { id: 1, name: "Test Item" };
      const element = collectionFeature.renderItem(testItem, 5);

      expect(template).toHaveBeenCalledWith(testItem, 5);
      expect(element).toBeDefined();
    });
  });

  describe("Data Management", () => {
    beforeEach(() => {
      collectionFeature.initialize();
    });

    it("should set and store items", () => {
      const items = [
        { id: 1, name: "Item 1" },
        { id: 2, name: "Item 2" },
        { id: 3, name: "Item 3" },
      ];

      collectionFeature.setItems(items);

      expect(collectionFeature.getTotalItems()).toBe(3);
      expect(collectionFeature.hasItem(1)).toBe(true);
      expect(collectionFeature.getItem(1)).toEqual(items[1]);
    });

    it("should handle item updates", () => {
      const items = [
        { id: 1, name: "Item 1" },
        { id: 2, name: "Item 2" },
      ];

      collectionFeature.setItems(items);

      const updatedItem = { id: 1, name: "Updated Item 1" };
      collectionFeature.updateItem(0, updatedItem);

      expect(collectionFeature.getItem(0)).toEqual(updatedItem);
    });

    it("should get items in range", () => {
      const items = Array.from({ length: 50 }, (_, i) => ({
        id: i,
        name: `Item ${i}`,
      }));
      collectionFeature.setItems(items);

      const range: ItemRange = { start: 10, end: 19 };
      const rangeItems = collectionFeature.getItemsInRange(range);

      expect(rangeItems).toHaveLength(10);
      expect(rangeItems[0].item.id).toBe(10);
      expect(rangeItems[9].item.id).toBe(19);
    });

    it("should handle sparse data with placeholders", () => {
      collectionFeature.setTotalItems(100);

      // Set some items
      const items = [
        { id: 20, name: "Item 20" },
        { id: 21, name: "Item 21" },
      ];
      collectionFeature.setRangeItems({ start: 20, end: 21 }, items);

      const range: ItemRange = { start: 15, end: 25 };
      const rangeItems = collectionFeature.getItemsInRange(range);

      expect(rangeItems).toHaveLength(11);

      // Should have actual items and placeholders
      const actualItems = rangeItems.filter((item) => !item.item.loading);
      const placeholders = rangeItems.filter((item) => item.item.loading);

      expect(actualItems).toHaveLength(2);
      expect(placeholders).toHaveLength(9);
    });
  });

  describe("Pagination Strategies", () => {
    beforeEach(() => {
      collectionFeature.initialize();
    });

    it("should handle page-based pagination", () => {
      collectionFeature.adaptPaginationStrategy("page");

      const range: ItemRange = { start: 40, end: 59 };
      const params = collectionFeature.getRangeParams(range);

      expect(params.strategy).toBe("page");
      expect(params.page).toBe(3); // Page 3 for items 40-59 with pageSize 20
      expect(params.limit).toBe(20);
    });

    it("should handle offset-based pagination", () => {
      collectionFeature.adaptPaginationStrategy("offset");

      const range: ItemRange = { start: 30, end: 49 };
      const params = collectionFeature.getRangeParams(range);

      expect(params.strategy).toBe("offset");
      expect(params.offset).toBe(30);
      expect(params.limit).toBe(20);
    });

    it("should handle cursor-based pagination", () => {
      collectionFeature.adaptPaginationStrategy("cursor");

      const range: ItemRange = { start: 25, end: 44 };
      const params = collectionFeature.getRangeParams(range);

      expect(params.strategy).toBe("cursor");
      expect(params.after).toBe("item-24"); // Cursor after item 24
      expect(params.limit).toBe(20);
    });

    it("should emit strategy change events", () => {
      collectionFeature.adaptPaginationStrategy("cursor");

      expect(emitSpy).toHaveBeenCalledWith(
        ListManagerEvents.PAGINATION_STRATEGY_CHANGED,
        expect.objectContaining({
          strategy: "cursor",
          previousStrategy: "page",
        })
      );
    });
  });

  describe("Range Loading", () => {
    beforeEach(() => {
      collectionFeature.initialize();
      collectionFeature.setTotalItems(200);
    });

    it("should trigger loading for missing ranges", () => {
      const visibleRange: ItemRange = { start: 50, end: 69 };

      collectionFeature.handleVisibleRangeChange(visibleRange);

      expect(emitSpy).toHaveBeenCalledWith(
        ListManagerEvents.LOADING_TRIGGERED,
        expect.objectContaining({
          range: expect.objectContaining({
            start: expect.any(Number),
            end: expect.any(Number),
          }),
          strategy: expect.any(String),
        })
      );
    });

    it("should not trigger loading for already loaded ranges", () => {
      // Pre-load some data
      const items = Array.from({ length: 20 }, (_, i) => ({
        id: i + 50,
        name: `Item ${i + 50}`,
      }));
      collectionFeature.setRangeItems({ start: 50, end: 69 }, items);

      const visibleRange: ItemRange = { start: 55, end: 65 };
      collectionFeature.handleVisibleRangeChange(visibleRange);

      // Should not trigger loading for already loaded range
      const loadingCalls = emitSpy.mock.calls.filter(
        (call) => call[0] === ListManagerEvents.LOADING_TRIGGERED
      );
      expect(loadingCalls).toHaveLength(0);
    });

    it("should handle concurrent range loading", () => {
      const range1: ItemRange = { start: 0, end: 19 };
      const range2: ItemRange = { start: 20, end: 39 };
      const range3: ItemRange = { start: 40, end: 59 };

      // Trigger multiple range loads quickly
      collectionFeature.handleVisibleRangeChange(range1);
      collectionFeature.handleVisibleRangeChange(range2);
      collectionFeature.handleVisibleRangeChange(range3);

      // Should respect max concurrent requests limit
      const loadingCalls = emitSpy.mock.calls.filter(
        (call) => call[0] === ListManagerEvents.LOADING_TRIGGERED
      );
      expect(loadingCalls.length).toBeLessThanOrEqual(3); // Max concurrent
    });

    it("should emit loading completed events", () => {
      const range: ItemRange = { start: 80, end: 99 };
      const items = Array.from({ length: 20 }, (_, i) => ({
        id: i + 80,
        name: `Item ${i + 80}`,
      }));

      collectionFeature.setRangeItems(range, items);

      expect(emitSpy).toHaveBeenCalledWith(
        ListManagerEvents.LOADING_COMPLETED,
        expect.objectContaining({
          range,
          itemCount: 20,
        })
      );
    });
  });

  describe("Speed-Based Loading", () => {
    beforeEach(() => {
      collectionFeature.initialize();
      collectionFeature.setTotalItems(500);
    });

    it("should adapt loading based on scroll speed", () => {
      // Simulate fast scrolling
      collectionFeature.handleScrollPositionChange(1000, "forward");
      collectionFeature.handleScrollPositionChange(2000, "forward");
      collectionFeature.handleScrollPositionChange(3000, "forward");

      const speedTracker = collectionFeature.getSpeedTracker();
      expect(speedTracker.velocity).toBeGreaterThan(0);

      // Should trigger aggressive loading for fast scroll
      const visibleRange: ItemRange = { start: 100, end: 119 };
      collectionFeature.handleVisibleRangeChange(visibleRange);

      expect(emitSpy).toHaveBeenCalledWith(
        ListManagerEvents.LOADING_TRIGGERED,
        expect.objectContaining({
          strategy: expect.stringMatching(/aggressive|normal/),
        })
      );
    });

    it("should use conservative loading for slow scrolling", () => {
      // Simulate slow scrolling
      collectionFeature.handleScrollPositionChange(100, "forward");
      collectionFeature.handleScrollPositionChange(110, "forward");

      const visibleRange: ItemRange = { start: 40, end: 59 };
      collectionFeature.handleVisibleRangeChange(visibleRange);

      // Should use conservative strategy for slow scroll
      expect(emitSpy).toHaveBeenCalledWith(
        ListManagerEvents.LOADING_TRIGGERED,
        expect.objectContaining({
          strategy: expect.stringMatching(/conservative|normal/),
        })
      );
    });

    it("should handle direction changes", () => {
      // Scroll forward then backward
      collectionFeature.handleScrollPositionChange(500, "forward");
      collectionFeature.handleScrollPositionChange(300, "backward");

      const speedTracker = collectionFeature.getSpeedTracker();
      expect(speedTracker.direction).toBe("backward");
    });
  });

  describe("Placeholder System", () => {
    beforeEach(() => {
      collectionFeature.initialize();
      collectionFeature.setTotalItems(100);
    });

    it("should generate placeholders for missing items", () => {
      const range: ItemRange = { start: 20, end: 29 };
      const placeholders = collectionFeature.generatePlaceholders(range);

      expect(placeholders).toHaveLength(10);
      expect(placeholders[0].loading).toBe(true);
      expect(placeholders[0].id).toBe("placeholder-20");
    });

    it("should detect item structure from actual data", () => {
      const sampleItems = [
        { id: 1, name: "Item 1", value: 100, category: "A" },
        { id: 2, name: "Item 2", value: 200, category: "B" },
      ];

      collectionFeature.setItems(sampleItems);

      const range: ItemRange = { start: 10, end: 12 };
      const placeholders = collectionFeature.generatePlaceholders(range);

      // Placeholders should have similar structure
      expect(placeholders[0]).toHaveProperty("id");
      expect(placeholders[0]).toHaveProperty("name");
      expect(placeholders[0]).toHaveProperty("value");
      expect(placeholders[0]).toHaveProperty("category");
    });

    it("should show placeholders while loading", () => {
      const range: ItemRange = { start: 50, end: 59 };

      // Request data (should show placeholders immediately)
      collectionFeature.handleVisibleRangeChange(range);

      const items = collectionFeature.getItemsInRange(range);
      const placeholderCount = items.filter((item) => item.item.loading).length;

      expect(placeholderCount).toBeGreaterThan(0);

      expect(emitSpy).toHaveBeenCalledWith(
        ListManagerEvents.PLACEHOLDERS_SHOWN,
        expect.objectContaining({
          range,
          count: placeholderCount,
        })
      );
    });

    it("should replace placeholders with actual data", () => {
      const range: ItemRange = { start: 30, end: 39 };

      // First, get placeholders
      collectionFeature.handleVisibleRangeChange(range);
      let items = collectionFeature.getItemsInRange(range);
      let placeholderCount = items.filter((item) => item.item.loading).length;
      expect(placeholderCount).toBeGreaterThan(0);

      // Then load actual data
      const actualItems = Array.from({ length: 10 }, (_, i) => ({
        id: i + 30,
        name: `Item ${i + 30}`,
      }));
      collectionFeature.setRangeItems(range, actualItems);

      // Placeholders should be replaced
      items = collectionFeature.getItemsInRange(range);
      placeholderCount = items.filter((item) => item.item.loading).length;
      expect(placeholderCount).toBe(0);
    });
  });

  describe("Error Handling", () => {
    beforeEach(() => {
      collectionFeature.initialize();
      collectionFeature.setTotalItems(100);
    });

    it("should handle loading errors", () => {
      const range: ItemRange = { start: 40, end: 59 };
      const error = new Error("Network error");

      collectionFeature.handleRangeError(range, error);

      expect(emitSpy).toHaveBeenCalledWith(
        ListManagerEvents.LOADING_ERROR,
        expect.objectContaining({
          range,
          error: error.message,
          retryAttempt: expect.any(Number),
        })
      );
    });

    it("should retry failed requests", () => {
      const range: ItemRange = { start: 60, end: 79 };
      const error = new Error("Timeout");

      // First failure
      collectionFeature.handleRangeError(range, error);

      // Should emit retry event
      expect(emitSpy).toHaveBeenCalledWith(
        ListManagerEvents.LOADING_RETRY,
        expect.objectContaining({
          range,
          attempt: 1,
        })
      );
    });

    it("should stop retrying after max attempts", () => {
      const range: ItemRange = { start: 80, end: 99 };
      const error = new Error("Persistent error");

      // Exhaust retry attempts
      for (let i = 0; i < 5; i++) {
        collectionFeature.handleRangeError(range, error);
      }

      expect(emitSpy).toHaveBeenCalledWith(
        ListManagerEvents.LOADING_FAILED,
        expect.objectContaining({
          range,
          finalError: error.message,
        })
      );
    });
  });

  describe("Memory Management", () => {
    beforeEach(() => {
      collectionFeature.initialize();
    });

    it("should clean up distant ranges", () => {
      collectionFeature.setTotalItems(1000);

      // Load multiple ranges
      const ranges = [
        { start: 0, end: 19 },
        { start: 200, end: 219 },
        { start: 400, end: 419 },
        { start: 600, end: 619 },
        { start: 800, end: 819 },
      ];

      ranges.forEach((range) => {
        const items = Array.from({ length: 20 }, (_, i) => ({
          id: i + range.start,
          name: `Item ${i + range.start}`,
        }));
        collectionFeature.setRangeItems(range, items);
      });

      // Move to a visible range in the middle
      const visibleRange: ItemRange = { start: 400, end: 419 };
      collectionFeature.handleVisibleRangeChange(visibleRange);

      // Should trigger cleanup of distant ranges
      expect(emitSpy).toHaveBeenCalledWith(
        ListManagerEvents.MEMORY_CLEANUP,
        expect.objectContaining({
          cleanedRanges: expect.any(Array),
          totalItemsRemoved: expect.any(Number),
        })
      );
    });

    it("should preserve recently accessed ranges", () => {
      collectionFeature.setTotalItems(500);

      // Load and access some ranges
      const recentRange: ItemRange = { start: 100, end: 119 };
      const items = Array.from({ length: 20 }, (_, i) => ({
        id: i + 100,
        name: `Item ${i + 100}`,
      }));
      collectionFeature.setRangeItems(recentRange, items);

      // Access the range (marks as recently used)
      collectionFeature.getItemsInRange(recentRange);

      // Move away and trigger cleanup
      const farRange: ItemRange = { start: 400, end: 419 };
      collectionFeature.handleVisibleRangeChange(farRange);

      // Recent range should still be available
      expect(collectionFeature.hasRangeData(recentRange)).toBe(true);
    });
  });

  describe("Performance Monitoring", () => {
    beforeEach(() => {
      collectionFeature.initialize();
      collectionFeature.setTotalItems(200);
    });

    it("should track loading performance", () => {
      const range: ItemRange = { start: 60, end: 79 };
      const startTime = Date.now();

      // Simulate loading start
      collectionFeature.handleVisibleRangeChange(range);

      // Simulate loading completion after delay
      setTimeout(() => {
        const items = Array.from({ length: 20 }, (_, i) => ({
          id: i + 60,
          name: `Item ${i + 60}`,
        }));
        collectionFeature.setRangeItems(range, items);

        expect(emitSpy).toHaveBeenCalledWith(
          ListManagerEvents.PERFORMANCE_METRIC,
          expect.objectContaining({
            metric: "loadingTime",
            value: expect.any(Number),
            range,
          })
        );
      }, 100);
    });

    it("should monitor memory usage", () => {
      // Load substantial amount of data
      for (let i = 0; i < 10; i++) {
        const range: ItemRange = { start: i * 20, end: (i + 1) * 20 - 1 };
        const items = Array.from({ length: 20 }, (_, j) => ({
          id: j + i * 20,
          name: `Item ${j + i * 20}`,
        }));
        collectionFeature.setRangeItems(range, items);
      }

      expect(emitSpy).toHaveBeenCalledWith(
        ListManagerEvents.PERFORMANCE_METRIC,
        expect.objectContaining({
          metric: "memoryUsage",
          value: expect.any(Number),
        })
      );
    });
  });

  describe("Cleanup and Destruction", () => {
    it("should clean up resources on destroy", () => {
      collectionFeature.initialize();

      // Load some data
      const items = Array.from({ length: 50 }, (_, i) => ({
        id: i,
        name: `Item ${i}`,
      }));
      collectionFeature.setItems(items);

      collectionFeature.destroy();

      expect(emitSpy).toHaveBeenCalledWith(
        ListManagerEvents.COLLECTION_DESTROYED,
        expect.any(Object)
      );

      // Data should be cleared
      expect(collectionFeature.getTotalItems()).toBe(0);
    });

    it("should cancel pending requests on destroy", () => {
      collectionFeature.initialize();
      collectionFeature.setTotalItems(100);

      // Trigger loading
      const range: ItemRange = { start: 20, end: 39 };
      collectionFeature.handleVisibleRangeChange(range);

      // Destroy before loading completes
      collectionFeature.destroy();

      expect(emitSpy).toHaveBeenCalledWith(
        ListManagerEvents.LOADING_CANCELLED,
        expect.objectContaining({
          cancelledRanges: expect.any(Array),
        })
      );
    });
  });
});
