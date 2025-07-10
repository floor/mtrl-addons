/**
 * API Bridge for List Manager
 * Provides event helpers and component integration utilities
 */

import type {
  ListManager,
  ListManagerConfig,
  ListManagerObserver,
  ListManagerEventData,
  ItemRange,
  ViewportInfo,
} from "./types";
import { ListManagerEvents } from "./types";
import { createListManager } from "./list-manager";

/**
 * Enhanced List Manager API with convenient methods
 */
export interface ListManagerAPI {
  // Business logic API
  loadRange(
    pageOrOffset: number,
    size: number,
    strategy?: "page" | "offset",
    alignment?: "start" | "center" | "end"
  ): void;

  // Navigation API
  scrollToPosition(position: number): void;
  scrollToIndex(index: number, alignment?: "start" | "center" | "end"): void;
  scrollToPage(page: number, alignment?: "start" | "center" | "end"): void;

  // State API
  getScrollPosition(): number;
  getItems(): any[];
  getTotalItems(): number;
  getVisibleRange(): ItemRange;

  // Core lifecycle
  initialize(): void;
  destroy(): void;
  updateConfig(config: Partial<ListManagerConfig>): void;

  // Event system
  on(event: string, listener: Function): () => void;

  // Convenience methods
  onScroll(
    callback: (position: number, direction: "forward" | "backward") => void
  ): () => void;
  onRangeChange(callback: (range: ItemRange) => void): () => void;
  onViewportChange(callback: (viewport: ViewportInfo) => void): () => void;
  onLoading(callback: (range: ItemRange, strategy: string) => void): () => void;
  onPlaceholders(
    callback: (range: ItemRange, count: number) => void
  ): () => void;

  // State queries
  isLoading(): boolean;
  getLoadedRanges(): Set<number>;
  hasItem(index: number): boolean;
  getItem(index: number): any;

  // Debugging
  getDebugInfo(): ListManagerDebugInfo;
  enableDebug(): void;
  disableDebug(): void;
}

/**
 * Debug information interface
 */
export interface ListManagerDebugInfo {
  config: ListManagerConfig;
  state: {
    isInitialized: boolean;
    totalItems: number;
    visibleRange: ItemRange;
    scrollPosition: number;
    paginationStrategy: string;
  };
  performance: {
    scrollVelocity: number;
    loadedRanges: number[];
    pendingRanges: number[];
  };
  features: {
    viewport: {
      orientation: string;
      containerSize: number;
      totalVirtualSize: number;
      estimatedItemSize: number;
      measuredItemsCount: number;
    };
    collection: {
      loadedItemsCount: number;
      hasPlaceholderStructure: boolean;
      placeholderFields: string[];
    };
  };
}

/**
 * Event helper functions
 */
export class ListManagerEventHelpers {
  private listManager: any; // Enhanced component from createListManager
  private eventSubscriptions: Map<string, () => void> = new Map();

  constructor(listManager: any) {
    this.listManager = listManager;
  }

  /**
   * Subscribe to scroll position changes
   */
  onScroll(
    callback: (position: number, direction: "forward" | "backward") => void
  ): () => void {
    const unsubscribe = this.listManager.on(
      "scroll:position:changed",
      (data: any) => {
        callback(data.position, data.direction);
      }
    );

    const key = `scroll-${Date.now()}`;
    this.eventSubscriptions.set(key, unsubscribe);

    return () => {
      unsubscribe();
      this.eventSubscriptions.delete(key);
    };
  }

  /**
   * Subscribe to visible range changes
   */
  onRangeChange(callback: (range: ItemRange) => void): () => void {
    const unsubscribe = this.listManager.on(
      "virtual:range:changed",
      (data: any) => {
        callback(data);
      }
    );

    const key = `range-${Date.now()}`;
    this.eventSubscriptions.set(key, unsubscribe);

    return () => {
      unsubscribe();
      this.eventSubscriptions.delete(key);
    };
  }

  /**
   * Subscribe to viewport changes
   */
  onViewportChange(callback: (viewport: ViewportInfo) => void): () => void {
    const unsubscribe = this.listManager.on("viewport:changed", (data: any) => {
      callback(data);
    });

    const key = `viewport-${Date.now()}`;
    this.eventSubscriptions.set(key, unsubscribe);

    return () => {
      unsubscribe();
      this.eventSubscriptions.delete(key);
    };
  }

  /**
   * Subscribe to loading events
   */
  onLoading(
    callback: (range: ItemRange, strategy: string) => void
  ): () => void {
    const unsubscribe = this.listManager.on(
      "loading:triggered",
      (data: any) => {
        callback(data.range, data.strategy);
      }
    );

    const key = `loading-${Date.now()}`;
    this.eventSubscriptions.set(key, unsubscribe);

    return () => {
      unsubscribe();
      this.eventSubscriptions.delete(key);
    };
  }

  /**
   * Subscribe to placeholder events
   */
  onPlaceholders(
    callback: (range: ItemRange, count: number) => void
  ): () => void {
    const unsubscribe = this.listManager.on(
      "placeholders:shown",
      (data: any) => {
        callback(data.range, data.count);
      }
    );

    const key = `placeholders-${Date.now()}`;
    this.eventSubscriptions.set(key, unsubscribe);

    return () => {
      unsubscribe();
      this.eventSubscriptions.delete(key);
    };
  }

