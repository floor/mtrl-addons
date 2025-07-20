/**
 * API feature for VList
 * Provides a clean public API for the VList component
 */

import type { VListConfig } from "../types";

/**
 * Adds public API methods to VList
 */
export const withAPI = <T = any>(config: VListConfig<T>) => {
  return (component: any) => {
    // Initialize viewport on creation
    setTimeout(() => {
      if (component.viewport && component.viewport.initialize) {
        component.viewport.initialize();
      }
    }, 0);

    // Track loading state
    let isLoading = false;
    let selectedIds = new Set<string | number>();

    // Listen for collection events
    component.on?.("collection:range-loaded", () => {
      isLoading = false;
    });
    component.on?.("collection:range-failed", () => {
      isLoading = false;
    });

    return {
      ...component,

      // Data operations
      setItems(items: T[]) {
        if (component.viewport?.collection) {
          component.viewport.collection.setItems(items);
        } else {
          component.items = items;
          component.totalItems = items.length;
        }
        component.emit?.("items:set", { items, total: items.length });
      },

      getItems(): T[] {
        if (component.viewport?.collection) {
          return component.viewport.collection.getItems();
        }
        return component.items || [];
      },

      getVisibleItems(): T[] {
        const range = component.viewport?.getVisibleRange() || {
          start: 0,
          end: 0,
        };
        const items = this.getItems();
        return items.slice(range.start, range.end);
      },

      getItemCount(): number {
        if (component.viewport?.collection) {
          return component.viewport.collection.getTotalItems();
        }
        return component.totalItems || component.items?.length || 0;
      },

      // Loading operations
      async loadRange(
        page: number,
        limit: number,
        strategy: string = "page",
        alignment?: string
      ) {
        isLoading = true;

        if (component.viewport?.collection) {
          const offset = strategy === "page" ? (page - 1) * limit : page;
          try {
            await component.viewport.collection.loadRange(offset, limit);
            component.emit?.("load", { page, limit, strategy });

            // Scroll to the loaded range if alignment is specified
            if (alignment) {
              const index = offset;
              this.scrollToIndex(index, alignment);
            }
          } catch (error) {
            component.emit?.("error", { error });
            throw error;
          } finally {
            isLoading = false;
          }
        }
      },

      isLoading(): boolean {
        return isLoading;
      },

      hasNext(): boolean {
        if (component.viewport?.collection) {
          const total = component.viewport.collection.getTotalItems();
          const items = component.viewport.collection.getItems();
          return items.length < total;
        }
        return false;
      },

      // Selection operations
      getSelectedIds(): (string | number)[] {
        return Array.from(selectedIds);
      },

      selectItem(id: string | number) {
        selectedIds.add(id);
        component.emit?.("selection:change", {
          selected: this.getSelectedIds(),
        });
      },

      deselectItem(id: string | number) {
        selectedIds.delete(id);
        component.emit?.("selection:change", {
          selected: this.getSelectedIds(),
        });
      },

      clearSelection() {
        selectedIds.clear();
        component.emit?.("selection:change", { selected: [] });
      },

      // Scrolling methods
      scrollToIndex: (
        index: number,
        alignment: "start" | "center" | "end" = "start",
        animate?: boolean
      ) => {
        if (component.viewport) {
          component.viewport.scrollToIndex(index, alignment);
        }
        return Promise.resolve();
      },

      scrollToItem: async function (
        itemId: string,
        alignment: "start" | "center" | "end" = "start",
        animate?: boolean
      ) {
        const items = this.getItems();
        const index = items.findIndex(
          (item: any) => String(item.id) === String(itemId)
        );

        if (index >= 0) {
          return this.scrollToIndex(index, alignment, animate);
        }

        console.warn(`Item ${itemId} not found`);
        return Promise.resolve();
      },

      scrollToTop: function () {
        return this.scrollToIndex(0, "start");
      },

      scrollToBottom: function () {
        const totalItems = this.getItemCount();
        if (totalItems > 0) {
          return this.scrollToIndex(totalItems - 1, "end");
        }
        return Promise.resolve();
      },

      getScrollPosition: () => {
        return component.viewport?.getScrollPosition() || 0;
      },

      setScrollAnimation(enabled: boolean) {
        // Store animation preference (would be used by viewport scrolling feature)
        component.scrollAnimation = enabled;
      },

      // State
      getState() {
        return {
          items: this.getItems(),
          totalItems: component.viewport?.collection
            ? component.viewport.collection.getTotalItems()
            : component.totalItems || 0,
          visibleRange: component.viewport?.getVisibleRange() || {
            start: 0,
            end: 0,
          },
          scrollPosition: component.viewport?.getScrollPosition() || 0,
          selectedIds: this.getSelectedIds(),
          isLoading: this.isLoading(),
        };
      },

      // Lifecycle
      destroy() {
        if (component.viewport?.destroy) {
          component.viewport.destroy();
        }
        selectedIds.clear();
        component.emit?.("destroyed");
      },
    };
  };
};
