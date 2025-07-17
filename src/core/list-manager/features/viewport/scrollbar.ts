// Removed unused imports
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
  totalVirtualSize?: number; // The capped virtual size used by viewport
}

/**
 * Scrollbar implementation that bypasses browser scroll height limitations
 * Provides accurate scrollbar representation for datasets with millions of items
 */
export const scrollbar = (config: Partial<ScrollbarConfig> = {}): any => ({
  name: "scrollbar",
  version: "1.0.0",
  dependencies: [],

  install: (listManager: any, pluginConfig: any) => {
    // Configuration with defaults
    const scrollbarConfig: ScrollbarConfig = {
      enabled: true,
      trackWidth: 12,
      thumbMinHeight: 10, // Reduced from 20 to 10 (divided by 2)
      thumbColor: "#999999",
      trackColor: "#f0f0f0",
      borderRadius: 6,
      fadeTimeout: 1000,
      itemHeight: 84,
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

    /**
     * Calculate scrollbar dimensions and position
     */
    const updateScrollbarDimensions = (): void => {
      if (!scrollbarConfig.totalItems) return;

      // Use capped virtual size if available, otherwise calculate from items
      totalVirtualHeight =
        scrollbarConfig.totalVirtualSize ||
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
      // Use the capped virtual size if available, otherwise calculate from items
      const currentTotalVirtualHeight =
        scrollbarConfig.totalVirtualSize ||
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

      // Update position immediately (visual only)
      updateScrollbarPosition(newScrollRatio);

      // 🎯 NO EVENTS DURING DRAG: Don't emit anything until drag stops
      // (removed verbose dragging logs to keep console clean)
    };

    /**
     * Handle scrollbar thumb drag end
     */
    const handleThumbMouseUp = (): void => {
      if (!isDragging) {
        return;
      }

      isDragging = false;

      document.removeEventListener("mousemove", handleThumbDrag);
      document.removeEventListener("mouseup", handleThumbMouseUp);

      // Remove dragging state classes
      removeClass(scrollbarTrack, "list__scrollbar--dragging");
      removeClass(scrollbarThumb, "list__scrollbar-thumb--dragging");
      hideScrollbar();

      // Calculate the start index and virtual position
      let finalStartIndex: number;
      let finalVirtualScrollTop: number;

      // Check if we're using compressed virtual space
      const actualTotalSize =
        scrollbarConfig.totalItems * scrollbarConfig.itemHeight;
      const isCompressed =
        scrollbarConfig.totalVirtualSize &&
        actualTotalSize > scrollbarConfig.totalVirtualSize;

      if (
        isCompressed &&
        scrollbarConfig.totalVirtualSize &&
        scrollbarConfig.totalItems
      ) {
        // Compressed space: map ratio directly to item index
        // When ratio = 1, we want to show the last viewport of items
        const viewportItemCount = Math.floor(
          viewportHeight / scrollbarConfig.itemHeight
        );
        const maxStartIndex = Math.max(
          0,
          scrollbarConfig.totalItems - viewportItemCount
        );

        // Ensure we reach the last items when scrollbar is at the bottom
        if (scrollRatio >= 0.999) {
          // Close enough to bottom, snap to last items
          finalStartIndex = maxStartIndex;
          finalVirtualScrollTop =
            scrollbarConfig.totalVirtualSize - viewportHeight;
        } else {
          finalStartIndex = Math.floor(scrollRatio * maxStartIndex);
          // Map the index back to virtual space using the same ratio
          const maxVirtualScroll = Math.max(
            0,
            scrollbarConfig.totalVirtualSize - viewportHeight
          );
          finalVirtualScrollTop = scrollRatio * maxVirtualScroll;
        }
      } else {
        // Direct 1:1 mapping when not compressed
        finalVirtualScrollTop = getVirtualPositionFromScrollRatio(scrollRatio);
        finalStartIndex = Math.floor(
          finalVirtualScrollTop / scrollbarConfig.itemHeight
        );
      }

      console.log(
        `🚨 [SCROLLBAR-DRAG] === FINAL API REQUEST TRIGGER === virtualScrollTop=${finalVirtualScrollTop}px, startIndex=${finalStartIndex}, totalItems=${scrollbarConfig.totalItems}, scrollRatio=${scrollRatio}`
      );

      // Emit final viewport change event when drag stops
      listManager.emit("viewport:changed", {
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

      listManager.emit("viewport:changed", {
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
      if (payload.event === "virtual:range:changed") {
        if (
          payload.data?.action === "update-scrollbar" &&
          payload.data?.source === "virtual-viewport"
        ) {
          const { totalItems, itemHeight, totalVirtualSize } = payload.data;

          if (totalItems !== undefined) {
            scrollbarConfig.totalItems = totalItems;
          }
          if (itemHeight !== undefined) {
            scrollbarConfig.itemHeight = itemHeight;
          }
          if (totalVirtualSize !== undefined) {
            scrollbarConfig.totalVirtualSize = totalVirtualSize;
          }

          updateScrollbarDimensions();
        }
      }

      // Listen for wheel scroll events to update scrollbar position
      if (payload.event === "viewport:changed") {
        if (payload.data?.source === "wheel-scroll-scrollbar-update") {
          // Skip this update - scrollbar is already updated via updateScrollPosition
          return;
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
        // 🚫 PREVENT INFINITE LOOP: Only update if count actually changed

        if (scrollbarConfig.totalItems === count) {
          return;
        }

        const previousCount = scrollbarConfig.totalItems;
        scrollbarConfig.totalItems = count;
        updateScrollbarDimensions();
      },

      /**
       * Update scroll position from external source
       */
      updateScrollPosition(virtualScrollTop: number): void {
        // 🚫 PREVENT INFINITE LOOP: Don't update scrollbar position during drag
        if (!isDragging) {
          const newScrollRatio =
            getScrollRatioFromVirtualPosition(virtualScrollTop);
          updateScrollbarPosition(newScrollRatio);
        }
      },

      /**
       * Update item height
       */
      setItemHeight(height: number): void {
        scrollbarConfig.itemHeight = height;
        updateScrollbarDimensions();
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

        // Clean up timeouts
        if (fadeTimeoutId) {
          clearTimeout(fadeTimeoutId);
        }

        console.log(`${LOGGING.PREFIX} Scrollbar destroyed`);
      },
    };
  },
});
