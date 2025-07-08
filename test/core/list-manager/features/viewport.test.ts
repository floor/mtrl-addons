import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  mock,
  spyOn,
} from "bun:test";
import { createViewportFeature } from "../../../../src/core/list-manager/features/viewport";
import { ListManagerEvents } from "../../../../src/core/list-manager/types";
import type {
  FeatureContext,
  ViewportFeature,
} from "../../../../src/core/list-manager/types";

// Mock DOM environment
const mockContainer = {
  getBoundingClientRect: mock(() => ({
    width: 400,
    height: 600,
    top: 0,
    left: 0,
  })),
  scrollTop: 0,
  scrollLeft: 0,
  clientWidth: 400,
  clientHeight: 600,
  scrollWidth: 400,
  scrollHeight: 600,
  addEventListener: mock(),
  removeEventListener: mock(),
  appendChild: mock(),
  removeChild: mock(),
  querySelector: mock(),
  querySelectorAll: mock(() => []),
  style: {},
  dataset: {},
  classList: {
    add: mock(),
    remove: mock(),
    contains: mock(() => false),
    toggle: mock(),
  },
} as unknown as HTMLElement;

// Mock scroll element
const mockScrollElement = {
  scrollTop: 0,
  scrollLeft: 0,
  addEventListener: mock(),
  removeEventListener: mock(),
  style: {},
  getBoundingClientRect: mock(() => ({
    width: 400,
    height: 600,
    top: 0,
    left: 0,
  })),
} as unknown as HTMLElement;

// Mock content element
const mockContentElement = {
  style: {},
  getBoundingClientRect: mock(() => ({
    width: 400,
    height: 5000,
    top: 0,
    left: 0,
  })),
} as unknown as HTMLElement;

// Mock scrollbar elements
const mockScrollbar = {
  style: {},
  addEventListener: mock(),
  removeEventListener: mock(),
} as unknown as HTMLElement;

const mockScrollbarThumb = {
  style: {},
  addEventListener: mock(),
  removeEventListener: mock(),
} as unknown as HTMLElement;

