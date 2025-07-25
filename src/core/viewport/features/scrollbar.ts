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
  trackWidth?: number;
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
      trackWidth = 8,
      thumbMinHeight = 15,
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

    // Create scrollbar elements
    const createScrollbarElements = () => {
      if (!viewportElement) return;

      scrollbarTrack = document.createElement("div");
      addClass(scrollbarTrack, VIEWPORT_CONSTANTS.SCROLLBAR.CLASSES.SCROLLBAR);
      scrollbarTrack.style.cssText = `
        position: absolute;
        top: 0;
        right: 0;
        width: ${trackWidth}px;
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
        const scrollRatio = containerSize / totalVirtualSize;
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

      // Throttle viewport updates
      if (animationFrameId === null && component.viewport) {
        animationFrameId = requestAnimationFrame(() => {
          if (lastRequestedScrollPosition !== null && component.viewport) {
            component.viewport.scrollToPosition(lastRequestedScrollPosition);
          }
          animationFrameId = null;
        });
      }
    };

    const handleMouseUp = () => {
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
