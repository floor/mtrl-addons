// src/core/viewport/features/scrollbar.ts

/**
 * Scrollbar Feature - Custom scrollbar implementation
 * Provides visual scroll indication and drag-to-scroll functionality
 */

import type { ViewportContext } from "../types";
import type { ScrollingComponent } from "./scrolling";
import { VIEWPORT_CONSTANTS } from "../constants";

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
  return <T extends ViewportContext & ScrollingComponent>(
    component: T
  ): T & ScrollbarComponent => {
    const {
      enabled = true,
      autoHide = true,
      trackWidth = 8,
      thumbMinHeight = 20,
      thumbColor = "rgba(0, 0, 0, 0.3)",
      trackColor = "rgba(0, 0, 0, 0.1)",
      borderRadius = 4,
      fadeTimeout = 1000,
    } = config;

    // Return unchanged component if scrollbar is disabled
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
    let scrollbarTrack: HTMLElement | null = null;
    let scrollbarThumb: HTMLElement | null = null;
    let viewportElement: HTMLElement | null = null;
    let isDragging = false;
    let dragStartY = 0;
    let dragStartScrollPosition = 0;
    let hideTimeout: number | null = null;
    let totalVirtualSize = 0;
    let containerSize = 0;
    let thumbHeight = 0;
    let isVisible = false;

    /**
     * Create scrollbar elements
     */
    const createScrollbarElements = () => {
      // Check if scrollbar already exists
      const existingTrack = viewportElement?.querySelector(
        ".mtrl-viewport-scrollbar"
      );
      if (existingTrack) {
        scrollbarTrack = existingTrack as HTMLElement;
        scrollbarThumb = existingTrack.querySelector(
          ".mtrl-viewport-scrollbar-thumb"
        ) as HTMLElement;
        return;
      }

      // Create track
      scrollbarTrack = document.createElement("div");
      scrollbarTrack.className = "mtrl-viewport-scrollbar";
      scrollbarTrack.style.cssText = `
        position: absolute;
        top: 0;
        right: 0;
        width: ${trackWidth}px;
        height: 100%;
        background: ${trackColor};
        border-radius: ${borderRadius}px;
        opacity: 0;
        transition: opacity 0.3s ease;
        cursor: pointer;
        z-index: 10;
      `;

      // Create thumb
      scrollbarThumb = document.createElement("div");
      scrollbarThumb.className = "mtrl-viewport-scrollbar-thumb";
      scrollbarThumb.style.cssText = `
        position: absolute;
        top: 0;
        width: 100%;
        background: ${thumbColor};
        border-radius: ${borderRadius}px;
        min-height: ${thumbMinHeight}px;
        cursor: grab;
        transition: background 0.2s ease;
      `;

      scrollbarTrack.appendChild(scrollbarThumb);
    };

    /**
     * Show scrollbar
     */
    const show = () => {
      if (!scrollbarTrack || !isVisible) return;

      scrollbarTrack.style.opacity = "1";

      if (autoHide && hideTimeout) {
        clearTimeout(hideTimeout);
      }

      if (autoHide) {
        hideTimeout = window.setTimeout(() => hide(), fadeTimeout);
      }
    };

    /**
     * Hide scrollbar
     */
    const hide = () => {
      if (!scrollbarTrack || isDragging) return;

      scrollbarTrack.style.opacity = "0";

      if (hideTimeout) {
        clearTimeout(hideTimeout);
        hideTimeout = null;
      }
    };

    /**
     * Update scrollbar bounds
     */
    const updateBounds = (
      newTotalVirtualSize: number,
      newContainerSize: number
    ) => {
      totalVirtualSize = newTotalVirtualSize;
      containerSize = newContainerSize;

      if (!scrollbarThumb || !scrollbarTrack) return;

      // Calculate thumb height
      const scrollRatio = containerSize / totalVirtualSize;
      thumbHeight = Math.max(thumbMinHeight, scrollRatio * containerSize);
      scrollbarThumb.style.height = `${thumbHeight}px`;

      // Show/hide based on whether scrolling is needed
      isVisible = totalVirtualSize > containerSize;
      scrollbarTrack.style.display = isVisible ? "block" : "none";

      // Update position
      if (component.scrolling) {
        updatePosition(component.scrolling.getScrollPosition());
      }
    };

    /**
     * Update scrollbar position
     */
    const updatePosition = (scrollPosition: number) => {
      if (!scrollbarThumb || !isVisible) return;

      const maxScroll = totalVirtualSize - containerSize;
      const scrollRatio = maxScroll > 0 ? scrollPosition / maxScroll : 0;
      const maxThumbPosition = containerSize - thumbHeight;
      const thumbPosition = scrollRatio * maxThumbPosition;

      scrollbarThumb.style.transform = `translateY(${thumbPosition}px)`;

      // Show scrollbar when scrolling
      if (autoHide) {
        show();
      }
    };

    /**
     * Handle track click
     */
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

      component.scrolling?.scrollToPosition(
        targetScrollPosition,
        "scrollbar-track"
      );
    };

    /**
     * Handle thumb drag start
     */
    const handleThumbMouseDown = (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();

      isDragging = true;
      dragStartY = e.clientY;
      dragStartScrollPosition = component.scrolling?.getScrollPosition() || 0;

      if (scrollbarThumb) {
        scrollbarThumb.style.cursor = "grabbing";
      }

      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    };

    /**
     * Handle mouse move during drag
     */
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;

      const deltaY = e.clientY - dragStartY;
      const maxThumbPosition = containerSize - thumbHeight;
      const scrollableDistance = totalVirtualSize - containerSize;

      const thumbMovementRatio = deltaY / maxThumbPosition;
      const scrollDelta = thumbMovementRatio * scrollableDistance;
      const targetScrollPosition = dragStartScrollPosition + scrollDelta;

      component.scrolling?.scrollToPosition(
        targetScrollPosition,
        "scrollbar-drag"
      );
    };

    /**
     * Handle mouse up
     */
    const handleMouseUp = () => {
      isDragging = false;

      if (scrollbarThumb) {
        scrollbarThumb.style.cursor = "grab";
      }

      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);

      // Resume auto-hide
      if (autoHide) {
        show();
      }
    };

    // Initialize function
    const initialize = () => {
      viewportElement = component.element;

      if (!viewportElement) return;

      createScrollbarElements();

      if (scrollbarTrack) {
        viewportElement.appendChild(scrollbarTrack);

        // Add event listeners
        scrollbarTrack.addEventListener("click", handleTrackClick);

        if (scrollbarThumb) {
          scrollbarThumb.addEventListener("mousedown", handleThumbMouseDown);

          // Hover effects
          scrollbarThumb.addEventListener("mouseenter", () => {
            if (scrollbarThumb && !isDragging) {
              scrollbarThumb.style.background = "rgba(0, 0, 0, 0.5)";
            }
          });

          scrollbarThumb.addEventListener("mouseleave", () => {
            if (scrollbarThumb && !isDragging) {
              scrollbarThumb.style.background = thumbColor;
            }
          });
        }

        // Show on hover
        viewportElement.addEventListener("mouseenter", show);
        viewportElement.addEventListener("mouseleave", () => {
          if (!isDragging) hide();
        });
      }

      // Listen for scroll events
      component.on?.("viewport:scroll", (data: any) => {
        updatePosition(data.position);
      });
    };

    // Cleanup function
    const destroy = () => {
      if (scrollbarTrack) {
        scrollbarTrack.remove();
        scrollbarTrack = null;
      }

      scrollbarThumb = null;

      if (hideTimeout) {
        clearTimeout(hideTimeout);
        hideTimeout = null;
      }

      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };

    // Store functions for viewport to call
    (component as any)._scrollbarInitialize = initialize;
    (component as any)._scrollbarDestroy = destroy;

    // Return enhanced component
    return {
      ...component,
      scrollbar: {
        show,
        hide,
        updateBounds,
        updatePosition,
      },
    };
  };
}
