/**
 * Viewport Feature - Complete Virtual Scrolling Enhancer
 * Handles orientation, virtual scrolling, custom scrollbar, and item rendering
 */

import type {
  ListManagerComponent,
  ItemRange,
  ViewportInfo,
} from "../../types";
import { LIST_MANAGER_CONSTANTS } from "../../constants";
// Removed calculateViewportInfoUtil import - using virtualManager directly
import { getDefaultTemplate } from "./template";
import { createItemSizeManager, type ItemSizeManager } from "./item-size";
import { createScrollingManager, type ScrollingManager } from "./scrolling";
import { createVirtualManager, type VirtualManager } from "./virtual";
import { createRenderingManager, type RenderingManager } from "./rendering";
import { scrollbar as createScrollbar } from "./scrollbar";

/**
 * Configuration for viewport enhancer
 */
export interface ViewportConfig {
  orientation?: "vertical" | "horizontal";
  estimatedItemSize?: number;
  overscan?: number;
  enableScrollbar?: boolean;
  loadDataForRange?: (range: { start: number; end: number }) => void;
  measureItems?: boolean; // Add measureItems flag
}

/**
 * Component interface after viewport enhancement
 */
export interface ViewportComponent {
  viewport: {
    // Virtual scrolling
    getScrollPosition(): number;
    getContainerSize(): number;
    getTotalVirtualSize(): number;
    getVisibleRange(): ItemRange;
    getViewportInfo(): ViewportInfo;

    // Navigation - Visual positioning only
    scrollToPosition(position: number): void;
    scrollToIndex(index: number, alignment?: "start" | "center" | "end"): void;

    // Item sizing
    measureItemSize(element: HTMLElement, index: number): number;
    hasMeasuredSize(index: number): boolean;
    getMeasuredSize(index: number): number;
    getEstimatedItemSize(): number;

    // Rendering
    renderItems(): void;
    updateItemPositions(): void;
    getRenderedElements(): Map<number, HTMLElement>;

    // State
    getOrientation(): "vertical" | "horizontal";
    isInitialized(): boolean;

    // Manual updates
    updateContainerPosition(): void;
    updateScrollbar(): void;
    updateViewport(): void;
  };
}

/**
 * Adds viewport functionality to a List Manager component
 *
 * @param config - Viewport configuration
 * @returns Function that enhances a component with viewport capabilities
 */
