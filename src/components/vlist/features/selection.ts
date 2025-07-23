/**
 * @module core/compose/features
 * @description Selection feature for components
 */

/**
 * Basic item interface for selection
 */
export interface SelectableItem {
  id: string;
  [key: string]: any;
}

/**
 * Selection configuration
 */
export interface SelectionConfig<T extends SelectableItem = SelectableItem> {
  enabled?: boolean;
  multiple?: boolean;
  selectableFilter?: (item: T) => boolean;
}

/**
 * Component with selection capabilities
 */
export interface SelectionComponent<T extends SelectableItem = SelectableItem> {
  selectItem: (id: string) => any;
  deselectItem: (id: string) => any;
  selectAll: () => any;
  deselectAll: () => any;
  getSelectedItems: () => T[];
  getSelectedIds: () => string[];
}

/**
 * Adds selection capabilities to a component
 *
 * @param config - Selection configuration
 * @returns Component enhancer that adds selection capabilities
 *
 * @example
 * ```typescript
 * const component = pipe(
 *   createBase,
 *   withElement(),
 *   withEvents(),
 *   withSelection({
 *     enabled: true,
 *     multiple: true,
 *     selectableFilter: (item) => item.status === 'active'
 *   })
 * )(config);
 * ```
 */
export function withSelection<T extends SelectableItem = SelectableItem>(
  config: SelectionConfig<T>
) {
  return (component: any): any & SelectionComponent<T> => {
    console.log("✅ [MTRL-ADDONS] Adding selection capabilities");

    if (!config.enabled) return component;

    let selectedIds = new Set<string>();

    // Selection helper functions
    const isSelectable = (item: T): boolean => {
      if (config.selectableFilter) {
        return config.selectableFilter(item);
      }
      return true;
    };

    const updateItemSelection = (id: string, selected: boolean): void => {
      const element = component.element.querySelector(
        `[data-id="${id}"]`
      ) as HTMLElement;
      if (element) {
        element.classList.toggle(
          component.getModifierClass
            ? component.getModifierClass("item", "selected")
            : "mtrl-item--selected",
          selected
        );
        element.setAttribute("aria-selected", selected.toString());
      }
    };

    // Use component's event system for selection if available
    if (component.on) {
      component.on("click", (event: Event) => {
        const target = event.target as HTMLElement;
        const selectableItem = target.closest("[data-id]") as HTMLElement;
        if (!selectableItem) return;

        const itemId = selectableItem.getAttribute("data-id");
        if (!itemId) return;

        const item = component.getItem ? component.getItem(itemId) : null;
        if (!item || !isSelectable(item)) return;

        // Handle selection logic
        if (config.multiple) {
          if (selectedIds.has(itemId)) {
            component.deselectItem(itemId);
          } else {
            component.selectItem(itemId);
          }
        } else {
          // Single selection - clear others first
          component.deselectAll();
          component.selectItem(itemId);
        }

        // Emit selection events using component's event system
        if (component.emit) {
          component.emit("selection:change", {
            itemId,
            selected: selectedIds.has(itemId),
            selectedIds: Array.from(selectedIds),
          });
        }
      });
    }

    // Selection methods
    return {
      ...component,

      selectItem(id: string) {
        const item = component.getItem ? component.getItem(id) : null;
        if (!item || !isSelectable(item)) return component;

        selectedIds.add(id);
        updateItemSelection(id, true);
        console.log(`✅ [MTRL-ADDONS] Selected item: ${id}`);

        // Emit event using component's event system
        if (component.emit) {
          component.emit("item:select", { itemId: id, item });
        }

        return component;
      },

      deselectItem(id: string) {
        selectedIds.delete(id);
        updateItemSelection(id, false);
        console.log(`❌ [MTRL-ADDONS] Deselected item: ${id}`);

        // Emit event using component's event system
        if (component.emit) {
          component.emit("item:deselect", { itemId: id });
        }

        return component;
      },

      selectAll() {
        if (!config.multiple) return component;

        if (component.getItems) {
          component.getItems().forEach((item: T) => {
            if (isSelectable(item)) {
              selectedIds.add(item.id);
              updateItemSelection(item.id, true);
            }
          });
        }

        console.log(
          `✅ [MTRL-ADDONS] Selected all items (${selectedIds.size})`
        );

        // Emit event using component's event system
        if (component.emit) {
          component.emit("selection:all", {
            selectedIds: Array.from(selectedIds),
          });
        }

        return component;
      },

      deselectAll() {
        selectedIds.forEach((id) => {
          updateItemSelection(id, false);
        });
        selectedIds.clear();

        console.log(`❌ [MTRL-ADDONS] Deselected all items`);

        // Emit event using component's event system
        if (component.emit) {
          component.emit("selection:clear", {});
        }

        return component;
      },

      getSelectedItems(): T[] {
        if (!component.getItem) return [];

        return Array.from(selectedIds)
          .map((id) => component.getItem(id))
          .filter(Boolean) as T[];
      },

      getSelectedIds(): string[] {
        return Array.from(selectedIds);
      },
    };
  };
}