  /**
   * Clean up all event subscriptions
   */
  destroy(): void {
    this.eventSubscriptions.forEach((unsubscribe) => unsubscribe());
    this.eventSubscriptions.clear();
  }
}

/**
 * Enhanced List Manager implementation with API helpers
 */
class ListManagerAPIImpl implements ListManagerAPI {
  private listManager: any; // Enhanced component from createListManager
  private eventHelpers: ListManagerEventHelpers;

  constructor(listManager: any) {
    this.listManager = listManager;
    this.eventHelpers = new ListManagerEventHelpers(listManager);
  }

  // Business logic API
  loadRange(
    pageOrOffset: number,
    size: number,
    strategy: "page" | "offset" = "page",
    alignment: "start" | "center" | "end" = "start"
  ): void {
    console.log(
      `🎯 [LIST-MANAGER-API] loadRange called: ${pageOrOffset}, size=${size}, strategy=${strategy}, alignment=${alignment}`
    );

    let targetIndex: number;
    let dataRange: { start: number; end: number };

    if (strategy === "page") {
      // Page-based loading: page 1 = items 0-19, page 2 = items 20-39
      const pageSize = size;
      targetIndex = (pageOrOffset - 1) * pageSize;
      dataRange = {
        start: targetIndex,
        end: targetIndex + pageSize - 1,
      };
      console.log(
        `📄 [LIST-MANAGER-API] Page ${pageOrOffset} → index ${targetIndex}, range ${dataRange.start}-${dataRange.end}`
      );
    } else {
      // Offset-based loading: offset 2 = start at item 2, load 'size' items
      targetIndex = pageOrOffset;
      dataRange = {
        start: targetIndex,
        end: targetIndex + size - 1,
      };
      console.log(
        `📍 [LIST-MANAGER-API] Offset ${pageOrOffset} → range ${dataRange.start}-${dataRange.end}`
      );
    }

    // 1. First, request data from collection (proactive)
    console.log(
      `📡 [LIST-MANAGER-API] Requesting data for range ${dataRange.start}-${dataRange.end}`
    );
    if (
      this.listManager.collection &&
      typeof this.listManager.collection.loadMissingRanges === "function"
    ) {
      this.listManager.collection
        .loadMissingRanges(dataRange)
        .catch((error: any) => {
          console.error("❌ [LIST-MANAGER-API] Failed to load range:", error);
        });
    }

    // 2. Then, tell viewport to scroll to visual position
    console.log(
      `🎯 [LIST-MANAGER-API] Instructing viewport to scroll to index ${targetIndex}`
    );
    if (this.listManager.viewport?.scrollToIndex) {
      this.listManager.viewport.scrollToIndex(targetIndex, alignment);
    } else {
      console.error(
        "❌ [LIST-MANAGER-API] Viewport or scrollToIndex method not available"
      );
    }
  }

  // Navigation API
  scrollToPosition(position: number): void {
    console.log(`🎯 [LIST-MANAGER-API] scrollToPosition called: ${position}px`);
    if (this.listManager.viewport?.scrollToPosition) {
      this.listManager.viewport.scrollToPosition(position);
    } else {
      console.error(
        "❌ [LIST-MANAGER-API] Viewport or scrollToPosition method not available"
      );
    }
  }

  // Delegate core methods to the enhanced component
  scrollToIndex(index: number, alignment?: "start" | "center" | "end"): void {
    console.log(
      `🎯 [LIST-MANAGER-API] scrollToIndex called: index=${index}, alignment=${alignment}`
    );
    if (this.listManager.viewport?.scrollToIndex) {
      this.listManager.viewport.scrollToIndex(index, alignment);
    } else {
      console.error(
        "❌ [LIST-MANAGER-API] Viewport or scrollToIndex method not available"
      );
    }
  }

  scrollToPage(page: number, alignment?: "start" | "center" | "end"): void {
    // Legacy method - redirect to loadRange for better architecture
    this.loadRange(page, 20, "page", alignment);
  }

  // State API
  getScrollPosition(): number {
    return this.listManager.viewport?.getScrollPosition() || 0;
  }

  getItems(): any[] {
    return this.listManager.items || [];
  }

  getTotalItems(): number {
    return this.listManager.totalItems || 0;
  }

  getVisibleRange(): ItemRange {
    return this.listManager.viewport?.getVisibleRange() || { start: 0, end: 0 };
  }

  // Core lifecycle
  initialize(): void {
    this.listManager.initialize();
  }

  destroy(): void {
    this.listManager.destroy();
  }

  updateConfig(config: Partial<ListManagerConfig>): void {
    this.listManager.updateConfig(config);
  }

  // Event system
  on(event: string, listener: Function): () => void {
    return this.listManager.on(event, listener);
  }

  // Convenience methods
  onScroll(
    callback: (position: number, direction: "forward" | "backward") => void
  ): () => void {
    return this.eventHelpers.onScroll(callback);
  }

