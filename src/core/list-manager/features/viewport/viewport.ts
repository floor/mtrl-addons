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
import { calculateViewportInfo as calculateViewportInfoUtil } from "../../utils/calculations";
import { getDefaultTemplate } from "./template";
import { createItemSizeManager, type ItemSizeManager } from "./item-size";
import { createScrollingManager, type ScrollingManager } from "./scrolling";
import { createVirtualManager, type VirtualManager } from "./virtual";

/**
 * Configuration for viewport enhancer
 */
export interface ViewportConfig {
  orientation?: "vertical" | "horizontal";
  estimatedItemSize?: number;
  overscan?: number;
  enableScrollbar?: boolean;
  loadDataForRange?: (range: { start: number; end: number }) => void;
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

    // Navigation
    scrollToIndex(index: number, alignment?: "start" | "center" | "end"): void;
    scrollToPage(page: number, alignment?: "start" | "center" | "end"): void;

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
    const estimatedItemSize = 60; // Force smaller item size for testing
    const overscan =
      config.overscan || LIST_MANAGER_CONSTANTS.VIRTUAL_SCROLL.OVERSCAN_BUFFER;
    const enableScrollbar = config.enableScrollbar !== false;

    // Items container for virtual positioning
    let itemsContainer: HTMLElement | null = null;

    // Rendered elements cache and virtual range tracking
    const renderedElements = new Map<number, HTMLElement>();
    let currentVisibleRange: ItemRange = { start: 0, end: 0 };

    // State
    let isViewportInitialized = false;
    let resizeObserver: ResizeObserver | null = null;

    // Store the correct total items value from collection layer
    let actualTotalItems = component.totalItems;

