// test/core/collection/failed-ranges.test.ts

import { describe, test, expect, beforeEach, mock, afterEach } from "bun:test";
import { createListManager } from "../../../src/core/list-manager/list-manager";
import { withCollection } from "../../../src/core/list-manager/features/collection/collection";
import type { ListManagerConfig } from "../../../src/core/list-manager/types";

describe("Collection - Failed Range Tracking", () => {
  let container: HTMLElement;
  let config: ListManagerConfig;
  let mockAdapter: any;

  beforeEach(() => {
    container = document.createElement("div");
    container.style.height = "600px";
    container.style.width = "400px";
    document.body.appendChild(container);

    // Mock adapter that can simulate failures
    mockAdapter = {
      read: mock(),
    };

    config = {
      container,
      items: [],
      template: {
        template: (item: any) => `<div>Item ${item.id}</div>`,
      },
      virtual: {
        enabled: true,
        itemSize: 84,
        estimatedItemSize: 84,
        overscan: 5,
      },
    };
  });

  afterEach(() => {
    container.remove();
    mock.restore();
  });

  test("should track failed ranges when data loading fails", async () => {
    // Configure adapter to fail
    mockAdapter.read.mockRejectedValueOnce(new Error("Network error"));

    const manager = createListManager(config);
    const enhancedManager = withCollection({
      collection: mockAdapter,
      rangeSize: 20,
    })(manager);

    // Try to load a range
    try {
      await enhancedManager.collection.loadRange(0, 20);
    } catch (error) {
      // Expected to fail
    }

    // Check that failed range is tracked
    const failedRanges = enhancedManager.collection.getFailedRanges();
    expect(failedRanges.size).toBe(1);
    expect(failedRanges.has(0)).toBe(true);

    const failedInfo = failedRanges.get(0);
    expect(failedInfo?.attempts).toBe(1);
    expect(failedInfo?.error.message).toBe("Network error");
  });

  test("should not reload failed ranges immediately", async () => {
    // Configure adapter to fail
    mockAdapter.read.mockRejectedValue(new Error("Network error"));

    const manager = createListManager(config);
    const enhancedManager = withCollection({
      collection: mockAdapter,
      rangeSize: 20,
    })(manager);

    // First attempt - should fail
    try {
      await enhancedManager.collection.loadRange(0, 20);
    } catch (error) {
      // Expected
    }

    // Reset mock
    mockAdapter.read.mockClear();

    // Try to load missing ranges immediately - should skip failed range
    await enhancedManager.collection.loadMissingRanges({ start: 0, end: 19 });

    // Should not have tried to load again
    expect(mockAdapter.read).not.toHaveBeenCalled();
  });

  test("should retry failed ranges after clearing lastAttempt", async () => {
    // Configure adapter to fail first, then succeed
    mockAdapter.read
      .mockRejectedValueOnce(new Error("Network error"))
      .mockResolvedValueOnce({
        items: Array.from({ length: 20 }, (_, i) => ({
          id: i,
          name: `Item ${i}`,
        })),
        meta: { total: 100 },
      });

    const manager = createListManager(config);
    const enhancedManager = withCollection({
      collection: mockAdapter,
      rangeSize: 20,
    })(manager);

    // First attempt - should fail
    try {
      await enhancedManager.collection.loadRange(0, 20);
    } catch (error) {
      // Expected
    }

    // Manually retry failed ranges
    await enhancedManager.collection.retryFailedRanges();

    // Check that failed range was cleared after success
    const failedRanges = enhancedManager.collection.getFailedRanges();
    expect(failedRanges.size).toBe(0);

    // Check that data was loaded
    const loadedRanges = enhancedManager.collection.getLoadedRanges();
    expect(loadedRanges.has(0)).toBe(true);
  });

  test("should track multiple attempts", async () => {
    // Configure adapter to fail multiple times
    mockAdapter.read.mockRejectedValue(new Error("Network error"));

    const manager = createListManager(config);
    const enhancedManager = withCollection({
      collection: mockAdapter,
      rangeSize: 20,
    })(manager);

    // Multiple attempts
    for (let i = 0; i < 3; i++) {
      try {
        // Clear lastAttempt to allow immediate retry
        const failedRanges = enhancedManager.collection.getFailedRanges();
        failedRanges.forEach((info) => {
          info.lastAttempt = 0;
        });

        await enhancedManager.collection.loadRange(0, 20);
      } catch (error) {
        // Expected
      }
    }

    // Check attempt count
    const failedRanges = enhancedManager.collection.getFailedRanges();
    const failedInfo = failedRanges.get(0);
    expect(failedInfo?.attempts).toBe(3);
  });

  test("should clear failed ranges", async () => {
    // Configure adapter to fail
    mockAdapter.read.mockRejectedValue(new Error("Network error"));

    const manager = createListManager(config);
    const enhancedManager = withCollection({
      collection: mockAdapter,
      rangeSize: 20,
    })(manager);

    // Fail to load some ranges
    try {
      await enhancedManager.collection.loadRange(0, 20);
    } catch (error) {
      // Expected
    }
    try {
      await enhancedManager.collection.loadRange(40, 20);
    } catch (error) {
      // Expected
    }

    // Should have 2 failed ranges
    expect(enhancedManager.collection.getFailedRanges().size).toBe(2);

    // Clear failed ranges
    enhancedManager.collection.clearFailedRanges();

    // Should have no failed ranges
    expect(enhancedManager.collection.getFailedRanges().size).toBe(0);
  });

  test("should handle concurrent failures correctly", async () => {
    // Configure adapter to fail
    mockAdapter.read.mockRejectedValue(new Error("Network error"));

    const manager = createListManager(config);
    const enhancedManager = withCollection({
      collection: mockAdapter,
      rangeSize: 20,
    })(manager);

    // Try to load multiple ranges concurrently
    const promises = [
      enhancedManager.collection.loadRange(0, 20),
      enhancedManager.collection.loadRange(20, 20),
      enhancedManager.collection.loadRange(40, 20),
    ];

    // All should fail
    const results = await Promise.allSettled(promises);
    expect(results.every((r) => r.status === "rejected")).toBe(true);

    // Should have 3 failed ranges
    const failedRanges = enhancedManager.collection.getFailedRanges();
    expect(failedRanges.size).toBe(3);
    expect(failedRanges.has(0)).toBe(true);
    expect(failedRanges.has(1)).toBe(true);
    expect(failedRanges.has(2)).toBe(true);
  });

  test("should respect exponential backoff", async () => {
    // Configure adapter to fail
    mockAdapter.read.mockRejectedValue(new Error("Network error"));

    const manager = createListManager(config);
    const enhancedManager = withCollection({
      collection: mockAdapter,
      rangeSize: 20,
    })(manager);

    // First failure
    try {
      await enhancedManager.collection.loadRange(0, 20);
    } catch (error) {
      // Expected
    }

    // Try again immediately - should be blocked
    mockAdapter.read.mockClear();
    try {
      await enhancedManager.collection.loadRange(0, 20);
    } catch (error) {
      // Should re-throw the same error without calling adapter
      expect(error.message).toBe("Network error");
    }
    expect(mockAdapter.read).not.toHaveBeenCalled();

    // Simulate time passing (clear lastAttempt)
    const failedRanges = enhancedManager.collection.getFailedRanges();
    const failedInfo = failedRanges.get(0);
    if (failedInfo) {
      failedInfo.lastAttempt = Date.now() - 2000; // 2 seconds ago
    }

    // Now it should try again
    mockAdapter.read.mockRejectedValueOnce(new Error("Still failing"));
    try {
      await enhancedManager.collection.loadRange(0, 20);
    } catch (error) {
      expect(error.message).toBe("Still failing");
    }
    expect(mockAdapter.read).toHaveBeenCalledTimes(1);
  });
});
