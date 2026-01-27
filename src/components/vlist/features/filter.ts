// src/components/vlist/features/filter.ts

/**
 * Filter feature for VList
 *
 * Provides generic, layout-agnostic filter functionality that works with
 * any layout structure and any filter controls. The feature references
 * layout elements by name and handles filter state, events, and integration
 * with the collection adapter.
 *
 * @example
 * ```typescript
 * const vlist = createVList({
 *   layout: [
 *     ['head', { class: 'head' },
 *       [createIconButton, 'filter-toggle', { icon: iconFilter, toggle: true }]
 *     ],
 *     ['filters', { class: 'filter-panel' },
 *       [createSelect, 'country-select', { options: countries }],
 *       [createSelect, 'decade-select', { options: decades }],
 *       [Button, 'clear-btn', { icon: iconCancel }]
 *     ],
 *     ['viewport'],
 *   ],
 *
 *   filter: {
 *     toggleButton: 'filter-toggle',
 *     panel: 'filters',
 *     clearButton: 'clear-btn',
 *     controls: {
 *       country: 'country-select',
 *       decade: 'decade-select',
 *     },
 *   },
 *
 *   collection: {
 *     adapter: {
 *       read: async ({ page, limit, filters }) => {
 *         let url = `/api/items?page=${page}&limit=${limit}`
 *         if (filters?.country) url += `&country=${filters.country}`
 *         if (filters?.decade) url += `&decade=${filters.decade}`
 *         return fetch(url).then(r => r.json())
 *       }
 *     }
 *   }
 * })
 *
 * // Events
 * vlist.on('filter:open', () => console.log('Filter panel opened'))
 * vlist.on('filter:change', ({ name, value, filters }) => console.log('Filter changed:', name, value))
 * vlist.on('filter:clear', () => console.log('Filters cleared'))
 *
 * // API
 * vlist.setFilter('country', 'FR')
 * vlist.setFilters({ country: 'FR', decade: '1980' })
 * vlist.clearFilters()
 * console.log(vlist.getFilters())
 * console.log(vlist.getFilter('country'))
 * console.log(vlist.isFiltered())
 * ```
 */

import type { VListConfig, VListItem } from "../types";

/**
 * Filter configuration
 */
export interface FilterConfig {
  /** Layout element name for toggle button */
  toggleButton?: string;
  /** Layout element name for filter panel container */
  panel?: string;
  /** Layout element name for clear all filters button */
  clearButton?: string;
  /** Map of filter name to layout element name */
  controls?: Record<string, string>;
  /** Automatically reload on filter change (default: true) */
  autoReload?: boolean;
}

/**
 * Filter state
 */
interface FilterState {
  filters: Record<string, any>;
  isOpen: boolean;
}

/**
 * Get DOM element from layout item (handles both raw elements and components)
 */
const getElement = (layoutItem: any): HTMLElement | null => {
  if (!layoutItem) return null;
  if (layoutItem instanceof HTMLElement) return layoutItem;
  if (layoutItem.element instanceof HTMLElement) return layoutItem.element;
  return null;
};

/**
 * Get value from a filter control component
 */
const getControlValue = (control: any): any => {
  if (!control) return undefined;

  // Component with getValue method (Select, Chips, etc.)
  if (typeof control.getValue === "function") {
    return control.getValue();
  }

  // Component with value property
  if ("value" in control) {
    return control.value;
  }

  // Component with getSelected method (Chips with multiSelect)
  if (typeof control.getSelected === "function") {
    return control.getSelected();
  }

  // Component with getSelectedValue method
  if (typeof control.getSelectedValue === "function") {
    return control.getSelectedValue();
  }

  // Raw input element
  const element = getElement(control);
  if (
    element instanceof HTMLInputElement ||
    element instanceof HTMLSelectElement
  ) {
    return element.value;
  }

  return undefined;
};

/**
 * Set value on a filter control component
 */
