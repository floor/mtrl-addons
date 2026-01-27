// src/components/vlist/features/search.ts

/**
 * Search feature for VList
 *
 * Provides generic, layout-agnostic search functionality that works with
 * any layout structure. The feature references layout elements by name
 * and handles search state, events, and integration with the collection adapter.
 *
 * @example
 * ```typescript
 * const vlist = createVList({
 *   layout: [
 *     ['head', { class: 'head' },
 *       [createIconButton, 'search-toggle', { icon: iconSearch, toggle: true }]
 *     ],
 *     [createSearch, 'search-input', { placeholder: 'Search...' }],
 *     ['viewport'],
 *   ],
 *
 *   search: {
 *     toggleButton: 'search-toggle',
 *     searchBar: 'search-input',
 *     debounce: 300,
 *   },
 *
 *   collection: {
 *     adapter: {
 *       read: async ({ page, limit, search }) => {
 *         let url = `/api/items?page=${page}&limit=${limit}`
 *         if (search) url += `&q=${encodeURIComponent(search)}`
 *         return fetch(url).then(r => r.json())
 *       }
 *     }
 *   }
 * })
 *
 * // Events
 * vlist.on('search:open', () => console.log('Search opened'))
 * vlist.on('search:change', ({ query }) => console.log('Searching:', query))
 *
 * // API
 * vlist.search('john')
 * vlist.clearSearch()
 * console.log(vlist.getSearchQuery())
 * ```
 */

import type { VListConfig, VListItem } from "../types";

/**
 * Search configuration
 */
export interface SearchConfig {
  /** Layout element name for toggle button */
  toggleButton?: string;
  /** Layout element name for search input/bar */
  searchBar?: string;
  /** Automatically reload on search change (default: true) */
  autoReload?: boolean;
  /** Debounce input in ms (default: 300) */
  debounce?: number;
  /** Minimum query length to trigger search (default: 1) */
  minLength?: number;
}

/**
 * Search state
 */
interface SearchState {
  query: string;
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
 * Get input element from a search component or element
 */
const getInputElement = (layoutItem: any): HTMLInputElement | null => {
  if (!layoutItem) return null;

  // If it's an input element directly
  if (layoutItem instanceof HTMLInputElement) return layoutItem;

  // If it's a component with getInput method (like createSearch)
  if (typeof layoutItem.getInput === "function") {
    return layoutItem.getInput();
  }

  // If it's a component with input property
  if (layoutItem.input instanceof HTMLInputElement) {
    return layoutItem.input;
  }

  // If it's an element, look for input inside
  const element = getElement(layoutItem);
  if (element) {
    const input = element.querySelector("input");
    if (input instanceof HTMLInputElement) return input;
  }

  return null;
};

/**
 * Creates a debounced version of a function
 */
const debounce = <T extends (...args: any[]) => any>(
  fn: T,
  delay: number,
): ((...args: Parameters<T>) => void) => {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  return (...args: Parameters<T>) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    timeoutId = setTimeout(() => {
      fn(...args);
      timeoutId = null;
    }, delay);
  };
};

/**
 * Adds search functionality to VList component
 *
 * This feature:
 * 1. Connects to layout elements by name (toggle button, search bar)
 * 2. Manages search state (query, open/closed)
 * 3. Emits events for app-specific handling
 * 4. Provides API methods for programmatic control
 * 5. Triggers list reload on search changes (configurable)
 *
 * @param config - VList configuration with search options
 * @returns Feature function that enhances the VList component
 */
