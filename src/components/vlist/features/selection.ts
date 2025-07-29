// src/components/vlist/features/selection.ts

import type { VListConfig, VListComponent } from "../types";
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
 * Adds selection management capabilities to VList component
 * Works with viewport's virtual scrolling architecture
 *
 * @param config - VList configuration with selection options
 * @returns Function that enhances a component with selection management
 */
export const withSelection = <T = any>(config: VListConfig<T>) => {
  return (component: VListComponent<T>): VListComponent<T> => {
    // Skip if selection is not enabled
    if (!config.selection?.enabled || config.selection?.mode === "none") {
      // console.log("🎯 [Selection] Skipped - not enabled or mode is none");
      return component;
    }

    // console.log("🎯 [Selection] Initializing selection feature", {
    //   enabled: config.selection?.enabled,
    //   mode: config.selection?.mode,
    // });

    // Initialize selection state
    const state: SelectionState = {
      selectedIds: new Set(),
      mode: config.selection?.mode || "single",
      lastSelectedIndex: undefined,
    };

    // Get configuration options
    const requireModifiers = config.selection?.requireModifiers ?? false;

    // Add BEM modifier class to container element
    const addContainerModifier = () => {
      if (component.element) {
        // Add selection mode modifier class following BEM convention
        addClass(component.element, `vlist--selection`);
        // Also add specific mode modifier
        addClass(component.element, `vlist--selection-${state.mode}`);
      }
    };

    // Defer initialization of pre-selected items until after setup
    const initializePreselectedItems = () => {
      if (config.selection?.selectedIndices && component.getItems) {
        config.selection.selectedIndices.forEach((index) => {
          const items = component.getItems();
          const item = items?.[index];
          if (item && (item as any).id !== undefined) {
            state.selectedIds.add((item as any).id);
          }
        });
      }
    };

    /**
     * Apply selection class to an element
     */
    const applySelectionClass = (element: HTMLElement, isSelected: boolean) => {
      if (isSelected) {
        addClass(element, VLIST_CLASSES.SELECTED);
      } else {
        removeClass(element, VLIST_CLASSES.SELECTED);
      }
    };

    /**
     * Get item ID from element or item data
     */
    const getItemId = (item: any): string | number | undefined => {
      if (item?.id !== undefined) return item.id;
      if (typeof item === "string" || typeof item === "number") return item;
      return undefined;
    };

    /**
     * Handle item click for selection
     */
    const handleItemClick = (e: MouseEvent) => {
      // console.log("🎯 [Selection] Click detected on:", e.target);

      // Find the clicked viewport item element (wrapper)
      const viewportItem = (e.target as HTMLElement).closest(
        `.${PREFIX}-viewport-item[data-index]`
      ) as HTMLElement;
      if (!viewportItem) {
        console.log("🎯 [Selection] No viewport item found for click");
        return;
      }

      const index = parseInt(viewportItem.dataset.index || "-1");
      console.log(`🎯 [Selection] Clicked item index: ${index}`);
      if (index < 0) return;

      // Get the item data
      const enhancedComponent = component as any;
      const items = enhancedComponent.getItems?.();
      const item = items?.[index];
      if (!item) return;

      const itemId = getItemId(item);
      if (itemId === undefined) return;

      // Handle selection based on mode
      const wasSelected = state.selectedIds.has(itemId);

      // console.log("🎯 [Selection] Click detected:", {
      //   index,
      //   itemId,
      //   wasSelected,
      //   mode: state.mode,
      //   shiftKey: e.shiftKey,
      //   ctrlKey: e.ctrlKey,
      //   metaKey: e.metaKey,
      //   lastSelectedIndex: state.lastSelectedIndex,
      // });

      if (state.mode === "single") {
        // Clear previous selection
        state.selectedIds.clear();

        // Toggle selection
        if (!wasSelected) {
          state.selectedIds.add(itemId);
          state.lastSelectedIndex = index;
        } else {
          state.lastSelectedIndex = undefined;
        }
      } else if (state.mode === "multiple") {
        // Handle multi-select with keyboard modifiers
        if (e.shiftKey && state.lastSelectedIndex !== undefined) {
          // Range selection
          const start = Math.min(state.lastSelectedIndex, index);
          const end = Math.max(state.lastSelectedIndex, index);

          if (!e.ctrlKey && !e.metaKey) {
            // Clear existing selection if not holding ctrl/cmd
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
          // Toggle individual selection with Ctrl/Cmd
          if (wasSelected) {
            state.selectedIds.delete(itemId);
          } else {
            state.selectedIds.add(itemId);
          }
          state.lastSelectedIndex = index;
        } else {
          // Single click without modifiers
          // console.log("🎯 [Selection] Single click without modifiers:", {
          //   requireModifiers,
          //   wasSelected,
          //   willToggle: !requireModifiers,
          // });

          if (requireModifiers) {
            // If modifiers are required, single click selects only this item
            state.selectedIds.clear();
            state.selectedIds.add(itemId);
          } else {
            // If modifiers are NOT required, single click toggles selection
            if (wasSelected) {
              state.selectedIds.delete(itemId);
            } else {
              state.selectedIds.add(itemId);
            }
          }
          state.lastSelectedIndex = index;
        }
      }

      // Update visible elements
      updateVisibleElements();

      // Emit selection change event
      const selectedItems =
        items?.filter((item: any) => {
          const id = getItemId(item);
          return id !== undefined && state.selectedIds.has(id);
        }) || [];

      const selectedIndices =
        items?.reduce((acc: number[], item: any, idx: number) => {
          const id = getItemId(item);
          if (id !== undefined && state.selectedIds.has(id)) {
            acc.push(idx);
          }
          return acc;
        }, [] as number[]) || [];

      component.emit?.("selection:change", {
        selectedItems,
        selectedIndices,
      });

      // Call the selection change callback if provided
      if (config.selection?.onSelectionChange) {
        config.selection.onSelectionChange(selectedItems, selectedIndices);
      }

      // Emit individual item selection event
      component.emit?.("item:selection:change", {
        item,
        index,
        isSelected: state.selectedIds.has(itemId),
      });
    };

    /**
     * Update selection state for visible elements
     */
    const updateVisibleElements = () => {
      const container = component.element?.querySelector(
        `.${PREFIX}-viewport-items`
      );
      if (!container) {
        // console.warn("🎯 [Selection] No viewport items container found");
        return;
      }

      const viewportItems = container.querySelectorAll(
        `.${PREFIX}-viewport-item[data-index]`
      );
      // console.log(
      //   `🎯 [Selection] Updating ${viewportItems.length} visible elements`
      // );

      const enhancedComponent = component as any;
      const items = enhancedComponent.getItems?.();

      viewportItems.forEach((viewportItem) => {
        const index = parseInt(
          (viewportItem as HTMLElement).dataset.index || "-1"
        );
        if (index < 0) return;

        const item = items?.[index];
        if (!item) return;

        const itemId = getItemId(item);
        if (itemId === undefined) return;

        const isSelected = state.selectedIds.has(itemId);

        // Apply selection class to the viewport item itself
        // The new layout system doesn't have a separate inner item
        applySelectionClass(viewportItem as HTMLElement, isSelected);
      });
    };

    // Setup listeners after component is fully initialized
    // Since selection is applied last, we can just use a timeout
    setTimeout(() => {
      // console.log("🎯 [Selection] Setting up listeners after initialization");

      // Add BEM modifier classes to the container
      addContainerModifier();

      setupSelectionListeners();
    }, 0);

    function setupSelectionListeners() {
      // Wait for viewport to be ready
      setTimeout(() => {
        // Initialize pre-selected items now that component is ready
        initializePreselectedItems();

        // Listen for render complete to update selection state
        // Using type assertion since viewport:rendered is not in ListEvents type
        (component as any).on?.("viewport:rendered", () => {
          updateVisibleElements();
        });

        // Add click listener to the viewport element
        if (component.element) {
          // Use capture phase to ensure we get the event
          component.element.addEventListener("click", handleItemClick, true);
          // console.log(
          //   "🎯 [Selection] Click handler attached to element (capture phase)"
          // );

          // Test if handler works
          // setTimeout(() => {
          //   const testItem = component.element?.querySelector(
          //     `.${PREFIX}-viewport-item`
          //   );
          //   // console.log("🎯 [Selection] Test item found:", !!testItem);
          // }, 500);
        }
      }, 100);
    }

    // Clean up on destroy
    const originalDestroy = component.destroy;
    component.destroy = () => {
      if (component.element) {
        component.element.removeEventListener("click", handleItemClick, true);
      }
      originalDestroy?.();
    };

    // Create the enhanced component
    const enhancedComponent = {
      ...component,

      // Selection API methods
      selectItems(indices: number[]) {
        // Use type assertion to access getItems which is added by API feature
        const getItemsFn = (this as any).getItems;
        if (!getItemsFn) {
          console.warn("🎯 [Selection] getItems not available yet");
          return;
        }
        const items = getItemsFn();

        if (state.mode === "single" && indices.length > 1) {
          // In single mode, only select the first item
          indices = [indices[0]];
        }

        indices.forEach((index) => {
          const item = items?.[index];
          const itemId = getItemId(item);
          if (itemId !== undefined) {
            state.selectedIds.add(itemId);
          }
        });

        // Update lastSelectedIndex for shift+click range selection
        if (indices.length > 0) {
          state.lastSelectedIndex = indices[indices.length - 1];
        }

        updateVisibleElements();
        (this as any).emit?.("selection:change", {
          selectedItems: (this as any).getSelectedItems(),
          selectedIndices: (this as any).getSelectedIndices(),
        });
      },

      deselectItems(indices: number[]) {
        // Use type assertion to access getItems which is added by API feature
        const getItemsFn = (this as any).getItems;
        if (!getItemsFn) {
          console.warn("🎯 [Selection] getItems not available yet");
          return;
        }
        const items = getItemsFn();

        indices.forEach((index) => {
          const item = items?.[index];
          const itemId = getItemId(item);
          if (itemId !== undefined) {
            state.selectedIds.delete(itemId);
          }
        });

        updateVisibleElements();
        (this as any).emit?.("selection:change", {
          selectedItems: (this as any).getSelectedItems(),
          selectedIndices: (this as any).getSelectedIndices(),
        });
      },

      clearSelection() {
        state.selectedIds.clear();
        state.lastSelectedIndex = undefined;
        updateVisibleElements();
        (this as any).emit?.("selection:change", {
          selectedItems: [],
          selectedIndices: [],
        });
      },

      getSelectedItems(): T[] {
        // Use type assertion to access getItems which is added by API feature
        const getItemsFn = (this as any).getItems;
        if (!getItemsFn) {
          return [];
        }
        const items = getItemsFn() || [];
        return items.filter((item: any) => {
          const id = getItemId(item);
          return id !== undefined && state.selectedIds.has(id);
        });
      },

      getSelectedIndices(): number[] {
        // Use type assertion to access getItems which is added by API feature
        const getItemsFn = (this as any).getItems;
        if (!getItemsFn) {
          return [];
        }
        const items = getItemsFn() || [];
        return items.reduce((acc: number[], item: any, index: number) => {
          const id = getItemId(item);
          if (id !== undefined && state.selectedIds.has(id)) {
            acc.push(index);
          }
          return acc;
        }, [] as number[]);
      },

      isSelected(index: number): boolean {
        // Use type assertion to access getItems which is added by API feature
        const getItemsFn = (this as any).getItems;
        if (!getItemsFn) {
          return false;
        }
        const items = getItemsFn();
        const item = items?.[index];
        const itemId = getItemId(item);
        return itemId !== undefined && state.selectedIds.has(itemId);
      },
    };

    return enhancedComponent;
  };
};

export default withSelection;
