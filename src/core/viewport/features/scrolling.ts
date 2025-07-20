/**
 * Scrolling Module - Virtual scrolling with integrated velocity tracking
 * Handles wheel events, scroll position management, scrollbar interactions, and velocity measurement
 */

import type { ViewportHost } from "../types";
import { VIEWPORT_CONSTANTS } from "../constants";

export interface ScrollingConfig {
  orientation?: "vertical" | "horizontal";
  sensitivity?: number;
  smoothing?: boolean;
  onScrollPositionChanged?: (data: {
    position: number;
    direction: "forward" | "backward";
    previousPosition?: number;
  }) => void;
}

export interface ScrollingFeature {
  name: string;
  initialize: (viewport: ViewportHost) => void;
  destroy: () => void;
  handleWheel: (event: WheelEvent) => void;
  scrollToPosition: (position: number, source?: string) => void;
  scrollToIndex: (
    index: number,
    alignment?: "start" | "center" | "end"
  ) => void;
  getScrollPosition: () => number;
  updateScrollBounds: (totalSize: number, containerSize: number) => void;
}

/**
 * Creates scrolling functionality for viewport
 */
export function createScrollingFeature(
  config: ScrollingConfig = {}
): ScrollingFeature {
  const {
    orientation = "vertical",
    sensitivity = VIEWPORT_CONSTANTS.VIRTUAL_SCROLL.SCROLL_SENSITIVITY,
    smoothing = false,
    onScrollPositionChanged,
  } = config;

  let scrollPosition = 0;
  let totalVirtualSize = 0;
  let containerSize = 0;
  let viewportElement: HTMLElement | null = null;
  let itemsContainer: HTMLElement | null = null;
  let getEstimatedItemSize: (() => number) | null = null;
  let calculateVisibleRange:
    | ((scrollPos: number) => { start: number; end: number })
    | null = null;
  let renderItems: (() => void) | null = null;
  let getTotalItems: (() => number) | null = null;

  const clamp = (value: number, min: number, max: number) => {
    return Math.max(min, Math.min(max, value));
  };

  const handleWheel = (event: WheelEvent) => {
    event.preventDefault();

    const delta = orientation === "vertical" ? event.deltaY : event.deltaX;
    const scrollDelta = delta * sensitivity;

    const previousPosition = scrollPosition;
    const maxScroll = Math.max(0, totalVirtualSize - containerSize);

    let newPosition = scrollPosition + scrollDelta;
    newPosition = clamp(newPosition, 0, maxScroll);

    if (newPosition !== scrollPosition) {
      scrollPosition = newPosition;
      updateContainerPosition();

      const direction = newPosition > previousPosition ? "forward" : "backward";
      onScrollPositionChanged?.({
        position: scrollPosition,
        direction,
        previousPosition,
      });

      // Trigger render
      if (renderItems) {
        renderItems();
      }
    }
  };

  const scrollToPosition = (position: number, source?: string) => {
    const maxScroll = Math.max(0, totalVirtualSize - containerSize);
    const clampedPosition = clamp(position, 0, maxScroll);

    if (clampedPosition !== scrollPosition) {
      const previousPosition = scrollPosition;
      scrollPosition = clampedPosition;
      updateContainerPosition();

      const direction =
        clampedPosition > previousPosition ? "forward" : "backward";
      onScrollPositionChanged?.({
        position: scrollPosition,
        direction,
        previousPosition,
      });

      // Trigger render
      if (renderItems) {
        renderItems();
      }
    }
  };

  const scrollToIndex = (
    index: number,
    alignment: "start" | "center" | "end" = "start"
  ) => {
    if (!getEstimatedItemSize) return;

    const itemSize = getEstimatedItemSize();
    const totalItems = getTotalItems?.() || 1000000; // Get from collection
    const actualTotalSize = totalItems * itemSize;
    const MAX_VIRTUAL_SIZE = 10 * 1000 * 1000;
    const isCompressed = actualTotalSize > MAX_VIRTUAL_SIZE;

    let targetPosition: number;

    if (isCompressed) {
      // In compressed space, map index to virtual position
      const ratio = index / totalItems;
      targetPosition = ratio * Math.min(actualTotalSize, MAX_VIRTUAL_SIZE);
    } else {
      // Direct calculation when not compressed
      targetPosition = index * itemSize;
    }

    // Adjust position based on alignment
    switch (alignment) {
      case "center":
        targetPosition -= containerSize / 2 - itemSize / 2;
        break;
      case "end":
        targetPosition -= containerSize - itemSize;
        break;
    }

    scrollToPosition(targetPosition);
  };

  const updateContainerPosition = () => {
    // Container doesn't move - items are positioned individually with transforms
    // This follows the virtual scrolling pattern from list-manager
  };

  const updateScrollBounds = (totalSize: number, containerSz: number) => {
    totalVirtualSize = totalSize;
    containerSize = containerSz;
  };

  return {
    name: "scrolling",

    initialize(viewport) {
      viewportElement = viewport.element;
      itemsContainer = viewport.itemsContainer;
      getEstimatedItemSize = viewport.getEstimatedItemSize;
      calculateVisibleRange = viewport.calculateVisibleRange;
      renderItems = viewport.renderItems;
      getTotalItems = viewport.getTotalItems;

      // Setup wheel event listener
      if (viewportElement) {
        viewportElement.addEventListener("wheel", handleWheel, {
          passive: false,
        });
      }

      // Set initial container styles
      if (itemsContainer) {
        itemsContainer.style.willChange = "transform";
        itemsContainer.style.transition = smoothing
          ? "transform 0.1s ease-out"
          : "none";
      }
    },

    destroy() {
      if (viewportElement) {
        viewportElement.removeEventListener("wheel", handleWheel);
      }
    },

    // Public API
    handleWheel,
    scrollToPosition,
    scrollToIndex,
    getScrollPosition: () => scrollPosition,
    updateScrollBounds,
  };
}
