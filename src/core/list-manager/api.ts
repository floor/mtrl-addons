/**
 * List Manager API Feature
 *
 * Provides the complete API interface for List Manager functionality.
 * This feature adds all the methods defined in the ListManager interface.
 */

import type {
  ListManager,
  VirtualItem,
  ViewportInfo,
  PerformanceReport,
  ListManagerObserver,
  ListManagerUnsubscribe,
} from "./types";

import { ListManagerEvents } from "./types";

import type { ElementComponent } from "mtrl/src/core/compose";

/**
 * Configuration for List Manager API
 */
export interface ListManagerAPIConfig {
  /**
   * Component prefix for CSS classes
   */
  prefix?: string;

  /**
   * Component name for identification
   */
  componentName?: string;

  /**
   * Debug mode
   */
  debug?: boolean;

  /**
   * Container element
   */
  container?: HTMLElement | string | null;

  /**
   * Template configuration
   */
  template?: {
    template?: (item: VirtualItem, index: number) => string | HTMLElement;
    onTemplateCreate?: (element: HTMLElement, item: VirtualItem) => void;
    onTemplateUpdate?: (element: HTMLElement, item: VirtualItem) => void;
    onTemplateDestroy?: (element: HTMLElement, item: VirtualItem) => void;
  };

  [key: string]: any;
}

/**
 * Enhanced component interface with List Manager API
 */
export interface ListManagerAPIComponent extends ElementComponent, ListManager {
  config: ListManagerAPIConfig;
}

/**
 * Creates the List Manager API manager
 */
