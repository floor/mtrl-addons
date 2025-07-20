import type { ListConfig, ListComponent, ListState } from "../types";
import type { BaseComponent, ElementComponent } from "mtrl/src/core/compose";
import type { CollectionItem } from "../../../core/collection/types";
import { createListManagerAPI } from "../../../core/list-manager/api";
import type { ListManagerConfig } from "../../../core/list-manager/types";

/**
 * Calculate optimal collection limit based on viewport dimensions
 * @param containerSize - Viewport container size in pixels
 * @param estimatedItemSize - Estimated item size in pixels
 * @param overscan - Number of items to render outside viewport
 * @returns Optimal limit for collection API requests
 */
function calculateOptimalLimit(
  containerSize: number,
  estimatedItemSize: number,
  overscan: number = 5
): number {
  // Calculate how many items fit in the viewport
  const itemsInViewport = Math.ceil(containerSize / estimatedItemSize);

  // Add overscan buffer for smooth scrolling
  const withOverscan = itemsInViewport + overscan * 2;

  // Add preload buffer for better UX (50% more items)
  const withPreload = Math.ceil(withOverscan * 1.5);

  // Ensure minimum of 10 items and maximum of 100 items per request
  const optimalLimit = Math.max(10, Math.min(100, withPreload));

  return optimalLimit;
}

/**
 * List Manager feature that creates and manages the enhanced List Manager
 * with built-in Collection support using Phase 1 functional composition.
 *
 * This replaces the complex orchestration layer with a simple feature
 * that delegates everything to the List Manager.
 */