    // Item size management
    const itemSizeManager = createItemSizeManager({
      initialEstimate: estimatedItemSize,
      orientation,
      onSizeUpdated: (newTotalSize) => {
        virtualManager.updateState({ totalVirtualSize: newTotalSize });
        scrollingManager.updateScrollbar();
        component.emit?.("dimensions:changed", {
          containerSize: virtualManager.getState().containerSize,
          totalVirtualSize: newTotalSize,
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

          // Trigger collection to load missing ranges
          collection.loadMissingRanges(targetRange).catch((error: any) => {
            console.error(
              "❌ [VIEWPORT] Failed to load missing ranges:",
              error
            );
          });
        } else {
          console.log(
            `✅ [VIEWPORT] All items in range ${targetRange.start}-${targetRange.end} are already loaded`
          );
        }
      } else {
        console.log(
          `⏰ [VIEWPORT] Collection not available, trying delayed detection...`
        );
        // Try again after component layering is complete
        setTimeout(() => {
          const delayedCollection = (component as any).collection;
          const delayedHasLoadMissingRanges =
            delayedCollection &&
            typeof delayedCollection.loadMissingRanges === "function";

          console.log(
            `🔍 [VIEWPORT] Delayed collection check: hasCollection=${!!delayedCollection}, hasLoadMissingRanges=${delayedHasLoadMissingRanges}`
          );

          if (delayedHasLoadMissingRanges) {
            // Use same improved logic for delayed detection
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
              `🔍 [VIEWPORT] Delayed missing data analysis: ${missingCount} missing items`
            );

            if (missingCount > 0) {
              console.log(
                `🔄 [VIEWPORT] Delayed triggering collection load for ${missingCount} missing items in range ${targetRange.start}-${targetRange.end}`
              );
              console.log(
                `🔍 [VIEWPORT] Delayed missing indices: [${missingIndices
                  .slice(0, 10)
                  .join(", ")}${missingIndices.length > 10 ? "..." : ""}]`
              );

              // Trigger collection to load missing ranges
              delayedCollection
                .loadMissingRanges(targetRange)
                .catch((error: any) => {
                  console.error(
                    "❌ [VIEWPORT] Failed to load missing ranges (delayed):",
                    error
                  );
                });
            }
          }
        }, 10); // Small delay to allow pipe composition to complete
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

        // Save current range and force a re-render
        const previousRange = currentVisibleRange;
        currentVisibleRange = { start: -1, end: -1 }; // Force range change detection

        // Trigger renderItems which has working collection access
        setTimeout(() => {
          renderItems();
        }, 0);
      }
    };

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
      renderItems,
      () => actualTotalItems, // Pass the callback to get actual total items
      loadDataForRange // Pass the proactive data loading function
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
          // Force recalculation by resetting current range
          currentVisibleRange = { start: -1, end: -1 };
          renderItems();
        });

        component.on("range:loaded", (data: any) => {
          // For range:loaded, we need to use the actual current total items
          // This should be available as component.totalItems by now
          const currentTotal = component.totalItems;
          virtualManager.updateTotalVirtualSize(currentTotal);
          // Force recalculation by resetting current range
          currentVisibleRange = { start: -1, end: -1 };
          renderItems();
        });

        component.on("total:changed", (data: any) => {
          // Use the total from the event data instead of component.totalItems
          const newTotal = data?.total || component.totalItems;
          actualTotalItems = newTotal; // Store the correct value
          console.log(
            `📊 [VIEWPORT] Total changed event received: ${newTotal.toLocaleString()}`
          );

          virtualManager.updateTotalVirtualSize(newTotal);
          // Force recalculation by resetting current range
          currentVisibleRange = { start: -1, end: -1 };
          renderItems();
        });

        component.on("placeholders:replaced", () => {
          renderItems();
        });

        component.on("estimated-size:changed", (data: any) => {
          // Recalculate virtual size with updated estimated size
          console.log(
            `📊 [VIEWPORT] Estimated size changed, recalculating virtual size for ${actualTotalItems.toLocaleString()} items`
          );
          virtualManager.updateTotalVirtualSize(actualTotalItems);
          scrollingManager.updateScrollbar();
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
      resizeObserver?.disconnect();

      // Clean up rendered elements
      renderedElements.clear();
      if (itemsContainer) {
        itemsContainer.innerHTML = "";
      }

      isViewportInitialized = false;
      component.emit?.("viewport:destroyed", {});
    };

    /**
     * Render items in the visible range
     */
    function renderItems(): void {
      if (!itemsContainer || !isViewportInitialized) {
        return;
      }

      const newVisibleRange = virtualManager.calculateVisibleRange(
        scrollingManager.getScrollPosition()
      );

      // Skip if range hasn't changed
      if (
        newVisibleRange.start === currentVisibleRange.start &&
        newVisibleRange.end === currentVisibleRange.end
      ) {
        return;
      }

      // Check if we need to load missing data for the new visible range
      console.log(
        `🔍 [VIEWPORT] Checking range ${newVisibleRange.start}-${newVisibleRange.end} for missing data`
      );

      // Try immediate detection first
      const collection = (component as any).collection;
      const hasCollection = !!collection;
      const hasLoadMissingRanges =
        hasCollection && typeof collection.loadMissingRanges === "function";

      if (hasLoadMissingRanges) {
        // Improved missing data detection - check for null/undefined items in range
        let missingCount = 0;
        const missingIndices: number[] = [];

        for (let i = newVisibleRange.start; i <= newVisibleRange.end; i++) {
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

        if (missingCount > 0) {
          console.log(
            `🔄 [VIEWPORT] Triggering collection load for ${missingCount} missing items in range ${newVisibleRange.start}-${newVisibleRange.end}`
          );
          console.log(
            `🔍 [VIEWPORT] Missing indices: [${missingIndices
              .slice(0, 10)
              .join(", ")}${missingIndices.length > 10 ? "..." : ""}]`
          );
          console.log(
            `📊 [VIEWPORT] component.items.length: ${component.items.length}, actualTotalItems: ${actualTotalItems}`
          );

          // Trigger collection to load missing ranges
          collection.loadMissingRanges(newVisibleRange).catch((error: any) => {
            console.error(
              "❌ [VIEWPORT] Failed to load missing ranges:",
              error
            );
          });
        } else {
          console.log(
            `✅ [VIEWPORT] All items in range ${newVisibleRange.start}-${newVisibleRange.end} are already loaded`
          );
        }
      } else {
        // Try again after component layering is complete
        setTimeout(() => {
          const delayedCollection = (component as any).collection;
          const delayedHasLoadMissingRanges =
            delayedCollection &&
            typeof delayedCollection.loadMissingRanges === "function";

          if (delayedHasLoadMissingRanges) {
            // Use same improved logic for delayed detection
            let missingCount = 0;
            const missingIndices: number[] = [];

            for (let i = newVisibleRange.start; i <= newVisibleRange.end; i++) {
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

            if (missingCount > 0) {
              console.log(
                `🔄 [VIEWPORT] Delayed triggering collection load for ${missingCount} missing items in range ${newVisibleRange.start}-${newVisibleRange.end}`
              );
              console.log(
                `🔍 [VIEWPORT] Delayed missing indices: [${missingIndices
                  .slice(0, 10)
                  .join(", ")}${missingIndices.length > 10 ? "..." : ""}]`
              );

              // Trigger collection to load missing ranges
              delayedCollection
                .loadMissingRanges(newVisibleRange)
                .catch((error: any) => {
                  console.error(
                    "❌ [VIEWPORT] Failed to load missing ranges (delayed):",
                    error
                  );
                });
            }
          }
        }, 10); // Small delay to allow pipe composition to complete
      }

      // Remove elements outside the new range
      for (const [index, element] of renderedElements.entries()) {
        if (index < newVisibleRange.start || index > newVisibleRange.end) {
          element.remove();
          renderedElements.delete(index);
        }
      }

      // Render new items in range
      const newElements: { element: HTMLElement; index: number }[] = [];

      for (let i = newVisibleRange.start; i <= newVisibleRange.end; i++) {
        if (i >= component.items.length) {
          console.log(
            `⚠️ [VIEWPORT] Breaking at index ${i} - items.length: ${component.items.length}`
          );
          break;
        }

        const item = component.items[i];

        if (!item) {
          continue; // Skip empty slots - collection will load them
        }

        // Skip if already rendered
        if (renderedElements.has(i)) {
          continue;
        }

        // Create element for item
        const element = renderItem(item, i);
        if (element) {
          // Initially hide the element for measurement
          element.style.visibility = "hidden";
          element.style.position = "absolute";

          renderedElements.set(i, element);
          itemsContainer.appendChild(element);

          // Store for measurement
          newElements.push({ element, index: i });
        }
      }

      // Measure all new elements synchronously before positioning
      if (newElements.length > 0) {
        // Force a reflow to ensure all elements are laid out
        itemsContainer.offsetHeight;

        newElements.forEach(({ element, index }) => {
          itemSizeManager.measureItem(element, index);
          // Make element visible after measurement
          element.style.visibility = "visible";
        });
      }

      currentVisibleRange = newVisibleRange;

      // Position elements correctly with actual measured sizes
      updateItemPositions();

      // Emit range rendered event
      component.emit?.("range:rendered", {
        range: newVisibleRange,
        renderedCount: newElements.length,
      });
    }

    /**
     * Render a single item using the component template
     */
    const renderItem = (item: any, index: number): HTMLElement | null => {
      let template = component.template;

      // Use default template if none provided
      if (!template) {
        template = getDefaultTemplate();
      }

      try {
        const result = template(item, index);

        if (typeof result === "string") {
          // Create element from string
          const wrapper = document.createElement("div");
          wrapper.innerHTML = result;
          return wrapper.firstElementChild as HTMLElement;
        } else if (result instanceof HTMLElement) {
          return result;
        }

        return null;
      } catch (error) {
        console.error(`Error rendering item at index ${index}:`, error);
        return null;
      }
    };

    /**
     * Update positions of rendered items
     */
    const updateItemPositions = (): void => {
      if (!itemsContainer) return;

      let currentPosition = 0;

      // Calculate position for each rendered item
      for (let i = 0; i < currentVisibleRange.start; i++) {
        currentPosition += itemSizeManager.getMeasuredSize(i);
      }

      const positionLog: string[] = [];

      // Position visible items
      for (
        let i = currentVisibleRange.start;
        i <= currentVisibleRange.end;
        i++
      ) {
        const element = renderedElements.get(i);
        if (element) {
          const itemSize = itemSizeManager.getMeasuredSize(i);
          const isMeasured = itemSizeManager.hasMeasuredSize(i);

          if (orientation === "vertical") {
            element.style.position = "absolute";
            element.style.top = `${currentPosition}px`;
            element.style.left = "0";
            element.style.width = "100%";
          } else {
            element.style.position = "absolute";
            element.style.left = `${currentPosition}px`;
            element.style.top = "0";
            element.style.height = "100%";
          }

          positionLog.push(
            `${i}:${currentPosition}px(${isMeasured ? "M" : "E"}${itemSize})`
          );
          currentPosition += itemSize;
        }
      }

      if (positionLog.length > 0) {
        console.log(`📍 [VIEWPORT] Positioned items: ${positionLog.join(" ")}`);
      }
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
      return calculateViewportInfoUtil(
        scrollingManager.getScrollPosition(),
        virtualManager.getState().containerSize,
        component.totalItems,
        itemSizeManager.getEstimatedItemSize(),
        itemSizeManager.getMeasuredSizes(),
        overscan
      );
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
     * Setup container structure
     */
    const setupContainer = (): void => {
      component.element.style.position = "relative";
      component.element.style.overflow = "hidden";

      // Create items container for virtual positioning
      itemsContainer = document.createElement("div");
      itemsContainer.className = `${component.getClass("list-manager")}-items`;
      itemsContainer.style.position = "absolute";
      itemsContainer.style.top = "0";
      itemsContainer.style.left = "0";
      itemsContainer.style.width = "100%";
      itemsContainer.style.height = "100%";

      component.element.appendChild(itemsContainer);

      // Set items container reference in scrolling manager
      (scrollingManager as any).setItemsContainer(itemsContainer);
    };

    /**
     * Setup resize observer
     */
    const setupResizeObserver = (): void => {
      resizeObserver = new ResizeObserver(() => {
        measureContainer();
        updateViewport();
      });

      resizeObserver.observe(component.element);
    };

    /**
     * Measure container dimensions
     */
    const measureContainer = (): void => {
      const newSize =
        orientation === "vertical"
          ? component.element.offsetHeight
          : component.element.offsetWidth;

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

      // Navigation
      scrollToIndex: scrollingManager.scrollToIndex,
      scrollToPage: scrollingManager.scrollToPage,

      // Item sizing
      measureItemSize,
      hasMeasuredSize: (index: number) =>
        itemSizeManager.hasMeasuredSize(index),
      getMeasuredSize: (index: number) =>
        itemSizeManager.getMeasuredSize(index),
      getEstimatedItemSize: () => itemSizeManager.getEstimatedItemSize(),

      // Rendering
      renderItems,
      updateItemPositions,
      getRenderedElements: () => new Map(renderedElements),

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