export const withSearch = <T extends VListItem = VListItem>(
  config: VListConfig<T> & { search?: SearchConfig },
) => {
  return (component: any): any => {
    const searchConfig = config.search;

    // Skip if no search config provided
    if (!searchConfig) {
      return component;
    }

    // Configuration with defaults
    const autoReload = searchConfig.autoReload !== false;
    const debounceMs = searchConfig.debounce ?? 300;
    const minLength = searchConfig.minLength ?? 1;

    // Internal state
    const state: SearchState = {
      query: "",
      isOpen: false,
    };

    // Store cleanup functions
    const cleanupFns: Array<() => void> = [];

    /**
     * Open the search bar
     */
    const openSearch = () => {
      if (state.isOpen) return;

      state.isOpen = true;

      // Show search bar element
      if (searchConfig.searchBar && component.layout) {
        const searchBar = component.layout[searchConfig.searchBar];
        const element = getElement(searchBar);
        if (element) {
          element.classList.add("show");
          element.classList.remove("hide");

          // Focus the input
          const input = getInputElement(searchBar);
          if (input) {
            setTimeout(() => input.focus(), 50);
          }
        }

        // If component has show method (like a Search component)
        if (typeof searchBar?.show === "function") {
          searchBar.show();
        }
      }

      // Update toggle button state
      if (searchConfig.toggleButton && component.layout) {
        const toggleBtn = component.layout[searchConfig.toggleButton];
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

      component.emit?.("search:open", {});
    };

    /**
     * Close the search bar
     */
    const closeSearch = () => {
      if (!state.isOpen) return;

      state.isOpen = false;

      // Clear the query state
      state.query = "";

      // Hide search bar element and clear input
      if (searchConfig.searchBar && component.layout) {
        const searchBar = component.layout[searchConfig.searchBar];
        const element = getElement(searchBar);
        if (element) {
          element.classList.remove("show");
          element.classList.add("hide");
        }

        // Clear the input value
        if (typeof searchBar?.clear === "function") {
          searchBar.clear();
        } else if (typeof searchBar?.setValue === "function") {
          searchBar.setValue("");
        } else {
          const input = getInputElement(searchBar);
          if (input) {
            input.value = "";
          }
        }

        // If component has hide method
        if (typeof searchBar?.hide === "function") {
          searchBar.hide();
        }
      }

      // Update toggle button state
      if (searchConfig.toggleButton && component.layout) {
        const toggleBtn = component.layout[searchConfig.toggleButton];
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

      component.emit?.("search:close", {});
    };

    /**
     * Toggle search bar visibility
     */
    const toggleSearch = () => {
      if (state.isOpen) {
        closeSearch();
      } else {
        openSearch();
      }
    };

    /**
     * Handle search query change
     */
    const handleSearchChange = (query: string) => {
      const previousQuery = state.query;
      state.query = query;

      // Only trigger if query meets minimum length or is being cleared
      if (
        query.length >= minLength ||
        (previousQuery.length > 0 && query.length === 0)
      ) {
        component.emit?.("search:change", { query, previousQuery });

        // Reload list if auto-reload is enabled
        if (autoReload && typeof component.reload === "function") {
          component.reload();
        }
      }
    };

    // Create debounced handler
    const debouncedSearchChange = debounce(handleSearchChange, debounceMs);

    /**
     * Wire up event listeners after component is ready
     */
    const setup = () => {
      // Wait for layout to be available
      if (!component.layout) {
        return;
      }

      // Wire up toggle button
      if (searchConfig.toggleButton) {
        const toggleBtn = component.layout[searchConfig.toggleButton];
        if (toggleBtn) {
          const handleToggleClick = () => {
            toggleSearch();
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

      // Wire up search bar input
      if (searchConfig.searchBar) {
        const searchBar = component.layout[searchConfig.searchBar];

        // Listen to component's change event if available
        if (searchBar && typeof searchBar.on === "function") {
          const handleChange = (event: any) => {
            const value = event?.value ?? event?.target?.value ?? "";
            debouncedSearchChange(value);
          };

          searchBar.on("change", handleChange);
          searchBar.on("input", handleChange);
          cleanupFns.push(() => {
            searchBar.off?.("change", handleChange);
            searchBar.off?.("input", handleChange);
          });

          // Listen for clear event
          const handleClear = () => {
            handleSearchChange("");
            component.emit?.("search:clear", {});
          };
          searchBar.on("clear", handleClear);
          cleanupFns.push(() => searchBar.off?.("clear", handleClear));
        }

        // Also listen to raw input events
        const input = getInputElement(searchBar);
        if (input) {
          const handleInputEvent = (e: Event) => {
            const value = (e.target as HTMLInputElement).value;
            debouncedSearchChange(value);
          };

          input.addEventListener("input", handleInputEvent);
          cleanupFns.push(() =>
            input.removeEventListener("input", handleInputEvent),
          );

          // Handle Enter key
          const handleKeydown = (e: KeyboardEvent) => {
            if (e.key === "Enter") {
              // Immediately trigger search without debounce
              handleSearchChange(input.value);
            } else if (e.key === "Escape") {
              closeSearch();
              if (state.query) {
                clearSearchInternal();
              }
            }
          };

          input.addEventListener("keydown", handleKeydown);
          cleanupFns.push(() =>
            input.removeEventListener("keydown", handleKeydown),
          );
        }
      }
    };

    /**
     * Internal clear search function
     */
    const clearSearchInternal = () => {
      const hadQuery = state.query.length > 0;
      state.query = "";

      // Clear the input element
      if (searchConfig.searchBar && component.layout) {
        const searchBar = component.layout[searchConfig.searchBar];

        // Use component's clear method if available
        if (typeof searchBar?.clear === "function") {
          searchBar.clear();
        } else if (typeof searchBar?.setValue === "function") {
          searchBar.setValue("");
        } else {
          const input = getInputElement(searchBar);
          if (input) {
            input.value = "";
          }
        }
      }

      if (hadQuery) {
        component.emit?.("search:clear", {});

        // Reload list if auto-reload is enabled
        if (autoReload && typeof component.reload === "function") {
          component.reload();
        }
      }
    };

    // Initialize after component is ready
    setTimeout(setup, 0);

    // Cleanup on destroy
    const originalDestroy = component.destroy;

    // Enhanced component with search API
    return {
      ...component,

      // Internal search query getter (for collection adapter integration)
      _searchQuery: () => state.query,

      /**
       * Set search query programmatically
       */
      search(query: string): void {
        // Update state
        state.query = query;

        // Update input element
        if (searchConfig.searchBar && component.layout) {
          const searchBar = component.layout[searchConfig.searchBar];
          if (typeof searchBar?.setValue === "function") {
            searchBar.setValue(query);
          } else {
            const input = getInputElement(searchBar);
            if (input) {
              input.value = query;
            }
          }
        }

        // Open search if setting a query
        if (query && !state.isOpen) {
          openSearch();
        }

        // Emit change event
        component.emit?.("search:change", { query, previousQuery: "" });

        // Reload if auto-reload enabled
        if (autoReload && typeof component.reload === "function") {
          component.reload();
        }
      },

      /**
       * Clear search query
       */
      clearSearch(): void {
        clearSearchInternal();
      },

      /**
       * Get current search query
       */
      getSearchQuery(): string {
        return state.query;
      },

      /**
       * Check if currently in search mode (has a query)
       */
      isSearching(): boolean {
        return state.query.length > 0;
      },

      /**
       * Check if search bar is open
       */
      isSearchOpen(): boolean {
        return state.isOpen;
      },

      /**
       * Open the search bar
       */
      openSearch(): void {
        openSearch();
      },

      /**
       * Close the search bar
       */
      closeSearch(): void {
        closeSearch();
      },

      /**
       * Toggle search bar visibility
       */
      toggleSearch(): void {
        toggleSearch();
      },

      /**
       * Enhanced destroy that cleans up search listeners
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
 * Type helper for VList with search
 */
export interface WithSearchComponent {
  /** Set search query programmatically */
  search(query: string): void;
  /** Clear search query */
  clearSearch(): void;
  /** Get current search query */
  getSearchQuery(): string;
  /** Check if currently in search mode */
  isSearching(): boolean;
  /** Check if search bar is open */
  isSearchOpen(): boolean;
  /** Open the search bar */
  openSearch(): void;
  /** Close the search bar */
  closeSearch(): void;
  /** Toggle search bar visibility */
  toggleSearch(): void;
}
