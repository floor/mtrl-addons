import type { ListManagerPlugin, VirtualItem } from "../../types";
import { ListManagerEvents } from "../../types";
import { CLASSES, LOGGING } from "../../constants";
import { addClass, removeClass } from "mtrl";

/**
 * Scrollbar configuration
 */
export interface ScrollbarConfig {
  enabled: boolean;
  trackWidth: number;
  thumbMinHeight: number; // Default: 10px (reduced from 20px)
  thumbColor: string;
  trackColor: string;
  borderRadius: number;
  fadeTimeout: number;
  itemHeight: number;
  totalItems: number;
}

/**
 * Scrollbar implementation that bypasses browser scroll height limitations
 * Provides accurate scrollbar representation for datasets with millions of items
 */
export const scrollbar = (
  config: Partial<ScrollbarConfig> = {}
): ListManagerPlugin => ({
  name: "scrollbar",
  version: "1.0.0",
  dependencies: [],

  install: (listManager, pluginConfig) => {
    // Configuration with defaults
    const scrollbarConfig: ScrollbarConfig = {
      enabled: true,
      trackWidth: 12,
      thumbMinHeight: 10, // Reduced from 20 to 10 (divided by 2)
      thumbColor: "#999999",
      trackColor: "#f0f0f0",
      borderRadius: 6,
      fadeTimeout: 1000,
      itemHeight: 50,
      totalItems: 0,
      ...config,
      ...(pluginConfig || {}),
    };

    // State
    let isDragging = false;
    let dragStartY = 0;
    let dragStartScrollRatio = 0;
    let fadeTimeoutId: number | null = null;
    let totalVirtualHeight = 0;
    let viewportHeight = 0;
    let visibleRatio = 0;
    let scrollRatio = 0;

    // Get elements
    const getElements = () => {
      const config = listManager.getConfig?.();
      if (!config?.container) return null;

      const containerElement =
        typeof config.container === "string"
          ? (document.querySelector(config.container) as HTMLElement)
          : config.container;

      const viewport = containerElement?.querySelector(
        `.mtrl-list__viewport`
      ) as HTMLElement;

      // Find the actual mtrl-list element (parent of viewport)
      const listElement = viewport?.closest(".mtrl-list") as HTMLElement;

      return { containerElement, viewport, listElement };
    };

    let elements = getElements();
    if (!elements?.viewport) {
      console.warn("Scrollbar: viewport not found");
      return {};
    }
    if (!elements?.listElement) {
      console.warn("Scrollbar: mtrl-list element not found");
      return {};
    }

    const { containerElement, viewport, listElement } = elements;

    // Create scrollbar DOM structure
    const scrollbarTrack = document.createElement("div");
    addClass(scrollbarTrack, CLASSES.SCROLLBAR);
    addClass(scrollbarTrack, CLASSES.SCROLLBAR_TRACK);

    const scrollbarThumb = document.createElement("div");
    addClass(scrollbarThumb, CLASSES.SCROLLBAR_THUMB);

    scrollbarTrack.appendChild(scrollbarThumb);
    // Append scrollbar to the mtrl-list element, not the outer container
    listElement.appendChild(scrollbarTrack);

    // Hide native scrollbar using CSS classes instead of inline styles
    addClass(viewport, "list__scrollbar-enabled");

    console.log(`✅ [SCROLLBAR] Scrollbar initialized with CSS styling`);

    /**
     * Calculate scrollbar dimensions and position
     */
    const updateScrollbarDimensions = (): void => {
      if (!scrollbarConfig.totalItems) return;

      // Calculate virtual dimensions
      totalVirtualHeight =
        scrollbarConfig.totalItems * scrollbarConfig.itemHeight;
      viewportHeight = viewport.clientHeight;
      visibleRatio = Math.min(viewportHeight / totalVirtualHeight, 1);

      // Calculate thumb height (proportional to visible area)
      const thumbHeight = Math.max(
        scrollbarConfig.thumbMinHeight,
        visibleRatio * (scrollbarTrack.clientHeight - 4) // 4px for padding
      );

      // Update thumb dimensions
      scrollbarThumb.style.height = `${thumbHeight}px`;

      console.log(`📏 [SCROLLBAR] Updated dimensions:`, {
        totalVirtualHeight,
        viewportHeight,
        visibleRatio,
        thumbHeight,
      });
    };

    /**
     * Update scrollbar position based on scroll ratio
     */
    const updateScrollbarPosition = (newScrollRatio: number): void => {
      scrollRatio = Math.max(0, Math.min(1, newScrollRatio));

      const trackHeight = scrollbarTrack.clientHeight;
      const thumbHeight = scrollbarThumb.clientHeight;
      const maxThumbTop = trackHeight - thumbHeight;
      const thumbTop = scrollRatio * maxThumbTop;

      scrollbarThumb.style.top = `${thumbTop}px`;

      console.log(`📍 [SCROLLBAR] Position updated:`, {
        scrollRatio,
        thumbTop,
        maxThumbTop,
      });
    };

    /**
     * Calculate scroll ratio from virtual scroll position
     */
    const getScrollRatioFromVirtualPosition = (
      virtualScrollTop: number
    ): number => {
      if (totalVirtualHeight <= viewportHeight) return 0;
      const maxScroll = totalVirtualHeight - viewportHeight;
      return Math.max(0, Math.min(1, virtualScrollTop / maxScroll));
    };

    /**
     * Calculate virtual scroll position from scroll ratio
     */
    const getVirtualPositionFromScrollRatio = (ratio: number): number => {
      // Ensure we have current total virtual height
      const currentTotalVirtualHeight =
        scrollbarConfig.totalItems * scrollbarConfig.itemHeight;
      const currentViewportHeight = viewport.clientHeight;
      const maxScroll = Math.max(
        0,
        currentTotalVirtualHeight - currentViewportHeight
      );
      return ratio * maxScroll;
    };

    /**
     * Show scrollbar with fade in
     */
    const showScrollbar = (): void => {
      if (fadeTimeoutId) {
        clearTimeout(fadeTimeoutId);
        fadeTimeoutId = null;
      }
      addClass(scrollbarTrack, "list__scrollbar--scrolling");
    };

    /**
     * Hide scrollbar with fade out
     */
    const hideScrollbar = (): void => {
      if (fadeTimeoutId) clearTimeout(fadeTimeoutId);
      fadeTimeoutId = window.setTimeout(() => {
        removeClass(scrollbarTrack, "list__scrollbar--scrolling");
        fadeTimeoutId = null;
      }, scrollbarConfig.fadeTimeout);
    };

    /**
     * Handle scrollbar thumb drag
     */
    const handleThumbMouseDown = (e: MouseEvent): void => {
      e.preventDefault();
      e.stopPropagation();

      isDragging = true;
      dragStartY = e.clientY;
      dragStartScrollRatio = scrollRatio;

      document.addEventListener("mousemove", handleThumbDrag);
      document.addEventListener("mouseup", handleThumbMouseUp);

      // Add dragging state class
      addClass(scrollbarTrack, "list__scrollbar--dragging");
      addClass(scrollbarThumb, "list__scrollbar-thumb--dragging");
      showScrollbar();

      console.log(`🖱️ [SCROLLBAR] Thumb drag started at ratio: ${scrollRatio}`);
    };

    /**
     * Handle scrollbar thumb drag movement
     */
    const handleThumbDrag = (e: MouseEvent): void => {
      if (!isDragging) return;

      const deltaY = e.clientY - dragStartY;
      const trackHeight = scrollbarTrack.clientHeight;
      const thumbHeight = scrollbarThumb.clientHeight;
      const maxThumbTravel = trackHeight - thumbHeight;

      if (maxThumbTravel <= 0) return;

      const deltaRatio = deltaY / maxThumbTravel;
      const newScrollRatio = Math.max(
        0,
        Math.min(1, dragStartScrollRatio + deltaRatio)
      );

      // Update position immediately
      updateScrollbarPosition(newScrollRatio);

      // Calculate and emit virtual scroll position
      const virtualScrollTop =
        getVirtualPositionFromScrollRatio(newScrollRatio);

      // 🎯 DRAG OPTIMIZATION: Emit drag events WITHOUT action to avoid data loading
      // Only the final drag-end event will trigger data loading
      listManager.emit(ListManagerEvents.VIEWPORT_CHANGED, {
        scrollTop: virtualScrollTop,
        scrollRatio: newScrollRatio,
        source: "scrollbar",
        action: "drag", // Mark as drag to prevent data loading
      });

      console.log(
        `🖱️ [SCROLLBAR] Dragging to ratio: ${newScrollRatio}, virtual: ${virtualScrollTop}px (no data loading during drag)`
      );
    };

    /**
     * Handle scrollbar thumb drag end
     */
    const handleThumbMouseUp = (): void => {
      isDragging = false;

      document.removeEventListener("mousemove", handleThumbDrag);
      document.removeEventListener("mouseup", handleThumbMouseUp);

      // Remove dragging state classes
      removeClass(scrollbarTrack, "list__scrollbar--dragging");
      removeClass(scrollbarThumb, "list__scrollbar-thumb--dragging");
      hideScrollbar();

      console.log(`🖱️ [SCROLLBAR] Thumb drag ended at ratio: ${scrollRatio}`);

      // Calculate final virtual position and emit a final viewport change event
      const finalVirtualScrollTop =
        getVirtualPositionFromScrollRatio(scrollRatio);
      const finalStartIndex = Math.floor(
        finalVirtualScrollTop / scrollbarConfig.itemHeight
      );

      console.log(
        `📍 [SCROLLBAR] Final position: virtualScrollTop=${finalVirtualScrollTop}px, startIndex=${finalStartIndex}, totalItems=${scrollbarConfig.totalItems}`
      );

      // Emit final viewport change event to ensure range calculations are updated
      listManager.emit(ListManagerEvents.VIEWPORT_CHANGED, {
        scrollTop: finalVirtualScrollTop,
        scrollRatio: scrollRatio,
        startIndex: finalStartIndex,
        source: "scrollbar",
        action: "drag-end", // Indicate this is the final position
      });
    };

    /**
     * Handle scrollbar track click
     */
    const handleTrackClick = (e: MouseEvent): void => {
      if (isDragging) return;

      const rect = scrollbarTrack.getBoundingClientRect();
      const clickY = e.clientY - rect.top;
      const trackHeight = scrollbarTrack.clientHeight;
      const thumbHeight = scrollbarThumb.clientHeight;

      // Calculate new scroll ratio based on click position
      const newScrollRatio = Math.max(
        0,
        Math.min(1, (clickY - thumbHeight / 2) / (trackHeight - thumbHeight))
      );

      // Update position and emit event
      updateScrollbarPosition(newScrollRatio);

      const virtualScrollTop =
        getVirtualPositionFromScrollRatio(newScrollRatio);

      listManager.emit(ListManagerEvents.VIEWPORT_CHANGED, {
        scrollTop: virtualScrollTop,
        scrollRatio: newScrollRatio,
        source: "scrollbar",
      });

      showScrollbar();
      hideScrollbar();

      console.log(
        `🖱️ [SCROLLBAR] Track clicked at ratio: ${newScrollRatio}, virtual: ${virtualScrollTop}px, totalItems: ${scrollbarConfig.totalItems}`
      );
    };

    // Listen for virtual viewport updates
    const unsubscribeScrollbar = listManager.subscribe((payload: any) => {
      if (payload.event === ListManagerEvents.VIRTUAL_RANGE_CHANGED) {
        if (
          payload.data?.action === "update-scrollbar" &&
          payload.data?.source === "virtual-viewport"
        ) {
          const { totalItems, itemHeight } = payload.data;

          if (totalItems !== undefined) {
            scrollbarConfig.totalItems = totalItems;
          }
          if (itemHeight !== undefined) {
            scrollbarConfig.itemHeight = itemHeight;
          }

          updateScrollbarDimensions();
        }
      }

      // Listen for wheel scroll events to update scrollbar position
      if (payload.event === ListManagerEvents.VIEWPORT_CHANGED) {
        if (payload.data?.source === "wheel-scroll-scrollbar-update") {
          const newScrollRatio = payload.data?.scrollRatio;
          if (newScrollRatio !== undefined) {
            updateScrollbarPosition(newScrollRatio);
            console.log(
              `📍 [SCROLLBAR] Position updated from wheel scroll: ratio=${newScrollRatio}`
            );
          }
        }
      }
    });

    // Attach event listeners
    scrollbarThumb.addEventListener("mousedown", handleThumbMouseDown);
    scrollbarTrack.addEventListener("click", handleTrackClick);

    // Show/hide on hover (use listElement since scrollbar is inside it)
    listElement.addEventListener("mouseenter", showScrollbar);
    listElement.addEventListener("mouseleave", hideScrollbar);

    // Show during scrolling
    viewport.addEventListener("scroll", showScrollbar);

    // Return plugin API
    return {
      /**
       * Update total items count
       */
      setTotalItems(count: number): void {
        scrollbarConfig.totalItems = count;
        updateScrollbarDimensions();
        console.log(`📊 [SCROLLBAR] Total items updated: ${count}`);
      },

      /**
       * Update scroll position from external source
       */
      updateScrollPosition(virtualScrollTop: number): void {
        const newScrollRatio =
          getScrollRatioFromVirtualPosition(virtualScrollTop);
        updateScrollbarPosition(newScrollRatio);
      },

      /**
       * Update item height
       */
      setItemHeight(height: number): void {
        scrollbarConfig.itemHeight = height;
        updateScrollbarDimensions();
        console.log(`📏 [SCROLLBAR] Item height updated: ${height}px`);
      },

      /**
       * Get current virtual scroll position
       */
      getVirtualScrollTop(): number {
        return getVirtualPositionFromScrollRatio(scrollRatio);
      },

      /**
       * Get current scroll ratio (0-1)
       */
      getScrollRatio(): number {
        return scrollRatio;
      },

      /**
       * Show scrollbar
       */
      show(): void {
        showScrollbar();
      },

      /**
       * Hide scrollbar
       */
      hide(): void {
        hideScrollbar();
      },

      /**
       * Update configuration
       */
      updateConfig(newConfig: Partial<ScrollbarConfig>): void {
        Object.assign(scrollbarConfig, newConfig);
        updateScrollbarDimensions();
      },

      /**
       * Destroy scrollbar
       */
      destroy(): void {
        if (scrollbarTrack.parentNode) {
          scrollbarTrack.parentNode.removeChild(scrollbarTrack);
        }

        // Remove scrollbar classes from viewport
        removeClass(viewport, "list__scrollbar-enabled");

        // Clean up event subscriptions
        unsubscribeScrollbar();

        // Clean up event listeners
        listElement.removeEventListener("mouseenter", showScrollbar);
        listElement.removeEventListener("mouseleave", hideScrollbar);
        viewport.removeEventListener("scroll", showScrollbar);
        scrollbarThumb.removeEventListener("mousedown", handleThumbMouseDown);
        scrollbarTrack.removeEventListener("click", handleTrackClick);
        document.removeEventListener("mousemove", handleThumbDrag);
        document.removeEventListener("mouseup", handleThumbMouseUp);

        if (fadeTimeoutId) {
          clearTimeout(fadeTimeoutId);
        }

        console.log(`${LOGGING.PREFIX} Scrollbar destroyed`);
      },
    };
  },
});
