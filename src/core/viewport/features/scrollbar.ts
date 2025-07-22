// src/core/viewport/features/scrollbar.ts

/**
 * Scrollbar Feature - Custom scrollbar implementation
 * Provides visual scroll indication and drag-to-scroll functionality
 */

import type { ViewportContext, ViewportComponent } from "../types";
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
  return <T extends ViewportContext & ViewportComponent>(
    component: T
  ): T & ScrollbarComponent => {
    const {
      enabled = true,
      autoHide = true,
      trackWidth = 8,
      thumbMinHeight = 20,
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

    console.error("withScrollbar");

    // State
    let viewportElement: HTMLElement | null = null;
    let scrollbarTrack: HTMLElement | null = null;
    let scrollbarThumb: HTMLElement | null = null;
    let isInitialized = false;

    // Scrollbar state
    let isDragging = false;
    let dragStartY = 0;
    let dragStartScrollPosition = 0;
    let hideTimeout: ReturnType<typeof setTimeout> | null = null;
    let totalVirtualSize = 0;
    let containerSize = 0;
    let thumbHeight = 0;
    let isVisible = true;

    /**
     * Create scrollbar elements
     */
    const createScrollbarElements = () => {
      if (!viewportElement) return;

      // Create track
      scrollbarTrack = document.createElement("div");
      scrollbarTrack.className = "mtrl-vlist__scrollbar";
      scrollbarTrack.style.cssText = `
        position: absolute;
        top: 0;
        right: 0;
        width: ${trackWidth}px;
        height: 100%;
        z-index: 10;
      `;

      // Create thumb
      scrollbarThumb = document.createElement("div");
      scrollbarThumb.className = "mtrl-vlist__scrollbar-thumb";
      scrollbarThumb.style.cssText = `
        position: absolute;
        top: 0;
        width: 100%;
        border-radius: 4px;
        min-height: 20px;
        cursor: grab;
        transition: background 0.2s;
      `;

      scrollbarTrack.appendChild(scrollbarThumb);
      viewportElement.appendChild(scrollbarTrack);
    };

    /**
     * Show scrollbar
     */
    const show = () => {
      if (!scrollbarTrack || totalVirtualSize <= containerSize) return;

      if (hideTimeout) {
        clearTimeout(hideTimeout);
        hideTimeout = null;
      }

      scrollbarTrack.classList.add("mtrl-vlist__scrollbar--visible");

      // Auto-hide after delay
      if (config.autoHide && !isDragging) {
        hideTimeout = setTimeout(hide, config.fadeTimeout);
      }
    };

    /**
     * Hide scrollbar
     */
    const hide = () => {
      if (!scrollbarTrack || isDragging) return;
      scrollbarTrack.classList.remove("mtrl-vlist__scrollbar--visible");
    };

    /**
     * Update scrollbar bounds and visibility
     */
    const updateBounds = (newTotalSize: number, newContainerSize: number) => {
      totalVirtualSize = newTotalSize;
      containerSize = newContainerSize;

      if (!scrollbarTrack || !scrollbarThumb) return;

      // Update visibility
      const needsScrollbar = totalVirtualSize > containerSize;
      scrollbarTrack.style.display = needsScrollbar ? "block" : "none";

      if (needsScrollbar) {
        // Calculate thumb height
        const scrollRatio = containerSize / totalVirtualSize;
        const calculatedHeight = Math.max(
          config.thumbMinHeight || 20,
          scrollRatio * containerSize
        );
        thumbHeight = calculatedHeight;

        // Update thumb size
        scrollbarThumb.style.height = `${thumbHeight}px`;

        // Update thumb position
        const currentPosition = component.viewport?.getScrollPosition() || 0;
        updatePosition(currentPosition);
      }
    };

    /**
     * Update scrollbar thumb position based on scroll position
     */
    const updatePosition = (scrollPos: number) => {
      if (!scrollbarThumb || !scrollbarTrack) return;

      const scrollableDistance = totalVirtualSize - containerSize;
      if (scrollableDistance <= 0) return;

      const scrollRatio = Math.min(
        1,
        Math.max(0, scrollPos / scrollableDistance)
      );
      const trackHeight = scrollbarTrack.clientHeight;
      const currentThumbHeight = scrollbarThumb.clientHeight;
      const maxThumbPosition = trackHeight - currentThumbHeight;
      const thumbPosition = scrollRatio * maxThumbPosition;

      scrollbarThumb.style.transform = `translateY(${thumbPosition}px)`;
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

      if (component.viewport) {
        component.viewport.scrollToPosition(targetScrollPosition);
      }
    };

    /**
     * Handle mouse down on thumb
     */
    const handleThumbMouseDown = (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();

      isDragging = true;
      dragStartY = e.clientY;
      dragStartScrollPosition = component.viewport?.getScrollPosition() || 0;

      if (scrollbarThumb) {
        scrollbarThumb.classList.add("mtrl-vlist__scrollbar-thumb--dragging");
      }

      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    };

    /**
     * Handle mouse move during drag
     */
    const handleMouseMove = (e: MouseEvent) => {
      if (
        !isDragging ||
        !component.viewport ||
        !scrollbarTrack ||
        !scrollbarThumb
      )
        return;

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
      const newPosition = newScrollRatio * (totalVirtualSize - containerSize);

      component.viewport.scrollToPosition(newPosition);
    };

    /**
     * Handle mouse up
     */
    const handleMouseUp = () => {
      isDragging = false;

      if (scrollbarThumb) {
        scrollbarThumb.classList.remove(
          "mtrl-vlist__scrollbar-thumb--dragging"
        );
      }

      hide();

      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);

      // Resume auto-hide
      if (autoHide) {
        show();
      }
    };

    // Initialize function
    const initialize = () => {
      // Prevent multiple initializations
      if (isInitialized) {
        console.log("[Scrollbar] Already initialized, skipping");
        return;
      }

      // Get the viewport element (created by base feature)
      viewportElement = component.element?.querySelector(
        ".mtrl-viewport"
      ) as HTMLElement;

      if (!viewportElement) {
        console.warn("[Scrollbar] No viewport element found");
        return;
      }

      // Check if scrollbar already exists
      if (viewportElement.querySelector(".mtrl-list__scrollbar")) {
        console.log(
          "[Scrollbar] Scrollbar already exists, skipping initialization"
        );
        return;
      }

      console.log(
        "[Scrollbar] Initializing with viewport element:",
        viewportElement
      );
      createScrollbarElements();
      isInitialized = true;

      if (scrollbarTrack && viewportElement) {
        // Add event listeners
        scrollbarTrack.addEventListener("click", handleTrackClick);

        if (scrollbarThumb) {
          scrollbarThumb.addEventListener("mousedown", handleThumbMouseDown);
        }

        // Show on hover
        viewportElement.addEventListener("mouseenter", show);
        viewportElement.addEventListener("mouseleave", () => {
          if (!isDragging) hide();
        });
      }

      // Initialize with current viewport state
      if (component.viewport) {
        const info = component.viewport.getViewportInfo();
        totalVirtualSize = info.totalVirtualSize;
        containerSize = info.containerSize;
        updateBounds(totalVirtualSize, containerSize);
        updatePosition(component.viewport.getScrollPosition());
      }

      // Listen for scroll events
      component.on?.("viewport:scroll", (data: any) => {
        // Update position whenever viewport scrolls
        if (!isDragging) {
          updatePosition(data.position);
        }
        show();
      });

      // Listen for virtual size changes
      component.on?.("viewport:virtual-size-changed", (data: any) => {
        totalVirtualSize = data.totalVirtualSize;
        updateBounds(data.totalVirtualSize, containerSize);
      });

      // Listen for container size changes
      component.on?.("viewport:container-size-changed", (data: any) => {
        containerSize = data.containerSize;
        updateBounds(totalVirtualSize, data.containerSize);
      });
    };

    // Store initialize function
    (component as any)._scrollbarInitialize = initialize;

    // Hook into viewport initialization
    const originalInitialize = component.viewport.initialize;
    component.viewport.initialize = () => {
      originalInitialize();

      // Initialize scrollbar after viewport is ready
      initialize();
    };

    // Cleanup function
    const destroy = () => {
      if (scrollbarTrack) {
        scrollbarTrack.remove();
        scrollbarTrack = null;
      }
      scrollbarThumb = null;
      viewportElement = null;
      isInitialized = false;

      // Clear timeout
      if (hideTimeout) {
        clearTimeout(hideTimeout);
        hideTimeout = null;
      }

      // Remove global event listeners
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };

    // Store functions for viewport to call
    (component as any)._scrollbarDestroy = destroy;

    // Hook into component destroy
    if ("destroy" in component && typeof component.destroy === "function") {
      const originalDestroy = component.destroy;
      component.destroy = () => {
        destroy();
        originalDestroy?.();
      };
    }

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
