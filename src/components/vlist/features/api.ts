/**
 * API feature for VList
 * Provides a clean public API for the VList component
 */

import type { VListConfig, VListItem, RemoveItemOptions } from "../types";

// Re-export for convenience
export type { RemoveItemOptions } from "../types";

export const withAPI = <T extends VListItem = VListItem>(
  config: VListConfig<T>,
) => {
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

    // Track pending removals to filter out items from stale server responses
    // This prevents race conditions where server returns old data before updates are committed
    const pendingRemovals = new Set<string | number>();

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

      /**
       * Get item at a specific index
       * @param index - The index of the item to retrieve
       * @returns The item at the index, or undefined if not found
       */
      getItem(index: number): T | undefined {
        if ((component as any).collection?.getItem) {
          return (component as any).collection.getItem(index);
        }
        const items = this.getItems();
        return items[index];
      },

      /**
       * Update item at a specific index
       * @param index - The index of the item to update
       * @param item - The new item data (full replacement)
       */
      updateItem(index: number, item: T): void {
        const items = this.getItems();

        if (index < 0 || index >= items.length) {
          console.warn(`[VList] updateItem: index ${index} out of bounds`);
          return;
        }

        const previousItem = items[index];

        // Update in collection items array
        if ((component as any).collection?.items) {
          (component as any).collection.items[index] = item;
        }

        // Emit event for rendering feature to handle DOM update
        component.emit?.("item:update-request", {
          index,
          item,
          previousItem,
        });
      },

      /**
       * Update item by ID
       * Finds the item in the collection by its ID and updates it with new data
       * Re-renders the item if currently visible in the viewport
       * @param id - The item ID to find
       * @param data - Partial data to merge with existing item, or full item replacement
       * @param options - Update options
       * @returns true if item was found and updated, false otherwise
       */
      updateItemById(
        id: string | number,
        data: Partial<T>,
        options: {
          /** If true, replace the entire item instead of merging (default: false) */
          replace?: boolean;
          /** If true, re-render even if not visible (default: false) */
          forceRender?: boolean;
        } = {},
      ): boolean {
        const { replace = false } = options;
        const items = this.getItems();

        // Find the item by ID (handle sparse arrays from pagination)
        // Check all possible ID fields since items may have different ID structures
        const index = items.findIndex((item: any) => {
          if (!item) return false;
          // Check all possible ID fields - user_id is important for profile/contact items
          const idsToCheck = [item.id, item._id, item.user_id].filter(
            (v) => v !== undefined && v !== null,
          );
          return idsToCheck.some(
            (itemId) => itemId === id || String(itemId) === String(id),
          );
        });

        if (index === -1) {
          console.warn(`[VList] updateItemById: item with id ${id} not found`);
          return false;
        }

        const previousItem = items[index];

        // Create updated item - either replace entirely or merge
        let updatedItem: T;
        if (replace) {
          updatedItem = { ...data, id: previousItem.id ?? id } as T;
        } else {
          // Only merge properties that have actual values (not undefined)
          // This prevents partial updates from overwriting existing data
          updatedItem = { ...previousItem } as T;
          for (const [key, value] of Object.entries(data)) {
            if (value !== undefined) {
              (updatedItem as any)[key] = value;
            }
          }
        }

        // Update in collection items array
        if ((component as any).collection?.items) {
          (component as any).collection.items[index] = updatedItem;
        }

        // Emit event for rendering feature to handle DOM update
        component.emit?.("item:update-request", {
          index,
          item: updatedItem,
          previousItem,
        });

        return true;
      },

      /**
       * Remove item at a specific index
       * Removes the item from the collection, updates totalItems, and triggers re-render
       * @param index - The index of the item to remove
       * @returns true if item was found and removed, false otherwise
       */
      removeItem(index: number): boolean {
        const items = this.getItems();
        const collection = (component as any).collection;

        if (index < 0 || index >= items.length) {
          console.warn(`[VList] removeItem: index ${index} out of bounds`);
          return false;
        }

        const removedItem = items[index];

        // Remove from collection items array (component.collection.items is the actual array)
        if ((component as any).collection?.items) {
          (component as any).collection.items.splice(index, 1);
        }

        // IMPORTANT: Emit item:remove-request FIRST so rendering feature rebuilds collectionItems
        // BEFORE setTotalItems triggers a render via viewport:total-items-changed
        component.emit?.("item:remove-request", {
          index,
          item: removedItem,
        });

        // Update totalItems - this will trigger viewport:total-items-changed which calls renderItems
        // By now, collectionItems has been rebuilt by the item:remove-request handler
        if (collection?.getTotalItems && collection?.setTotalItems) {
          const currentTotal = collection.getTotalItems();
          collection.setTotalItems(Math.max(0, currentTotal - 1));
        } else if (component.viewport?.collection?.setTotalItems) {
          // Fallback to viewport.collection if available
          const currentTotal = component.viewport.collection.getTotalItems();
          component.viewport.collection.setTotalItems(
            Math.max(0, currentTotal - 1),
          );
        } else {
          // Last resort: update component.totalItems directly
          if (component.totalItems !== undefined) {
            component.totalItems = Math.max(0, component.totalItems - 1);
          }
        }

        return true;
      },

      /**
       * Remove item by ID
       * Finds the item in the collection by its ID and removes it
       * Updates totalItems and triggers re-render of visible items
       * Optionally tracks as pending removal to filter from future fetches
       * @param id - The item ID to find and remove
       * @param options - Remove options (trackPending, pendingTimeout)
       * @returns true if item was found and removed, false otherwise
       */
      removeItemById(
        id: string | number,
        options: RemoveItemOptions = {},
      ): boolean {
        const { trackPending = true, pendingTimeout = 5000 } = options;

        if (id === undefined || id === null) {
          console.warn(`[VList] removeItemById: invalid id`);
          return false;
        }

        // Add to pending removals to filter from future server responses
        if (trackPending) {
          pendingRemovals.add(id);

          // Clear from pending removals after timeout (server should have updated by then)
          setTimeout(() => {
            pendingRemovals.delete(id);
          }, pendingTimeout);
        }

        const items = this.getItems();

        // Find the item by ID (handle sparse arrays from pagination)
        // Check all possible ID fields since items may have different ID structures
        const index = items.findIndex((item: any) => {
          if (!item) return false;
          // Check all possible ID fields
          const idsToCheck = [item.id, item._id, item.user_id].filter(
            (v) => v !== undefined && v !== null,
          );
          return idsToCheck.some(
            (itemId) => itemId === id || String(itemId) === String(id),
          );
        });

        if (index === -1) {
          return false;
        }

        return this.removeItem(index);
      },

      /**
       * Check if an item ID is pending removal
       * @param id - The item ID to check
       * @returns true if the item is pending removal
       */
      isPendingRemoval(id: string | number): boolean {
        return pendingRemovals.has(id);
      },

      /**
       * Get all pending removal IDs
       * @returns Set of pending removal IDs
       */
      getPendingRemovals(): Set<string | number> {
        return new Set(pendingRemovals);
      },

      /**
       * Clear a specific pending removal
       * @param id - The item ID to clear from pending removals
       */
      clearPendingRemoval(id: string | number): void {
        pendingRemovals.delete(id);
      },

      /**
       * Clear all pending removals
       */
      clearAllPendingRemovals(): void {
        pendingRemovals.clear();
      },

      /**
       * Filter items array to exclude pending removals
       * Utility method for use in collection adapters
       * @param items - Array of items to filter
       * @returns Filtered array without pending removal items
       */
      filterPendingRemovals<I extends { id?: any; _id?: any }>(
        items: I[],
      ): I[] {
        if (pendingRemovals.size === 0) return items;

        return items.filter((item) => {
          const id = item._id || item.id;
          return !pendingRemovals.has(id);
        });
      },

      // Loading operations
      async loadRange(
        page: number,
        limit: number,
        strategy: string = "page",
        alignment?: string,
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
              config.pagination?.limit || 20,
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
        animate?: boolean,
      ) => {
        if (component.viewport) {
          component.viewport.scrollToIndex(index, alignment);
        }
        return Promise.resolve();
      },

      /**
       * Scroll to index and select item after data loads
       * Useful for runtime scroll+select when VList is already created
       */
      scrollToIndexAndSelect: async function (
        index: number,
        selectId: string | number,
        alignment: "start" | "center" | "end" = "start",
      ) {
        if (component.viewport) {
          component.viewport.scrollToIndex(index, alignment);
        }

        // Listen for range load to complete, then select
        const onRangeLoaded = () => {
          component.off?.("viewport:range-loaded", onRangeLoaded);
          requestAnimationFrame(() => {
            if (component.selectById) {
              component.selectById(selectId);
            }
          });
        };

        component.on?.("viewport:range-loaded", onRangeLoaded);

        // Fallback timeout in case event doesn't fire (data already loaded)
        setTimeout(() => {
          component.off?.("viewport:range-loaded", onRangeLoaded);
          if (component.selectById) {
            component.selectById(selectId);
          }
        }, 300);

        return Promise.resolve();
      },

      scrollToItem: async function (
        itemId: string,
        alignment: "start" | "center" | "end" = "start",
        animate?: boolean,
      ) {
        const items = this.getItems();
        const index = items.findIndex(
          (item: any) => String(item.id) === String(itemId),
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
        animate?: boolean,
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
                  } to ${pageNum}`,
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
