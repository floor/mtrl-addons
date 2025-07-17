/**
 * Rendering - Item rendering and positioning for viewport
 *
 * This viewport module handles all aspects of rendering items in the virtual viewport,
 * including DOM element creation, positioning, recycling, and updates.
 */

import type { ListManagerComponent, ItemRange } from "../../types";
import type { ItemSizeManager } from "./item-size";
import type { VirtualManager } from "./virtual";
import type { ScrollingManager } from "./scrolling";
import { getDefaultTemplate } from "./template";

export interface RenderingConfig {
  orientation: "vertical" | "horizontal";
  overscan: number;
  loadDataForRange?: (range: { start: number; end: number }) => void;
}

export interface RenderingManager {
  renderItems(): void;
  updateItemPositions(): void;
  getRenderedElements(): Map<number, HTMLElement>;
  setItemsContainer(container: HTMLElement): void;
  clear(): void;
}

/**
 * Creates a rendering manager for virtual viewport item rendering
 */
export const createRenderingManager = (
  component: ListManagerComponent,
  itemSizeManager: ItemSizeManager,
  virtualManager: VirtualManager,
  scrollingManager: ScrollingManager,
  config: RenderingConfig,
  getActualTotalItems: () => number
): RenderingManager => {
  const { orientation, overscan, loadDataForRange } = config;

  // Items container reference
  let itemsContainer: HTMLElement | null = null;

  // Rendered elements cache and virtual range tracking
  const renderedElements = new Map<number, HTMLElement>();
  let currentVisibleRange: ItemRange = { start: 0, end: 0 };

  /**
   * Set the items container element
   */
  const setItemsContainer = (container: HTMLElement): void => {
    itemsContainer = container;
  };

  /**
   * Clear all rendered elements
   */
  const clear = (): void => {
    renderedElements.clear();
    if (itemsContainer) {
      itemsContainer.innerHTML = "";
    }
  };

  /**
   * Render items in the visible range
   */
  const renderItems = (): void => {
    if (!itemsContainer) {
      return;
    }

    // Skip initial render if no data is loaded yet and we have a large total
    // This prevents unnecessary rendering before the collection loads initial data
    const totalItems = getActualTotalItems();
    if (component.items.length === 0 && totalItems > 0) {
      console.log(
        `⏳ [VIEWPORT] Skipping render - waiting for initial data (total: ${totalItems.toLocaleString()})`
      );
      return;
    }

    const newVisibleRange = virtualManager.calculateVisibleRange(
      scrollingManager.getScrollPosition()
    );

    // Always update item positions when scrolling, even if range hasn't changed
    // This ensures smooth scrolling without snapping
    const rangeChanged =
      newVisibleRange.start !== currentVisibleRange.start ||
      newVisibleRange.end !== currentVisibleRange.end;

    // Update positions even if range hasn't changed
    if (!rangeChanged && renderedElements.size > 0) {
      // Check if we have all the items in the visible range rendered
      let hasAllVisibleItems = true;
      for (let i = newVisibleRange.start; i <= newVisibleRange.end; i++) {
        if (
          i < component.items.length &&
          component.items[i] &&
          !renderedElements.has(i)
        ) {
          hasAllVisibleItems = false;
          break;
        }
      }

      // Only skip rendering if we have all visible items already rendered
      if (hasAllVisibleItems) {
        updateItemPositions();
        return;
      }
    }

    // Proactively load data for visible range AND upcoming ranges
    console.log(
      `🔍 [VIEWPORT] Checking range ${newVisibleRange.start}-${newVisibleRange.end} for missing data`
    );

    const actualTotalItems = getActualTotalItems();

    // Try immediate detection first
    const collection = (component as any).collection;
    const hasCollection = !!collection;
    const hasLoadMissingRanges =
      hasCollection && typeof collection.loadMissingRanges === "function";

    console.log(
      `🔍 [VIEWPORT] Collection check: hasCollection=${hasCollection}, hasLoadMissingRanges=${hasLoadMissingRanges}, items.length=${component.items.length}, actualTotalItems=${actualTotalItems}`
    );

    // Calculate extended range for proactive loading
    const itemsPerViewport = Math.ceil(
      virtualManager.getState().containerSize /
        itemSizeManager.getEstimatedItemSize()
    );

    // DISABLED PREFETCH: Set to 0 to avoid loading wrong ranges
    // TODO: Fix the range calculation before re-enabling prefetch
    const prefetchBuffer = 0; // Was: Math.ceil(itemsPerViewport * 2);
    const extendedRange = {
      start: Math.max(0, newVisibleRange.start - prefetchBuffer),
      end: Math.min(actualTotalItems - 1, newVisibleRange.end + prefetchBuffer),
    };

    // Check for missing data in visible and extended ranges
    if (hasLoadMissingRanges) {
      // Count missing items in visible range
      let visibleMissingCount = 0;
      const visibleMissingIndices: number[] = [];

      for (let i = newVisibleRange.start; i <= newVisibleRange.end; i++) {
        // Skip if index is beyond actual total items
        if (i >= actualTotalItems) {
          break;
        }

        // Check if item is missing (null, undefined, or array doesn't extend to this index)
        const itemExists =
          i < component.items.length &&
          component.items[i] !== null &&
          component.items[i] !== undefined;

        if (!itemExists) {
          visibleMissingCount++;
          visibleMissingIndices.push(i);
        }
      }

      // Count missing items in extended range (excluding visible range)
      let extendedMissingCount = 0;
      const extendedMissingIndices: number[] = [];

      for (let i = extendedRange.start; i <= extendedRange.end; i++) {
        // Skip visible range (already counted)
        if (i >= newVisibleRange.start && i <= newVisibleRange.end) {
          continue;
        }

        // Skip if index is beyond actual total items
        if (i >= actualTotalItems) {
          break;
        }

        // Check if item is missing
        const itemExists =
          i < component.items.length &&
          component.items[i] !== null &&
          component.items[i] !== undefined;

        if (!itemExists) {
          extendedMissingCount++;
          extendedMissingIndices.push(i);
        }
      }

      // Load visible range with high priority
      if (visibleMissingCount > 0) {
        console.log(
          `🔄 [VIEWPORT] Loading ${visibleMissingCount} missing visible items in range ${newVisibleRange.start}-${newVisibleRange.end}`
        );
        console.log(
          `🔍 [VIEWPORT] Visible missing indices: [${visibleMissingIndices
            .slice(0, 10)
            .join(", ")}${visibleMissingIndices.length > 10 ? "..." : ""}]`
        );

        // Trigger collection to load missing visible ranges (high priority)
        collection.loadMissingRanges(newVisibleRange).catch((error: any) => {
          console.error("❌ [VIEWPORT] Failed to load visible ranges:", error);
        });
      }

      // Load extended range with lower priority (proactive)
      // Skip if prefetch is disabled (prefetchBuffer === 0)
      if (extendedMissingCount > 0 && prefetchBuffer > 0) {
        console.log(
          `🚀 [VIEWPORT] Proactively loading ${extendedMissingCount} missing items in extended range ${extendedRange.start}-${extendedRange.end}`
        );
        console.log(
          `🔍 [VIEWPORT] Extended missing indices: [${extendedMissingIndices
            .slice(0, 10)
            .join(", ")}${extendedMissingIndices.length > 10 ? "..." : ""}]`
        );

        // Use loading manager for proactive loads
        if (loadDataForRange) {
          console.log(
            `📡 [VIEWPORT] Using loading manager for extended range ${extendedRange.start}-${extendedRange.end}`
          );
          loadDataForRange(extendedRange);
        } else {
          // Fallback to direct collection call
          collection.loadMissingRanges(extendedRange).catch((error: any) => {
            console.error(
              "❌ [VIEWPORT] Failed to load extended range:",
              error
            );
          });
        }
      }

      if (visibleMissingCount === 0 && extendedMissingCount === 0) {
        console.log(
          `✅ [VIEWPORT] All items in visible range ${newVisibleRange.start}-${newVisibleRange.end} and extended range ${extendedRange.start}-${extendedRange.end} are loaded`
        );
      }
    }

    // Recycle out-of-range items
    const buffer = overscan; // Reduced from overscan * 2 for fewer DOM elements
    const recycleStart = newVisibleRange.start - buffer;
    const recycleEnd = newVisibleRange.end + buffer;

    for (const [index, element] of renderedElements) {
      if (index < recycleStart || index > recycleEnd) {
        // Remove from DOM
        element.remove();
        renderedElements.delete(index);
      }
    }

    console.log(
      `♻️ [VIEWPORT] Removed out-of-range elements, renderedElements now: ${renderedElements.size}`
    );

    // Render new items
    const newElements: { element: HTMLElement; index: number }[] = [];

    for (let i = newVisibleRange.start; i <= newVisibleRange.end; i++) {
      if (i >= component.items.length) {
        console.log(
          `⚠️ [VIEWPORT] Breaking at index ${i} - items.length: ${component.items.length}`
        );
        break;
      }

      const item = component.items[i];

      if (!item) {
        continue; // Skip empty slots
      }

      // Skip if already rendered
      if (renderedElements.has(i)) {
        continue;
      }

      // Create element
      const element = renderItem(item, i);
      if (element) {
        itemsContainer.appendChild(element);
        renderedElements.set(i, element);
        newElements.push({ element, index: i });
      }
    }

    // Update visible range
    currentVisibleRange = newVisibleRange;

    // Emit event
    component.emit?.("range:rendered", {
      range: newVisibleRange,
      renderedCount: renderedElements.size,
    });

    // Batch measure new elements for performance
    if (newElements.length > 0) {
      // Use requestAnimationFrame to measure after browser layout
      requestAnimationFrame(() => {
        newElements.forEach(({ element, index }) => {
          itemSizeManager.measureItem(element, index, orientation);
        });

        // Update positions after measuring
        updateItemPositions();
      });
    } else {
      // Update positions immediately if no new elements
      updateItemPositions();
    }
  };

  /**
   * Render a single item element
   */
  const renderItem = (item: any, index: number): HTMLElement | null => {
    let template = component.template;

    // Use default template if none provided
    if (!template) {
      template = getDefaultTemplate();
    }

    try {
      let element: HTMLElement;

      // Always create fresh element from template
      const result = template(item, index);
      if (typeof result === "string") {
        const wrapper = document.createElement("div");
        wrapper.innerHTML = result;
        element = wrapper.firstElementChild as HTMLElement;
      } else if (result instanceof HTMLElement) {
        element = result;
      } else {
        return null;
      }

      // Apply base styles for virtual positioning
      element.style.position = "absolute";
      element.style.left = "0";
      element.style.right = "0"; // For vertical, full width
      element.style.boxSizing = "border-box";
      element.style.willChange = "transform";
      element.style.visibility = "visible"; // Make visible immediately

      if (orientation === "horizontal") {
        element.style.top = "0";
        element.style.bottom = "0"; // Full height for horizontal
        element.style.width = `${itemSizeManager.getEstimatedItemSize()}px`; // Initial width
      } else {
        element.style.height = `${itemSizeManager.getEstimatedItemSize()}px`; // Initial height
        element.style.width = "100%";
      }

      return element;
    } catch (error) {
      console.error(`Error rendering item at index ${index}:`, error);
      return null;
    }
  };

  /**
   * Update positions of rendered items
   */
  const updateItemPositions = () => {
    if (!itemsContainer || renderedElements.size === 0) return;

    const isHorizontal = orientation === "horizontal";
    const axis = isHorizontal ? "X" : "Y";

    // Get the current scroll position and visible range
    const scrollPosition = scrollingManager.getScrollPosition();
    const visibleRange = virtualManager.calculateVisibleRange(scrollPosition);

    // Get basic measurements
    const totalItems = getActualTotalItems();
    const itemSize = itemSizeManager.getEstimatedItemSize();
    const virtualTotalSize = virtualManager.getTotalVirtualSize();
    const containerSize = virtualManager.getState().containerSize;

    // Get all indices in sorted order
    const sortedIndices = Array.from(renderedElements.keys()).sort(
      (a, b) => a - b
    );

    if (sortedIndices.length === 0) return;

    // Calculate positioning based on the visible range
    let currentPosition = 0;
    const firstRenderedIndex = sortedIndices[0];
    const lastRenderedIndex = sortedIndices[sortedIndices.length - 1];

    if (totalItems > 100000) {
      // For index-based scrolling, we need special handling near the bottom
      const maxScrollPosition = virtualTotalSize - containerSize;
      const distanceFromBottom = maxScrollPosition - scrollPosition;
      const nearBottomThreshold = containerSize; // Within one viewport height

      if (
        distanceFromBottom <= nearBottomThreshold &&
        distanceFromBottom >= -1
      ) {
        // Near or at the bottom - use interpolation for smooth transition
        const lastItemIndex = totalItems - 1;
        const itemsInViewport = Math.ceil(containerSize / itemSize);
        const firstVisibleAtBottom = Math.max(
          0,
          lastItemIndex - itemsInViewport + 1
        );

        // Calculate normal scroll position
        const scrollRatio = scrollPosition / virtualTotalSize;
        const exactScrollIndex = scrollRatio * totalItems;

        // Interpolation factor: 0 when far from bottom, 1 when at bottom
        const interpolationFactor = Math.max(
          0,
          Math.min(1, 1 - distanceFromBottom / nearBottomThreshold)
        );

        // For the first rendered item, interpolate between normal and bottom positions
        const bottomPosition =
          (firstRenderedIndex - firstVisibleAtBottom) * itemSize;
        const normalPosition =
          (firstRenderedIndex - exactScrollIndex) * itemSize;

        // Interpolate between the two positions
        currentPosition =
          normalPosition +
          (bottomPosition - normalPosition) * interpolationFactor;
      } else {
        // For normal scrolling, calculate the exact scroll position in terms of items
        const scrollRatio = scrollPosition / virtualTotalSize;
        const exactScrollIndex = scrollRatio * totalItems;

        // Calculate offset from the exact scroll position
        const offset = firstRenderedIndex - exactScrollIndex;
        currentPosition = offset * itemSize;
      }
    } else {
      // For standard scrolling, position based on actual scroll position
      const firstItemPosition = firstRenderedIndex * itemSize;
      currentPosition = firstItemPosition - scrollPosition;
    }

    // Position each rendered item
    sortedIndices.forEach((index) => {
      const element = renderedElements.get(index);
      if (!element) return;

      // Get measured size for this item
      const size =
        itemSizeManager.getMeasuredSize(index) ||
        itemSizeManager.getEstimatedItemSize();

      // Position item relative to container
      element.style.position = "absolute";
      element.style.transform = `translate${axis}(${currentPosition}px)`;
      element.style.visibility = "visible";

      // Update dimensions
      if (isHorizontal) {
        element.style.width = `${size}px`;
        element.style.height = "100%";
        element.style.top = "0";
      } else {
        element.style.height = `${size}px`;
        element.style.width = "100%";
        element.style.left = "0";
      }

      // Move to next position
      currentPosition += size;
    });

    // Don't set container size to virtual size - keep it minimal
    // The scrollbar will handle the virtual size representation
    if (isHorizontal) {
      itemsContainer.style.width = "100%";
      itemsContainer.style.height = "100%";
    } else {
      itemsContainer.style.height = "100%";
      itemsContainer.style.width = "100%";
    }
  };

  return {
    renderItems,
    updateItemPositions,
    getRenderedElements: () => new Map(renderedElements),
    setItemsContainer,
    clear,
  };
};
