/**
 * Viewport Feature - Complete Virtual Scrolling Enhancer
 * Handles orientation, virtual scrolling, custom scrollbar, and item sizing
 */

import type {
  ListManagerComponent,
  ItemRange,
  ViewportInfo,
} from "../../types";
import { LIST_MANAGER_CONSTANTS } from "../../constants";
import {
  calculateVisibleRange as calculateVisibleRangeUtil,
  calculateContainerPosition,
  calculateScrollbarMetrics,
  calculateViewportInfo as calculateViewportInfoUtil,
  clamp,
  applyBoundaryResistance,
} from "../../utils/calculations";
import { getDefaultTemplate } from "./template";

/**
 * Configuration for viewport enhancer
 */
export interface ViewportConfig {
  orientation?: "vertical" | "horizontal";
  estimatedItemSize?: number;
  overscan?: number;
  enableScrollbar?: boolean;
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
    const estimatedItemSize =
      config.estimatedItemSize ||
      LIST_MANAGER_CONSTANTS.VIRTUAL_SCROLL.DEFAULT_ITEM_SIZE;
    const overscan =
      config.overscan || LIST_MANAGER_CONSTANTS.VIRTUAL_SCROLL.OVERSCAN_BUFFER;
    const enableScrollbar = config.enableScrollbar !== false;

    // Virtual scrolling state
    let virtualScrollPosition = 0;
    let totalVirtualSize = 0;
    let containerSize = 0;
    let currentEstimatedItemSize = estimatedItemSize;

    // Item sizing
    const measuredSizes = new Map<number, number>();

    // Custom scrollbar elements
    let scrollbarThumb: HTMLElement | null = null;
    let scrollbarTrack: HTMLElement | null = null;
    let thumbPosition = 0;
    let scrollbarVisible = false;
    let scrollbarFadeTimeout: number | null = null;

    // Items container for virtual positioning
    let itemsContainer: HTMLElement | null = null;

    // Rendered elements cache and virtual range tracking
    const renderedElements = new Map<number, HTMLElement>();
    let currentVisibleRange: ItemRange = { start: 0, end: 0 };

    // State
    let isViewportInitialized = false;
    let resizeObserver: ResizeObserver | null = null;

    // Event handlers
    const wheelEventHandler = (event: WheelEvent) => handleWheel(event);

    /**
     * Initialize viewport
     */
    const initialize = (): void => {
      if (isViewportInitialized) return;

      setupContainer();
      if (enableScrollbar) {
        setupScrollbar();
      }
      setupEventListeners();
      setupCollectionEventListeners();
      setupResizeObserver();
      measureContainer();

      isViewportInitialized = true;
      component.emit?.("viewport:initialized", { orientation, containerSize });
    };

    /**
     * Setup collection event listeners for data updates
     */
    const setupCollectionEventListeners = (): void => {
      // Listen for collection events to trigger rendering
      if (component.on) {
        component.on("items:set", () => {
          updateTotalVirtualSize();
          renderItems();
        });

        component.on("range:loaded", () => {
          updateTotalVirtualSize();
          renderItems();
        });

        component.on("total:changed", () => {
          updateTotalVirtualSize();
          renderItems();
        });

        component.on("placeholders:replaced", () => {
          renderItems();
        });
      }
    };

    /**
     * Destroy viewport
     */
    const destroy = (): void => {
      if (!isViewportInitialized) return;

      removeEventListeners();
      destroyScrollbar();
      resizeObserver?.disconnect();

      // Clean up rendered elements
      renderedElements.clear();
      if (itemsContainer) {
        itemsContainer.innerHTML = "";
      }

      if (scrollbarFadeTimeout) {
        clearTimeout(scrollbarFadeTimeout);
      }

      isViewportInitialized = false;
      component.emit?.("viewport:destroyed", {});
    };

    /**
     * Handle wheel events for virtual scrolling
     */
    const handleWheel = (event: WheelEvent): void => {
      if (!isViewportInitialized) return;

      event.preventDefault();

      const sensitivity =
        LIST_MANAGER_CONSTANTS.VIRTUAL_SCROLL.SCROLL_SENSITIVITY;
      const delta = orientation === "vertical" ? event.deltaY : event.deltaX;
      const scrollDelta = delta * sensitivity;

      const previousPosition = virtualScrollPosition;
      let newPosition = virtualScrollPosition + scrollDelta;

      // Apply boundary resistance if enabled
      const maxScroll = Math.max(0, totalVirtualSize - containerSize);
      newPosition = clamp(newPosition, 0, maxScroll);

      virtualScrollPosition = newPosition;

      // Update UI
      updateContainerPosition();
      updateScrollbar();
      showScrollbar();

      // Trigger rendering for new visible range
      renderItems();

      // Emit events
      const direction = newPosition > previousPosition ? "forward" : "backward";
      component.emit?.("scroll:position:changed", {
        position: newPosition,
        direction,
        previousPosition,
      });

      const newVisibleRange = calculateVisibleRange();
      component.emit?.("virtual:range:changed", newVisibleRange);
    };