const setControlValue = (control: any, value: any): void => {
  if (!control) return;

  // Component with setValue method
  if (typeof control.setValue === "function") {
    control.setValue(value);
    return;
  }

  // Component with setSelected method (for Chips)
  if (typeof control.setSelected === "function") {
    control.setSelected(value);
    return;
  }

  // Component with select method
  if (typeof control.select === "function") {
    control.select(value);
    return;
  }

  // Raw input element
  const element = getElement(control);
  if (
    element instanceof HTMLInputElement ||
    element instanceof HTMLSelectElement
  ) {
    element.value = value ?? "";
  }
};

/**
 * Clear a filter control component
 */
const clearControl = (control: any): void => {
  if (!control) return;

  // Component with clear method
  if (typeof control.clear === "function") {
    control.clear();
    return;
  }

  // Component with reset method
  if (typeof control.reset === "function") {
    control.reset();
    return;
  }

  // Fall back to setting empty value
  setControlValue(control, "");
};

/**
 * Adds filter functionality to VList component
 *
 * This feature:
 * 1. Connects to layout elements by name (toggle button, panel, controls)
 * 2. Manages filter state
 * 3. Emits events for app-specific handling
 * 4. Provides API methods for programmatic control
 * 5. Triggers list reload on filter changes (configurable)
 *
 * @param config - VList configuration with filter options
 * @returns Feature function that enhances the VList component
 */
