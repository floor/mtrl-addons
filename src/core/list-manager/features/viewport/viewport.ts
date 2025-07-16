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

          // Use loading coordinator via loadDataForRange callback
          if (config.loadDataForRange) {
            console.log(
              `📡 [VIEWPORT] Using loading coordinator for range ${targetRange.start}-${targetRange.end}`
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
      } else if (
        LIST_MANAGER_CONSTANTS.VIEWPORT.ENABLE_DEFERRED_COLLECTION_DETECTION
      ) {
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

              // Use loading coordinator via loadDataForRange callback
              if (config.loadDataForRange) {
                console.log(
                  `📡 [VIEWPORT] Using loading coordinator for delayed load ${targetRange.start}-${targetRange.end}`
                );
                config.loadDataForRange(targetRange);
              } else {
                // Fallback to direct collection call
                delayedCollection
                  .loadMissingRanges(targetRange)
                  .catch((error: any) => {
                    console.error(
                      "❌ [VIEWPORT] Failed to load missing ranges:",
                      error
                    );
                  });
              }
            }
          }
        }, LIST_MANAGER_CONSTANTS.VIEWPORT.DEFERRED_COLLECTION_DETECTION_DELAY); // Small delay to allow pipe composition to complete
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
      loadDataForRange, // Pass the proactive data loading function
      () => virtualManager.getHeightCapInfo(), // Pass height cap info getter
      (index: number) => virtualManager.calculateVirtualPositionForIndex(index) // Pass position calculator
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
          // Force recalculation by resetting current range
          currentVisibleRange = { start: -1, end: -1 };
          renderItems();
        });

        component.on("range:loaded", (data: any) => {
          // Use actualTotalItems which maintains the correct total (1M) instead of
          // component.totalItems which may be temporarily reset during data loading
          virtualManager.updateTotalVirtualSize(actualTotalItems);
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

          // Update scrollbar plugin
          if (scrollbarPlugin && scrollbarPlugin.setTotalItems) {
            scrollbarPlugin.setTotalItems(newTotal);
          }

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

      // Always update item positions when scrolling, even if range hasn't changed
      // This ensures smooth scrolling without snapping
      const rangeChanged =
        newVisibleRange.start !== currentVisibleRange.start ||
        newVisibleRange.end !== currentVisibleRange.end;

      // Update positions even if range hasn't changed
      if (!rangeChanged) {
        updateItemPositions();
        return;
      }

      // Proactively load data for visible range AND upcoming ranges
      console.log(
        `🔍 [VIEWPORT] Checking range ${newVisibleRange.start}-${newVisibleRange.end} for missing data`
      );

      // Try immediate detection first
      const collection = (component as any).collection;
      const hasCollection = !!collection;
      const hasLoadMissingRanges =
        hasCollection && typeof collection.loadMissingRanges === "function";

      console.log(
        `🔍 [VIEWPORT] Collection check: hasCollection=${hasCollection}, hasLoadMissingRanges=${hasLoadMissingRanges}, items.length=${component.items.length}, actualTotalItems=${actualTotalItems}`
      );

      // Calculate extended range for proactive loading
      const itemsPerViewport = Math.ceil(
        virtualManager.getState().containerSize /
          itemSizeManager.getEstimatedItemSize()
      );

      // DISABLED PREFETCH: Set to 0 to avoid loading wrong ranges
      // TODO: Fix the range calculation before re-enabling prefetch
      const prefetchBuffer = 0; // Was: Math.ceil(itemsPerViewport * 2);
      const extendedRange = {
        start: Math.max(0, newVisibleRange.start - prefetchBuffer),
        end: Math.min(
          actualTotalItems - 1,
          newVisibleRange.end + prefetchBuffer
        ),
      };

      if (hasLoadMissingRanges) {
        // Check for missing data in visible range first (priority)
        let visibleMissingCount = 0;
        const visibleMissingIndices: number[] = [];

        for (let i = newVisibleRange.start; i <= newVisibleRange.end; i++) {
          if (i >= actualTotalItems) break;

          const itemExists =
            i < component.items.length &&
            component.items[i] !== null &&
            component.items[i] !== undefined;

          if (!itemExists) {
            visibleMissingCount++;
            visibleMissingIndices.push(i);
          }
        }

        // Check for missing data in extended range (proactive loading)
        let extendedMissingCount = 0;
        const extendedMissingIndices: number[] = [];

        for (let i = extendedRange.start; i <= extendedRange.end; i++) {
          if (i >= actualTotalItems) break;

          // Skip items already counted in visible range
          if (i >= newVisibleRange.start && i <= newVisibleRange.end) continue;

          const itemExists =
            i < component.items.length &&
            component.items[i] !== null &&
            component.items[i] !== undefined;

          if (!itemExists) {
            extendedMissingCount++;
            extendedMissingIndices.push(i);
          }
        }

        // Load visible range with high priority
        if (visibleMissingCount > 0) {
          console.log(
            `🔄 [VIEWPORT] Loading ${visibleMissingCount} missing visible items in range ${newVisibleRange.start}-${newVisibleRange.end}`
          );
          console.log(
            `🔍 [VIEWPORT] Visible missing indices: [${visibleMissingIndices
              .slice(0, 10)
              .join(", ")}${visibleMissingIndices.length > 10 ? "..." : ""}]`
          );

          // Trigger collection to load missing visible ranges (high priority)
          collection.loadMissingRanges(newVisibleRange).catch((error: any) => {
            console.error(
              "❌ [VIEWPORT] Failed to load visible ranges:",
              error
            );
          });
        }

        // Load extended range with lower priority (proactive)
        // Skip if prefetch is disabled (prefetchBuffer === 0)
        if (extendedMissingCount > 0 && prefetchBuffer > 0) {
          console.log(
            `🚀 [VIEWPORT] Proactively loading ${extendedMissingCount} missing items in extended range ${extendedRange.start}-${extendedRange.end}`
          );
          console.log(
            `🔍 [VIEWPORT] Extended missing indices: [${extendedMissingIndices
              .slice(0, 10)
              .join(", ")}${extendedMissingIndices.length > 10 ? "..." : ""}]`
          );

          // Use loading coordinator for proactive loads
          if (config.loadDataForRange) {
            console.log(
              `📡 [VIEWPORT] Using loading coordinator for extended range ${extendedRange.start}-${extendedRange.end}`
            );
            config.loadDataForRange(extendedRange);
          } else {
            // Fallback to direct collection call
            collection.loadMissingRanges(extendedRange).catch((error: any) => {
              console.error(
                "❌ [VIEWPORT] Failed to load extended range:",
                error
              );
            });
          }
        }

        if (visibleMissingCount === 0 && extendedMissingCount === 0) {
          console.log(
            `✅ [VIEWPORT] All items in visible range ${newVisibleRange.start}-${newVisibleRange.end} and extended range ${extendedRange.start}-${extendedRange.end} are loaded`
          );
        }
      } else if (
        LIST_MANAGER_CONSTANTS.VIEWPORT.ENABLE_DEFERRED_COLLECTION_DETECTION
      ) {
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
        }, LIST_MANAGER_CONSTANTS.VIEWPORT.DEFERRED_COLLECTION_DETECTION_DELAY); // Small delay to allow pipe composition to complete
      }

      // Recycle out-of-range items
      const buffer = overscan; // Reduced from overscan * 2 for fewer DOM elements
      const recycleStart = newVisibleRange.start - buffer;
      const recycleEnd = newVisibleRange.end + buffer;

      for (const [index, element] of renderedElements) {
        if (index < recycleStart || index > recycleEnd) {
          // Remove from DOM
          element.remove();
          renderedElements.delete(index);
        }
      }

      console.log(
        `♻️ [VIEWPORT] Removed out-of-range elements, renderedElements now: ${renderedElements.size}`
      );

      // Render new items
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
          continue; // Skip empty slots
        }

        // Skip if already rendered
        if (renderedElements.has(i)) {
          continue;
        }

        // Create element
        const element = renderItem(item, i);
        if (element) {
          itemsContainer.appendChild(element);
          renderedElements.set(i, element);
          newElements.push({ element, index: i });
        }
      }

      // Measure new elements
      if (newElements.length > 0) {
        // Force reflow
        itemsContainer.offsetHeight;

        newElements.forEach(({ element, index }) => {
          // Only measure if we don't already have a measurement
          if (!itemSizeManager.hasMeasuredSize(index)) {
            itemSizeManager.measureItem(element, index);
          }
          element.style.visibility = "visible";
        });
      }

      currentVisibleRange = newVisibleRange;

      // Position all visible items with transforms
      updateItemPositions();

      // Emit event
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
        let element: HTMLElement;

        // Always create fresh element from template
        const result = template(item, index);
        if (typeof result === "string") {
          const wrapper = document.createElement("div");
          wrapper.innerHTML = result;
          element = wrapper.firstElementChild as HTMLElement;
        } else if (result instanceof HTMLElement) {
          element = result;
        } else {
          return null;
        }

        // Apply base styles for virtual positioning
        element.style.position = "absolute";
        element.style.left = "0";
        element.style.right = "0"; // For vertical, full width
        element.style.boxSizing = "border-box";
        element.style.willChange = "transform";
        element.style.visibility = "visible"; // Make visible immediately

        if (orientation === "horizontal") {
          element.style.top = "0";
          element.style.bottom = "0"; // Full height for horizontal
          element.style.width = `${itemSizeManager.getEstimatedItemSize()}px`; // Initial width
        } else {
          element.style.height = `${itemSizeManager.getEstimatedItemSize()}px`; // Initial height
          element.style.width = "100%";
        }

        return element;
      } catch (error) {
        console.error(`Error rendering item at index ${index}:`, error);
        return null;
      }
    };

    /**
     * Update item positioning using traditional virtual scrolling approach
     */
    const updateItemPositions = (): void => {
      if (!itemsContainer) return;

      const isHorizontal = orientation === "horizontal";
      const axis = isHorizontal ? "X" : "Y";

      // Get the current scroll position
      const scrollPosition = scrollingManager.getScrollPosition();

      // Get height cap info to handle virtual position mapping
      const heightCapInfo = virtualManager.getHeightCapInfo();
      const isVirtualSizeCapped = heightCapInfo.isVirtualSizeCapped;
      const compressionRatio = heightCapInfo.compressionRatio;

      // If using virtual size capping, we need to map the scroll position
      let effectiveScrollPosition = scrollPosition;
      if (isVirtualSizeCapped) {
        // Convert virtual scroll position back to actual position
        effectiveScrollPosition = scrollPosition / compressionRatio;
      }

      // Position each rendered item based on its absolute position
      renderedElements.forEach((element, index) => {
        if (!element) return;

        // Calculate the absolute position for this item
        let absolutePosition = 0;
        for (let i = 0; i < index; i++) {
          absolutePosition +=
            itemSizeManager.getMeasuredSize(i) ||
            itemSizeManager.getEstimatedItemSize();
        }

        // Get measured size for this item
        const size =
          itemSizeManager.getMeasuredSize(index) ||
          itemSizeManager.getEstimatedItemSize();

        // Position item absolutely within container, offset by scroll position
        // This creates the scrolling effect
        const position = absolutePosition - effectiveScrollPosition;

        element.style.position = "absolute";
        element.style.transform = `translate${axis}(${position}px)`;
        element.style.visibility = "visible"; // Ensure item is visible

        // Update dimensions
        if (isHorizontal) {
          element.style.width = `${size}px`;
          element.style.height = "100%";
          element.style.top = "0";
        } else {
          element.style.height = `${size}px`;
          element.style.width = "100%";
          element.style.left = "0";
        }
      });

      // Don't set container size to virtual size - keep it minimal
      // The scrollbar will handle the virtual size representation
      if (isHorizontal) {
        itemsContainer.style.width = "100%";
        itemsContainer.style.height = "100%";
      } else {
        itemsContainer.style.height = "100%";
        itemsContainer.style.width = "100%";
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
              event: "VIEWPORT_CHANGED",
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
              event: "VIRTUAL_RANGE_CHANGED",
              data: {
                ...data,
                action: "update-scrollbar",
                source: "virtual-viewport",
                totalItems: actualTotalItems,
                itemHeight: itemSizeManager.getEstimatedItemSize(),
              },
            });
          });

          return () => {}; // Unsubscribe function
        },
        emit: (event: string, data: any) => {
          if (event === "VIEWPORT_CHANGED" && data.source === "scrollbar") {
            // Handle scrollbar events - scroll to position
            const targetPosition = data.scrollTop || 0;
            scrollingManager.scrollToPosition(targetPosition);
          }
        },
      };

      // Initialize scrollbar plugin
      const scrollbarPluginInstance = createScrollbar({
        enabled: true,
        itemHeight: itemSizeManager.getEstimatedItemSize(),
        totalItems: actualTotalItems,
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

      // Set items container reference in scrolling manager
      (scrollingManager as any).setItemsContainer(itemsContainer);

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