  onRangeChange(callback: (range: ItemRange) => void): () => void {
    return this.eventHelpers.onRangeChange(callback);
  }

  onViewportChange(callback: (viewport: ViewportInfo) => void): () => void {
    return this.eventHelpers.onViewportChange(callback);
  }

  onLoading(
    callback: (range: ItemRange, strategy: string) => void
  ): () => void {
    return this.eventHelpers.onLoading(callback);
  }

  onPlaceholders(
    callback: (range: ItemRange, count: number) => void
  ): () => void {
    return this.eventHelpers.onPlaceholders(callback);
  }

  isLoading(): boolean {
    // TODO: Implement proper loading state check
    return false;
  }

  getLoadedRanges(): Set<number> {
    // TODO: Implement proper loaded ranges access
    return new Set();
  }

  hasItem(index: number): boolean {
    // TODO: Implement proper item check
    return false;
  }

  getItem(index: number): any {
    // TODO: Implement proper item access
    return null;
  }

  getDebugInfo(): ListManagerDebugInfo {
    const config = this.listManager.getConfig(); // Assuming getConfig is available on the enhanced component
    const viewport = this.listManager.getViewportInfo(); // Assuming getViewportInfo is available on the enhanced component
    const visibleRange = this.listManager.getVisibleRange(); // Assuming getVisibleRange is available on the enhanced component

    return {
      config,
      state: {
        isInitialized: true, // TODO: Access internal state
        totalItems: this.getTotalItems(),
        visibleRange,
        scrollPosition: this.getScrollPosition(),
        paginationStrategy: this.listManager.getPaginationStrategy(), // Assuming getPaginationStrategy is available on the enhanced component
      },
      performance: {
        scrollVelocity: 0, // TODO: Access speed tracker
        loadedRanges: [], // TODO: Access collection feature
        pendingRanges: [], // TODO: Access collection feature
      },
      features: {
        viewport: {
          orientation: config.orientation.orientation,
          containerSize: viewport.containerSize,
          totalVirtualSize: viewport.totalVirtualSize,
          estimatedItemSize: config.virtual.estimatedItemSize,
          measuredItemsCount: 0, // TODO: Access viewport feature
        },
        collection: {
          loadedItemsCount: 0, // TODO: Access collection feature
          hasPlaceholderStructure: false, // TODO: Access collection feature
          placeholderFields: [], // TODO: Access collection feature
        },
      },
    };
  }

  enableDebug(): void {
    this.listManager.updateConfig({ debug: true }); // Assuming updateConfig is available on the enhanced component
  }

  disableDebug(): void {
    this.listManager.updateConfig({ debug: false }); // Assuming updateConfig is available on the enhanced component
  }
}

/**
 * Create an enhanced List Manager with API helpers
 */
export function createListManagerAPI(
  config: ListManagerConfig
): ListManagerAPI {
  const listManager = createListManager(config);
  return new ListManagerAPIImpl(listManager);
}

/**
 * Utility functions for common List Manager operations
 */
export const ListManagerUtils = {
  /**
   * Create a simple template function for debugging
   */
  createDebugTemplate: (itemHeight: number = 50) => {
    return (item: any, index: number) => {
      const div = document.createElement("div");
      div.style.height = `${itemHeight}px`;
      div.style.padding = "8px";
      div.style.borderBottom = "1px solid #eee";
      div.style.display = "flex";
      div.style.alignItems = "center";
      div.innerHTML = `
        <span style="font-weight: bold; margin-right: 8px;">#${index}</span>
        <span>${JSON.stringify(item)}</span>
      `;
      return div;
    };
  },

  /**
   * Create a default configuration for testing
   */
  createTestConfig: (
    container: HTMLElement,
    itemCount: number = 1000
  ): Partial<ListManagerConfig> => {
    const items = Array.from({ length: itemCount }, (_, i) => ({
      id: i,
      name: `Item ${i}`,
      value: Math.random() * 100,
    }));

    return {
      container,
      items,
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
      template: {
        template: ListManagerUtils.createDebugTemplate(50),
      },
      debug: true,
      prefix: "test-list",
      componentName: "TestList",
    };
  },

  /**
   * Performance measurement helper
   */
  measurePerformance: (
    listManager: ListManagerAPI,
    duration: number = 5000
  ) => {
    const measurements = {
      scrollEvents: 0,
      rangeChanges: 0,
      loadingTriggers: 0,
      startTime: Date.now(),
      endTime: 0,
    };

    const unsubscribeScroll = listManager.onScroll(() => {
      measurements.scrollEvents++;
    });

    const unsubscribeRange = listManager.onRangeChange(() => {
      measurements.rangeChanges++;
    });

    const unsubscribeLoading = listManager.onLoading(() => {
      measurements.loadingTriggers++;
    });

    return new Promise<typeof measurements>((resolve) => {
      setTimeout(() => {
        measurements.endTime = Date.now();
        unsubscribeScroll();
        unsubscribeRange();
        unsubscribeLoading();
        resolve(measurements);
      }, duration);
    });
  },
};

/**
 * Default exports
 */
export { createListManager };
export default createListManagerAPI;