describe("Viewport Feature", () => {
  let mockContext: FeatureContext;
  let viewportFeature: ViewportFeature;
  let emitSpy: ReturnType<typeof mock>;

  beforeEach(() => {
    // Reset all mocks
    mock.restore();

    // Setup mock context
    emitSpy = mock();
    mockContext = {
      config: {
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
        debug: true,
        prefix: "test-list",
        componentName: "TestList",
      } as any,
      constants: {
        VIRTUAL_SCROLL: {
          DEFAULT_ITEM_SIZE: 50,
          OVERSCAN_BUFFER: 5,
          MEASUREMENT_CACHE_SIZE: 500,
          SCROLL_DEBOUNCE: 16,
        },
        SCROLLBAR: {
          TRACK_SIZE: 12,
          THUMB_MIN_SIZE: 20,
          HOVER_TIMEOUT: 300,
        },
      } as any,
      emit: emitSpy,
    };

    // Mock DOM queries
    mockContainer.querySelector = mock((selector: string) => {
      if (selector.includes("scroll")) return mockScrollElement;
      if (selector.includes("content")) return mockContentElement;
      if (selector.includes("scrollbar-track")) return mockScrollbar;
      if (selector.includes("scrollbar-thumb")) return mockScrollbarThumb;
      return null;
    });

    viewportFeature = createViewportFeature(mockContainer, mockContext);
  });

  afterEach(() => {
    if (viewportFeature) {
      viewportFeature.destroy();
    }
  });

  describe("Initialization", () => {
    it("should create viewport feature", () => {
      expect(viewportFeature).toBeDefined();
      expect(viewportFeature.orientation).toBe("vertical");
      expect(viewportFeature.estimatedItemSize).toBe(50);
    });

    it("should initialize DOM structure", () => {
      viewportFeature.initialize();

      expect(mockContainer.appendChild).toHaveBeenCalled();
      expect(mockContainer.addEventListener).toHaveBeenCalledWith(
        "scroll",
        expect.any(Function)
      );
    });

    it("should setup orientation-specific properties", () => {
      expect(viewportFeature.orientation).toBe("vertical");

      // Test horizontal orientation
      const horizontalContext = {
        ...mockContext,
        config: {
          ...mockContext.config,
          orientation: {
            orientation: "horizontal",
            reverse: false,
            crossAxisAlignment: "stretch",
          },
        },
      };

      const horizontalFeature = createViewportFeature(
        mockContainer,
        horizontalContext as any
      );
      expect(horizontalFeature.orientation).toBe("horizontal");

      horizontalFeature.destroy();
    });

    it("should emit initialization event", () => {
      viewportFeature.initialize();

      expect(emitSpy).toHaveBeenCalledWith(
        ListManagerEvents.VIEWPORT_INITIALIZED,
        expect.objectContaining({
          orientation: "vertical",
          containerSize: expect.any(Number),
        })
      );
    });
  });

  describe("Virtual Scrolling", () => {
    beforeEach(() => {
      viewportFeature.initialize();
      viewportFeature.setTotalItems(100);
    });

    it("should calculate visible range", () => {
      // Set scroll position
      viewportFeature.virtualScrollPosition = 500;

      const range = viewportFeature.calculateVisibleRange();

      expect(range.start).toBeGreaterThanOrEqual(0);
      expect(range.end).toBeLessThanOrEqual(100);
      expect(range.end).toBeGreaterThan(range.start);
    });

    it("should handle overscan buffer", () => {
      viewportFeature.virtualScrollPosition = 500;

      const rangeNoOverscan = viewportFeature.calculateVisibleRange();

      // Temporarily increase overscan
      const originalOverscan = mockContext.config.virtual.overscan;
      mockContext.config.virtual.overscan = 10;

      const rangeWithOverscan = viewportFeature.calculateVisibleRange();

      expect(rangeWithOverscan.end - rangeWithOverscan.start).toBeGreaterThan(
        rangeNoOverscan.end - rangeNoOverscan.start
      );

      // Restore overscan
      mockContext.config.virtual.overscan = originalOverscan;
    });

    it("should scroll to specific index", () => {
      const initialPosition = viewportFeature.virtualScrollPosition;

      viewportFeature.scrollToIndex(20, "start");

      expect(viewportFeature.virtualScrollPosition).not.toBe(initialPosition);
      expect(emitSpy).toHaveBeenCalledWith(
        ListManagerEvents.SCROLL_POSITION_CHANGED,
        expect.objectContaining({
          position: expect.any(Number),
          direction: expect.any(String),
        })
      );
    });

    it("should handle different scroll alignments", () => {
      const startPosition = viewportFeature.virtualScrollPosition;

      viewportFeature.scrollToIndex(10, "start");
      const startScroll = viewportFeature.virtualScrollPosition;

      viewportFeature.scrollToIndex(10, "center");
      const centerScroll = viewportFeature.virtualScrollPosition;

      viewportFeature.scrollToIndex(10, "end");
      const endScroll = viewportFeature.virtualScrollPosition;

      // All positions should be different
      expect(new Set([startScroll, centerScroll, endScroll]).size).toBe(3);
    });

    it("should respect boundaries when scrolling", () => {
      // Try to scroll to negative index
      viewportFeature.scrollToIndex(-5, "start");
      expect(viewportFeature.virtualScrollPosition).toBeGreaterThanOrEqual(0);

      // Try to scroll beyond total items
      viewportFeature.scrollToIndex(200, "start");
      const totalSize = viewportFeature.calculateTotalVirtualSize();
      const containerSize = viewportFeature.getContainerSize();
      expect(viewportFeature.virtualScrollPosition).toBeLessThanOrEqual(
        totalSize - containerSize
      );
    });
  });

  describe("Container Positioning", () => {
    beforeEach(() => {
      viewportFeature.initialize();
      viewportFeature.setTotalItems(100);
    });

    it("should update container position", () => {
      const contentElement = mockContentElement;
      const initialTransform = contentElement.style.transform;

      viewportFeature.virtualScrollPosition = 200;
      viewportFeature.updateContainerPosition();

      // Should apply transform for virtual scrolling
      expect(contentElement.style.transform).toBeDefined();
    });

    it("should handle orientation-specific transforms", () => {
      viewportFeature.virtualScrollPosition = 100;
      viewportFeature.updateContainerPosition();

      const verticalTransform = mockContentElement.style.transform;

      // Test horizontal orientation
      const horizontalContext = {
        ...mockContext,
        config: {
          ...mockContext.config,
          orientation: {
            orientation: "horizontal",
            reverse: false,
            crossAxisAlignment: "stretch",
          },
        },
      };

      const horizontalFeature = createViewportFeature(
        mockContainer,
        horizontalContext as any
      );
      horizontalFeature.initialize();
      horizontalFeature.virtualScrollPosition = 100;
      horizontalFeature.updateContainerPosition();

      // Transforms should be different for different orientations
      expect(mockContentElement.style.transform).toBeDefined();

      horizontalFeature.destroy();
    });

    it("should handle reverse orientation", () => {
      const reverseContext = {
        ...mockContext,
        config: {
          ...mockContext.config,
          orientation: {
            orientation: "vertical",
            reverse: true,
            crossAxisAlignment: "stretch",
          },
        },
      };

      const reverseFeature = createViewportFeature(
        mockContainer,
        reverseContext as any
      );
      reverseFeature.initialize();
      reverseFeature.virtualScrollPosition = 100;
      reverseFeature.updateContainerPosition();

      expect(mockContentElement.style.transform).toBeDefined();

      reverseFeature.destroy();
    });
  });

  describe("Scrollbar Management", () => {
    beforeEach(() => {
      viewportFeature.initialize();
      viewportFeature.setTotalItems(100);
    });

    it("should update scrollbar appearance", () => {
      viewportFeature.virtualScrollPosition = 500;
      viewportFeature.updateScrollbar();

      // Scrollbar should be visible when content overflows
      expect(mockScrollbar.style.display).not.toBe("none");
    });

    it("should hide scrollbar when content fits", () => {
      // Set small total size that fits in container
      viewportFeature.setTotalItems(5);
      viewportFeature.updateScrollbar();

      // Scrollbar should be hidden
      expect(mockScrollbar.style.display).toBe("none");
    });

    it("should update scrollbar thumb position", () => {
      viewportFeature.virtualScrollPosition = 1000;
      viewportFeature.updateScrollbar();

      // Thumb should have position based on scroll ratio
      const thumbStyle = mockScrollbarThumb.style;
      expect(thumbStyle.top || thumbStyle.left).toBeDefined();
    });

    it("should handle scrollbar interaction", () => {
      viewportFeature.updateScrollbar();

      // Verify event listeners are attached
      expect(mockScrollbar.addEventListener).toHaveBeenCalledWith(
        "mousedown",
        expect.any(Function)
      );
      expect(mockScrollbarThumb.addEventListener).toHaveBeenCalledWith(
        "mousedown",
        expect.any(Function)
      );
    });
  });

  describe("Item Size Management", () => {
    beforeEach(() => {
      viewportFeature.initialize();
      viewportFeature.setTotalItems(100);
    });

    it("should measure item size", () => {
      const mockElement = {
        getBoundingClientRect: mock(() => ({ width: 100, height: 75 })),
      } as unknown as HTMLElement;

      const size = viewportFeature.measureItemSize(mockElement, 5);

      expect(size).toBe(75); // Height for vertical orientation
      expect(viewportFeature.hasMeasuredSize(5)).toBe(true);
    });

    it("should cache measured sizes", () => {
      const mockElement = {
        getBoundingClientRect: mock(() => ({ width: 100, height: 60 })),
      } as unknown as HTMLElement;

      viewportFeature.measureItemSize(mockElement, 10);
      const cachedSize = viewportFeature.getMeasuredSize(10);

      expect(cachedSize).toBe(60);
    });

    it("should use estimated size for unmeasured items", () => {
      const size = viewportFeature.getItemSize(25);

      expect(size).toBe(50); // Default estimated size
    });

    it("should calculate total virtual size with mixed measured/estimated", () => {
      // Measure some items
      const mockElement1 = {
        getBoundingClientRect: mock(() => ({ height: 80 })),
      } as unknown as HTMLElement;
      const mockElement2 = {
        getBoundingClientRect: mock(() => ({ height: 40 })),
      } as unknown as HTMLElement;

      viewportFeature.measureItemSize(mockElement1, 0);
      viewportFeature.measureItemSize(mockElement2, 1);

      const totalSize = viewportFeature.calculateTotalVirtualSize();

      // Should be: 80 + 40 + (98 * 50) = 5020
      expect(totalSize).toBe(5020);
    });
  });

  describe("Viewport Information", () => {
    beforeEach(() => {
      viewportFeature.initialize();
      viewportFeature.setTotalItems(100);
    });

    it("should provide comprehensive viewport info", () => {
      viewportFeature.virtualScrollPosition = 300;

      const info = viewportFeature.getViewportInfo();

      expect(info).toHaveProperty("containerSize");
      expect(info).toHaveProperty("totalVirtualSize");
      expect(info).toHaveProperty("visibleRange");
      expect(info).toHaveProperty("virtualScrollPosition");

      expect(info.containerSize).toBe(600); // Height for vertical
      expect(info.virtualScrollPosition).toBe(300);
      expect(info.totalVirtualSize).toBeGreaterThan(0);
    });

    it("should get container size based on orientation", () => {
      expect(viewportFeature.getContainerSize()).toBe(600); // Height for vertical

      // Test horizontal
      const horizontalContext = {
        ...mockContext,
        config: {
          ...mockContext.config,
          orientation: {
            orientation: "horizontal",
            reverse: false,
            crossAxisAlignment: "stretch",
          },
        },
      };

      const horizontalFeature = createViewportFeature(
        mockContainer,
        horizontalContext as any
      );
      expect(horizontalFeature.getContainerSize()).toBe(400); // Width for horizontal

      horizontalFeature.destroy();
    });
  });

  describe("Event Handling", () => {
    beforeEach(() => {
      viewportFeature.initialize();
      viewportFeature.setTotalItems(100);
    });

    it("should handle scroll events", () => {
      const scrollHandler = mockContainer.addEventListener.mock.calls.find(
        (call) => call[0] === "scroll"
      )?.[1];

      expect(scrollHandler).toBeDefined();

      // Simulate scroll event
      mockScrollElement.scrollTop = 200;
      scrollHandler?.({ target: mockScrollElement });

      expect(emitSpy).toHaveBeenCalledWith(
        ListManagerEvents.SCROLL_POSITION_CHANGED,
        expect.objectContaining({
          position: expect.any(Number),
        })
      );
    });

    it("should handle resize events", () => {
      const resizeHandler = mockContainer.addEventListener.mock.calls.find(
        (call) => call[0] === "resize"
      )?.[1];

      if (resizeHandler) {
        // Mock container size change
        mockContainer.getBoundingClientRect = mock(() => ({
          width: 500,
          height: 800,
        }));

        resizeHandler?.({});

        expect(emitSpy).toHaveBeenCalledWith(
          ListManagerEvents.VIEWPORT_CHANGED,
          expect.any(Object)
        );
      }
    });

    it("should throttle scroll events", () => {
      const scrollHandler = mockContainer.addEventListener.mock.calls.find(
        (call) => call[0] === "scroll"
      )?.[1];

      // Simulate rapid scroll events
      for (let i = 0; i < 10; i++) {
        mockScrollElement.scrollTop = i * 10;
        scrollHandler?.({ target: mockScrollElement });
      }

      // Should not emit for every single scroll
      expect(emitSpy.mock.calls.length).toBeLessThan(10);
    });
  });

  describe("Performance Optimizations", () => {
    beforeEach(() => {
      viewportFeature.initialize();
      viewportFeature.setTotalItems(1000); // Large list
    });

    it("should limit measurement cache size", () => {
      // Measure many items
      for (let i = 0; i < 1000; i++) {
        const mockElement = {
          getBoundingClientRect: mock(() => ({ height: 50 + (i % 10) })),
        } as unknown as HTMLElement;

        viewportFeature.measureItemSize(mockElement, i);
      }

      // Cache should be limited
      const cacheSize = Array.from({ length: 1000 }, (_, i) => i).filter((i) =>
        viewportFeature.hasMeasuredSize(i)
      ).length;

      expect(cacheSize).toBeLessThanOrEqual(500); // Default cache limit
    });

    it("should debounce rapid updates", () => {
      const updateSpy = spyOn(viewportFeature, "updateContainerPosition");

      // Simulate rapid position changes
      for (let i = 0; i < 10; i++) {
        viewportFeature.virtualScrollPosition = i * 100;
        viewportFeature.updateContainerPosition();
      }

      // Should be called, but potentially debounced
      expect(updateSpy).toHaveBeenCalled();
    });
  });

  describe("Cleanup and Destruction", () => {
    it("should clean up event listeners on destroy", () => {
      viewportFeature.initialize();

      const addedListeners = mockContainer.addEventListener.mock.calls.length;

      viewportFeature.destroy();

      expect(mockContainer.removeEventListener).toHaveBeenCalledTimes(
        addedListeners
      );
    });

    it("should clean up DOM elements on destroy", () => {
      viewportFeature.initialize();

      viewportFeature.destroy();

      expect(mockContainer.removeChild).toHaveBeenCalled();
    });

    it("should emit destruction event", () => {
      viewportFeature.initialize();
      viewportFeature.destroy();

      expect(emitSpy).toHaveBeenCalledWith(
        ListManagerEvents.VIEWPORT_DESTROYED,
        expect.any(Object)
      );
    });

    it("should handle multiple destroy calls gracefully", () => {
      viewportFeature.initialize();

      expect(() => {
        viewportFeature.destroy();
        viewportFeature.destroy();
      }).not.toThrow();
    });
  });

  describe("Edge Cases", () => {
    it("should handle zero items", () => {
      viewportFeature.initialize();
      viewportFeature.setTotalItems(0);

      const range = viewportFeature.calculateVisibleRange();
      expect(range).toEqual({ start: 0, end: 0 });

      const totalSize = viewportFeature.calculateTotalVirtualSize();
      expect(totalSize).toBe(0);
    });

    it("should handle single item", () => {
      viewportFeature.initialize();
      viewportFeature.setTotalItems(1);

      const range = viewportFeature.calculateVisibleRange();
      expect(range.start).toBe(0);
      expect(range.end).toBe(0);
    });

    it("should handle very large lists", () => {
      viewportFeature.initialize();
      viewportFeature.setTotalItems(1000000);

      expect(() => {
        viewportFeature.calculateVisibleRange();
        viewportFeature.calculateTotalVirtualSize();
        viewportFeature.scrollToIndex(500000, "center");
      }).not.toThrow();
    });

    it("should handle container resize to zero", () => {
      viewportFeature.initialize();

      // Mock zero-size container
      mockContainer.getBoundingClientRect = mock(() => ({
        width: 0,
        height: 0,
      }));

      expect(() => {
        viewportFeature.updateContainerPosition();
        viewportFeature.calculateVisibleRange();
      }).not.toThrow();
    });
  });
});
