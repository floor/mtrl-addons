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
export interface ListManagerAPI extends ListManager {
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
  private listManager: ListManager;
  private eventSubscriptions: Map<string, () => void> = new Map();

  constructor(listManager: ListManager) {
    this.listManager = listManager;
  }

  /**
   * Subscribe to scroll position changes
   */
  onScroll(
    callback: (position: number, direction: "forward" | "backward") => void
  ): () => void {
    const unsubscribe = this.listManager.subscribe((event, data) => {
      if (event === ListManagerEvents.SCROLL_POSITION_CHANGED) {
        const scrollData =
          data as ListManagerEventData[ListManagerEvents.SCROLL_POSITION_CHANGED];
        callback(scrollData.position, scrollData.direction);
      }
    });

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
    const unsubscribe = this.listManager.subscribe((event, data) => {
      if (event === ListManagerEvents.VIRTUAL_RANGE_CHANGED) {
        const range = data as ItemRange;
        callback(range);
      }
    });

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
    const unsubscribe = this.listManager.subscribe((event, data) => {
      if (event === ListManagerEvents.VIEWPORT_CHANGED) {
        const viewport = data as ViewportInfo;
        callback(viewport);
      }
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
    const unsubscribe = this.listManager.subscribe((event, data) => {
      if (event === ListManagerEvents.LOADING_TRIGGERED) {
        const loadingData =
          data as ListManagerEventData[ListManagerEvents.LOADING_TRIGGERED];
        callback(loadingData.range, loadingData.strategy);
      }
    });

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
    const unsubscribe = this.listManager.subscribe((event, data) => {
      if (event === ListManagerEvents.PLACEHOLDERS_SHOWN) {
        const placeholderData =
          data as ListManagerEventData[ListManagerEvents.PLACEHOLDERS_SHOWN];
        callback(placeholderData.range, placeholderData.count);
      }
    });

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
  private listManager: ListManager;
  private eventHelpers: ListManagerEventHelpers;

  constructor(listManager: ListManager) {
    this.listManager = listManager;
    this.eventHelpers = new ListManagerEventHelpers(listManager);
  }

  // Delegate all core methods to the underlying list manager
  scrollToIndex(index: number, alignment?: "start" | "center" | "end"): void {
    this.listManager.scrollToIndex(index, alignment);
  }

  scrollToPage(page: number, alignment?: "start" | "center" | "end"): void {
    this.listManager.scrollToPage(page, alignment);
  }

  getScrollPosition(): number {
    return this.listManager.getScrollPosition();
  }

  getVisibleRange(): ItemRange {
    return this.listManager.getVisibleRange();
  }

  getViewportInfo(): ViewportInfo {
    return this.listManager.getViewportInfo();
  }

  updateViewport(): void {
    this.listManager.updateViewport();
  }

  setItems(items: any[]): void {
    this.listManager.setItems(items);
  }

  setTotalItems(total: number): void {
    this.listManager.setTotalItems(total);
  }

  getItems(): any[] {
    return this.listManager.getItems();
  }

  getTotalItems(): number {
    return this.listManager.getTotalItems();
  }

  setPaginationStrategy(strategy: "page" | "offset" | "cursor"): void {
    this.listManager.setPaginationStrategy(strategy);
  }

  getPaginationStrategy(): "page" | "offset" | "cursor" {
    return this.listManager.getPaginationStrategy();
  }

  updateConfig(config: any): void {
    this.listManager.updateConfig(config);
  }

  getConfig(): ListManagerConfig {
    return this.listManager.getConfig();
  }

  subscribe(observer: ListManagerObserver): () => void {
    return this.listManager.subscribe(observer);
  }

  emit<T extends ListManagerEvents>(
    event: T,
    data: ListManagerEventData[T]
  ): void {
    this.listManager.emit(event, data);
  }

  initialize(): void {
    this.listManager.initialize();
  }

  destroy(): void {
    this.eventHelpers.destroy();
    this.listManager.destroy();
  }

  // Enhanced API methods
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
    const config = this.getConfig();
    const viewport = this.getViewportInfo();
    const visibleRange = this.getVisibleRange();

    return {
      config,
      state: {
        isInitialized: true, // TODO: Access internal state
        totalItems: this.getTotalItems(),
        visibleRange,
        scrollPosition: this.getScrollPosition(),
        paginationStrategy: this.getPaginationStrategy(),
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
    this.updateConfig({ debug: true });
  }

  disableDebug(): void {
    this.updateConfig({ debug: false });
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
  ): ListManagerConfig => {
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