    /**
     * Update container position for virtual scrolling
     */
    const updateContainerPosition = (): void => {
      if (!itemsContainer) return;

      const visibleRange = calculateVisibleRange();
      const offset = calculateContainerPosition(
        virtualScrollPosition,
        visibleRange,
        measuredSizes,
        currentEstimatedItemSize
      );

      const transformProperty =
        orientation === "vertical" ? "translateY" : "translateX";
      itemsContainer.style.transform = `${transformProperty}(-${offset}px)`;
    };

    /**
     * Update scrollbar thumb position and size
     */
    const updateScrollbar = (): void => {
      if (!scrollbarThumb || !scrollbarTrack || !enableScrollbar) return;

      const trackSize =
        orientation === "vertical"
          ? scrollbarTrack.offsetHeight
          : scrollbarTrack.offsetWidth;

      const { thumbPosition: newThumbPosition, thumbSize } =
        calculateScrollbarMetrics(
          virtualScrollPosition,
          totalVirtualSize,
          containerSize,
          trackSize
        );

      thumbPosition = newThumbPosition;

      // Update thumb styles
      if (orientation === "vertical") {
        scrollbarThumb.style.top = `${thumbPosition}px`;
        scrollbarThumb.style.height = `${thumbSize}px`;
      } else {
        scrollbarThumb.style.left = `${thumbPosition}px`;
        scrollbarThumb.style.width = `${thumbSize}px`;
      }
    };

    /**
     * Calculate visible range based on current scroll position
     */
    const calculateVisibleRange = (): ItemRange => {
      return calculateVisibleRangeUtil(
        virtualScrollPosition,
        containerSize,
        currentEstimatedItemSize,
        component.totalItems,
        overscan
      );
    };