export const withFilter = <T extends VListItem = VListItem>(
  config: VListConfig<T> & { filter?: FilterConfig },
) => {
  return (component: any): any => {
    const filterConfig = config.filter;

    // Skip if no filter config provided
    if (!filterConfig) {
      return component;
    }

    // Configuration with defaults
    const autoReload = filterConfig.autoReload !== false;
    const controls = filterConfig.controls || {};

    // Internal state
    const state: FilterState = {
      filters: {},
      isOpen: false,
    };

    // Store cleanup functions
    const cleanupFns: Array<() => void> = [];

    /**
     * Open the filter panel
     */
    const openFilter = () => {
      if (state.isOpen) return;

      state.isOpen = true;

      // Show filter panel
      if (filterConfig.panel && component.layout) {
        const panel = component.layout[filterConfig.panel];
        const element = getElement(panel);
        if (element) {
          element.classList.add("show");
          element.classList.remove("hide");
        }

        // If component has show method
        if (typeof panel?.show === "function") {
          panel.show();
        }
      }

      // Update toggle button state
      if (filterConfig.toggleButton && component.layout) {
        const toggleBtn = component.layout[filterConfig.toggleButton];
        // Use icon-button's select/deselect API
        if (toggleBtn && typeof toggleBtn.select === "function") {
          toggleBtn.select();
        } else if (
          toggleBtn &&
          typeof toggleBtn.toggleSelected === "function"
        ) {
          // Only toggle if not already selected
          if (!toggleBtn.isSelected?.()) {
            toggleBtn.toggleSelected();
          }
        }
      }

      component.emit?.("filter:open", {});
    };

    /**
     * Close the filter panel
     */
    const closeFilter = () => {
      if (!state.isOpen) return;

      state.isOpen = false;

      // Hide filter panel
      if (filterConfig.panel && component.layout) {
        const panel = component.layout[filterConfig.panel];
        const element = getElement(panel);
        if (element) {
          element.classList.remove("show");
          element.classList.add("hide");
        }

        // If component has hide method
        if (typeof panel?.hide === "function") {
          panel.hide();
        }
      }

      // Update toggle button state
      if (filterConfig.toggleButton && component.layout) {
        const toggleBtn = component.layout[filterConfig.toggleButton];
        // Use icon-button's select/deselect API
        if (toggleBtn && typeof toggleBtn.deselect === "function") {
          toggleBtn.deselect();
        } else if (
          toggleBtn &&
          typeof toggleBtn.toggleSelected === "function"
        ) {
          // Only toggle if currently selected
          if (toggleBtn.isSelected?.()) {
            toggleBtn.toggleSelected();
          }
        }
      }

      component.emit?.("filter:close", {});
    };

    /**
     * Toggle filter panel visibility
     */
    const toggleFilter = () => {
      if (state.isOpen) {
        closeFilter();
      } else {
        openFilter();
      }
    };

    /**
     * Handle filter value change
     */
    const handleFilterChange = (name: string, value: any) => {
      const previousValue = state.filters[name];

      // Skip if value hasn't changed
      if (previousValue === value) return;

      // Update state
      if (
        value === undefined ||
        value === null ||
        value === "" ||
        (Array.isArray(value) && value.length === 0)
      ) {
        delete state.filters[name];
      } else {
        state.filters[name] = value;
      }

      // Emit change event
      component.emit?.("filter:change", {
        name,
        value,
        previousValue,
        filters: { ...state.filters },
      });

      // Reload if auto-reload enabled
      if (autoReload && typeof component.reload === "function") {
        component.reload();
      }
    };

    /**
     * Clear all filters
     */
    const clearFiltersInternal = (emitEvent: boolean = true) => {
      const hadFilters = Object.keys(state.filters).length > 0;

      // Clear internal state
      state.filters = {};

      // Clear all control values
      if (component.layout) {
        for (const [, elementName] of Object.entries(controls)) {
          const control = component.layout[elementName];
          if (control) {
            clearControl(control);
          }
        }
      }

      if (hadFilters && emitEvent) {
        component.emit?.("filter:clear", {});

        // Reload if auto-reload enabled
        if (autoReload && typeof component.reload === "function") {
          component.reload();
        }
      }
    };

    /**
     * Wire up event listeners after component is ready
     */
    const setup = () => {
      // Wait for layout to be available
      if (!component.layout) {
        return;
      }

      // Wire up toggle button
      if (filterConfig.toggleButton) {
        const toggleBtn = component.layout[filterConfig.toggleButton];
        if (toggleBtn) {
          const handleToggleClick = () => {
            toggleFilter();
          };

          if (typeof toggleBtn.on === "function") {
            toggleBtn.on("click", handleToggleClick);
            cleanupFns.push(() => toggleBtn.off?.("click", handleToggleClick));
          } else {
            const element = getElement(toggleBtn);
            if (element) {
              element.addEventListener("click", handleToggleClick);
              cleanupFns.push(() =>
                element.removeEventListener("click", handleToggleClick),
              );
            }
          }
        }
      }

      // Wire up clear button
      if (filterConfig.clearButton) {
        const clearBtn = component.layout[filterConfig.clearButton];
        if (clearBtn) {
          const handleClearClick = () => {
            clearFiltersInternal();
          };

          if (typeof clearBtn.on === "function") {
            clearBtn.on("click", handleClearClick);
            cleanupFns.push(() => clearBtn.off?.("click", handleClearClick));
          } else {
            const element = getElement(clearBtn);
            if (element) {
              element.addEventListener("click", handleClearClick);
              cleanupFns.push(() =>
                element.removeEventListener("click", handleClearClick),
              );
            }
          }
        }
      }

      // Wire up filter controls
      for (const [filterName, elementName] of Object.entries(controls)) {
        const control = component.layout[elementName];
        if (!control) continue;

        // Handler for value changes
        const handleChange = (event: any) => {
          // Get value from event or control
          let value =
            event?.value ?? event?.detail?.value ?? getControlValue(control);
          handleFilterChange(filterName, value);
        };

        // Listen to component events
        if (typeof control.on === "function") {
          control.on("change", handleChange);
          cleanupFns.push(() => control.off?.("change", handleChange));

          // Some components emit 'select' instead of 'change'
          control.on("select", handleChange);
          cleanupFns.push(() => control.off?.("select", handleChange));
        }

        // Also listen to native DOM events
        const element = getElement(control);
        if (element) {
          const handleDomChange = (e: Event) => {
            const target = e.target as HTMLInputElement | HTMLSelectElement;
            handleFilterChange(filterName, target.value);
          };

          element.addEventListener("change", handleDomChange);
          cleanupFns.push(() =>
            element.removeEventListener("change", handleDomChange),
          );
        }
      }
    };

    // Initialize after component is ready
    setTimeout(setup, 0);

    // Store original destroy
    const originalDestroy = component.destroy;

    // Enhanced component with filter API
    return {
      ...component,

      // Internal filters getter (for collection adapter integration)
      _filters: () => ({ ...state.filters }),

      /**
       * Set a single filter value
       */
      setFilter(name: string, value: any): void {
        // Update internal state
        if (
          value === undefined ||
          value === null ||
          value === "" ||
          (Array.isArray(value) && value.length === 0)
        ) {
          delete state.filters[name];
        } else {
          state.filters[name] = value;
        }

        // Update control if it exists
        const elementName = controls[name];
        if (elementName && component.layout) {
          const control = component.layout[elementName];
          if (control) {
            setControlValue(control, value);
          }
        }

        // Emit change event
        component.emit?.("filter:change", {
          name,
          value,
          filters: { ...state.filters },
        });

        // Reload if auto-reload enabled
        if (autoReload && typeof component.reload === "function") {
          component.reload();
        }
      },

      /**
       * Set multiple filters at once
       */
      setFilters(filters: Record<string, any>): void {
        // Store previous state for comparison
        const previousFilters = { ...state.filters };

        // Update all filters
        for (const [name, value] of Object.entries(filters)) {
          if (
            value === undefined ||
            value === null ||
            value === "" ||
            (Array.isArray(value) && value.length === 0)
          ) {
            delete state.filters[name];
          } else {
            state.filters[name] = value;
          }

          // Update control if it exists
          const elementName = controls[name];
          if (elementName && component.layout) {
            const control = component.layout[elementName];
            if (control) {
              setControlValue(control, value);
            }
          }
        }

        // Check if filters actually changed
        const hasChanged =
          JSON.stringify(previousFilters) !== JSON.stringify(state.filters);

        if (hasChanged) {
          // Emit change event with all filters
          component.emit?.("filter:change", {
            name: null,
            value: null,
            filters: { ...state.filters },
          });

          // Reload if auto-reload enabled
          if (autoReload && typeof component.reload === "function") {
            component.reload();
          }
        }
      },

      /**
       * Clear all filters
       */
      clearFilters(): void {
        clearFiltersInternal();
      },

      /**
       * Get all current filters
       */
      getFilters(): Record<string, any> {
        return { ...state.filters };
      },

      /**
       * Get a single filter value
       */
      getFilter(name: string): any {
        return state.filters[name];
      },

      /**
       * Check if any filter is active
       */
      isFiltered(): boolean {
        return Object.keys(state.filters).length > 0;
      },

      /**
       * Check if filter panel is open
       */
      isFilterOpen(): boolean {
        return state.isOpen;
      },

      /**
       * Open the filter panel
       */
      openFilter(): void {
        openFilter();
      },

      /**
       * Close the filter panel
       */
      closeFilter(): void {
        closeFilter();
      },

      /**
       * Toggle filter panel visibility
       */
      toggleFilter(): void {
        toggleFilter();
      },

      /**
       * Enhanced destroy that cleans up filter listeners
       */
      destroy(): void {
        // Run all cleanup functions
        cleanupFns.forEach((fn) => {
          try {
            fn();
          } catch (e) {
            // Ignore cleanup errors
          }
        });
        cleanupFns.length = 0;

        // Call original destroy
        if (typeof originalDestroy === "function") {
          originalDestroy.call(this);
        }
      },
    };
  };
};

/**
 * Type helper for VList with filter
 */
export interface WithFilterComponent {
  /** Set a single filter value */
  setFilter(name: string, value: any): void;
  /** Set multiple filters at once */
  setFilters(filters: Record<string, any>): void;
  /** Clear all filters */
  clearFilters(): void;
  /** Get all current filters */
  getFilters(): Record<string, any>;
  /** Get a single filter value */
  getFilter(name: string): any;
  /** Check if any filter is active */
  isFiltered(): boolean;
  /** Check if filter panel is open */
  isFilterOpen(): boolean;
  /** Open the filter panel */
  openFilter(): void;
  /** Close the filter panel */
  closeFilter(): void;
  /** Toggle filter panel visibility */
  toggleFilter(): void;
}
