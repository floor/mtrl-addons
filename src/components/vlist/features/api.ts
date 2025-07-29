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
        // Collection is added directly to component, not to viewport.collection
        if ((component as any).collection?.getItems) {
          return (component as any).collection.getItems();
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

      // Data loading
      loadNext: async function () {
        console.log(`[VList] loadNext()`);

        if (component.viewport?.collection) {
          const totalItems = component.viewport.collection.getTotalItems();
          const loadedRanges = component.viewport.collection.getLoadedRanges();

          // Find the next unloaded range
          let nextOffset = 0;
          for (const rangeId of loadedRanges) {
            const rangeEnd = (rangeId + 1) * (config.pagination?.limit || 20);
            if (rangeEnd > nextOffset) {
              nextOffset = rangeEnd;
            }
          }

          if (nextOffset < totalItems) {
            await component.viewport.collection.loadRange(
              nextOffset,
              config.pagination?.limit || 20
            );
          }
        }

        return Promise.resolve();
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

      // Note: Selection operations are handled by the withSelection feature
      // These are kept for backward compatibility but delegate to selection feature if available
      getSelectedIds(): (string | number)[] {
        if (typeof component.getSelectedIndices === "function") {
          // Use selection feature if available
          const items = this.getItems();
          const indices = component.getSelectedIndices();
          return indices.map((idx: number) => (items[idx] as any)?.id || idx);
        }
        // Fallback to local tracking
        return Array.from(selectedIds);
      },

      selectItem(id: string | number) {
        if (typeof component.selectItems === "function") {
          // Use selection feature if available
          const items = this.getItems();
          const index = items.findIndex((item: any) => item.id === id);
          if (index >= 0) {
            component.selectItems([index]);
          }
        } else {
          // Fallback to local tracking
          selectedIds.add(id);
          component.emit?.("selection:change", {
            selected: this.getSelectedIds(),
          });
        }
      },

      deselectItem(id: string | number) {
        if (typeof component.deselectItems === "function") {
          // Use selection feature if available
          const items = this.getItems();
          const index = items.findIndex((item: any) => item.id === id);
          if (index >= 0) {
            component.deselectItems([index]);
          }
        } else {
          // Fallback to local tracking
          selectedIds.delete(id);
          component.emit?.("selection:change", {
            selected: this.getSelectedIds(),
          });
        }
      },

      clearSelection() {
        if (typeof component.clearSelection === "function") {
          // Use selection feature if available
          component.clearSelection();
        } else {
          // Fallback to local tracking
          selectedIds.clear();
          component.emit?.("selection:change", { selected: [] });
        }
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

      scrollToPage: async function (
        pageNum: number,
        alignment: "start" | "center" | "end" = "start",
        animate?: boolean
      ) {
        // console.log(`[VList] scrollToPage(${pageNum})`);

        // Get limit from config (rangeSize) or default
        const limit = config.pagination?.limit || 20;

        // Check if we're in cursor mode
        if (config.pagination?.strategy === "cursor") {
          // In cursor mode, we need to handle sequential loading
          const collection = (component.viewport as any)?.collection;
          if (collection) {
            const loadedRanges = collection.getLoadedRanges();
            const highestLoadedPage = loadedRanges.size;

            if (pageNum > highestLoadedPage + 1) {
              console.warn(
                `[VList] Cannot jump to page ${pageNum} in cursor mode. ` +
                  `Loading pages sequentially from ${
                    highestLoadedPage + 1
                  } to ${pageNum}`
              );
            }
          }
        }

        // Use viewport's scrollToPage if available
        if ((component.viewport as any)?.scrollToPage) {
          (component.viewport as any).scrollToPage(pageNum, limit, alignment);
        } else {
          // Fallback to scrollToIndex
          const targetIndex = (pageNum - 1) * limit;
          await this.scrollToIndex(targetIndex, alignment);
        }
      },

      getScrollPosition: () => {
        return component.viewport?.getScrollPosition() || 0;
      },

      getCurrentCursor: () => {
        const collection = (component.viewport as any)?.collection;
        return collection?.getCurrentCursor?.() || null;
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