    /**
     * Render items for the current visible range
     */
    const renderItems = (): void => {
      if (!itemsContainer || !component.template) return;

      const newVisibleRange = calculateVisibleRange();

      // Check if range has changed significantly
      const rangeChanged =
        newVisibleRange.start !== currentVisibleRange.start ||
        newVisibleRange.end !== currentVisibleRange.end;

      if (!rangeChanged && renderedElements.size > 0) return;

      // Remove elements outside the new range
      for (const [index, element] of renderedElements.entries()) {
        if (index < newVisibleRange.start || index > newVisibleRange.end) {
          element.remove();
          renderedElements.delete(index);
        }
      }

      // Render new items in range
      for (let i = newVisibleRange.start; i <= newVisibleRange.end; i++) {
        if (i >= component.items.length) break;

        const item = component.items[i];
        if (!item) continue; // Skip empty slots

        // Skip if already rendered
        if (renderedElements.has(i)) continue;

        // Create element for item
        const element = renderItem(item, i);
        if (element) {
          renderedElements.set(i, element);
          itemsContainer.appendChild(element);

          // Measure the element after it's in DOM
          requestAnimationFrame(() => {
            measureItemSize(element, i);
          });
        }
      }

      currentVisibleRange = newVisibleRange;

      // Position elements correctly
      updateItemPositions();

      component.emit?.("range:rendered", {
        range: newVisibleRange,
        renderedCount: renderedElements.size,
      });
    };

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
        currentPosition += measuredSizes.get(i) || currentEstimatedItemSize;
      }

      // Position visible items
      for (
        let i = currentVisibleRange.start;
        i <= currentVisibleRange.end;
        i++
      ) {
        const element = renderedElements.get(i);
        if (element) {
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

          currentPosition += measuredSizes.get(i) || currentEstimatedItemSize;
        }
      }
    };

    /**
     * Measure actual item size and update cache
     */
    const measureItemSize = (element: HTMLElement, index: number): number => {
      if (!element || index < 0) return currentEstimatedItemSize;

      const size =
        orientation === "vertical" ? element.offsetHeight : element.offsetWidth;

      if (size > 0) {
        measuredSizes.set(index, size);
        updateEstimatedSize();
        updateTotalVirtualSize();
        return size;
      }

      return currentEstimatedItemSize;
    };

    /**
     * Scroll to specific index
     */
    const scrollToIndex = (
      index: number,
      alignment: "start" | "center" | "end" = "start"
    ): void => {
      if (index < 0 || index >= component.totalItems) return;

      let targetPosition = 0;

      // Calculate position based on measured sizes
      for (let i = 0; i < index; i++) {
        targetPosition += measuredSizes.get(i) || currentEstimatedItemSize;
      }

      // Apply alignment
      if (alignment === "center") {
        const itemSize = measuredSizes.get(index) || currentEstimatedItemSize;
        targetPosition -= (containerSize - itemSize) / 2;
      } else if (alignment === "end") {
        const itemSize = measuredSizes.get(index) || currentEstimatedItemSize;
        targetPosition -= containerSize - itemSize;
      }

      // Clamp to valid range
      const maxScroll = Math.max(0, totalVirtualSize - containerSize);
      targetPosition = clamp(targetPosition, 0, maxScroll);

      virtualScrollPosition = targetPosition;
      updateContainerPosition();
      updateScrollbar();
      showScrollbar();

      component.emit?.("scroll:position:changed", {
        position: targetPosition,
        direction: "manual",
        targetIndex: index,
        alignment,
      });
    };

    /**
     * Scroll to specific page
     */
    const scrollToPage = (
      page: number,
      alignment: "start" | "center" | "end" = "start"
    ): void => {
      const pageSize = LIST_MANAGER_CONSTANTS.RANGE_LOADING.DEFAULT_RANGE_SIZE;
      const targetIndex = (page - 1) * pageSize;
      scrollToIndex(targetIndex, alignment);
    };

    /**
     * Get current viewport information
     */
    const getViewportInfo = (): ViewportInfo => {
      return calculateViewportInfoUtil(
        virtualScrollPosition,
        containerSize,
        component.totalItems,
        currentEstimatedItemSize,
        measuredSizes,
        overscan
      );
    };

    /**
     * Update viewport manually
     */
    const updateViewport = (): void => {
      measureContainer();
      updateTotalVirtualSize();
      updateContainerPosition();
      updateScrollbar();
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
    };

    /**
     * Setup custom scrollbar
     */
    const setupScrollbar = (): void => {
      if (!enableScrollbar) return;

      // Create scrollbar track
      scrollbarTrack = document.createElement("div");
      scrollbarTrack.className = `${component.getClass(
        "list-manager"
      )}-scrollbar-track`;
      scrollbarTrack.style.position = "absolute";
      scrollbarTrack.style.backgroundColor = "rgba(0, 0, 0, 0.1)";
      scrollbarTrack.style.borderRadius = `${LIST_MANAGER_CONSTANTS.SCROLLBAR.BORDER_RADIUS}px`;
      scrollbarTrack.style.opacity = "0";
      scrollbarTrack.style.transition = "opacity 0.2s ease";

      // Create scrollbar thumb
      scrollbarThumb = document.createElement("div");
      scrollbarThumb.className = `${component.getClass(
        "list-manager"
      )}-scrollbar-thumb`;
      scrollbarThumb.style.position = "absolute";
      scrollbarThumb.style.backgroundColor = "rgba(0, 0, 0, 0.4)";
      scrollbarThumb.style.borderRadius = `${LIST_MANAGER_CONSTANTS.SCROLLBAR.BORDER_RADIUS}px`;
      scrollbarThumb.style.cursor = "pointer";

      // Position scrollbar based on orientation
      if (orientation === "vertical") {
        scrollbarTrack.style.right = "2px";
        scrollbarTrack.style.top = "0";
        scrollbarTrack.style.bottom = "0";
        scrollbarTrack.style.width = `${LIST_MANAGER_CONSTANTS.SCROLLBAR.TRACK_WIDTH}px`;

        scrollbarThumb.style.left = "0";
        scrollbarThumb.style.right = "0";
        scrollbarThumb.style.minHeight = `${LIST_MANAGER_CONSTANTS.SCROLLBAR.THUMB_MIN_SIZE}px`;
      } else {
        scrollbarTrack.style.bottom = "2px";
        scrollbarTrack.style.left = "0";
        scrollbarTrack.style.right = "0";
        scrollbarTrack.style.height = `${LIST_MANAGER_CONSTANTS.SCROLLBAR.TRACK_WIDTH}px`;

        scrollbarThumb.style.top = "0";
        scrollbarThumb.style.bottom = "0";
        scrollbarThumb.style.minWidth = `${LIST_MANAGER_CONSTANTS.SCROLLBAR.THUMB_MIN_SIZE}px`;
      }

      scrollbarTrack.appendChild(scrollbarThumb);
      component.element.appendChild(scrollbarTrack);

      setupScrollbarEvents();
    };

    /**
     * Setup scrollbar drag events
     */
    const setupScrollbarEvents = (): void => {
      if (!scrollbarThumb || !scrollbarTrack) return;

      let isDragging = false;
      let startY = 0;
      let startX = 0;
      let startScrollPosition = 0;

      const handleMouseDown = (e: MouseEvent) => {
        isDragging = true;
        startY = e.clientY;
        startX = e.clientX;
        startScrollPosition = virtualScrollPosition;

        document.addEventListener("mousemove", handleMouseMove);
        document.addEventListener("mouseup", handleMouseUp);
        e.preventDefault();
      };

      const handleMouseMove = (e: MouseEvent) => {
        if (!isDragging) return;

        const trackSize =
          orientation === "vertical"
            ? scrollbarTrack!.offsetHeight
            : scrollbarTrack!.offsetWidth;

        const delta =
          orientation === "vertical" ? e.clientY - startY : e.clientX - startX;

        const scrollRatio = delta / trackSize;
        const maxScroll = Math.max(0, totalVirtualSize - containerSize);
        const newPosition = startScrollPosition + scrollRatio * maxScroll;

        virtualScrollPosition = clamp(newPosition, 0, maxScroll);
        updateContainerPosition();
        updateScrollbar();

        component.emit?.("scroll:position:changed", {
          position: virtualScrollPosition,
          direction: newPosition > startScrollPosition ? "forward" : "backward",
          source: "scrollbar",
        });
      };

      const handleMouseUp = () => {
        isDragging = false;
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };

      scrollbarThumb.addEventListener("mousedown", handleMouseDown);
    };

    /**
     * Setup event listeners
     */
    const setupEventListeners = (): void => {
      component.element.addEventListener("wheel", wheelEventHandler, {
        passive: false,
      });
    };

    /**
     * Remove event listeners
     */
    const removeEventListeners = (): void => {
      component.element.removeEventListener("wheel", wheelEventHandler);
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

      if (newSize !== containerSize) {
        containerSize = newSize;
        updateContainerPosition();
        updateScrollbar();

        component.emit?.("viewport:changed", getViewportInfo());
      }
    };

    /**
     * Show scrollbar with fade timeout
     */
    const showScrollbar = (): void => {
      if (!scrollbarTrack || !enableScrollbar) return;

      scrollbarTrack.style.opacity = "1";
      scrollbarVisible = true;

      // Clear existing timeout
      if (scrollbarFadeTimeout) {
        clearTimeout(scrollbarFadeTimeout);
      }

      // Set new fade timeout
      scrollbarFadeTimeout = window.setTimeout(() => {
        if (scrollbarTrack) {
          scrollbarTrack.style.opacity = "0";
          scrollbarVisible = false;
        }
      }, LIST_MANAGER_CONSTANTS.SCROLLBAR.FADE_TIMEOUT);
    };

    /**
     * Destroy scrollbar
     */
    const destroyScrollbar = (): void => {
      if (scrollbarTrack) {
        scrollbarTrack.remove();
        scrollbarTrack = null;
        scrollbarThumb = null;
      }
    };

    /**
     * Update total virtual size
     */
    const updateTotalVirtualSize = (): void => {
      let newTotalSize = 0;

      for (let i = 0; i < component.totalItems; i++) {
        newTotalSize += measuredSizes.get(i) || currentEstimatedItemSize;
      }

      if (newTotalSize !== totalVirtualSize) {
        totalVirtualSize = newTotalSize;
        updateScrollbar();

        component.emit?.("dimensions:changed", {
          containerSize,
          totalVirtualSize,
          estimatedItemSize: currentEstimatedItemSize,
        });
      }
    };

    /**
     * Update estimated item size based on measured sizes
     */
    const updateEstimatedSize = (): void => {
      if (measuredSizes.size === 0) return;

      const sizes = Array.from(measuredSizes.values());
      const average = sizes.reduce((sum, size) => sum + size, 0) / sizes.length;

      currentEstimatedItemSize = Math.max(1, Math.round(average));
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
      getScrollPosition: () => virtualScrollPosition,
      getContainerSize: () => containerSize,
      getTotalVirtualSize: () => totalVirtualSize,
      getVisibleRange: calculateVisibleRange,
      getViewportInfo,

      // Navigation
      scrollToIndex,
      scrollToPage,

      // Item sizing
      measureItemSize,
      hasMeasuredSize: (index: number) => measuredSizes.has(index),
      getMeasuredSize: (index: number) =>
        measuredSizes.get(index) || currentEstimatedItemSize,
      getEstimatedItemSize: () => currentEstimatedItemSize,

      // Rendering
      renderItems,
      updateItemPositions,
      getRenderedElements: () => new Map(renderedElements),

      // State
      getOrientation: () => orientation,
      isInitialized: () => isViewportInitialized,

      // Manual updates
      updateContainerPosition,
      updateScrollbar,
      updateViewport,
    };

    return {
      ...component,
      viewport,
    };
  };