const createListManagerAPI = (
  component: ElementComponent,
  config: ListManagerAPIConfig
): ListManager => {
  // Internal state
  let items: VirtualItem[] = [];
  let visibleItems: VirtualItem[] = [];
  let isDestroyed = false;

  // Event system
  const listeners = new Set<ListManagerObserver>();

  // Scroll animation state
  let scrollAnimationEnabled = true;

  // Performance tracking
  let performanceMetrics: PerformanceReport = {
    timestamp: Date.now(),
    currentFPS: 60,
    averageFPS: 60,
    minFPS: 60,
    maxFPS: 60,
    memoryUsage: 0,
    memoryDelta: 0,
    gcCount: 0,
    renderTime: 0,
    averageRenderTime: 0,
    slowRenders: 0,
    scrollFPS: 60,
    scrollEvents: 0,
    scrollDistance: 0,
    totalElements: 0,
    visibleElements: 0,
    recycledElements: 0,
    poolSize: 0,
    viewportChanges: 0,
    intersectionUpdates: 0,
    heightMeasurements: 0,
  };

  // Viewport info
  let viewportInfo: ViewportInfo = {
    width: 0,
    height: 0,
    scrollTop: 0,
    scrollLeft: 0,
    startIndex: 0,
    endIndex: 0,
    visibleItems: [],
    bufferStart: 0,
    bufferEnd: 0,
    totalHeight: 0,
    totalWidth: 0,
  };

  // Initialize viewport info from container if available
  if (config.container) {
    const containerElement =
      typeof config.container === "string"
        ? (document.querySelector(config.container) as HTMLElement)
        : config.container;

    if (containerElement) {
      const rect = containerElement.getBoundingClientRect();
      viewportInfo.width = rect.width;
      viewportInfo.height = rect.height;
    }
  }

  /**
   * Logs debug messages if debug mode is enabled
   */
  const debugLog = (message: string, ...args: any[]) => {
    if (config.debug) {
      console.log(`🔧 [LIST-MANAGER-API] ${message}`, ...args);
    }
  };

  /**
   * Emits events to all subscribers
   */
  const emit = (event: ListManagerEvents | string, data?: any): void => {
    if (isDestroyed) return;

    const payload = {
      event: event as ListManagerEvents,
      data,
      viewport: viewportInfo,
      performance: performanceMetrics,
      timestamp: Date.now(),
      source: "list-manager" as const,
    };

    console.log(
      `🔥 [LIST-MANAGER-API] Emitting ${event} to ${listeners.size} listeners`
    );

    let listenerCount = 0;
    listeners.forEach((listener) => {
      try {
        listenerCount++;
        console.log(
          `🔥 [LIST-MANAGER-API] Calling listener ${listenerCount} for ${event}`
        );
        listener(payload);
        console.log(
          `🔥 [LIST-MANAGER-API] Listener ${listenerCount} completed for ${event}`
        );
      } catch (error) {
        console.error(
          `❌ [LIST-MANAGER-API] Error in listener ${listenerCount} for ${event}:`,
          error
        );
      }
    });

    debugLog(`Event emitted: ${event}`, payload);
  };

  /**
   * Updates viewport information
   */
  const updateViewportInfo = (updates: Partial<ViewportInfo>): void => {
    const previousViewport = { ...viewportInfo };
    viewportInfo = { ...viewportInfo, ...updates };

    // Check if viewport changed significantly
    const hasSignificantChange =
      previousViewport.startIndex !== viewportInfo.startIndex ||
      previousViewport.endIndex !== viewportInfo.endIndex ||
      previousViewport.width !== viewportInfo.width ||
      previousViewport.height !== viewportInfo.height;

    if (hasSignificantChange) {
      performanceMetrics.viewportChanges++;
      emit(ListManagerEvents.VIEWPORT_CHANGED, {
        previous: previousViewport,
        current: viewportInfo,
      });
    }
  };

  /**
   * Validates item parameter
   */
  const validateItem = (item: VirtualItem): void => {
    if (!item || typeof item !== "object") {
      throw new Error("Item must be a valid object");
    }
    if (!item.id) {
      throw new Error("Item must have an id property");
    }
  };

  /**
   * Validates index parameter
   */
  const validateIndex = (index: number): void => {
    if (typeof index !== "number" || index < 0) {
      throw new Error(`Invalid index: ${index}. Must be >= 0`);
    }

    // For virtual scrolling with infinite data, allow any valid index
    // The orchestration layer will handle loading data as needed
    if (index >= items.length) {
      debugLog(
        `Virtual scroll to index ${index} (current items: ${items.length})`
      );
    }
  };

  // Return the List Manager API
  return {
    // Plugin delegation methods - these delegate to the installed plugins
    renderItems(range: { start: number; end: number; count: number }): void {
      debugLog(`Delegating renderItems to rendering plugin`, range);

      const renderingPlugin = (component as any).plugin_rendering;
      if (renderingPlugin && renderingPlugin.renderItems) {
        renderingPlugin.renderItems(range);
      } else {
        console.warn(
          `⚠️ [LIST-MANAGER-API] Rendering plugin not found or doesn't have renderItems method`
        );
      }
    },

    setTemplate(
      template: (item: VirtualItem, index: number) => string | HTMLElement
    ): void {
      debugLog(`Delegating setTemplate to rendering plugin`);

      // Check if template is a function
      if (typeof template !== "function") {
        console.error(
          `❌ [LIST-MANAGER-API] Template must be a function, got: ${typeof template}`
        );
        return;
      }

      const renderingPlugin = (component as any)["plugin_rendering"];
      if (renderingPlugin && renderingPlugin.setTemplate) {
        debugLog(`✅ [LIST-MANAGER-API] Setting template on rendering plugin`);
        renderingPlugin.setTemplate(template);
      } else {
        console.warn(
          `⚠️ [LIST-MANAGER-API] Rendering plugin not found or doesn't have setTemplate method`
        );
        console.warn(
          `Available plugins:`,
          Object.keys(component as any).filter((key) =>
            key.startsWith("plugin_")
          )
        );
      }
    },

    setupVirtualContainer(): void {
      debugLog(`Delegating setupVirtualContainer to virtual viewport plugin`);

      const virtualViewportPlugin = (component as any)[
        "plugin_virtual-viewport"
      ];
      if (virtualViewportPlugin && virtualViewportPlugin.updateViewport) {
        virtualViewportPlugin.updateViewport();
      } else {
        console.warn(
          `⚠️ [LIST-MANAGER-API] Virtual viewport plugin not found or doesn't have updateViewport method`
        );
      }
    },

    handleScrollToIndex(
      index: number,
      alignment: "start" | "center" | "end" = "start",
      animate?: boolean
    ): void {
      debugLog(
        `Delegating handleScrollToIndex to scrollbar plugin (virtual viewport handles positioning)`,
        {
          index,
          alignment,
          animate,
        }
      );

      // With virtual viewport + custom scrollbar, we need to calculate scroll position and let scrollbar handle it
      const scrollbarPlugin = (component as any)["plugin_scrollbar"];
      if (scrollbarPlugin) {
        const itemHeight = 50; // Should get from config
        const virtualScrollTop = index * itemHeight;

        // Update scrollbar position, which will trigger virtual viewport updates
        if (scrollbarPlugin.updateScrollPosition) {
          scrollbarPlugin.updateScrollPosition(virtualScrollTop);
        }
      } else {
        console.warn(
          `⚠️ [LIST-MANAGER-API] Scrollbar plugin not found - virtual viewport requires custom scrollbar`
        );
      }
    },

    setTotalItems(count: number): void {
      debugLog(
        `Delegating setTotalItems to virtual viewport and scrollbar plugins`,
        count
      );

      // Update virtual viewport with total dataset size (not a mock array)
      const virtualViewportPlugin = (component as any)[
        "plugin_virtual-viewport"
      ];
      if (virtualViewportPlugin && virtualViewportPlugin.setTotalDatasetSize) {
        virtualViewportPlugin.setTotalDatasetSize(count);
        debugLog(
          `Delegated setTotalDatasetSize to virtual viewport: ${count} items`
        );
      } else {
        console.warn(
          `⚠️ [LIST-MANAGER-API] Virtual viewport plugin not found or doesn't have setTotalDatasetSize method`
        );
      }

      // Update scrollbar with total items for proper scrollbar sizing
      const scrollbarPlugin = (component as any)["plugin_scrollbar"];
      if (scrollbarPlugin && scrollbarPlugin.setTotalItems) {
        scrollbarPlugin.setTotalItems(count);
        debugLog(`Delegated setTotalItems to scrollbar: ${count}`);
      }
    },

    getRenderRange(): { start: number; end: number; count: number } {
      const virtualViewportPlugin = (component as any)[
        "plugin_virtual-viewport"
      ];
      if (virtualViewportPlugin && virtualViewportPlugin.getRenderRange) {
        return virtualViewportPlugin.getRenderRange();
      }
      return { start: 0, end: 0, count: 0 };
    },

    getScrollTop(): number {
      const scrollbarPlugin = (component as any)["plugin_scrollbar"];
      if (scrollbarPlugin && scrollbarPlugin.getVirtualScrollTop) {
        return scrollbarPlugin.getVirtualScrollTop();
      }
      return 0;
    },

    // Viewport calculations and scroll operations
    calculateViewportForIndex(
      index: number,
      alignment?: "start" | "center" | "end",
      totalItems?: number
    ): {
      visibleRange: { start: number; end: number; count: number };
      scrollTop: number;
    } {
      // Default fallback calculation
      const itemHeight = 50; // Assume 50px item height
      const containerHeight = 400; // Assume 400px container height
      const visibleItemCount = Math.ceil(containerHeight / itemHeight);

      let startIndex = index;
      if (alignment === "center") {
        startIndex = Math.max(0, index - Math.floor(visibleItemCount / 2));
      } else if (alignment === "end") {
        startIndex = Math.max(0, index - visibleItemCount + 1);
      }

      const endIndex = Math.min(
        (totalItems || index + 10) - 1,
        startIndex + visibleItemCount - 1
      );
      const scrollTop = index * itemHeight;

      return {
        visibleRange: {
          start: startIndex,
          end: endIndex,
          count: endIndex - startIndex + 1,
        },
        scrollTop,
      };
    },

    calculateVirtualScrollMetrics(targetIndex: number): {
      scrollTop: number;
      virtualOffset: number;
    } {
      // Default fallback calculation
      const scrollTop = targetIndex * 50; // Assume 50px item height
      return { scrollTop, virtualOffset: scrollTop };
    },

    // Virtual scrolling methods
    setItems(newItems: VirtualItem[]): void {
      if (!Array.isArray(newItems)) {
        throw new Error("Items must be an array");
      }

      // Validate items
      newItems.forEach(validateItem);

      items = [...newItems];
      debugLog(`🚀 [LIST-MANAGER-API] Items updated: ${items.length} items`);

      // Update performance metrics
      performanceMetrics.totalElements = items.length;

      // 🔥 CRITICAL: Pass items to virtual viewport plugin
      const virtualViewportPlugin = (component as any)[
        "plugin_virtual-viewport"
      ];
      if (virtualViewportPlugin && virtualViewportPlugin.setItems) {
        debugLog(
          `🔄 [LIST-MANAGER-API] Delegating setItems to virtual viewport: ${items.length} items`
        );
        virtualViewportPlugin.setItems(items);
      } else {
        console.warn(
          `⚠️ [LIST-MANAGER-API] Virtual viewport plugin not found or doesn't have setItems method`
        );
      }

      // Pass items to rendering plugin
      const renderingPlugin = (component as any).plugin_rendering;
      if (renderingPlugin && renderingPlugin.setItems) {
        debugLog(
          `🔄 [LIST-MANAGER-API] Delegating setItems to rendering plugin: ${items.length} items`
        );
        renderingPlugin.setItems(items);
      } else {
        console.warn(
          `⚠️ [LIST-MANAGER-API] Rendering plugin not found or doesn't have setItems method`
        );
      }

      // Don't emit virtual:range:changed here - let the virtual viewport handle it
      // The virtual viewport will emit this event with the correct ranges after calculating them
    },

    getVisibleItems(): VirtualItem[] {
      return [...visibleItems];
    },

    getVisibleRange(): { start: number; end: number; count: number } {
      const virtualViewportPlugin = (component as any)[
        "plugin_virtual-viewport"
      ];
      if (virtualViewportPlugin && virtualViewportPlugin.getVisibleRange) {
        const range = virtualViewportPlugin.getVisibleRange();
        return {
          start: range.startIndex,
          end: range.endIndex,
          count: range.endIndex - range.startIndex + 1,
        };
      }
      return {
        start: viewportInfo.startIndex,
        end: viewportInfo.endIndex,
        count: viewportInfo.endIndex - viewportInfo.startIndex + 1,
      };
    },

    scrollToIndex(
      index: number,
      align: "start" | "center" | "end" = "start",
      animate?: boolean
    ): void {
      validateIndex(index);
      debugLog(
        `Scrolling to index: ${index}, align: ${align}, animate: ${animate}`
      );

      // Emit event
      emit("scroll:to:index", { index, align, animate });
    },

    scrollToItem(
      item: VirtualItem,
      align: "start" | "center" | "end" = "start",
      animate?: boolean
    ): void {
      validateItem(item);

      const index = items.findIndex((i) => i.id === item.id);
      if (index === -1) {
        throw new Error(`Item with id "${item.id}" not found`);
      }

      this.scrollToIndex(index, align, animate);
    },

    // Element recycling methods
    recycleElement(element: HTMLElement): void {
      if (!(element instanceof HTMLElement)) {
        throw new Error("Element must be an HTMLElement");
      }

      debugLog("Recycling element", element);
      performanceMetrics.recycledElements++;

      // This will be implemented by the recycling features
      emit(ListManagerEvents.ELEMENT_RECYCLED, { element });
    },

    getPoolStats(): any {
      return {
        size: performanceMetrics.poolSize,
        maxSize: 100, // This should come from config
        recycled: performanceMetrics.recycledElements,
      };
    },

    optimizePool(): void {
      debugLog("Optimizing element pool");

      // This will be implemented by the recycling features
      emit("pool:optimized", {});
    },

    // Viewport management methods
    getViewportInfo(): ViewportInfo {
      return { ...viewportInfo };
    },

    updateViewport(): void {
      debugLog("Updating viewport");

      // Get container dimensions
      if (component.element) {
        const rect = component.element.getBoundingClientRect();
        updateViewportInfo({
          width: rect.width,
          height: rect.height,
        });
      }

      emit("viewport:update", { viewport: viewportInfo });
    },

    onViewportChange(
      callback: (viewport: ViewportInfo) => void
    ): ListManagerUnsubscribe {
      const observer: ListManagerObserver = (payload) => {
        if (payload.event === ListManagerEvents.VIEWPORT_CHANGED) {
          callback(payload.viewport || viewportInfo);
        }
      };

      listeners.add(observer);

      return () => {
        listeners.delete(observer);
      };
    },

    // Height measurement methods
    measureHeight(item: VirtualItem): number {
      validateItem(item);

      // This will be implemented by the height measurement features
      const height = 50; // Default height
      performanceMetrics.heightMeasurements++;

      debugLog(`Measured height for item ${item.id}: ${height}px`);
      return height;
    },

    estimateHeight(item: VirtualItem): number {
      validateItem(item);

      // This will be implemented by the height measurement features
      return 50; // Default estimated height
    },

    cacheHeight(item: VirtualItem, height: number): void {
      validateItem(item);

      if (typeof height !== "number" || height <= 0) {
        throw new Error("Height must be a positive number");
      }

      debugLog(`Caching height for item ${item.id}: ${height}px`);
      performanceMetrics.heightMeasurements++;

      // This will be implemented by the height measurement features
      emit(ListManagerEvents.HEIGHT_CACHED, { item, height });
    },

    // Performance monitoring methods
    getPerformanceReport(): PerformanceReport {
      return { ...performanceMetrics };
    },

    enablePerformanceMonitoring(): void {
      debugLog("Performance monitoring enabled");

      // This will be implemented by the performance features
      emit("performance:monitoring:enabled", {});
    },

    disablePerformanceMonitoring(): void {
      debugLog("Performance monitoring disabled");

      // This will be implemented by the performance features
      emit("performance:monitoring:disabled", {});
    },

    // Scroll animation control methods
    setScrollAnimation(enabled: boolean): void {
      debugLog(`Scroll animation ${enabled ? "enabled" : "disabled"}`);

      // Update internal state
      scrollAnimationEnabled = enabled;

      // Update CSS scroll-behavior property on container element to override SCSS
      if (component.element) {
        component.element.style.scrollBehavior = enabled ? "smooth" : "unset";
        component.element.style.setProperty(
          "scroll-behavior",
          enabled ? "smooth" : "unset"
        );
      }

      // Update programmatic scroll plugin (if available)
      if ((component as any).updateConfig) {
        (component as any).updateConfig({
          smooth: enabled,
          behavior: enabled ? "smooth" : "instant",
        });
      }

      // Emit scroll animation state change event
      emit("scroll:animation:changed", { enabled });
    },

    getScrollAnimation(): boolean {
      return scrollAnimationEnabled;
    },

    toggleScrollAnimation(): void {
      const currentState = scrollAnimationEnabled;
      this.setScrollAnimation(!currentState);
      debugLog(
        `Scroll animation toggled to ${!currentState ? "enabled" : "disabled"}`
      );
    },

    // Template rendering methods
    renderItem(item: VirtualItem, index: number): HTMLElement {
      validateItem(item);
      validateIndex(index);

      if (config.template?.template) {
        const result = config.template.template(item, index);

        let element: HTMLElement;
        if (typeof result === "string") {
          element = document.createElement("div");
          element.innerHTML = result;
        } else {
          element = result;
        }

        // Set data attributes
        element.setAttribute("data-item-id", item.id);
        element.setAttribute("data-item-index", index.toString());

        // Call lifecycle hook
        if (config.template.onTemplateCreate) {
          config.template.onTemplateCreate(element, item);
        }

        debugLog(`Rendered item ${item.id} at index ${index}`);
        return element;
      }

      // Default template
      const element = document.createElement("div");
      element.className = `${config.prefix || "mtrl"}-list-item`;
      element.textContent = `Item ${index}: ${item.id}`;
      element.setAttribute("data-item-id", item.id);
      element.setAttribute("data-item-index", index.toString());

      return element;
    },

    updateItem(element: HTMLElement, item: VirtualItem, index: number): void {
      if (!(element instanceof HTMLElement)) {
        throw new Error("Element must be an HTMLElement");
      }
      validateItem(item);

      // Update data attributes
      element.setAttribute("data-item-id", item.id);
      element.setAttribute("data-item-index", index.toString());

      // Call lifecycle hook
      if (config.template?.onTemplateUpdate) {
        config.template.onTemplateUpdate(element, item);
      }

      debugLog(`Updated item ${item.id} at index ${index}`);
    },

    // Event system methods
    subscribe(observer: ListManagerObserver): ListManagerUnsubscribe {
      console.log(
        `🔥 [LIST-MANAGER-API] SUBSCRIBE: Adding observer (current: ${listeners.size})`
      );
      listeners.add(observer);
      console.log(
        `🔥 [LIST-MANAGER-API] SUBSCRIBE: Observer added (total: ${listeners.size})`
      );
      debugLog(`Subscribed observer (${listeners.size} total)`);

      return () => {
        console.log(
          `🔥 [LIST-MANAGER-API] UNSUBSCRIBE: Removing observer (current: ${listeners.size})`
        );
        listeners.delete(observer);
        console.log(
          `🔥 [LIST-MANAGER-API] UNSUBSCRIBE: Observer removed (remaining: ${listeners.size})`
        );
        debugLog(`Unsubscribed observer (${listeners.size} remaining)`);
      };
    },

    emit(event: ListManagerEvents | string, data?: any): void {
      emit(event, data);
    },

    // Lifecycle methods
    destroy(): void {
      if (isDestroyed) return;

      debugLog("Destroying List Manager API");

      // Call template destroy hooks for all elements
      if (config.template?.onTemplateDestroy && component.element) {
        const elements = component.element.querySelectorAll("[data-item-id]");
        elements.forEach((el) => {
          const itemId = el.getAttribute("data-item-id");
          const item = items.find((i) => i.id === itemId);
          if (item && config.template?.onTemplateDestroy) {
            config.template.onTemplateDestroy(el as HTMLElement, item);
          }
        });
      }

      // Clear all listeners
      listeners.clear();

      // Reset state
      items = [];
      visibleItems = [];
      isDestroyed = true;

      emit("destroyed", {});
    },
  };
};

