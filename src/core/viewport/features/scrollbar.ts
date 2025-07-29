// src/core/viewport/features/scrollbar.ts

/**
 * Scrollbar Feature - Custom scrollbar implementation
 * Provides visual scroll indication and drag-to-scroll functionality
 */

import type { ViewportContext, ViewportComponent } from "../types";
import { VIEWPORT_CONSTANTS } from "../constants";
import { wrapInitialize, wrapDestroy, storeFeatureFunction } from "./utils";
import { PREFIX, addClass, removeClass } from "mtrl";

export interface ScrollbarConfig {
  enabled?: boolean;
  autoHide?: boolean;
  thumbMinHeight?: number;
  thumbColor?: string;
  trackColor?: string;
  borderRadius?: number;
  fadeTimeout?: number;
}

export interface ScrollbarComponent {
  scrollbar: {
    show: () => void;
    hide: () => void;
    updateBounds: (totalVirtualSize: number, containerSize: number) => void;
    updatePosition: (scrollPosition: number) => void;
  };
}

/**
 * Adds scrollbar functionality to viewport component
 */
export function withScrollbar(config: ScrollbarConfig = {}) {
  return <T extends ViewportContext & ViewportComponent>(
    component: T
  ): T & ScrollbarComponent => {
    const {
      enabled = true,
      autoHide = true,
      thumbMinHeight = 25,
      borderRadius = 4,
      fadeTimeout = 1000,
    } = config;

    // Return no-op if disabled
    if (!enabled) {
      return {
        ...component,
        scrollbar: {
          show: () => {},
          hide: () => {},
          updateBounds: () => {},
          updatePosition: () => {},
        },
      };
    }

    // State
    let viewportElement: HTMLElement | null = null;
    let scrollbarTrack: HTMLElement | null = null;
    let scrollbarThumb: HTMLElement | null = null;
    let isInitialized = false;
    let isDragging = false;
    let dragStartY = 0;
    let dragStartScrollPosition = 0;
    let hideTimeout: ReturnType<typeof setTimeout> | null = null;
    let totalVirtualSize = 0;
    let containerSize = 0;
    let thumbHeight = 0;
    let animationFrameId: number | null = null;
    let lastRequestedScrollPosition: number | null = null;
    let isCursorMode = false;
    let loadedItemsCount = 0;

    // Create scrollbar elements
    const createScrollbarElements = () => {
      if (!viewportElement) return;

      scrollbarTrack = document.createElement("div");
      addClass(scrollbarTrack, VIEWPORT_CONSTANTS.SCROLLBAR.CLASSES.SCROLLBAR);
      scrollbarTrack.style.cssText = `
        position: absolute;
        top: 0;
        right: 0;
        height: 100%;
        z-index: 10;
      `;

      scrollbarThumb = document.createElement("div");

      addClass(
        scrollbarThumb,
        VIEWPORT_CONSTANTS.SCROLLBAR.CLASSES.SCROLLBAR_THUMB
      );

      scrollbarTrack.appendChild(scrollbarThumb);
      viewportElement.appendChild(scrollbarTrack);
    };

    // Show/hide functions
    const show = () => {
      if (!scrollbarTrack || totalVirtualSize <= containerSize) return;

      if (hideTimeout) {
        clearTimeout(hideTimeout);
        hideTimeout = null;
      }

      addClass(
        scrollbarTrack,
        VIEWPORT_CONSTANTS.SCROLLBAR.CLASSES.SCROLLBAR_VISIBLE
      );

      if (autoHide && !isDragging) {
        hideTimeout = setTimeout(hide, fadeTimeout);
      }
    };

    const hide = () => {
      if (!scrollbarTrack || isDragging) return;
      removeClass(
        scrollbarTrack,
        VIEWPORT_CONSTANTS.SCROLLBAR.CLASSES.SCROLLBAR_VISIBLE
      );
    };

    // Update scrollbar bounds
    const updateBounds = (newTotalSize: number, newContainerSize: number) => {
      totalVirtualSize = newTotalSize;
      containerSize = newContainerSize;

      if (!scrollbarTrack || !scrollbarThumb) return;

      const needsScrollbar = totalVirtualSize > containerSize;
      scrollbarTrack.style.display = needsScrollbar ? "block" : "none";

      if (needsScrollbar) {
        let scrollRatio: number;

        if (isCursorMode && loadedItemsCount > 0) {
          // For cursor mode, thumb size represents loaded content vs estimated total
          // If we don't know total, use loaded items * 2 as estimate
          const estimatedTotal =
            totalVirtualSize > 0 ? totalVirtualSize : loadedItemsCount * 2;
          scrollRatio =
            containerSize /
            Math.max(estimatedTotal, loadedItemsCount + containerSize);
        } else {
          // Normal calculation for offset/page strategies
          scrollRatio = containerSize / totalVirtualSize;
        }

        thumbHeight = Math.max(thumbMinHeight, scrollRatio * containerSize);
        scrollbarThumb.style.height = `${thumbHeight}px`;
        updatePosition(component.viewport?.getScrollPosition() || 0);
      }
    };

    // Update thumb position
    const updatePosition = (scrollPos: number) => {
      if (!scrollbarThumb || !scrollbarTrack) return;

      const scrollableDistance = totalVirtualSize - containerSize;
      if (scrollableDistance <= 0) return;

      const scrollRatio = Math.min(
        1,
        Math.max(0, scrollPos / scrollableDistance)
      );
      const maxThumbPosition =
        scrollbarTrack.clientHeight - scrollbarThumb.clientHeight;
      const thumbPosition = scrollRatio * maxThumbPosition;

      scrollbarThumb.style.transform = `translateY(${thumbPosition}px)`;
    };

    // Handle track click
    const handleTrackClick = (e: MouseEvent) => {
      if (!scrollbarTrack || !scrollbarThumb || e.target === scrollbarThumb)
        return;

      const trackRect = scrollbarTrack.getBoundingClientRect();
      const clickY = e.clientY - trackRect.top;
      const thumbCenterY = clickY - thumbHeight / 2;
      const maxThumbPosition = containerSize - thumbHeight;
      const thumbPosition = Math.max(
        0,
        Math.min(thumbCenterY, maxThumbPosition)
      );
      const scrollRatio = thumbPosition / maxThumbPosition;
      const targetScrollPosition =
        scrollRatio * (totalVirtualSize - containerSize);

      component.viewport?.scrollToPosition(targetScrollPosition);
    };

    // Mouse event handlers
    const handleThumbMouseDown = (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();

      isDragging = true;
      dragStartY = e.clientY;
      dragStartScrollPosition = component.viewport?.getScrollPosition() || 0;

      if (scrollbarTrack) {
        addClass(
          scrollbarTrack,
          VIEWPORT_CONSTANTS.SCROLLBAR.CLASSES.SCROLLBAR_DRAGGING
        );
      }

      // Emit drag start event to notify viewport
      component.emit?.("viewport:drag-start", {
        source: "scrollbar",
        startPosition: dragStartScrollPosition,
      });

      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging || !scrollbarTrack || !scrollbarThumb) return;

      const deltaY = e.clientY - dragStartY;
      const trackHeight = scrollbarTrack.clientHeight;
      const thumbHeight = scrollbarThumb.clientHeight;
      const maxThumbTravel = trackHeight - thumbHeight;

      if (maxThumbTravel <= 0) return;

      const deltaRatio = deltaY / maxThumbTravel;
      const dragStartScrollRatio =
        dragStartScrollPosition / (totalVirtualSize - containerSize);
      const newScrollRatio = Math.max(
        0,
        Math.min(1, dragStartScrollRatio + deltaRatio)
      );

      // Update thumb position immediately
      const thumbPosition = newScrollRatio * maxThumbTravel;
      scrollbarThumb.style.transform = `translateY(${thumbPosition}px)`;

      // Calculate new scroll position
      const newPosition = newScrollRatio * (totalVirtualSize - containerSize);
      lastRequestedScrollPosition = newPosition;

      console.log(
        `[Scrollbar] Mouse move: newPos=${newPosition.toFixed(
          0
        )}, animationFrameId=${animationFrameId}`
      );

      // Throttle viewport updates
      if (animationFrameId === null && component.viewport) {
        animationFrameId = requestAnimationFrame(() => {
          console.log(
            `[Scrollbar] RAF callback: scrolling to ${lastRequestedScrollPosition}`
          );
          if (lastRequestedScrollPosition !== null && component.viewport) {
            component.viewport.scrollToPosition(lastRequestedScrollPosition);
          }
          animationFrameId = null;
        });
      }
    };

    const handleMouseUp = () => {
      console.log("[Scrollbar] Mouse up - ending drag");
      isDragging = false;

      if (animationFrameId !== null) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
      }

      if (lastRequestedScrollPosition !== null && component.viewport) {
        component.viewport.scrollToPosition(lastRequestedScrollPosition);
        lastRequestedScrollPosition = null;
      }

      if (scrollbarTrack) {
        removeClass(
          scrollbarTrack,
          VIEWPORT_CONSTANTS.SCROLLBAR.CLASSES.SCROLLBAR_DRAGGING
        );
      }

      // Emit drag end event
      component.emit?.("viewport:drag-end", {
        source: "scrollbar",
        endPosition: component.viewport?.getScrollPosition() || 0,
      });

      hide();

      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };

    // Initialize function
    const initialize = () => {
      if (isInitialized) return;

      viewportElement = component.element?.querySelector(
        `.${PREFIX}-viewport`
      ) as HTMLElement;

      if (!viewportElement) {
        console.warn("[Scrollbar] No viewport element found");
        return;
      }

      if (
        viewportElement.querySelector(
          `.${PREFIX}-${VIEWPORT_CONSTANTS.SCROLLBAR.CLASSES.SCROLLBAR}`
        )
      )
        return;

      createScrollbarElements();
      isInitialized = true;

      if (scrollbarTrack && viewportElement) {
        scrollbarTrack.addEventListener("click", handleTrackClick);

        if (scrollbarThumb) {
          scrollbarThumb.addEventListener("mousedown", handleThumbMouseDown);
        }

        viewportElement.addEventListener("mouseenter", show, { passive: true });
        viewportElement.addEventListener(
          "mouseleave",
          () => {
            if (!isDragging) hide();
          },
          { passive: true }
        );
      }

      // Initialize with current viewport state
      if (component.viewport) {
        const info = component.viewport.getViewportInfo();
        totalVirtualSize = info.totalVirtualSize;
        containerSize = info.containerSize;

        // Check if we're in cursor mode
        const collection = (component as any).collection;
        const viewportConfig = (component as any).config;
        isCursorMode = viewportConfig?.pagination?.strategy === "cursor";

        updateBounds(totalVirtualSize, containerSize);
        updatePosition(component.viewport.getScrollPosition());
      }

      // Event listeners
      component.on?.("viewport:scroll", (data: any) => {
        if (!isDragging) {
          updatePosition(data.position);
          show();
        }
      });

      component.on?.("viewport:virtual-size-changed", (data: any) => {
        totalVirtualSize = data.totalVirtualSize;
        updateBounds(data.totalVirtualSize, containerSize);
      });

      component.on?.("viewport:container-size-changed", (data: any) => {
        containerSize = data.containerSize;
        updateBounds(totalVirtualSize, data.containerSize);
      });

      // Listen for items loaded to update scrollbar in cursor mode
      component.on?.("viewport:items-changed", (data: any) => {
        if (isCursorMode) {
          loadedItemsCount = data.loadedCount || 0;
          updateBounds(totalVirtualSize, containerSize);
        }
      });

      // Listen for total items changes (important for cursor mode)
      component.on?.("viewport:total-items-changed", (data: any) => {
        if (isCursorMode && data.total) {
          // In cursor mode, the total is dynamic
          console.log(
            `[Scrollbar] Cursor mode: updating bounds for new total ${data.total}`
          );
          updateBounds(totalVirtualSize, containerSize);
        }
      });
    };

    // Store initialize function
    storeFeatureFunction(component, "_scrollbarInitialize", initialize);

    // Hook into viewport initialization
    wrapInitialize(component, initialize);

    // Cleanup
    const destroy = () => {
      if (scrollbarTrack) {
        scrollbarTrack.remove();
        scrollbarTrack = null;
      }
      scrollbarThumb = null;
      viewportElement = null;
      isInitialized = false;

      if (hideTimeout) {
        clearTimeout(hideTimeout);
        hideTimeout = null;
      }

      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };

    storeFeatureFunction(component, "_scrollbarDestroy", destroy);
    wrapDestroy(component, destroy);

    // Return enhanced component
    return {
      ...component,
      scrollbar: { show, hide, updateBounds, updatePosition },
    };
  };
}