export const withViewport =
  (config: ViewportConfig = {}) =>
  <T extends ListManagerComponent>(component: T): T & ViewportComponent => {
    // Configuration with defaults
    const orientation = config.orientation || "vertical";
    const estimatedItemSize = 84;
    // const estimatedItemSize =
    //   config.estimatedItemSize ||
    //   LIST_MANAGER_CONSTANTS.VIRTUAL_SCROLL.DEFAULT_ITEM_SIZE;
    const overscan =
      config.overscan || LIST_MANAGER_CONSTANTS.VIRTUAL_SCROLL.OVERSCAN_BUFFER;
    const enableScrollbar = config.enableScrollbar !== false;
    const measureItems = config.measureItems === true; // Default to false

    // Items container for virtual positioning
    let itemsContainer: HTMLElement | null = null;

    // Viewport element reference
    let viewportElement: HTMLElement | null = null;

    // State
    let isViewportInitialized = false;
    let resizeObserver: ResizeObserver | null = null;

    // Store the correct total items value from collection layer
    let actualTotalItems = component.totalItems;

    // Scrollbar plugin reference
    let scrollbarPlugin: any = null;

    // Item size management
    const itemSizeManager = createItemSizeManager({
      initialEstimate: estimatedItemSize,
      orientation,
      onSizeUpdated: (newTotalSize) => {
        // DON'T update virtual size from measured items - this breaks height capping!
        // The virtual size should only be managed by virtualManager.updateTotalVirtualSize()
        // Note: Ignoring onSizeUpdated to prevent virtual size reset from measured items
        scrollingManager.updateScrollbar();
        // Emit current state, not the reset state
        component.emit?.("dimensions:changed", {
          containerSize: virtualManager.getState().containerSize,
          totalVirtualSize: virtualManager.getState().totalVirtualSize,
          estimatedItemSize: itemSizeManager.getEstimatedItemSize(),
        });
      },
      onEstimatedSizeChanged: (newEstimate) => {
        component.emit?.("estimated-size:changed", {
          previousEstimate: estimatedItemSize,
          newEstimate,
        });
      },
    });

    // Virtual scrolling manager
    const virtualManager = createVirtualManager(
      component,
      itemSizeManager,
      {
        orientation,
        overscan,
        onDimensionsChanged: (data) => {
          scrollingManager.updateState({
            totalVirtualSize: data.totalVirtualSize,
            containerSize: data.containerSize,
          });
          scrollingManager.updateScrollbar();
          component.emit?.("dimensions:changed", data);
        },
      },
      () => actualTotalItems
    ); // Pass the callback to get actual total items

    /**
     * Check for missing data in a specific range and trigger loading if needed
     */
    const checkForMissingData = (targetRange: {
      start: number;
      end: number;
    }): void => {
      console.log(
        `🔍 [VIEWPORT] Checking range ${targetRange.start}-${targetRange.end} for missing data`
      );

      // Try immediate detection first
      const collection = (component as any).collection;
      const hasCollection = !!collection;
      const hasLoadMissingRanges =
        hasCollection && typeof collection.loadMissingRanges === "function";

      console.log(
        `🔍 [VIEWPORT] Collection check: hasCollection=${hasCollection}, hasLoadMissingRanges=${hasLoadMissingRanges}, items.length=${component.items.length}, actualTotalItems=${actualTotalItems}`
      );

      if (hasLoadMissingRanges) {
        // Improved missing data detection - check for null/undefined items in range
        let missingCount = 0;
        const missingIndices: number[] = [];

        for (let i = targetRange.start; i <= targetRange.end; i++) {
          // Skip if index is beyond actual total items
          if (i >= actualTotalItems) {
            break;
          }

          // Check if item is missing (null, undefined, or array doesn't extend to this index)
          const itemExists =
            i < component.items.length &&
            component.items[i] !== null &&
            component.items[i] !== undefined;

          if (!itemExists) {
            missingCount++;
            missingIndices.push(i);
          }
        }

        console.log(
          `🔍 [VIEWPORT] Missing data analysis: ${missingCount} missing items out of ${
            targetRange.end - targetRange.start + 1
          } requested`
        );
        console.log(
          `🔍 [VIEWPORT] Range breakdown: start=${targetRange.start}, end=${targetRange.end}, items.length=${component.items.length}`
        );

        if (missingCount > 0) {
          console.log(
            `🔄 [VIEWPORT] Triggering collection load for ${missingCount} missing items in range ${targetRange.start}-${targetRange.end}`
          );
          console.log(
            `🔍 [VIEWPORT] Missing indices: [${missingIndices
              .slice(0, 10)
              .join(", ")}${missingIndices.length > 10 ? "..." : ""}]`
          );
          console.log(
            `📊 [VIEWPORT] component.items.length: ${component.items.length}, actualTotalItems: ${actualTotalItems}`
          );

          // Use loading manager via loadDataForRange callback
          if (config.loadDataForRange) {
            console.log(
              `📡 [VIEWPORT] Using loading manager for range ${targetRange.start}-${targetRange.end}`
            );
            config.loadDataForRange(targetRange);
          } else {
            // Fallback to direct collection call if no coordinator
            collection.loadMissingRanges(targetRange).catch((error: any) => {
              console.error(
                "❌ [VIEWPORT] Failed to load missing ranges:",
                error
              );
            });
          }
        } else {
          console.log(
            `✅ [VIEWPORT] All items in range ${targetRange.start}-${targetRange.end} are already loaded`
          );
        }
      } else {
        console.log(`⚠️ [VIEWPORT] Collection not available for loading data`);
      }
    };

    /**
     * Proactively load data for a specific range (called by scrolling manager)
     */
    const loadDataForRange = (range: { start: number; end: number }): void => {
      console.log(
        `🎯 [VIEWPORT] Proactive load request for range ${range.start}-${range.end}`
      );

      // Use the callback from config if provided (proactive approach)
      if (config.loadDataForRange) {
        console.log(
          `📡 [VIEWPORT] Using proactive data loading callback for range ${range.start}-${range.end}`
        );
        config.loadDataForRange(range);
      } else {
        // Fallback to reactive approach (force re-render)
        console.log(
          `🔄 [VIEWPORT] No proactive callback, triggering renderItems for range ${range.start}-${range.end}`
        );

        // Force a re-render
        setTimeout(() => {
          renderItems();
        }, 0);
      }
    };

    // Forward declare renderItems for scrollingManager
    let renderItems: () => void;

    // Scrolling manager
    const scrollingManager = createScrollingManager(
      component,
      itemSizeManager,
      {
        orientation,
        enableScrollbar,
        onScrollPositionChanged: (data) => {
          component.emit?.("scroll:position:changed", data);
        },
        onVirtualRangeChanged: (range) => {
          component.emit?.("virtual:range:changed", range);
        },
      },
      () =>
        virtualManager.calculateVisibleRange(
          scrollingManager.getScrollPosition()
        ),
      () => {
        if (renderingManager) {
          renderingManager.renderItems();
        }
      }, // Wrap in arrow function to avoid hoisting issues
      () => actualTotalItems, // Pass the callback to get actual total items
      loadDataForRange, // Pass the proactive data loading function
      undefined, // Removed height cap info - using index-based scrolling
      (index: number) => virtualManager.calculateVirtualPositionForIndex(index) // Pass position calculator
    );

    // Rendering manager
    const renderingManager = createRenderingManager(
      component,
      itemSizeManager,
      virtualManager,
      scrollingManager,
      {
        orientation,
        overscan,
        loadDataForRange,
        measureItems, // Pass the flag
      },
      () => actualTotalItems
    );

    /**
     * Initialize viewport
     */
    const initialize = (): void => {
      if (isViewportInitialized) return;

      setupContainer();
      if (enableScrollbar) {
        scrollingManager.setupScrollbar();
      }
      scrollingManager.setupWheelEvents();
      setupCollectionEventListeners();
      setupResizeObserver();
      measureContainer();

      if (itemsContainer) {
        // Set items container styles: relative, no transform, flex for orientation
        itemsContainer.style.position = "relative";
        // Remove flex layout as it conflicts with absolute positioning of items
        itemsContainer.style.overflow = "hidden"; // Prevent overflow issues
      }

      isViewportInitialized = true;
      component.emit?.("viewport:initialized", {
        orientation,
        containerSize: virtualManager.getState().containerSize,
      });
    };

    /**
     * Setup collection event listeners for data updates
     */
    const setupCollectionEventListeners = (): void => {
      // Listen for collection events to trigger rendering
      if (component.on) {
        component.on("items:set", (data: any) => {
          // Use the total from the event data or get the current component total
          const currentTotal = data?.total || component.totalItems;
          virtualManager.updateTotalVirtualSize(currentTotal);
          // Force recalculation
          if (renderingManager) {
            renderingManager.renderItems();
          }
        });

        component.on("range:loaded", (data: any) => {
          // Use actualTotalItems which maintains the correct total (1M) instead of
          // component.totalItems which may be temporarily reset during data loading
          virtualManager.updateTotalVirtualSize(actualTotalItems);
          // Always render when data loads - the render function will handle what to show
          if (renderingManager) {
            renderingManager.renderItems();
          }
        });

        component.on("total:changed", (data: any) => {
          // Use the total from the event data instead of component.totalItems
          const newTotal = data?.total || component.totalItems;
          actualTotalItems = newTotal; // Store the correct value
          console.log(
            `📊 [VIEWPORT] Total changed event received: ${newTotal.toLocaleString()}`
          );

          virtualManager.updateTotalVirtualSize(newTotal);

          // Update scrollbar plugin
          if (scrollbarPlugin && scrollbarPlugin.setTotalItems) {
            scrollbarPlugin.setTotalItems(newTotal);
          }

          // Force recalculation
          if (renderingManager) {
            renderingManager.renderItems();
          }
        });

        component.on("placeholders:replaced", () => {
          if (renderingManager) {
            renderingManager.renderItems();
          }
        });

        component.on("estimated-size:changed", (data: any) => {
          // Recalculate virtual size with updated estimated size
          console.log(
            `📊 [VIEWPORT] Estimated size changed, recalculating virtual size for ${actualTotalItems.toLocaleString()} items`
          );
          virtualManager.updateTotalVirtualSize(actualTotalItems);
          scrollingManager.updateScrollbar();

          // Update scrollbar plugin
          if (scrollbarPlugin && scrollbarPlugin.setItemHeight) {
            scrollbarPlugin.setItemHeight(
              itemSizeManager.getEstimatedItemSize()
            );
          }
          if (scrollbarPlugin && scrollbarPlugin.setTotalItems) {
            scrollbarPlugin.setTotalItems(actualTotalItems);
          }
        });
      }
    };

    /**
     * Destroy viewport
     */
    const destroy = (): void => {
      if (!isViewportInitialized) return;

      scrollingManager.removeWheelEvents();
      scrollingManager.destroyScrollbar();

      // Destroy scrollbar plugin
      if (scrollbarPlugin && scrollbarPlugin.destroy) {
        scrollbarPlugin.destroy();
        scrollbarPlugin = null;
      }

      resizeObserver?.disconnect();

      // Clean up rendered elements
      renderingManager.clear();

      isViewportInitialized = false;
      component.emit?.("viewport:destroyed", {});
    };

    /**
     * Render items in the visible range
     */
    renderItems = (): void => {
      if (!isViewportInitialized) {
        return;
      }
      renderingManager.renderItems();
    };

    /**
     * Measure actual item size and update cache
     * (Kept for compatibility - delegates to itemSizeManager)
     */
    const measureItemSize = (element: HTMLElement, index: number): number => {
      return itemSizeManager.measureItem(element, index, orientation);
    };

    /**
     * Get current viewport information
     */
    const getViewportInfo = (): ViewportInfo => {
      const scrollPosition = scrollingManager.getScrollPosition();
      const state = virtualManager.getState();
      const visibleRange = virtualManager.calculateVisibleRange(scrollPosition);

      return {
        containerSize: state.containerSize,
        totalVirtualSize: state.totalVirtualSize,
        visibleRange,
        virtualScrollPosition: scrollPosition,
      };
    };

    /**
     * Update viewport manually
     */
    const updateViewport = (): void => {
      measureContainer();
      virtualManager.updateTotalVirtualSize(component.totalItems);
      scrollingManager.updateContainerPosition();
      scrollingManager.updateScrollbar();
      renderItems();
    };

    // Private helper functions

    /**
     * Setup scrollbar plugin integration
     */
    const setupScrollbarPlugin = (): void => {
      // Create simple adapter interface for scrollbar plugin
      const listManagerAdapter = {
        getConfig: () => ({
          container: component.element,
        }),
        subscribe: (callback: (payload: any) => void) => {
          // Simple event subscription using component events
          component.on?.("scroll:position:changed", (data: any) => {
            callback({
              event: "viewport:changed",
              data: {
                ...data,
                source: "wheel-scroll-scrollbar-update",
                scrollRatio:
                  data.position &&
                  virtualManager.getState().totalVirtualSize > 0
                    ? data.position / virtualManager.getState().totalVirtualSize
                    : 0,
              },
            });
          });

          component.on?.("dimensions:changed", (data: any) => {
            callback({
              event: "virtual:range:changed",
              data: {
                ...data,
                action: "update-scrollbar",
                source: "virtual-viewport",
                totalItems: actualTotalItems,
                itemHeight: itemSizeManager.getEstimatedItemSize(),
                totalVirtualSize:
                  data.totalVirtualSize || virtualManager.getTotalVirtualSize(),
              },
            });
          });

          return () => {}; // Unsubscribe function
        },
        emit: (event: string, data: any) => {
          if (event === "viewport:changed" && data.source === "scrollbar") {
            console.log(`🎯 [VIEWPORT] Received scrollbar event:`, data);
            // Handle scrollbar events - scroll to position
            const targetPosition = data.scrollTop || 0;
            console.log(
              `🎯 [VIEWPORT] Scrolling to position: ${targetPosition}`
            );
            scrollingManager.scrollToPosition(targetPosition);
          }
        },
      };

      // Initialize scrollbar plugin
      const scrollbarPluginInstance = createScrollbar({
        enabled: true,
        itemHeight: itemSizeManager.getEstimatedItemSize(),
        totalItems: actualTotalItems,
        totalVirtualSize: virtualManager.getTotalVirtualSize(),
      });

      scrollbarPlugin = scrollbarPluginInstance.install(listManagerAdapter, {});

      // Connect scrollbar to scrolling manager
      (scrollingManager as any).setScrollbarPlugin(scrollbarPlugin);

      console.log("📜 [VIEWPORT] Scrollbar plugin initialized and connected");
    };

    /**
     * Setup container structure with transform-based virtual scrolling
     */
    const setupContainer = (): void => {
      component.element.style.position = "relative";
      component.element.style.overflow = "hidden";

      // Create viewport container (using class expected by scrollbar plugin)
      const viewport = document.createElement("div");
      viewport.className = `mtrl-list__viewport ${component.getClass(
        "list-manager"
      )}-viewport`;
      viewport.style.cssText = `
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        overflow: hidden;
      `;

      // Store viewport reference
      viewportElement = viewport;

      // Create items container for natural item flow
      itemsContainer = document.createElement("div");
      itemsContainer.className = `${component.getClass(
        "list-manager"
      )}-viewport-items`;
      itemsContainer.style.cssText = `
        position: relative;
        width: 100%;
        will-change: contents;
      `;

      viewport.appendChild(itemsContainer);
      component.element.appendChild(viewport);

      console.log(
        "🏗️ [VIEWPORT] Container structure created with transform-based positioning"
      );

      // Set items container reference in scrolling manager and rendering manager
      (scrollingManager as any).setItemsContainer(itemsContainer);
      renderingManager.setItemsContainer(itemsContainer);

      // Initialize scrollbar plugin if enabled
      if (enableScrollbar) {
        setupScrollbarPlugin();
      }
    };

    /**
     * Setup resize observer
     */
    const setupResizeObserver = (): void => {
      resizeObserver = new ResizeObserver(() => {
        measureContainer();
        updateViewport();
      });

      // Observe the viewport element if available, otherwise the component element
      const observeElement = viewportElement || component.element;
      resizeObserver.observe(observeElement);
    };

    /**
     * Measure container dimensions
     */
    const measureContainer = (): void => {
      // Measure the actual viewport element, not the component element
      const measureElement = viewportElement || component.element;
      const newSize =
        orientation === "vertical"
          ? measureElement.offsetHeight
          : measureElement.offsetWidth;

      const currentSize = virtualManager.getState().containerSize;
      if (newSize !== currentSize) {
        virtualManager.updateState({ containerSize: newSize });
        scrollingManager.updateState({ containerSize: newSize });
        scrollingManager.updateContainerPosition();
        scrollingManager.updateScrollbar();

        component.emit?.("viewport:changed", getViewportInfo());
      }
    };

    // Initialize viewport when component initializes
    const originalInitialize = component.initialize;
    component.initialize = () => {
      originalInitialize.call(component);
      initialize();
    };

    // Destroy viewport when component destroys
    const originalDestroy = component.destroy;
    component.destroy = () => {
      destroy();
      originalDestroy.call(component);
    };

    // Viewport API
    const viewport = {
      // Virtual scrolling
      getScrollPosition: () => scrollingManager.getScrollPosition(),
      getContainerSize: () => virtualManager.getState().containerSize,
      getTotalVirtualSize: () => virtualManager.getState().totalVirtualSize,
      getVisibleRange: () =>
        virtualManager.calculateVisibleRange(
          scrollingManager.getScrollPosition()
        ),
      getViewportInfo,

      // Navigation - Visual positioning only
      scrollToPosition: scrollingManager.scrollToPosition,
      scrollToIndex: scrollingManager.scrollToIndex,

      // Item sizing
      measureItemSize,
      hasMeasuredSize: (index: number) =>
        itemSizeManager.hasMeasuredSize(index),
      getMeasuredSize: (index: number) =>
        itemSizeManager.getMeasuredSize(index),
      getEstimatedItemSize: () => itemSizeManager.getEstimatedItemSize(),

      // Rendering
      renderItems,
      updateItemPositions: renderingManager.updateItemPositions,
      getRenderedElements: renderingManager.getRenderedElements,

      // State
      getOrientation: () => orientation,
      isInitialized: () => isViewportInitialized,

      // Manual updates
      updateContainerPosition: scrollingManager.updateContainerPosition,
      updateScrollbar: scrollingManager.updateScrollbar,
      updateViewport,

      // Proactive data loading
      loadDataForRange,

      // Lifecycle
      initialize,
      destroy,
    };

    return {
      ...component,
      viewport,
    };
  };
