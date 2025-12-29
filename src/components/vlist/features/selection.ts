// src/components/vlist/features/selection.ts

import type { VListConfig, VListComponent, VListItem } from "../types";
import { VLIST_CLASSES } from "../constants";
import { PREFIX, addClass, removeClass } from "mtrl";

/**
 * Selection state interface
 */
interface SelectionState {
  selectedIds: Set<string | number>;
  mode: "none" | "single" | "multiple";
  lastSelectedIndex?: number;
}

/**
 * Get item ID from element or item data
 */
const getItemId = (item: any): string | number | undefined => {
  if (item?.id !== undefined) return item.id;
  if (item?._id !== undefined) return item._id;
  if (typeof item === "string" || typeof item === "number") return item;
  return undefined;
};

/**
 * Adds selection management capabilities to VList component
 */
export const withSelection = <T extends VListItem = VListItem>(
  config: VListConfig<T>,
) => {
  return (component: VListComponent<T>): VListComponent<T> => {
    if (!config.selection?.enabled || config.selection?.mode === "none") {
      return component;
    }

    const state: SelectionState = {
      selectedIds: new Set(),
      mode: config.selection?.mode || "single",
      lastSelectedIndex: undefined,
    };

    const requireModifiers = config.selection?.requireModifiers ?? false;

    /**
     * Apply selection class to rendered elements matching selected IDs
     */
    const applySelectionToElements = () => {
      const container = component.element?.querySelector(
        `.${PREFIX}-viewport-items`,
      );
      if (!container) return;

      const items = container.querySelectorAll(
        `.${PREFIX}-viewport-item[data-id]`,
      );

      items.forEach((el) => {
        const element = el as HTMLElement;
        const id = element.dataset.id;
        if (id !== undefined) {
          // Check both string and number versions of the ID
          const isSelected =
            state.selectedIds.has(id) || state.selectedIds.has(Number(id));
          if (isSelected) {
            addClass(element, VLIST_CLASSES.SELECTED);
          } else {
            removeClass(element, VLIST_CLASSES.SELECTED);
          }
        }
      });
    };

    /**
     * Handle item click for selection
     */
    const handleItemClick = (e: MouseEvent) => {
      const viewportItem = (e.target as HTMLElement).closest(
        `.${PREFIX}-viewport-item[data-index]`,
      ) as HTMLElement;
      if (!viewportItem) return;

      const index = parseInt(viewportItem.dataset.index || "-1");
      if (index < 0) return;

      const enhancedComponent = component as any;
      const items = enhancedComponent.getItems?.();
      const item = items?.[index];
      if (!item) return;

      const itemId = getItemId(item);
      if (itemId === undefined) return;

      const wasSelected = state.selectedIds.has(itemId);

      if (state.mode === "single") {
        state.selectedIds.clear();
        if (!wasSelected) {
          state.selectedIds.add(itemId);
          state.lastSelectedIndex = index;
        } else {
          state.lastSelectedIndex = undefined;
        }
      } else if (state.mode === "multiple") {
        if (e.shiftKey && state.lastSelectedIndex !== undefined) {
          const start = Math.min(state.lastSelectedIndex, index);
          const end = Math.max(state.lastSelectedIndex, index);

          if (!e.ctrlKey && !e.metaKey) {
            state.selectedIds.clear();
          }

          for (let i = start; i <= end; i++) {
            const rangeItem = items?.[i];
            const rangeItemId = getItemId(rangeItem);
            if (rangeItemId !== undefined) {
              state.selectedIds.add(rangeItemId);
            }
          }
        } else if (e.ctrlKey || e.metaKey) {
          if (wasSelected) {
            state.selectedIds.delete(itemId);
          } else {
            state.selectedIds.add(itemId);
          }
          state.lastSelectedIndex = index;
        } else {
          if (requireModifiers) {
            state.selectedIds.clear();
            state.selectedIds.add(itemId);
          } else {
            if (wasSelected) {
              state.selectedIds.delete(itemId);
            } else {
              state.selectedIds.add(itemId);
            }
          }
          state.lastSelectedIndex = index;
        }
      }

      applySelectionToElements();
      emitSelectionChange();
    };

    /**
     * Emit selection change event
     */
    const emitSelectionChange = () => {
      const enhancedComponent = component as any;
      const items = enhancedComponent.getItems?.() || [];

      const selectedItems = items.filter((item: any) => {
        const id = getItemId(item);
        return id !== undefined && state.selectedIds.has(id);
      });

      const selectedIndices = items.reduce(
        (acc: number[], item: any, idx: number) => {
          const id = getItemId(item);
          if (id !== undefined && state.selectedIds.has(id)) {
            acc.push(idx);
          }
          return acc;
        },
        [] as number[],
      );

      component.emit?.("selection:change", { selectedItems, selectedIndices });

      if (config.selection?.onSelectionChange) {
        config.selection.onSelectionChange(selectedItems, selectedIndices);
      }
    };

    // Setup: listen for renders and clicks
    const setup = () => {
      // Add mode class to container
      if (component.element) {
        addClass(component.element, "vlist--selection");
        addClass(component.element, `vlist--selection-${state.mode}`);
        component.element.addEventListener("click", handleItemClick, true);
      }

      // Apply selection after each render
      (component as any).on?.(
        "viewport:items-rendered",
        applySelectionToElements,
      );
      (component as any).on?.("viewport:rendered", applySelectionToElements);

      // Clean up selection when item is removed
      (component as any).on?.(
        "item:removed",
        (data: { item: any; index: number }) => {
          const itemId = getItemId(data.item);
          if (itemId !== undefined && state.selectedIds.has(itemId)) {
            state.selectedIds.delete(itemId);
            // If the removed item was the last selected index, clear it
            if (state.lastSelectedIndex === data.index) {
              state.lastSelectedIndex = undefined;
            } else if (
              state.lastSelectedIndex !== undefined &&
              state.lastSelectedIndex > data.index
            ) {
              // Adjust lastSelectedIndex since items shifted down
              state.lastSelectedIndex--;
            }
            emitSelectionChange();
          }
        },
      );
    };

    // Initialize after component is ready
    setTimeout(setup, 0);

    // Listen for initial load complete to auto-select item
    // This must be in withSelection because selectById is defined here
    (component as any).on?.(
      "collection:initial-load-complete",
      (data: { selectId: string | number }) => {
        if (data?.selectId !== undefined) {
          // Use requestAnimationFrame to ensure rendering is complete
          requestAnimationFrame(() => {
            if (state.mode === "single") {
              state.selectedIds.clear();
            }
            state.selectedIds.add(data.selectId);
            applySelectionToElements();
            emitSelectionChange();
          });
        }
      },
    );

    // Cleanup on destroy
    const originalDestroy = component.destroy;
    component.destroy = () => {
      component.element?.removeEventListener("click", handleItemClick, true);
      originalDestroy?.();
    };

    // Enhanced component with selection API
    return {
      ...component,

      selectItems(indices: number[]) {
        const items = (this as any).getItems?.();
        if (!items) return;

        if (state.mode === "single") {
          // In single mode, clear previous selection before adding new one
          state.selectedIds.clear();
          if (indices.length > 1) {
            indices = [indices[0]];
          }
        }

        indices.forEach((index) => {
          const itemId = getItemId(items[index]);
          if (itemId !== undefined) {
            state.selectedIds.add(itemId);
          }
        });

        if (indices.length > 0) {
          state.lastSelectedIndex = indices[indices.length - 1];
        }

        applySelectionToElements();
        emitSelectionChange();
      },

      deselectItems(indices: number[]) {
        const items = (this as any).getItems?.();
        if (!items) return;

        indices.forEach((index) => {
          const itemId = getItemId(items[index]);
          if (itemId !== undefined) {
            state.selectedIds.delete(itemId);
          }
        });

        applySelectionToElements();
        emitSelectionChange();
      },

      clearSelection() {
        state.selectedIds.clear();
        state.lastSelectedIndex = undefined;
        applySelectionToElements();
        emitSelectionChange();
      },

      getSelectedItems(): T[] {
        const items = (this as any).getItems?.() || [];
        return items.filter((item: any) => {
          const id = getItemId(item);
          return id !== undefined && state.selectedIds.has(id);
        });
      },

      getSelectedIndices(): number[] {
        const items = (this as any).getItems?.() || [];
        return items.reduce((acc: number[], item: any, index: number) => {
          const id = getItemId(item);
          if (id !== undefined && state.selectedIds.has(id)) {
            acc.push(index);
          }
          return acc;
        }, [] as number[]);
      },

      isSelected(index: number): boolean {
        const items = (this as any).getItems?.();
        const itemId = getItemId(items?.[index]);
        return itemId !== undefined && state.selectedIds.has(itemId);
      },

      selectById(id: string | number): boolean {
        if (id === undefined || id === null) return false;

        if (state.mode === "single") {
          state.selectedIds.clear();
        }

        state.selectedIds.add(id);
        applySelectionToElements();
        emitSelectionChange();
        return true;
      },

      /**
       * Select item at index, scrolling and waiting for data if needed
       * Handles virtual scrolling by loading data before selecting
       */
      async selectAtIndex(index: number): Promise<boolean> {
        const enhancedComponent = component as any;
        const totalItems = enhancedComponent.getItemCount?.() || 0;

        if (index < 0 || index >= totalItems) {
          return false;
        }

        // First scroll to the index (triggers data loading if needed)
        if (enhancedComponent.viewport?.scrollToIndex) {
          enhancedComponent.viewport.scrollToIndex(index);
        }

        // Try to select immediately - works if item is already loaded
        const items = enhancedComponent.getItems?.() || [];
        if (items[index]) {
          this.selectItems([index]);
          return true;
        }

        // Item not loaded yet - wait for data to load then select
        return new Promise<boolean>((resolve) => {
          let resolved = false;

          const onRangeLoaded = () => {
            if (resolved) return;
            resolved = true;
            component.off?.("viewport:range-loaded", onRangeLoaded);
            requestAnimationFrame(() => {
              this.selectItems([index]);
              resolve(true);
            });
          };

          component.on?.("viewport:range-loaded", onRangeLoaded);

          // Fallback timeout in case event doesn't fire (data already loaded)
          setTimeout(() => {
            if (resolved) return;
            resolved = true;
            component.off?.("viewport:range-loaded", onRangeLoaded);
            this.selectItems([index]);
            resolve(true);
          }, 300);
        });
      },

      /**
       * Select next item relative to current selection
       * Handles virtual scrolling by loading data before selecting
       */
      async selectNext(): Promise<boolean> {
        const enhancedComponent = component as any;
        const selectedIndices = this.getSelectedIndices();

        if (selectedIndices.length === 0) {
          // Select first item
          return this.selectAtIndex(0);
        }

        const currentIndex = selectedIndices[0];
        const nextIndex = currentIndex + 1;
        const totalItems = enhancedComponent.getItemCount?.() || 0;

        if (nextIndex < totalItems) {
          return this.selectAtIndex(nextIndex);
        }

        return false;
      },

      /**
       * Select previous item relative to current selection
       * Handles virtual scrolling by loading data before selecting
       */
      async selectPrevious(): Promise<boolean> {
        const selectedIndices = this.getSelectedIndices();

        if (selectedIndices.length === 0) {
          return false;
        }

        const currentIndex = selectedIndices[0];
        const prevIndex = currentIndex - 1;

        if (prevIndex >= 0) {
          return this.selectAtIndex(prevIndex);
        }

        return false;
      },
    };
  };
};

export default withSelection;
