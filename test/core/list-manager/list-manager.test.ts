import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  mock,
  spyOn,
} from "bun:test";
import {
  createListManager,
  ListManagerImpl,
} from "../../../src/core/list-manager/list-manager";
import { ListManagerEvents } from "../../../src/core/list-manager/types";
import type {
  ListManagerConfig,
  ListManagerConfigUpdate,
} from "../../../src/core/list-manager/types";

// Mock DOM environment
const mockContainer = {
  getBoundingClientRect: () => ({ width: 400, height: 600, top: 0, left: 0 }),
  scrollTop: 0,
  scrollLeft: 0,
  clientWidth: 400,
  clientHeight: 600,
  addEventListener: mock(),
  removeEventListener: mock(),
  appendChild: mock(),
  removeChild: mock(),
  style: {},
} as unknown as HTMLElement;

// Mock features
const mockViewportFeature = {
  initialize: mock(),
  destroy: mock(),
  scrollToIndex: mock(),
  calculateVisibleRange: mock(() => ({ start: 0, end: 10 })),
  getViewportInfo: mock(() => ({
    containerSize: 600,
    totalVirtualSize: 50000,
    visibleRange: { start: 0, end: 10 },
    virtualScrollPosition: 0,
  })),
  updateContainerPosition: mock(),
  updateScrollbar: mock(),
  setTotalItems: mock(),
  virtualScrollPosition: 0,
  orientation: "vertical",
  estimatedItemSize: 50,
};

const mockCollectionFeature = {
  initialize: mock(),
  destroy: mock(),
  setTemplate: mock(),
  setItems: mock(),
  getItemsInRange: mock(() => [] as any[]),
  handleVisibleRangeChange: mock(),
  handleScrollPositionChange: mock(),
  adaptPaginationStrategy: mock(),
  paginationStrategy: "page",
};

// Mock feature factories
mock.module("../../../src/core/list-manager/features/viewport", () => ({
  createViewportFeature: mock(() => mockViewportFeature),
}));

mock.module("../../../src/core/list-manager/features/collection", () => ({
  createCollectionFeature: mock(() => mockCollectionFeature),
}));

