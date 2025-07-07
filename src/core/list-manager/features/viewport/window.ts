import type { ElementComponent } from "mtrl/src/core/compose";
import type { ListManagerPlugin, ViewportInfo, VirtualItem } from "../../types";
import {
  VIRTUAL_SCROLLING,
  CLASSES,
  ATTRIBUTES,
  LOGGING,
} from "../../constants";

/**
 * Window-based viewport configuration
 */
export interface WindowBasedConfig {
  heightStrategy: "dynamic" | "full" | "progressive";
  heightBuffer: number;
  maxPreCalculatedHeight: number;
  itemHeight: number | "auto";
  estimatedItemHeight?: number;
  overscan?: number;
  windowSize?: number;
}

/**
 * Window-based viewport management plugin
 * Uses native scrollbar with viewport-based virtual rendering
 */
export const windowBasedViewport = (
  config: WindowBasedConfig
): ListManagerPlugin => ({
  name: "window-based-viewport",
  version: "1.0.0",
  dependencies: [],

  install: (listManager, pluginConfig) => {
    // Configuration with defaults
    const viewportConfig = {
      heightStrategy: "dynamic" as const,
      heightBuffer: 2,
      maxPreCalculatedHeight: 1_000_000,
      itemHeight: 50,
      estimatedItemHeight: 50,
      overscan: VIRTUAL_SCROLLING.DEFAULT_OVERSCAN,
      windowSize: VIRTUAL_SCROLLING.DEFAULT_WINDOW_SIZE,
      ...config,
    };

    // Viewport state
    let items: VirtualItem[] = [];
    let visibleRange = { start: 0, end: 0, count: 0 };
    let renderRange = { start: 0, end: 0, count: 0 };
    let totalHeight = 0;
    let isDestroyed = false;

    // Get container and create viewport structure
    const container = listManager.getConfig().container;
    if (!container) {
      throw new Error("Window-based viewport requires a container element");
    }

    // Create viewport structure
    const viewport = document.createElement("div");
    viewport.classList.add(CLASSES.VIEWPORT);
    viewport.style.cssText = `
      height: 100%;
      overflow-y: auto;
      overflow-x: hidden;
      position: relative;
    `;

    const scrollContainer = document.createElement("div");
    scrollContainer.classList.add(CLASSES.SCROLL_CONTAINER);
    scrollContainer.style.cssText = `
      position: relative;
      min-height: 100%;
    `;

    // Create spacer for total height
    const spacer = document.createElement("div");
    spacer.classList.add(CLASSES.VIRTUAL_SPACER);
    spacer.style.cssText = `
      height: 0px;
      pointer-events: none;
    `;

    viewport.appendChild(scrollContainer);
    scrollContainer.appendChild(spacer);
    container.appendChild(viewport);

    /**
     * Calculate visible range based on viewport position
     */
    const calculateVisibleRange = (scrollTop: number) => {
      if (items.length === 0) {
        return { start: 0, end: 0, count: 0 };
      }

      const itemHeight =
        typeof viewportConfig.itemHeight === "number"
          ? viewportConfig.itemHeight
          : viewportConfig.estimatedItemHeight || 50;

      const containerHeight = viewport.clientHeight;
      const startIndex = Math.floor(scrollTop / itemHeight);
      const visibleCount =
        Math.ceil(containerHeight / itemHeight) + viewportConfig.overscan;
      const endIndex = Math.min(startIndex + visibleCount, items.length - 1);

      return {
        start: startIndex,
        end: endIndex,
        count: endIndex - startIndex + 1,
      };
    };

    /**
     * Calculate render range with buffer around viewport
     */
    const calculateRenderRange = (visibleRange: any) => {
      const bufferSize = viewportConfig.heightBuffer;
      const start = Math.max(0, visibleRange.start - bufferSize);
      const end = Math.min(items.length - 1, visibleRange.end + bufferSize);

      return {
        start,
        end,
        count: end - start + 1,
      };
    };

    /**
     * Update total height based on height strategy
     */
    const updateTotalHeight = () => {
      const itemHeight =
        typeof viewportConfig.itemHeight === "number"
          ? viewportConfig.itemHeight
          : viewportConfig.estimatedItemHeight || 50;

      switch (viewportConfig.heightStrategy) {
        case "dynamic":
          // Calculate based on current items
          totalHeight = items.length * itemHeight;
          break;
        case "full":
          // Pre-calculate full height
          totalHeight = Math.min(
            items.length * itemHeight,
            viewportConfig.maxPreCalculatedHeight
          );
          break;
        case "progressive":
          // Progressively expand height based on scroll position
          const currentScroll = viewport.scrollTop;
          const viewportHeight = viewport.clientHeight;
          const progressiveHeight = Math.max(
            totalHeight,
            currentScroll +
              viewportHeight +
              viewportHeight * viewportConfig.heightBuffer
          );
          totalHeight = Math.min(
            progressiveHeight,
            viewportConfig.maxPreCalculatedHeight
          );
          break;
      }

      spacer.style.height = `${totalHeight}px`;
    };

    /**
     * Position items in viewport using transform
     */
    const positionItems = (itemElements: HTMLElement[], range: any) => {
      const itemHeight =
        typeof viewportConfig.itemHeight === "number"
          ? viewportConfig.itemHeight
          : viewportConfig.estimatedItemHeight || 50;

      itemElements.forEach((element, index) => {
        const actualIndex = range.start + index;
        const offset = actualIndex * itemHeight;

        element.style.position = "absolute";
        element.style.top = "0";
        element.style.left = "0";
        element.style.right = "0";
        element.style.transform = `translateY(${offset}px)`;
        element.setAttribute(ATTRIBUTES.VIRTUAL_INDEX, actualIndex.toString());
        element.setAttribute(ATTRIBUTES.VIRTUAL_OFFSET, offset.toString());
      });
    };

    /**
     * Handle viewport scroll events
     */
    const handleViewportScroll = (): void => {
      if (isDestroyed) return;

      const scrollTop = viewport.scrollTop;
      const newVisibleRange = calculateVisibleRange(scrollTop);
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

        // Update height if using progressive strategy
        if (viewportConfig.heightStrategy === "progressive") {
          updateTotalHeight();
        }

        // Emit viewport change event
        listManager.emit("viewport:changed", {
          scrollTop,
          visibleRange,
          renderRange,
          direction: getScrollDirection(scrollTop),
        });
      }
    };

    /**
     * Get scroll direction within viewport
     */
    let lastScrollTop = 0;
    const getScrollDirection = (scrollTop: number): "up" | "down" | "none" => {
      if (scrollTop > lastScrollTop) {
        lastScrollTop = scrollTop;
        return "down";
      } else if (scrollTop < lastScrollTop) {
        lastScrollTop = scrollTop;
        return "up";
      }
      return "none";
    };

    // Setup viewport scroll listener with throttling
    let scrollTimeout: number | null = null;
    const throttledScroll = () => {
      if (scrollTimeout) return;

      scrollTimeout = window.setTimeout(() => {
        handleViewportScroll();
        scrollTimeout = null;
      }, VIRTUAL_SCROLLING.DEFAULT_THROTTLE_MS);
    };

    viewport.addEventListener("scroll", throttledScroll, { passive: true });

    // Setup resize observer for viewport changes
    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined") {
      resizeObserver = new ResizeObserver(() => {
        handleViewportScroll(); // Recalculate on viewport resize
      });
      resizeObserver.observe(viewport);
    }

    // Return viewport management API
    return {
      // Viewport interface
      setItems(newItems: VirtualItem[]): void {
        items = [...newItems];
        updateTotalHeight();
        handleViewportScroll(); // Recalculate ranges

        console.log(
          `${LOGGING.PREFIX} Window-based viewport: ${items.length} items set`
        );
      },

      getVisibleRange() {
        return { ...visibleRange };
      },

      getRenderRange() {
        return { ...renderRange };
      },

      scrollTo(index: number, behavior: "smooth" | "instant" = "smooth"): void {
        if (index < 0 || index >= items.length) {
          console.warn(`${LOGGING.PREFIX} Invalid scroll index: ${index}`);
          return;
        }

        const itemHeight =
          typeof viewportConfig.itemHeight === "number"
            ? viewportConfig.itemHeight
            : viewportConfig.estimatedItemHeight || 50;

        const offset = index * itemHeight;

        viewport.scrollTo({
          top: offset,
          behavior,
        });
      },

      scrollToTop(behavior: "smooth" | "instant" = "smooth"): void {
        viewport.scrollTo({ top: 0, behavior });
      },

      scrollToBottom(behavior: "smooth" | "instant" = "smooth"): void {
        viewport.scrollTo({ top: totalHeight, behavior });
      },

      getViewportInfo(): ViewportInfo {
        return {
          scrollTop: viewport.scrollTop,
          scrollLeft: viewport.scrollLeft,
          containerHeight: viewport.clientHeight,
          containerWidth: viewport.clientWidth,
          totalHeight,
          totalWidth: viewport.clientWidth,
          visibleRange,
          renderRange,
          direction: getScrollDirection(viewport.scrollTop),
        };
      },

      updateViewport(): void {
        updateTotalHeight();
        handleViewportScroll();
      },

      positionItems,

      // Plugin lifecycle
      destroy(): void {
        if (isDestroyed) return;

        viewport.removeEventListener("scroll", throttledScroll);

        if (resizeObserver) {
          resizeObserver.disconnect();
          resizeObserver = null;
        }

        if (scrollTimeout) {
          clearTimeout(scrollTimeout);
          scrollTimeout = null;
        }

        container.removeChild(viewport);
        isDestroyed = true;

        console.log(`${LOGGING.PREFIX} Window-based viewport destroyed`);
      },
    };
  },
});
