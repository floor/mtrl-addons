import type { ListManagerPlugin, VirtualItem } from "../../types";
import { ListManagerEvents } from "../../types";
import { CLASSES, ATTRIBUTES, LOGGING } from "../../constants";

/**
 * Virtual viewport configuration
 */
export interface VirtualViewportConfig {
  itemHeight: number;
  estimatedItemHeight?: number;
  overscan?: number;
  bufferSize?: number;
  prefix?: string;
  debug?: boolean;
}

/**
 * Virtual viewport plugin designed specifically for custom scrollbar
 * No native scrolling, no spacers, purely virtual positioning
 */
export const virtualViewport = (
  config: VirtualViewportConfig
): ListManagerPlugin => ({
  name: "virtual-viewport",
  version: "1.0.0",
  dependencies: ["scrollbar"], // Depends on custom scrollbar

  install: (listManager, pluginConfig) => {
    // Configuration with defaults
    const defaults = {
      itemHeight: 50,
      estimatedItemHeight: 50,
      overscan: 5,
      bufferSize: 2,
      prefix: "mtrl",
      debug: false,
    };
    const viewportConfig = {
      ...defaults,
      ...config,
      ...(pluginConfig || {}),
    };

    // Viewport state
    let items: VirtualItem[] = [];
    let totalDatasetSize = 0; // Total dataset size (e.g., 1M items)
    let visibleRange = { start: 0, end: 0, count: 0 };
    let renderRange = { start: 0, end: 0, count: 0 };
    let viewportHeight = 400; // Default, will be updated
    let currentScrollTop = 0; // Track current scroll position
    let isDestroyed = false;

    /**
     * Debug logging
     */
    const debugLog = (message: string, ...args: any[]) => {
      if (viewportConfig.debug) {
        console.log(`🎯 [VIRTUAL-VIEWPORT] ${message}`, ...args);
      }
    };

    // Get container and viewport elements
    const listManagerConfig = listManager.getConfig?.();
    if (!listManagerConfig?.container) {
      throw new Error("Virtual viewport requires a container element");
    }

    const containerElement =
      typeof listManagerConfig.container === "string"
        ? (document.querySelector(listManagerConfig.container) as HTMLElement)
        : listManagerConfig.container;

    if (!containerElement) {
      throw new Error("Container element not found");
    }

    // Find existing mtrl-list__viewport (created by rendering plugin)
    const viewport = containerElement.querySelector(
      `.${viewportConfig.prefix}-list__viewport`
    ) as HTMLElement;

    if (!viewport) {
      throw new Error(
        "mtrl-list__viewport not found. Ensure rendering plugin runs before virtualViewport."
      );
    }

    // Configure viewport for pure virtual scrolling (no native scrolling)
    viewport.style.overflow = "hidden"; // No native scrolling
    viewport.style.position = "relative";
    viewport.style.height = "100%";

    // Update viewport height
    const updateViewportHeight = () => {
      viewportHeight = viewport.clientHeight;
      debugLog(`Viewport height updated: ${viewportHeight}px`);
    };

    // Initial height
    updateViewportHeight();

    debugLog(
      `✅ Virtual viewport initialized with pure virtual scrolling (wheel events + custom scrollbar)`
    );

    /**
     * Calculate visible range based on virtual scroll position
     */
    const calculateVisibleRange = (virtualScrollTop: number) => {
      if (totalDatasetSize === 0) {
        return { start: 0, end: 0, count: 0 };
      }

      const itemHeight = viewportConfig.itemHeight;
      const startIndex = Math.floor(virtualScrollTop / itemHeight);
      const visibleItemCount = Math.ceil(viewportHeight / itemHeight);
      const endIndex = Math.min(
        startIndex + visibleItemCount + viewportConfig.overscan,
        totalDatasetSize - 1 // Use total dataset size, not loaded items
      );

      return {
        start: Math.max(0, startIndex),
        end: Math.max(0, endIndex),
        count: Math.max(0, endIndex - startIndex + 1),
      };
    };

    /**
     * Calculate render range with buffer around visible range
     */
    const calculateRenderRange = (visibleRange: any) => {
      const bufferSize = viewportConfig.bufferSize;
      const start = Math.max(0, visibleRange.start - bufferSize);
      const end = Math.min(totalDatasetSize - 1, visibleRange.end + bufferSize);

      return {
        start,
        end,
        count: Math.max(0, end - start + 1),
      };
    };

    /**
     * Position items in viewport using transforms
     */
    const positionItems = (
      itemElements: HTMLElement[],
      range: any,
      virtualScrollTop: number = 0
    ) => {
      const itemHeight = viewportConfig.itemHeight;

      itemElements.forEach((element, index) => {
        const actualIndex = range.start + index;
        const virtualPosition = actualIndex * itemHeight;
        const transformPosition = virtualPosition - virtualScrollTop;

        element.style.position = "absolute";
        element.style.top = "0";
        element.style.left = "0";
        element.style.right = "0";
        element.style.height = `${itemHeight}px`;
        element.style.transform = `translateY(${transformPosition}px)`;

        element.setAttribute(ATTRIBUTES.VIRTUAL_INDEX, actualIndex.toString());
        element.setAttribute(
          "data-virtual-position",
          virtualPosition.toString()
        );
        element.setAttribute(
          "data-transform-position",
          transformPosition.toString()
        );
      });

      debugLog(
        `Positioned ${itemElements.length} items at virtual scroll ${virtualScrollTop}px`
      );
    };

    /**
     * Handle custom scrollbar viewport change events
     */
    const handleViewportChange = (payload: any) => {
      debugLog(`Received event: ${JSON.stringify(payload)}`);

      if (isDestroyed) {
        debugLog("Viewport destroyed, ignoring event");
        return;
      }

      if (payload.source !== "scrollbar") {
        debugLog(`Ignoring event from source: ${payload.source}`);
        return;
      }

      const virtualScrollTop = payload.scrollTop || 0;
      currentScrollTop = virtualScrollTop; // Track current scroll position

      debugLog(
        `Processing scrollbar event: scrollTop=${virtualScrollTop}px, action=${payload.action}`
      );

      const newVisibleRange = calculateVisibleRange(virtualScrollTop);
      const newRenderRange = calculateRenderRange(newVisibleRange);

      debugLog(
        `Calculated ranges - visible: ${newVisibleRange.start}-${newVisibleRange.end}, render: ${newRenderRange.start}-${newRenderRange.end}`
      );

      // Check if ranges changed
      const visibleChanged =
        newVisibleRange.start !== visibleRange.start ||
        newVisibleRange.end !== visibleRange.end;
      const renderChanged =
        newRenderRange.start !== renderRange.start ||
        newRenderRange.end !== renderRange.end;

      if (visibleChanged || renderChanged) {
        visibleRange = newVisibleRange;
        renderRange = newRenderRange;

        debugLog(
          `Viewport changed - visible: ${visibleRange.start}-${visibleRange.end}, render: ${renderRange.start}-${renderRange.end}`
        );

        // Emit viewport change event for rendering system
        listManager.emit(ListManagerEvents.VIEWPORT_CHANGED, {
          scrollTop: virtualScrollTop,
          visibleRange,
          renderRange,
          source: "virtual-viewport",
        });

        // For drag-end events, also emit virtual:range:changed to trigger data loading
        if (payload.action === "drag-end") {
          debugLog(`Emitting virtual:range:changed for drag-end event`);
          listManager.emit(ListManagerEvents.VIRTUAL_RANGE_CHANGED, {
            visibleRange,
            renderRange,
            scrollTop: virtualScrollTop,
            source: "virtual-viewport",
            action: "drag-end",
          });
        }
      } else {
        debugLog("No range changes, skipping emit");

        // Even if ranges didn't change, emit virtual:range:changed for drag-end
        // This ensures orchestration can check if data needs loading
        if (payload.action === "drag-end") {
          debugLog(
            `Emitting virtual:range:changed for drag-end event (no range change)`
          );
          listManager.emit(ListManagerEvents.VIRTUAL_RANGE_CHANGED, {
            visibleRange,
            renderRange,
            scrollTop: virtualScrollTop,
            source: "virtual-viewport",
            action: "drag-end",
          });
        }
      }
    };

    /**
     * Handle mouse wheel events for virtual scrolling
     */
    const handleWheelEvent = (event: WheelEvent) => {
      if (isDestroyed) return;

      event.preventDefault(); // Prevent native scrolling

      // Calculate scroll delta (pixels to scroll)
      const wheelDelta = event.deltaY; // Positive = scroll down, negative = scroll up
      const scrollSpeed = 3; // Multiplier for scroll sensitivity
      const deltaScrollTop = wheelDelta * scrollSpeed;

      // Update current virtual scroll position
      const maxVirtualHeight = Math.max(
        0,
        totalDatasetSize * viewportConfig.itemHeight - viewportHeight
      );
      const newVirtualScrollTop = Math.max(
        0,
        Math.min(maxVirtualHeight, currentScrollTop + deltaScrollTop)
      );

      // Only proceed if position actually changed
      if (newVirtualScrollTop === currentScrollTop) return;

      currentScrollTop = newVirtualScrollTop;

      debugLog(
        `Wheel scroll: delta=${wheelDelta}, newPosition=${currentScrollTop}px (max: ${maxVirtualHeight}px, dataset: ${totalDatasetSize})`
      );

      // Calculate new ranges based on virtual position
      const newVisibleRange = calculateVisibleRange(currentScrollTop);
      const newRenderRange = calculateRenderRange(newVisibleRange);

      // Check if ranges changed
      const visibleChanged =
        newVisibleRange.start !== visibleRange.start ||
        newVisibleRange.end !== visibleRange.end;
      const renderChanged =
        newRenderRange.start !== renderRange.start ||
        newRenderRange.end !== renderRange.end;

      if (visibleChanged || renderChanged) {
        visibleRange = newVisibleRange;
        renderRange = newRenderRange;

        debugLog(
          `Wheel scroll viewport changed - visible: ${visibleRange.start}-${visibleRange.end}, render: ${renderRange.start}-${renderRange.end}`
        );

        // Emit viewport change event for rendering system
        listManager.emit(ListManagerEvents.VIEWPORT_CHANGED, {
          scrollTop: currentScrollTop,
          visibleRange,
          renderRange,
          source: "wheel-scroll",
        });

        // Emit virtual:range:changed to trigger data loading if needed
        listManager.emit(ListManagerEvents.VIRTUAL_RANGE_CHANGED, {
          visibleRange,
          renderRange,
          scrollTop: currentScrollTop,
          source: "wheel-scroll",
          action: "scroll",
        });

        // Update scrollbar position to reflect wheel scroll
        updateScrollbarPosition();
      }
    };

    /**
     * Update scrollbar position based on current virtual scroll position
     */
    const updateScrollbarPosition = () => {
      if (totalDatasetSize === 0) return;

      const maxVirtualHeight = Math.max(
        0,
        totalDatasetSize * viewportConfig.itemHeight - viewportHeight
      );
      const scrollRatio =
        maxVirtualHeight > 0 ? currentScrollTop / maxVirtualHeight : 0;

      // Emit event to update scrollbar position
      listManager.emit(ListManagerEvents.VIEWPORT_CHANGED, {
        scrollTop: currentScrollTop,
        scrollRatio: scrollRatio,
        source: "wheel-scroll-scrollbar-update",
      });

      debugLog(
        `Updated scrollbar position: ratio=${scrollRatio}, scrollTop=${currentScrollTop}px`
      );
    };

    // Subscribe to custom scrollbar events
    debugLog("Subscribing to list manager events");
    const unsubscribe = listManager.subscribe((payload: any) => {
      debugLog(
        `🎯 [VIRTUAL-VIEWPORT] Received list manager event: ${
          payload.event
        } from ${payload.source || payload.data?.source || "unknown"}`
      );

      if (payload.event === ListManagerEvents.VIEWPORT_CHANGED) {
        // Check if this is from scrollbar
        const eventData = payload.data || payload;
        if (eventData.source === "scrollbar") {
          debugLog(
            `🎯 [VIRTUAL-VIEWPORT] Processing SCROLLBAR event: ${JSON.stringify(
              eventData
            )}`
          );
          handleViewportChange(eventData);
        } else {
          debugLog(
            `🎯 [VIRTUAL-VIEWPORT] Ignoring non-scrollbar event from: ${eventData.source}`
          );
        }
      }
    });

    // Add wheel event listener for virtual scrolling
    debugLog("Adding wheel event listener for virtual scrolling");
    viewport.addEventListener("wheel", handleWheelEvent, { passive: false });

    // Setup resize observer for viewport height changes
    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined") {
      resizeObserver = new ResizeObserver(() => {
        updateViewportHeight();
        // Recalculate ranges with current scroll position
        // We'll need to get this from the scrollbar plugin
      });
      resizeObserver.observe(viewport);
    }

    // Return virtual viewport API
    return {
      // Core viewport methods
      setItems(newItems: VirtualItem[]): void {
        items = [...newItems];
        debugLog(
          `✅ SETITEMS: ${items.length} actual items loaded (total dataset: ${totalDatasetSize}), current scroll: ${currentScrollTop}px`
        );

        // Only recalculate ranges if we have a valid total dataset size
        if (totalDatasetSize > 0) {
          // Recalculate ranges with current scroll position using total dataset size
          const newVisibleRange = calculateVisibleRange(currentScrollTop);
          const newRenderRange = calculateRenderRange(newVisibleRange);

          visibleRange = newVisibleRange;
          renderRange = newRenderRange;

          debugLog(
            `After setItems - visible: ${visibleRange.start}-${visibleRange.end}, render: ${renderRange.start}-${renderRange.end} (dataset: ${totalDatasetSize})`
          );

          // Emit virtual:range:changed event to notify orchestration
          const eventData = {
            visibleRange,
            renderRange,
            scrollTop: currentScrollTop,
            source: "virtual-viewport",
            action: "setItems",
          };

          debugLog(`Emitting virtual:range:changed for setItems:`, eventData);
          listManager.emit(ListManagerEvents.VIRTUAL_RANGE_CHANGED, eventData);
        } else {
          debugLog(
            `No total dataset size set yet - skipping range calculation`
          );
        }
      },

      setTotalDatasetSize(size: number): void {
        totalDatasetSize = size;
        debugLog(`✅ TOTAL DATASET SIZE SET: ${totalDatasetSize} items`);

        // Recalculate ranges with new total size
        const newVisibleRange = calculateVisibleRange(currentScrollTop);
        const newRenderRange = calculateRenderRange(newVisibleRange);

        visibleRange = newVisibleRange;
        renderRange = newRenderRange;

        debugLog(
          `After setTotalDatasetSize - visible: ${visibleRange.start}-${visibleRange.end}, render: ${renderRange.start}-${renderRange.end}`
        );

        // Emit virtual:range:changed event to notify orchestration
        const eventData = {
          visibleRange,
          renderRange,
          scrollTop: currentScrollTop,
          source: "virtual-viewport",
          action: "setTotalDatasetSize",
        };

        debugLog(
          `Emitting virtual:range:changed for setTotalDatasetSize:`,
          eventData
        );
        listManager.emit(ListManagerEvents.VIRTUAL_RANGE_CHANGED, eventData);
      },

      getVisibleRange() {
        return {
          start: visibleRange.start,
          end: visibleRange.end,
          startIndex: visibleRange.start,
          endIndex: visibleRange.end,
        };
      },

      getRenderRange() {
        return {
          start: renderRange.start,
          end: renderRange.end,
          startIndex: renderRange.start,
          endIndex: renderRange.end,
        };
      },

      getViewportInfo() {
        return {
          scrollTop: 0, // Virtual scroll position managed by custom scrollbar
          scrollLeft: 0,
          containerHeight: viewportHeight,
          containerWidth: viewport.clientWidth,
          totalHeight: items.length * viewportConfig.itemHeight,
          totalWidth: viewport.clientWidth,
          visibleRange,
          renderRange,
          direction: "none" as const,
        };
      },

      updateViewport(): void {
        updateViewportHeight();
        debugLog("Viewport updated");
      },

      setScrollPosition(scrollTop: number): void {
        currentScrollTop = scrollTop;
        const newVisibleRange = calculateVisibleRange(currentScrollTop);
        const newRenderRange = calculateRenderRange(newVisibleRange);

        visibleRange = newVisibleRange;
        renderRange = newRenderRange;

        debugLog(
          `Scroll position set to ${scrollTop}px - visible: ${visibleRange.start}-${visibleRange.end}, render: ${renderRange.start}-${renderRange.end}`
        );
      },

      getCurrentScrollPosition(): number {
        return currentScrollTop;
      },

      positionItems,

      // Plugin lifecycle
      destroy(): void {
        if (isDestroyed) return;

        unsubscribe();

        // Remove wheel event listener
        viewport.removeEventListener("wheel", handleWheelEvent);

        if (resizeObserver) {
          resizeObserver.disconnect();
          resizeObserver = null;
        }

        isDestroyed = true;
        debugLog("Virtual viewport destroyed");
      },
    };
  },
});
