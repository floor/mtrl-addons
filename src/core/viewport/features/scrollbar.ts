// src/core/viewport/features/scrollbar.ts

import type { ViewportHost } from "../types";
import { VIEWPORT_CONSTANTS } from "../constants";

export interface ScrollbarConfig {
  enabled?: boolean;
  trackWidth?: number;
  thumbMinHeight?: number;
  thumbColor?: string;
  trackColor?: string;
  borderRadius?: number;
  fadeTimeout?: number;
  onScrollPositionChanged?: (position: number, source: string) => void;
}

export interface ScrollbarFeature {
  name: string;
  initialize: (viewport: ViewportHost) => void;
  destroy: () => void;
  updateScrollPosition: (position: number) => void;
  updateBounds: (totalVirtualSize: number, containerSize: number) => void;
  showScrollbar: () => void;
  hideScrollbar: () => void;
}

/**
 * Creates custom scrollbar functionality for viewport
 */
export function createScrollbarFeature(
  config: ScrollbarConfig = {}
): ScrollbarFeature {
  const {
    enabled = true,
    trackWidth = VIEWPORT_CONSTANTS.SCROLLBAR.TRACK_WIDTH,
    thumbMinHeight = VIEWPORT_CONSTANTS.SCROLLBAR.THUMB_MIN_HEIGHT,
    thumbColor = VIEWPORT_CONSTANTS.SCROLLBAR.THUMB_COLOR,
    trackColor = VIEWPORT_CONSTANTS.SCROLLBAR.TRACK_COLOR,
    borderRadius = VIEWPORT_CONSTANTS.SCROLLBAR.BORDER_RADIUS,
    fadeTimeout = VIEWPORT_CONSTANTS.SCROLLBAR.FADE_TIMEOUT,
    onScrollPositionChanged,
  } = config;

  if (!enabled) {
    return {
      name: "scrollbar",
      initialize: () => {},
      destroy: () => {},
      updateScrollPosition: () => {},
      showScrollbar: () => {},
      hideScrollbar: () => {},
    };
  }

  let viewportElement: HTMLElement | null = null;
  let scrollbarTrack: HTMLElement | null = null;
  let scrollbarThumb: HTMLElement | null = null;
  let fadeTimeoutId: number | null = null;
  let isDragging = false;
  let dragStartY = 0;
  let dragStartScrollRatio = 0;
  let totalVirtualSize = 0;
  let containerSize = 0;
  let scrollPosition = 0;

  const createScrollbarElements = () => {
    // Create scrollbar track
    scrollbarTrack = document.createElement("div");
    scrollbarTrack.className = "mtrl-viewport-scrollbar";
    console.log("🎨 [SCROLLBAR] Creating scrollbar element");
    scrollbarTrack.style.cssText = `
      position: absolute;
      top: 0;
      right: 0;
      width: ${trackWidth}px;
      height: 100%;
      background: ${trackColor};
      border-radius: ${borderRadius}px;
      cursor: pointer;
      z-index: 10;
    `;

    // Create scrollbar thumb
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

    scrollbarThumb.addEventListener("mouseenter", () => {
      if (!isDragging && scrollbarThumb) {
        scrollbarThumb.style.background = "#666666";
      }
    });

    scrollbarThumb.addEventListener("mouseleave", () => {
      if (!isDragging && scrollbarThumb) {
        scrollbarThumb.style.background = thumbColor;
      }
    });

    scrollbarTrack.appendChild(scrollbarThumb);
  };

  const updateScrollbarDimensions = () => {
    if (!scrollbarTrack || !scrollbarThumb || !totalVirtualSize) return;

    const visibleRatio = Math.min(containerSize / totalVirtualSize, 1);
    const thumbHeight = Math.max(
      thumbMinHeight,
      visibleRatio * scrollbarTrack.clientHeight
    );

    console.log(
      `📏 [SCROLLBAR] Dimensions - container: ${containerSize}, virtual: ${totalVirtualSize}, thumbHeight: ${thumbHeight}`
    );

    scrollbarThumb.style.height = `${thumbHeight}px`;
  };

  const updateScrollbarPosition = () => {
    if (!scrollbarTrack || !scrollbarThumb || totalVirtualSize <= containerSize)
      return;

    const scrollRatio = scrollPosition / (totalVirtualSize - containerSize);
    const trackHeight = scrollbarTrack.clientHeight;
    const thumbHeight = scrollbarThumb.clientHeight;
    const maxThumbTop = trackHeight - thumbHeight;
    const thumbTop = scrollRatio * maxThumbTop;

    scrollbarThumb.style.top = `${thumbTop}px`;
  };

  const showScrollbar = () => {
    if (!scrollbarTrack) return;

    if (fadeTimeoutId) {
      clearTimeout(fadeTimeoutId);
      fadeTimeoutId = null;
    }

    scrollbarTrack.classList.add("mtrl-viewport-scrollbar--visible");
  };

  const hideScrollbar = () => {
    if (!scrollbarTrack || isDragging) return;

    if (fadeTimeoutId) clearTimeout(fadeTimeoutId);

    fadeTimeoutId = window.setTimeout(() => {
      if (scrollbarTrack) {
        scrollbarTrack.classList.remove("mtrl-viewport-scrollbar--visible");
      }
      fadeTimeoutId = null;
    }, fadeTimeout);
  };

  const handleThumbMouseDown = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    isDragging = true;
    dragStartY = e.clientY;
    dragStartScrollRatio = scrollPosition / (totalVirtualSize - containerSize);

    if (scrollbarThumb) {
      scrollbarThumb.style.cursor = "grabbing";
    }

    document.addEventListener("mousemove", handleThumbDrag);
    document.addEventListener("mouseup", handleThumbMouseUp);

    showScrollbar();
  };

  const handleThumbDrag = (e: MouseEvent) => {
    if (!isDragging || !scrollbarTrack || !scrollbarThumb) return;

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
    const newScrollPosition =
      newScrollRatio * (totalVirtualSize - containerSize);

    onScrollPositionChanged?.(newScrollPosition, "scrollbar-drag");
  };

  const handleThumbMouseUp = () => {
    isDragging = false;

    if (scrollbarThumb) {
      scrollbarThumb.style.cursor = "grab";
    }

    document.removeEventListener("mousemove", handleThumbDrag);
    document.removeEventListener("mouseup", handleThumbMouseUp);

    hideScrollbar();
  };

  const handleTrackClick = (e: MouseEvent) => {
    if (isDragging || !scrollbarTrack || !scrollbarThumb) return;

    const rect = scrollbarTrack.getBoundingClientRect();
    const clickY = e.clientY - rect.top;
    const trackHeight = scrollbarTrack.clientHeight;
    const thumbHeight = scrollbarThumb.clientHeight;

    const newScrollRatio = Math.max(
      0,
      Math.min(1, (clickY - thumbHeight / 2) / (trackHeight - thumbHeight))
    );

    const newScrollPosition =
      newScrollRatio * (totalVirtualSize - containerSize);
    onScrollPositionChanged?.(newScrollPosition, "scrollbar");

    showScrollbar();
    hideScrollbar();
  };

  return {
    name: "scrollbar",

    initialize(viewport) {
      viewportElement = viewport.element;

      // Get dimensions from viewport
      containerSize = viewportElement.offsetHeight || 600;

      createScrollbarElements();

      if (scrollbarTrack && viewportElement) {
        console.log("🎯 [SCROLLBAR] Appending scrollbar to viewport");
        viewportElement.appendChild(scrollbarTrack);

        // Add event listeners
        scrollbarThumb?.addEventListener("mousedown", handleThumbMouseDown);
        scrollbarTrack.addEventListener("click", handleTrackClick);

        // Show/hide on hover
        viewportElement.addEventListener("mouseenter", showScrollbar);
        viewportElement.addEventListener("mouseleave", hideScrollbar);

        // Update dimensions
        updateScrollbarDimensions();
      }
    },

    destroy() {
      if (fadeTimeoutId) {
        clearTimeout(fadeTimeoutId);
      }

      scrollbarThumb?.removeEventListener("mousedown", handleThumbMouseDown);
      scrollbarTrack?.removeEventListener("click", handleTrackClick);
      viewportElement?.removeEventListener("mouseenter", showScrollbar);
      viewportElement?.removeEventListener("mouseleave", hideScrollbar);

      scrollbarTrack?.remove();
    },

    updateScrollPosition(position: number) {
      scrollPosition = position;
      updateScrollbarPosition();
    },

    updateBounds(newTotalVirtualSize: number, newContainerSize: number) {
      totalVirtualSize = newTotalVirtualSize;
      containerSize = newContainerSize;
      console.log(
        `📐 [SCROLLBAR] Bounds updated - virtual: ${totalVirtualSize}, container: ${containerSize}`
      );
      updateScrollbarDimensions();
      updateScrollbarPosition();
    },

    showScrollbar,
    hideScrollbar,
  };
}