export const withListManager =
  <T = any>(config: ListConfig<T>) =>
  <C extends BaseComponent & ElementComponent>(
    component: C
  ): C & Partial<ListComponent<T>> => {
    console.log("🔍 [LIST-MANAGER] withListManager config:", {
      hasPagination: !!config.pagination,
      paginationLimit: config.pagination?.limit,
      paginationStrategy: config.pagination?.strategy,
    });

    // Get container dimensions for optimal limit calculation
    const containerElement = component.element;
    const containerSize = containerElement.offsetHeight || 600; // Default to 600px
    const estimatedItemSize = config.scroll?.estimatedItemSize || 50;
    const overscan = config.scroll?.overscan || 5;

    // Use fixed limit from pagination config if provided, otherwise calculate optimal limit
    const pageSize =
      config.pagination?.limit ||
      calculateOptimalLimit(containerSize, estimatedItemSize, overscan);

    // Convert List Config to Phase 1 List Manager Config
    const listManagerConfig: ListManagerConfig = {
      container: component.element,
      items: config.items || [],

      // Template configuration - config.template is already the converted function
      template: {
        template:
          config.template ||
          ((item: any, index: number) =>
            `<div>Item ${index}: ${JSON.stringify(item)}</div>`),
      },

      // Virtual scrolling configuration
      virtual: {
        enabled: true,
        itemSize: config.scroll?.itemSize || "auto",
        estimatedItemSize: config.scroll?.estimatedItemSize || 50,
        overscan: config.scroll?.overscan || 5,
        measureItems: config.scroll?.measureItems, // Pass measureItems option
      },

      // Orientation configuration
      orientation: {
        orientation: config.orientation?.orientation || "vertical",
        reverse: config.orientation?.reverse || false,
        crossAxisAlignment: config.orientation?.crossAxisAlignment || "stretch",
      },

      // Collection configuration (if using API) - Now uses pageSize from pagination config
      collection: config.adapter
        ? {
            adapter: config.adapter,
            pageSize: pageSize, // Use fixed limit or calculated optimal limit
            strategy: config.pagination?.strategy || ("page" as const),
          }
        : undefined,

      // Required properties for ListManagerConfig
      initialLoad: {
        strategy: "placeholders" as const,
        viewportMultiplier: 1.5,
        minItems: 10,
        maxItems: 100,
      },

      errorHandling: {
        timeout: 3000,
        showErrorItems: true,
        retryAttempts: 2,
        preserveScrollOnError: true,
      },

      positioning: {
        precisePositioning: true,
        allowPartialItems: true,
        snapToItems: false,
      },

      boundaries: {
        preventOverscroll: true,
        maintainEdgeRanges: true,
        boundaryResistance: 0.3,
      },

      recycling: {
        enabled: true,
        maxPoolSize: 50,
        minPoolSize: 10,
      },

      performance: {
        frameScheduling: true,
        memoryCleanup: true,
      },

      intersection: {
        pagination: {
          enabled: false,
          rootMargin: "0px",
          threshold: 0.1,
        },
        loading: {
          enabled: false,
        },
      },

      // Debug and styling
      debug: false,
      prefix: config.prefix || "mtrl",
      componentName: "list-manager",
    };

    // Create Phase 1 List Manager with functional composition
    const manager = createListManagerAPI(listManagerConfig);

    console.log(`📋 List Manager created with Phase 1 functional composition`);

    // Simple state tracking (much simpler than orchestration)
    const state: ListState = {
      isLoading: false,
      error: null,
      isEmpty: true,
      scrollTop: 0,
      visibleRange: { start: 0, end: 0, count: 0 },
      renderRange: { start: 0, end: 0, count: 0 },
      selectedIndices: config.selection?.selectedIndices || [],
      totalItems: 0,
      isVirtual: config.scroll?.virtual ?? true,
      animationEnabled: true,
    };

    // Store original component emit to avoid recursion
    const originalEmit = (component as any).emit;

    // Subscribe to List Manager events for component event emission
    if (manager.on) {
      manager.on("viewport:changed", (data: any) => {
        state.visibleRange = data.visibleRange || {
          start: 0,
          end: 0,
          count: 0,
        };
        state.scrollTop = data.scrollPosition || 0;

        if (originalEmit) {
          originalEmit.call(component, "viewport:change", {
            visibleRange: state.visibleRange,
          });
        }
        config.on?.onViewportChange?.(state.visibleRange);
      });

      manager.on("scroll:position:changed", (data: any) => {
        state.scrollTop = data.position || 0;
        if (originalEmit) {
          originalEmit.call(component, "scroll:change", {
            scrollTop: state.scrollTop,
            direction: data.direction || "none",
          });
        }
        config.on?.onScroll?.(state.scrollTop, data.direction || "none");
      });

      manager.on("range:loaded", (data: any) => {
        if (originalEmit) {
          originalEmit.call(component, "data:loaded", data);
        }
      });

      manager.on("error:occurred", (error: any) => {
        state.error = error;
        if (originalEmit) {
          originalEmit.call(component, "error", error);
        }
      });
    }

    // Handle item clicks
    const handleItemClick = (
      item: T,
      index: number,
      event: MouseEvent
    ): void => {
      // Handle selection
      if (config.selection?.enabled) {
        if (state.selectedIndices.includes(index)) {
          state.selectedIndices = state.selectedIndices.filter(
            (i) => i !== index
          );
        } else {
          if (config.selection.mode === "single") {
            state.selectedIndices = [index];
          } else {
            state.selectedIndices = [...state.selectedIndices, index];
          }
        }
      }

      // Emit click event
      if (originalEmit) {
        originalEmit.call(component, "item:click", { item, index, event });
      }
      config.on?.onItemClick?.(item, index, event);

      // Emit selection events
      const items = manager.getItems();
      const selectedItems = state.selectedIndices
        .map((i) => items[i])
        .filter(Boolean);

      if (originalEmit) {
        originalEmit.call(component, "selection:change", {
          selectedItems,
          selectedIndices: [...state.selectedIndices],
        });
      }
    };

    // Initialize List Manager
    const initialize = (): void => {
      manager.initialize();
      console.log(`🚀 List component initialized with Phase 1 List Manager`);
    };

    // Initialize on next tick
    setTimeout(initialize, 0);

    // Type assertion to access enhanced properties
    const enhancedManager = manager as any;

    // Return enhanced component with Phase 1 List Manager API
    return Object.assign(component, {
      // Core instances (simplified)
      listManager: manager,
      state,
      config,

      // Direct access to enhancers via type assertion
      viewport: enhancedManager.viewport,
      collection: enhancedManager.collection,
      speedTracker: enhancedManager.speedTracker,
      placeholders: enhancedManager.placeholders,

      // Data operations (delegate to List Manager)
      loadData: () =>
        enhancedManager.collection?.loadRange(0, 20) || Promise.resolve([]),
      reload: () => {
        enhancedManager.collection?.getLoadedRanges().clear();
        return (
          enhancedManager.collection?.loadRange(0, 20) || Promise.resolve([])
        );
      },
      clear: () => {
        enhancedManager.collection?.setItems([]);
      },
      addItems: (items: T[], position: "start" | "end" = "end") => {
        const currentItems = manager.getItems();
        const newItems =
          position === "start"
            ? [...items, ...currentItems]
            : [...currentItems, ...items];
        enhancedManager.collection?.setItems(newItems);
      },
      removeItems: (indices: number[]) => {
        const currentItems = manager.getItems();
        const newItems = currentItems.filter(
          (_: any, index: number) => !indices.includes(index)
        );
        enhancedManager.collection?.setItems(newItems);
      },
      updateItem: (index: number, item: T) => {
        const currentItems = [...manager.getItems()];
        if (index >= 0 && index < currentItems.length) {
          currentItems[index] = item;
          enhancedManager.collection?.setItems(currentItems);
        }
      },
      getItem: (index: number) => {
        const items = manager.getItems();
        return items[index];
      },
      getItems: () => manager.getItems(),
      getItemCount: () => manager.getTotalItems(),

      // Scrolling operations (delegate to viewport)
      scrollToIndex: (
        index: number,
        alignment: "start" | "center" | "end" = "start",
        animate?: boolean
      ) => {
        enhancedManager.viewport?.scrollToIndex(index, alignment);
        return Promise.resolve();
      },

      // NEW: Business logic for loading data ranges with positioning
      loadRange: (
        pageOrOffset: number,
        size: number,
        strategy: "page" | "offset" = "page",
        alignment: "start" | "center" | "end" = "start"
      ) => {
        // Delegate to the enhanced list manager's loadRange method
        if (enhancedManager.loadRange) {
          return enhancedManager.loadRange(
            pageOrOffset,
            size,
            strategy,
            alignment
          );
        } else {
          console.error(
            "❌ [LIST-COMPONENT] loadRange method not available on list manager"
          );
          return Promise.resolve();
        }
      },

      scrollToItem: async (
        itemId: string,
        alignment: "start" | "center" | "end" = "start",
        animate?: boolean
      ) => {
        // Find item in current data
        const items = manager.getItems();
        const index = items.findIndex(
          (item: any) => String(item.id) === String(itemId)
        );

        if (index >= 0) {
          enhancedManager.viewport?.scrollToIndex(index, alignment);
          return Promise.resolve();
        }

        console.warn(`Item ${itemId} not found in current data`);
        return Promise.resolve();
      },

      scrollToTop: () => {
        enhancedManager.viewport?.scrollToIndex(0, "start");
        return Promise.resolve();
      },

      scrollToBottom: () => {
        const totalItems = manager.getTotalItems() || 0;
        if (totalItems > 0) {
          enhancedManager.viewport?.scrollToIndex(totalItems - 1, "end");
        }
        return Promise.resolve();
      },

      getScrollPosition: () =>
        enhancedManager.viewport?.getScrollPosition() || 0,

      // Scroll animation control
      setScrollAnimation: (enabled: boolean) => {
        // This would need to be implemented in viewport
        return component;
      },
      getScrollAnimation: () => true,
      toggleScrollAnimation: () => {
        // This would need to be implemented in viewport
        return component;
      },

      // Selection operations
      selectItems: (indices: number[]) => {
        state.selectedIndices = [...indices];
      },
      deselectItems: (indices: number[]) => {
        state.selectedIndices = state.selectedIndices.filter(
          (i) => !indices.includes(i)
        );
      },
      clearSelection: () => {
        state.selectedIndices = [];
      },
      getSelectedItems: () => {
        const items = manager.getItems();
        return state.selectedIndices.map((i) => items[i]).filter(Boolean);
      },
      getSelectedIndices: () => [...state.selectedIndices],
      isSelected: (index: number) => state.selectedIndices.includes(index),

      // Template management
      setTemplate: (
        newTemplate: (item: T, index: number) => string | HTMLElement
      ) => {
        // This would need to be implemented to update the manager's template
        console.warn("setTemplate not yet implemented in Phase 1 List Manager");
      },

      // Additional methods for compatibility
      hasNext: () =>
        enhancedManager.collection?.getPendingRanges().size > 0 || false,
      hasPrevious: () => false, // Not implemented yet
      getSelectedIds: () => {
        const items = manager.getItems();
        return state.selectedIndices.map((i) => items[i]?.id).filter(Boolean);
      },
      getMetrics: () => ({
        renderCount: 0,
        scrollCount: 0,
        averageRenderTime: 0,
        averageScrollTime: 0,
        memoryUsage: 0,
        recycledElements: 0,
        speedTracker: enhancedManager.speedTracker?.getTracker() || null,
        placeholderStructure:
          enhancedManager.placeholders?.getPlaceholderStructure() || null,
      }),

      // State queries
      getState: () => ({ ...state }),
      isLoading: () =>
        enhancedManager.collection?.getPendingRanges().size > 0 || false,
      hasError: () => state.error !== null,
      isEmpty: () => (manager.getTotalItems() || 0) === 0,

      // Rendering
      render: () => {
        // Phase 1 List Manager handles rendering internally
      },
      updateViewport: () => enhancedManager.viewport?.updateViewport(),
      getVisibleRange: () =>
        enhancedManager.viewport?.getVisibleRange() || { start: 0, end: 0 },
      getRenderRange: () =>
        enhancedManager.viewport?.getVisibleRange() || { start: 0, end: 0 },

      // Configuration
      updateConfig: (newConfig: Partial<ListConfig<T>>) => {
        Object.assign(config, newConfig);
        manager.updateConfig(newConfig as any);
      },
      getConfig: () => ({ ...config }),

      // Lifecycle
      lifecycle: {
        init: initialize,
        destroy: () => {
          manager.destroy();
        },
        update: () => {
          // List Manager handles updates internally
        },
      },

      // Event subscription
      subscribe: (observer: (payload: any) => void) => {
        return manager.on || (() => {});
      },

      // Event emission
      emit: (event: string, data: any) => {
        if (originalEmit) {
          originalEmit.call(component, event, data);
        }
      },
    }) as unknown as C & Partial<ListComponent<T>>;
  };
