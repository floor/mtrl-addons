// src/core/viewport/features/with-viewport.ts

import type { BaseComponent } from "mtrl/src/core";
import type { ViewportHost, ViewportConfig } from "../types";
import { createCollectionFeature } from "./collection";
import { createScrollingFeature } from "./scrolling";
import { createScrollbarFeature } from "./scrollbar";

export interface ViewportFeature {
  initialize: () => void;
  updateViewport: () => void;
  scrollToIndex: (
    index: number,
    alignment?: "start" | "center" | "end"
  ) => void;
  scrollToPosition: (position: number) => void;
  getScrollPosition: () => number;
  getVisibleRange: () => { start: number; end: number };
  getViewportInfo: () => {
    containerSize: number;
    totalVirtualSize: number;
    visibleRange: { start: number; end: number };
    virtualScrollPosition: number;
  };
  renderItems: () => void;
  collection?: any;
}

/**
 * Creates viewport functionality for virtual scrolling
 */
export function withViewport<T extends BaseComponent>(
  config: ViewportConfig = {}
) {
  return (component: T): T & { viewport: ViewportFeature } => {
    let isInitialized = false;
    let viewportElement: HTMLElement | null = null;
    let itemsContainer: HTMLElement | null = null;
    let collectionFeature: any = null;
    let scrollingFeature: any = null;
    let scrollbarFeature: any = null;

    const estimatedItemSize = config.estimatedItemSize || 50;
    const overscan = config.overscan || 5;

    // Store collection config for later initialization
    let collectionConfig: any = null;
    if (config.collection || config.features?.collection) {
      collectionConfig = config.collection || config.features?.collection;
    }

    // Create scrolling feature
    scrollingFeature = createScrollingFeature({
      orientation: config.orientation || "vertical",
      sensitivity: config.scrollSensitivity,
      smoothing: config.smoothScrolling,
      onScrollPositionChanged: (data) => {
        // Update scrollbar
        if (scrollbarFeature) {
          scrollbarFeature.updateScrollPosition(data.position);
        }

        // Trigger render on scroll
        renderItems();

        // Load missing ranges based on visible area
        if (collectionFeature && collectionFeature.isInitialized()) {
          const visibleRange = calculateVisibleRange(data.position);
          collectionFeature.loadMissingRanges(visibleRange);
        }
      },
    });

    // Create scrollbar feature
    scrollbarFeature = createScrollbarFeature({
      enabled: config.enableScrollbar !== false,
      onScrollPositionChanged: (position, source) => {
        scrollingFeature.scrollToPosition(position, source);
      },
    });

    const calculateVisibleRange = (scrollPosition: number) => {
      const containerSize = viewportElement?.offsetHeight || 600;
      const startIndex = Math.floor(scrollPosition / estimatedItemSize);
      const visibleCount = Math.ceil(containerSize / estimatedItemSize);
      const endIndex = startIndex + visibleCount + overscan;

      return {
        start: Math.max(0, startIndex - overscan),
        end: endIndex,
      };
    };

    const renderItems = () => {
      if (!itemsContainer || !isInitialized) return;

      // Clear existing items
      itemsContainer.innerHTML = "";

      // Get items to render
      let items: any[] = [];
      let totalItems = 0;

      if (collectionFeature) {
        items = collectionFeature.getItems();
        totalItems = collectionFeature.getTotalItems();
      } else if (component.items) {
        items = component.items;
        totalItems = items.length;
      }

      console.log(
        `🎨 [VIEWPORT] Rendering items: ${
          items.length
        } items, total: ${totalItems}, template: ${typeof config.template}`
      );

      // Calculate visible range based on scroll position
      const scrollPosition = scrollingFeature.getScrollPosition();
      const visibleRange = calculateVisibleRange(scrollPosition);

      // Update scroll bounds
      const totalVirtualSize = totalItems * estimatedItemSize;
      const containerSize = viewportElement?.offsetHeight || 600;
      scrollingFeature.updateScrollBounds(totalVirtualSize, containerSize);
      scrollbarFeature.updateBounds(totalVirtualSize, containerSize);

      // Update items container height
      itemsContainer.style.height = `${totalVirtualSize}px`;

      console.log(
        `🎯 [VIEWPORT] Visible range: ${visibleRange.start} to ${visibleRange.end}`
      );

      // Render visible items
      let renderedCount = 0;
      for (
        let i = visibleRange.start;
        i < Math.min(visibleRange.end, totalItems);
        i++
      ) {
        const item = items[i];
        if (!item) {
          console.log(`⚠️ [VIEWPORT] No item at index ${i}`);
          continue;
        }

        // Create item element
        let itemElement: HTMLElement;
        if (config.template) {
          const result = config.template(item, i);
          if (typeof result === "string") {
            itemElement = document.createElement("div");
            itemElement.innerHTML = result;
          } else {
            itemElement = result;
          }
        } else {
          console.log(`⚠️ [VIEWPORT] No template provided, using default`);
          itemElement = document.createElement("div");
          itemElement.textContent = `Item ${i}`;
        }

        // Position item absolutely
        itemElement.style.position = "absolute";
        itemElement.style.top = `${i * estimatedItemSize}px`;
        itemElement.style.left = "0";
        itemElement.style.right = "0";
        itemElement.style.height = `${estimatedItemSize}px`;

        itemsContainer.appendChild(itemElement);
        renderedCount++;
      }

      console.log(`✅ [VIEWPORT] Rendered ${renderedCount} items`);

      // Emit render complete event
      component.emit?.("render:complete", {
        visibleRange,
        totalItems,
      });
    };

    const viewportInterface: ViewportFeature = {
      initialize: () => {
        if (isInitialized) return;

        // Create viewport structure
        viewportElement = document.createElement("div");
        viewportElement.className = "mtrl-viewport";
        viewportElement.style.cssText = `
          position: relative;
          width: 100%;
          height: 100%;
          overflow: hidden;
        `;

        itemsContainer = document.createElement("div");
        itemsContainer.className = "mtrl-viewport-items";
        itemsContainer.style.cssText = `
          position: relative;
          width: 100%;
        `;

        viewportElement.appendChild(itemsContainer);
        component.element.appendChild(viewportElement);

        // Create viewport host for features
        const viewportHost: ViewportHost = {
          element: viewportElement,
          getEstimatedItemSize: () => estimatedItemSize,
          getTotalVirtualSize: () => {
            const totalItems = collectionFeature
              ? collectionFeature.getTotalItems()
              : component.items?.length || 0;
            return totalItems * estimatedItemSize;
          },
          calculateVisibleRange: (scrollPos: number) =>
            calculateVisibleRange(scrollPos),
          renderItems,
          itemsContainer,
        } as any;

        // Initialize features
        scrollingFeature.initialize(viewportHost);
        scrollbarFeature.initialize(viewportHost);

        // Create and initialize collection feature if configured
        if (collectionConfig) {
          // Create a viewport component wrapper for collection feature
          const viewportComponent = {
            ...component,
            viewport: viewportInterface,
            element: viewportElement,
            items: component.items || [],
            totalItems: component.items?.length || 0,
          };

          // Prepare collection feature config
          const collectionFeatureConfig = {
            collection:
              collectionConfig.adapter ||
              collectionConfig.collection ||
              collectionConfig,
            rangeSize: collectionConfig.rangeSize,
            strategy: collectionConfig.strategy,
            enablePlaceholders: collectionConfig.enablePlaceholders,
            maskCharacter: collectionConfig.maskCharacter,
          };

          collectionFeature = createCollectionFeature(
            viewportComponent as any,
            collectionFeatureConfig
          );

          // Listen for collection events to trigger rendering
          component.on?.("collection:range-loaded", () => {
            console.log(
              "📦 [VIEWPORT] Collection range loaded, rendering items"
            );
            // Small delay to ensure collection has updated its internal state
            setTimeout(() => {
              renderItems();
            }, 0);
          });

          component.on?.("collection:total-changed", () => {
            console.log(
              "📊 [VIEWPORT] Collection total changed, updating bounds"
            );
            const totalItems = collectionFeature.getTotalItems();
            const totalVirtualSize = totalItems * estimatedItemSize;
            const containerSize = viewportElement?.offsetHeight || 600;
            scrollingFeature.updateScrollBounds(
              totalVirtualSize,
              containerSize
            );
            scrollbarFeature.updateBounds(totalVirtualSize, containerSize);
            renderItems();
          });

          collectionFeature.initialize();

          // Initial load
          const initialRange = { start: 0, end: 20 };
          collectionFeature.loadRange(initialRange);
        }

        isInitialized = true;

        // Initial render
        renderItems();
      },

      updateViewport: () => {
        renderItems();
      },

      scrollToIndex: (
        index: number,
        alignment?: "start" | "center" | "end"
      ) => {
        scrollingFeature.scrollToIndex(index, alignment);
      },

      scrollToPosition: (position: number) => {
        scrollingFeature.scrollToPosition(position);
      },

      getScrollPosition: () => scrollingFeature.getScrollPosition(),

      getVisibleRange: () => {
        const scrollPosition = scrollingFeature.getScrollPosition();
        return calculateVisibleRange(scrollPosition);
      },

      getViewportInfo: () => ({
        containerSize: viewportElement?.offsetHeight || 600,
        totalVirtualSize:
          (collectionFeature?.getTotalItems() || component.items?.length || 0) *
          estimatedItemSize,
        visibleRange: viewportInterface.getVisibleRange(),
        virtualScrollPosition: scrollingFeature.getScrollPosition(),
      }),

      renderItems,
    };

    // Add collection getter dynamically
    Object.defineProperty(viewportInterface, "collection", {
      get: () => collectionFeature,
      enumerable: true,
      configurable: true,
    });

    // Auto-initialize when items are set
    const originalEmit = component.emit;
    if (originalEmit) {
      component.emit = function (event: string, data?: any) {
        originalEmit.call(this, event, data);
        if (event === "items:set" && isInitialized) {
          if (collectionFeature) {
            collectionFeature.setItems(data.items || []);
          }
          renderItems();
        }
      };
    }

    // Initialize on next tick if we have items or collection
    setTimeout(() => {
      if (component.items && component.items.length > 0) {
        viewportInterface.initialize();
      } else if (config.collection || config.features?.collection) {
        // Initialize even without items if we have a collection
        viewportInterface.initialize();
      }
    }, 0);

    return {
      ...component,
      viewport: viewportInterface,
    };
  };
}
