// src/core/viewport/features/manager.ts

import type { BaseComponent } from "mtrl/src/core";
import type { ViewportContext, ViewportConfig } from "../types";
import { createCollectionFeature } from "./collection";
import { createScrollingFeature } from "./scrolling";
import { createScrollbarFeature } from "./scrollbar";
import { createLoadingManager, type LoadingManager } from "./loading-manager";
import {
  createPlaceholderFeature,
  type PlaceholderFeature,
} from "./placeholders";
import { VIEWPORT_CONSTANTS } from "../constants";

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
 * Creates viewport manager with all features
 */
export function createViewportManager<T extends BaseComponent>(
  config: ViewportConfig = {}
) {
  return (component: T): T & { viewport: ViewportFeature } => {
    let isInitialized = false;
    let viewportElement: HTMLElement | null = null;
    let itemsContainer: HTMLElement | null = null;
    let collectionFeature: any = null;
    let scrollingFeature: any = null;
    let scrollbarFeature: any = null;
    let loadingManager: LoadingManager | null = null;
    let placeholderFeature: PlaceholderFeature | null = null;

    // Create a reference object that can be updated later
    const loadingManagerRef = { current: null as LoadingManager | null };

    // Callback for loading data through loading manager
    const loadDataForRange = (
      range: { start: number; end: number },
      priority: "high" | "normal" | "low" = "normal"
    ): void => {
      if (loadingManagerRef.current) {
        loadingManagerRef.current.requestLoad(range, priority);
      } else if (collectionFeature && collectionFeature.isInitialized()) {
        // Fallback to direct loading if no loading manager
        collectionFeature.loadMissingRanges(range);
      }
    };

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

        // Load missing ranges based on visible area
        if (collectionFeature && collectionFeature.isInitialized()) {
          const visibleRange = calculateVisibleRange(data.position);
          // Use the loadDataForRange callback which handles loading manager
          loadDataForRange(visibleRange, "high");
        }

        // Always render on scroll
        renderItems();
      },
      onSpeedChanged: (data) => {
        // Update loading manager velocity
        if (loadingManagerRef.current) {
          loadingManagerRef.current.updateVelocity(
            data.velocity,
            data.direction
          );
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
      const totalItems = collectionFeature?.getTotalItems() || 0;

      // Check if we're using compressed virtual space
      const MAX_VIRTUAL_SIZE = 10 * 1000 * 1000;
      const actualTotalSize = totalItems * estimatedItemSize;
      const totalVirtualSize = Math.min(actualTotalSize, MAX_VIRTUAL_SIZE);
      const isCompressed = actualTotalSize > totalVirtualSize;

      let startIndex: number;
      if (isCompressed && totalVirtualSize > 0) {
        // Map scroll position to item index using ratio
        const scrollRatio = Math.min(1, scrollPosition / totalVirtualSize);
        const exactIndex = scrollRatio * totalItems;
        startIndex = Math.floor(exactIndex);
      } else {
        // Direct calculation when not compressed
        startIndex = Math.floor(scrollPosition / estimatedItemSize);
      }

      const visibleCount = Math.ceil(containerSize / estimatedItemSize);
      const endIndex = startIndex + visibleCount + overscan;

      return {
        start: Math.max(0, startIndex - overscan),
        end: Math.min(totalItems - 1, endIndex),
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

      // Calculate virtual size with capping
      const MAX_VIRTUAL_SIZE = 10 * 1000 * 1000; // 10M pixels - well within browser limits
      const actualTotalSize = totalItems * estimatedItemSize;
      const totalVirtualSize = Math.min(actualTotalSize, MAX_VIRTUAL_SIZE);
      const containerSize = viewportElement?.offsetHeight || 600;

      scrollingFeature.updateScrollBounds(totalVirtualSize, containerSize);
      scrollbarFeature.updateBounds(totalVirtualSize, containerSize);

      // Don't set container height - use virtual scrolling instead
      // Items will be positioned using transforms

      console.log(
        `🎯 [VIEWPORT] Visible range: ${visibleRange.start} to ${visibleRange.end}`
      );

      // Check for missing items in visible range
      if (collectionFeature && collectionFeature.isInitialized()) {
        let hasMissingItems = false;
        const missingIndices: number[] = [];

        for (let i = visibleRange.start; i <= visibleRange.end; i++) {
          if (
            !items[i] ||
            (placeholderFeature && placeholderFeature.isPlaceholder(items[i]))
          ) {
            hasMissingItems = true;
            missingIndices.push(i);
          }
        }

        if (hasMissingItems) {
          // Show placeholders for missing items
          if (
            placeholderFeature &&
            placeholderFeature.isEnabled() &&
            missingIndices.length > 0
          ) {
            const placeholderRange = {
              start: Math.min(...missingIndices),
              end: Math.max(...missingIndices),
            };

            // Generate placeholder items
            const placeholderItems =
              placeholderFeature.generatePlaceholderItems(placeholderRange);

            // Update items array with placeholders
            placeholderItems.forEach((placeholder, index) => {
              const targetIndex = placeholderRange.start + index;
              if (!items[targetIndex]) {
                items[targetIndex] = placeholder;
              }
            });
          }

          // Load missing items with high priority
          loadDataForRange(visibleRange, "high");
        }
      }

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

        // Add placeholder class if item is a placeholder
        if (placeholderFeature && placeholderFeature.isPlaceholder(item)) {
          itemElement.classList.add(VIEWPORT_CONSTANTS.PLACEHOLDER.CSS_CLASS);
        }

        // Position item using transform for better performance
        itemElement.style.position = "absolute";
        itemElement.style.left = "0";
        itemElement.style.right = "0";
        itemElement.style.height = `${estimatedItemSize}px`;
        itemElement.style.willChange = "transform";

        // Calculate position based on scroll and virtual space
        let relativePosition: number;
        const MAX_VIRTUAL_SIZE = 10 * 1000 * 1000;
        const actualTotalSize = totalItems * estimatedItemSize;
        const totalVirtualSize = Math.min(actualTotalSize, MAX_VIRTUAL_SIZE);
        const isCompressed = actualTotalSize > totalVirtualSize;

        if (isCompressed) {
          // In compressed space, use precise fractional positioning
          const scrollRatio = scrollPosition / totalVirtualSize;
          const exactScrollIndex = scrollRatio * totalItems;

          // Calculate offset from the exact (fractional) scroll position
          const offset = i - exactScrollIndex;
          relativePosition = offset * estimatedItemSize;
        } else {
          // Direct positioning when not compressed - precise 1:1 scrolling
          const itemPosition = i * estimatedItemSize;
          relativePosition = itemPosition - scrollPosition;
        }

        itemElement.style.transform = `translateY(${relativePosition}px)`;

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

        // Create viewport context for features
        const viewportContext: ViewportContext = {
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
          getTotalItems: () => collectionFeature?.getTotalItems() || 0,
        } as any;

        // Initialize features
        scrollingFeature.initialize(viewportContext);
        scrollbarFeature.initialize(viewportContext);

        // Create and initialize placeholder feature if enabled
        if (config.enablePlaceholders !== false) {
          placeholderFeature = createPlaceholderFeature({
            enabled: true,
            analyzeFirstLoad: true,
            maskCharacter: config.maskCharacter,
            randomLengthVariance: true,
          });
          placeholderFeature.initialize(viewportContext);
        }

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
            transform: collectionConfig.transform,
          };

          collectionFeature = createCollectionFeature(
            viewportComponent as any,
            collectionFeatureConfig
          );

          // Add collection feature to viewport component so loading manager can access it
          (viewportComponent as any).collectionFeature = collectionFeature;

          // Create loading manager immediately after collection feature
          loadingManager = createLoadingManager(viewportComponent as any, {
            maxConcurrentRequests: config.maxConcurrentRequests || 1,
            enableRequestQueue: true,
          });

          // Update the reference so scroll handlers can use it
          loadingManagerRef.current = loadingManager;

          // Listen for collection events to trigger rendering
          component.on?.("collection:range-loaded", (data: any) => {
            console.log(
              "📦 [VIEWPORT] Collection range loaded, rendering items"
            );

            // Analyze data structure for placeholders on first load
            if (
              placeholderFeature &&
              !placeholderFeature.hasAnalyzedStructure() &&
              data?.items?.length > 0
            ) {
              placeholderFeature.analyzeDataStructure(data.items);
            }

            // Small delay to ensure collection has updated its internal state
            setTimeout(() => {
              renderItems();
            }, 0);

            // Process any queued requests now that data is loaded
            if (loadingManagerRef.current) {
              loadingManagerRef.current.processQueue();
            }
          });

          component.on?.("collection:total-changed", () => {
            console.log(
              "📊 [VIEWPORT] Collection total changed, updating bounds"
            );
            const totalItems = collectionFeature.getTotalItems();
            const MAX_VIRTUAL_SIZE = 10 * 1000 * 1000; // 10M pixels
            const actualTotalSize = totalItems * estimatedItemSize;
            const totalVirtualSize = Math.min(
              actualTotalSize,
              MAX_VIRTUAL_SIZE
            );
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

    // Create the enhanced component first
    const enhancedComponent = {
      ...component,
      viewport: viewportInterface,
    };

    // Expose loading manager on the component if it was created
    if (loadingManager) {
      (enhancedComponent as any).loadingManager = loadingManager;
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

    return enhancedComponent;
  };
}