/**
 * Adds List Manager API to a component
 *
 * @param config - API configuration
 * @returns Function that enhances a component with List Manager API
 */
export const withListManagerAPI =
  <T extends ListManagerAPIConfig>(config: T) =>
  <C extends ElementComponent>(component: C): C & ListManagerAPIComponent => {
    // Create the API manager
    const api = createListManagerAPI(component, config);

    // Enhanced component with all API methods
    const enhanced = {
      ...component,
      ...api,
      config: {
        ...component.config,
        ...config,
      },
    } as C & ListManagerAPIComponent;

    // 🔥 CRITICAL: Bridge mtrl event system with List Manager API observer system
    // This ensures events from plugins (via mtrl events) reach orchestration (via API observers)
    if ((component as any).on) {
      const eventTypes = [
        "virtual:range:changed",
        "viewport:changed",
        "scroll:position:changed",
        "scroll:animation:changed",
        "orientation:dimensions:changed",
      ];

      eventTypes.forEach((eventType) => {
        (component as any).on(eventType, (data: any) => {
          console.log(
            `🌉 [LIST-MANAGER-API] Bridging mtrl event to observers: ${eventType}`
          );

          // Re-broadcast through the List Manager API's emit method
          // This will trigger the observers that orchestration subscribes to
          enhanced.emit(eventType as ListManagerEvents, data);
        });
      });

      console.log(
        `✅ [LIST-MANAGER-API] Event bridge established for ${eventTypes.length} event types`
      );
    }

    // Initialize viewport if container is available
    if (enhanced.element) {
      enhanced.updateViewport();
    }

    console.log(`✅ [LIST-MANAGER-API] API feature added to component`);
    return enhanced;
  };