describe("ListManager", () => {
  let config: ListManagerConfig;
  let listManager: ListManagerImpl;

  beforeEach(() => {
    // Reset all mocks
    mock.restore();

    // Create test configuration with all required properties
    config = {
      container: mockContainer,
      items: Array.from({ length: 100 }, (_, i) => ({
        id: i,
        name: `Item ${i}`,
      })),
      template: {
        template: (item: any, index: number) => {
          const div = document.createElement("div");
          div.textContent = `${index}: ${item.name}`;
          return div;
        },
      },
      virtual: {
        enabled: true,
        itemSize: "auto",
        estimatedItemSize: 50,
        overscan: 5,
      },
      orientation: {
        orientation: "vertical",
        reverse: false,
        crossAxisAlignment: "stretch",
      },
      initialLoad: {
        strategy: "placeholders",
        viewportMultiplier: 1.5,
        minItems: 10,
        maxItems: 100,
      },
      errorHandling: {
        timeout: 5000,
        showErrorItems: true,
        retryAttempts: 3,
        preserveScrollOnError: true,
      },
      positioning: {
        precisePositioning: true,
        allowPartialItems: true,
        snapToItems: false,
      },
      boundaries: {
        preventOverscroll: true,
        maintainEdgeRanges: true,
        boundaryResistance: 0.15,
      },
      recycling: {
        enabled: false,
        maxPoolSize: 50,
        minPoolSize: 10,
      },
      performance: {
        frameScheduling: true,
        memoryCleanup: true,
      },
      intersection: {
        pagination: {
          enabled: false,
          rootMargin: "100px",
          threshold: 0.1,
        },
        loading: {
          enabled: false,
        },
      },
      debug: true,
      prefix: "test-list",
      componentName: "TestList",
    };
  });

  afterEach(() => {
    if (listManager) {
      listManager.destroy();
    }
  });

  describe("Initialization", () => {
    it("should create a ListManager with valid config", () => {
      listManager = new ListManagerImpl(config);
      expect(listManager).toBeDefined();
      expect(listManager.getTotalItems()).toBe(100);
    });

    it("should throw error with invalid container", () => {
      const invalidConfig = { ...config, container: null as any };
      expect(() => new ListManagerImpl(invalidConfig)).toThrow();
    });

    it("should initialize features when initialize() is called", () => {
      listManager = new ListManagerImpl(config);
      listManager.initialize();

      expect(mockViewportFeature.initialize).toHaveBeenCalled();
      expect(mockCollectionFeature.initialize).toHaveBeenCalled();
    });

    it("should not initialize twice", () => {
      listManager = new ListManagerImpl(config);
      listManager.initialize();
      listManager.initialize();

      expect(mockViewportFeature.initialize).toHaveBeenCalledTimes(1);
    });

    it("should set template if provided", () => {
      listManager = new ListManagerImpl(config);
      listManager.initialize();

      expect(mockCollectionFeature.setTemplate).toHaveBeenCalledWith(
        config.template!.template
      );
    });

    it("should set items if provided", () => {
      listManager = new ListManagerImpl(config);
      listManager.initialize();

      expect(mockCollectionFeature.setItems).toHaveBeenCalledWith(config.items);
    });
  });

  describe("Virtual Scrolling API", () => {
    beforeEach(() => {
      listManager = new ListManagerImpl(config);
      listManager.initialize();
    });

    it("should scroll to index", () => {
      listManager.scrollToIndex(50, "center");
      expect(mockViewportFeature.scrollToIndex).toHaveBeenCalledWith(
        50,
        "center"
      );
    });

    it("should not scroll to invalid index", () => {
      const consoleSpy = spyOn(console, "warn").mockImplementation(() => {});

      listManager.scrollToIndex(-1);
      listManager.scrollToIndex(1000);

      expect(mockViewportFeature.scrollToIndex).not.toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledTimes(2);

      consoleSpy.mockRestore();
    });

    it("should scroll to page", () => {
      listManager.scrollToPage(5, "start");

      // Page 5 should target index 80 (assuming default page size of 20)
      expect(mockViewportFeature.scrollToIndex).toHaveBeenCalledWith(
        80,
        "start"
      );
    });

    it("should not scroll to page out of range", () => {
      const consoleSpy = spyOn(console, "warn").mockImplementation(() => {});

      listManager.scrollToPage(100); // Way beyond item count

      expect(mockViewportFeature.scrollToIndex).not.toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it("should get scroll position", () => {
      mockViewportFeature.virtualScrollPosition = 1000;
      expect(listManager.getScrollPosition()).toBe(1000);
    });
  });

  describe("Viewport Management", () => {
    beforeEach(() => {
      listManager = new ListManagerImpl(config);
      listManager.initialize();
    });

    it("should get visible range", () => {
      const range = listManager.getVisibleRange();
      expect(range).toEqual({ start: 0, end: 10 });
      expect(mockViewportFeature.calculateVisibleRange).toHaveBeenCalled();
    });

    it("should get viewport info", () => {
      const info = listManager.getViewportInfo();
      expect(info).toEqual({
        containerSize: 600,
        totalVirtualSize: 50000,
        visibleRange: { start: 0, end: 10 },
        virtualScrollPosition: 0,
      });
    });

    it("should update viewport", () => {
      listManager.updateViewport();

      expect(mockViewportFeature.updateContainerPosition).toHaveBeenCalled();
      expect(mockViewportFeature.updateScrollbar).toHaveBeenCalled();
      expect(mockCollectionFeature.handleVisibleRangeChange).toHaveBeenCalled();
    });

    it("should return default values when not initialized", () => {
      const uninitializedManager = new ListManagerImpl(config);

      expect(uninitializedManager.getVisibleRange()).toEqual({
        start: 0,
        end: 0,
      });
      expect(uninitializedManager.getScrollPosition()).toBe(0);
    });
  });

  describe("Collection Integration", () => {
    beforeEach(() => {
      listManager = new ListManagerImpl(config);
      listManager.initialize();
    });

    it("should set items", () => {
      const newItems = [{ id: 1, name: "New Item" }];
      listManager.setItems(newItems);

      expect(mockViewportFeature.setTotalItems).toHaveBeenCalledWith(1);
      expect(mockCollectionFeature.setItems).toHaveBeenCalledWith(newItems);
      expect(listManager.getTotalItems()).toBe(1);
    });

    it("should set total items", () => {
      listManager.setTotalItems(500);

      expect(mockViewportFeature.setTotalItems).toHaveBeenCalledWith(500);
      expect(listManager.getTotalItems()).toBe(500);
    });

    it("should get items in visible range", () => {
      const mockItems: any[] = [
        { item: { id: 1, name: "Item 1" }, index: 0 },
        { item: { id: 2, name: "Item 2" }, index: 1 },
      ];
      mockCollectionFeature.getItemsInRange.mockReturnValue(mockItems);

      const items = listManager.getItems();
      expect(items).toEqual([
        { id: 1, name: "Item 1" },
        { id: 2, name: "Item 2" },
      ]);
    });

    it("should set pagination strategy", () => {
      listManager.setPaginationStrategy("cursor");

      expect(
        mockCollectionFeature.adaptPaginationStrategy
      ).toHaveBeenCalledWith("cursor");
    });

    it("should get pagination strategy", () => {
      mockCollectionFeature.paginationStrategy = "offset";
      expect(listManager.getPaginationStrategy()).toBe("offset");
    });
  });

  describe("Configuration Management", () => {
    beforeEach(() => {
      listManager = new ListManagerImpl(config);
      listManager.initialize();
    });

    it("should update configuration", () => {
      const configUpdate: ListManagerConfigUpdate = {
        virtual: {
          enabled: true,
          itemSize: "auto",
          estimatedItemSize: 100,
          overscan: 5,
        },
        debug: false,
      };

      listManager.updateConfig(configUpdate);

      const updatedConfig = listManager.getConfig();
      expect(updatedConfig.virtual.estimatedItemSize).toBe(100);
      expect(updatedConfig.debug).toBe(false);
    });

    it("should return copy of config", () => {
      const returnedConfig = listManager.getConfig();
      returnedConfig.debug = false;

      expect(listManager.getConfig().debug).toBe(true); // Original should be unchanged
    });
  });

  describe("Event System", () => {
    beforeEach(() => {
      listManager = new ListManagerImpl(config);
      listManager.initialize();
    });

    it("should subscribe to events", () => {
      const observer = mock();
      const unsubscribe = listManager.subscribe(observer);

      listManager.emit(ListManagerEvents.INITIALIZED, { config });

      expect(observer).toHaveBeenCalledWith(ListManagerEvents.INITIALIZED, {
        config,
      });

      unsubscribe();
    });

    it("should unsubscribe from events", () => {
      const observer = mock();
      const unsubscribe = listManager.subscribe(observer);

      unsubscribe();
      listManager.emit(ListManagerEvents.INITIALIZED, { config });

      expect(observer).not.toHaveBeenCalled();
    });

    it("should handle observer errors gracefully", () => {
      const badObserver = mock(() => {
        throw new Error("Observer error");
      });
      const consoleSpy = spyOn(console, "error").mockImplementation(() => {});

      listManager.subscribe(badObserver);
      listManager.emit(ListManagerEvents.INITIALIZED, { config });

      expect(consoleSpy).toHaveBeenCalledWith(
        "[List Manager] Observer error:",
        expect.any(Error)
      );
      consoleSpy.mockRestore();
    });

    it("should emit events to multiple observers", () => {
      const observer1 = mock();
      const observer2 = mock();

      listManager.subscribe(observer1);
      listManager.subscribe(observer2);

      listManager.emit(ListManagerEvents.INITIALIZED, { config });

      expect(observer1).toHaveBeenCalled();
      expect(observer2).toHaveBeenCalled();
    });
  });

  describe("Feature Coordination", () => {
    beforeEach(() => {
      listManager = new ListManagerImpl(config);
      listManager.initialize();
    });

    it("should coordinate scroll events between features", () => {
      // Simulate scroll position change
      listManager.emit(ListManagerEvents.SCROLL_POSITION_CHANGED, {
        position: 1000,
        direction: "forward",
      });

      expect(
        mockCollectionFeature.handleScrollPositionChange
      ).toHaveBeenCalledWith(1000, "forward");
    });

    it("should coordinate range change events", () => {
      const newRange = { start: 10, end: 20 };

      listManager.emit(ListManagerEvents.VIRTUAL_RANGE_CHANGED, newRange);

      expect(
        mockCollectionFeature.handleVisibleRangeChange
      ).toHaveBeenCalledWith(newRange);
    });

    it("should coordinate viewport change events", () => {
      const viewportData = {
        containerSize: 600,
        totalVirtualSize: 50000,
        visibleRange: { start: 5, end: 15 },
        virtualScrollPosition: 500,
      };

      listManager.emit(ListManagerEvents.VIEWPORT_CHANGED, viewportData);

      expect(
        mockCollectionFeature.handleVisibleRangeChange
      ).toHaveBeenCalledWith(viewportData.visibleRange);
    });
  });

  describe("Lifecycle Management", () => {
    beforeEach(() => {
      listManager = new ListManagerImpl(config);
      listManager.initialize();
    });

    it("should destroy properly", () => {
      listManager.destroy();

      expect(mockViewportFeature.destroy).toHaveBeenCalled();
      expect(mockCollectionFeature.destroy).toHaveBeenCalled();
    });

    it("should not destroy twice", () => {
      listManager.destroy();
      listManager.destroy();

      expect(mockViewportFeature.destroy).toHaveBeenCalledTimes(1);
    });

    it("should emit destroy event", () => {
      const observer = mock();
      listManager.subscribe(observer);

      listManager.destroy();

      expect(observer).toHaveBeenCalledWith(ListManagerEvents.DESTROYED, {
        reason: "manual-destroy",
      });
    });
  });
});

describe("createListManager factory", () => {
  it("should create and auto-initialize ListManager", () => {
    const consoleSpy = spyOn(console, "log").mockImplementation(() => {});

    const factoryConfig: ListManagerConfig = {
      container: mockContainer,
      virtual: {
        enabled: true,
        itemSize: "auto",
        estimatedItemSize: 50,
        overscan: 5,
      },
      orientation: {
        orientation: "vertical",
        reverse: false,
        crossAxisAlignment: "stretch",
      },
      initialLoad: {
        strategy: "placeholders",
        viewportMultiplier: 1.5,
        minItems: 10,
        maxItems: 100,
      },
      errorHandling: {
        timeout: 5000,
        showErrorItems: true,
        retryAttempts: 3,
        preserveScrollOnError: true,
      },
      positioning: {
        precisePositioning: true,
        allowPartialItems: true,
        snapToItems: false,
      },
      boundaries: {
        preventOverscroll: true,
        maintainEdgeRanges: true,
        boundaryResistance: 0.15,
      },
      recycling: {
        enabled: false,
        maxPoolSize: 50,
        minPoolSize: 10,
      },
      performance: {
        frameScheduling: true,
        memoryCleanup: true,
      },
      intersection: {
        pagination: {
          enabled: false,
          rootMargin: "100px",
          threshold: 0.1,
        },
        loading: {
          enabled: false,
        },
      },
      debug: true,
      prefix: "test-list",
      componentName: "TestList",
    };

    const listManager = createListManager(factoryConfig);

    expect(listManager).toBeDefined();
    expect(listManager.getTotalItems()).toBe(0);
    expect(consoleSpy).toHaveBeenCalledWith(
      "[List Manager] Created with config:",
      expect.any(Object)
    );

    consoleSpy.mockRestore();
    listManager.destroy();
  });
});
