/**
 * mtrl-addons List Component API Feature
 *
 * API enhancement feature for the list component.
 * Follows mtrl patterns for component API composition.
 */

import type { ListItem } from "../types";

/**
 * API configuration options for List component
 */
interface ApiOptions<T extends ListItem = ListItem> {
  // Data operations
  data: {
    add: (items: T | T[]) => Promise<void>;
    update: (id: string, updates: Partial<T>) => Promise<void>;
    remove: (id: string) => Promise<void>;
    clear: () => Promise<void>;
    refresh: () => Promise<void>;
    getItems: () => T[];
    getItem: (id: string) => T | undefined;
    query: (filter: (item: T) => boolean) => T[];
    sort: (compareFn?: (a: T, b: T) => number) => Promise<void>;
    getSize: () => number;
    isEmpty: () => boolean;
    isLoading: () => boolean;
    getError: () => string | null;
  };

  // Selection operations (optional)
  selection?: {
    selectItem: (id: string) => any;
    deselectItem: (id: string) => any;
    selectAll: () => any;
    deselectAll: () => any;
    getSelectedItems: () => T[];
    getSelectedIds: () => string[];
  };

  // Scrolling operations
  scrolling: {
    scrollToItem: (id: string, position?: "start" | "center" | "end") => any;
    scrollToIndex: (
      index: number,
      position?: "start" | "center" | "end"
    ) => any;
    scrollToPage: (
      page: number,
      position?: "start" | "center" | "end"
    ) => Promise<any>;
  };

  // Performance operations
  performance: {
    getMetrics: () => any;
    resetMetrics: () => any;
  };

  // Template operations
  template: {
    setTemplate: (template: any) => void;
    getTemplate: () => any;
  };

  // Events system
  events: {
    on: (event: string, handler: Function) => any;
    off: (event: string, handler: Function) => any;
    emit: (event: string, data: any) => void;
    subscribe: (observer: Function) => Function;
  };

  // Lifecycle operations
  lifecycle: {
    destroy: () => void;
  };

  // Configuration access
  config: {
    selection?: any;
    listStyle?: any;
    performance?: any;
    virtualScroll?: any;
  };
}

/**
 * Component with required elements and methods for API enhancement
 */
interface ComponentWithElements {
  element: HTMLElement;
  on?: (event: string, handler: Function) => any;
  off?: (event: string, handler: Function) => any;
  emit?: (event: string, data: any) => void;
}

/**
 * Enhances a List component with public API methods
 * Following mtrl patterns for API composition
 *
 * @param {ApiOptions} options - API configuration options
 * @returns {Function} Higher-order function that adds API methods to component
 *
 * @example
 * ```typescript
 * const component = pipe(
 *   createBase,
 *   withElement(),
 *   withCollection(),
 *   withApi(getApiConfig(component, config))
 * )(config);
 * ```
 */
export const withApi =
  <T extends ListItem = ListItem>(options: ApiOptions<T>) =>
  (component: ComponentWithElements) => {
    console.log("🔗 [MTRL-ADDONS-LIST] Adding list API methods");

    return {
      ...component,
      element: component.element,

      // Data operations
      /**
       * Adds one or more items to the list
       * @param {T | T[]} items - Item(s) to add
       * @returns {Promise<void>} Promise that resolves when items are added
       */
      add: async (items: T | T[]) => {
        await options.data.add(items);
        return component;
      },

      /**
       * Updates an item in the list
       * @param {string} id - Item ID to update
       * @param {Partial<T>} updates - Updates to apply
       * @returns {Promise<void>} Promise that resolves when item is updated
       */
      update: async (id: string, updates: Partial<T>) => {
        await options.data.update(id, updates);
        return component;
      },

      /**
       * Removes an item from the list
       * @param {string} id - Item ID to remove
       * @returns {Promise<void>} Promise that resolves when item is removed
       */
      remove: async (id: string) => {
        await options.data.remove(id);
        return component;
      },

      /**
       * Clears all items from the list
       * @returns {Promise<void>} Promise that resolves when list is cleared
       */
      clear: async () => {
        await options.data.clear();
        return component;
      },

      /**
       * Refreshes the list with the latest data
       * @returns {Promise<void>} Promise that resolves when refresh is complete
       */
      refresh: async () => {
        await options.data.refresh();
        return component;
      },

      /**
       * Gets all items in the list
       * @returns {T[]} Array of all items
       */
      getItems: (): T[] => options.data.getItems(),

      /**
       * Gets a specific item by ID
       * @param {string} id - Item ID to retrieve
       * @returns {T | undefined} Item if found, undefined otherwise
       */
      getItem: (id: string): T | undefined => options.data.getItem(id),

      /**
       * Queries items using a filter function
       * @param {Function} filter - Filter function
       * @returns {T[]} Filtered items
       */
      query: (filter: (item: T) => boolean): T[] => options.data.query(filter),

      /**
       * Sorts items using a comparison function
       * @param {Function} compareFn - Comparison function
       * @returns {Promise<void>} Promise that resolves when sorting is complete
       */
      sort: async (compareFn?: (a: T, b: T) => number) => {
        await options.data.sort(compareFn);
        return component;
      },

      /**
       * Gets the number of items in the list
       * @returns {number} Number of items
       */
      getSize: (): number => options.data.getSize(),

      /**
       * Checks if the list is empty
       * @returns {boolean} True if list is empty
       */
      isEmpty: (): boolean => options.data.isEmpty(),

      /**
       * Checks if the list is currently loading
       * @returns {boolean} True if loading
       */
      isLoading: (): boolean => options.data.isLoading(),

      /**
       * Gets the current error state
       * @returns {string | null} Error message if any, null otherwise
       */
      getError: (): string | null => options.data.getError(),

      // Selection operations (if enabled)
      ...(options.selection && {
        /**
         * Selects an item
         * @param {string} id - Item ID to select
         * @returns {Object} Component instance for chaining
         */
        selectItem: (id: string) => {
          options.selection!.selectItem(id);
          return component;
        },

        /**
         * Deselects an item
         * @param {string} id - Item ID to deselect
         * @returns {Object} Component instance for chaining
         */
        deselectItem: (id: string) => {
          options.selection!.deselectItem(id);
          return component;
        },

        /**
         * Selects all items
         * @returns {Object} Component instance for chaining
         */
        selectAll: () => {
          options.selection!.selectAll();
          return component;
        },

        /**
         * Deselects all items
         * @returns {Object} Component instance for chaining
         */
        deselectAll: () => {
          options.selection!.deselectAll();
          return component;
        },

        /**
         * Gets all selected items
         * @returns {T[]} Array of selected items
         */
        getSelectedItems: (): T[] => options.selection!.getSelectedItems(),

        /**
         * Gets IDs of all selected items
         * @returns {string[]} Array of selected item IDs
         */
        getSelectedIds: (): string[] => options.selection!.getSelectedIds(),
      }),

      // Scrolling operations
      /**
       * Scrolls to a specific item by ID
       * @param {string} id - Item ID to scroll to
       * @param {string} position - Position ('start', 'center', 'end')
       * @returns {Object} Component instance for chaining
       */
      scrollToItem: (
        id: string,
        position: "start" | "center" | "end" = "start"
      ) => {
        // Provide fallback implementation if scrolling methods not available
        if (options.scrolling.scrollToItem) {
          options.scrolling.scrollToItem(id, position);
        } else {
          console.warn("scrollToItem not implemented");
        }
        return component;
      },

      /**
       * Scrolls to a specific index
       * @param {number} index - Index to scroll to
       * @param {string} position - Position ('start', 'center', 'end')
       * @returns {Object} Component instance for chaining
       */
      scrollToIndex: (
        index: number,
        position: "start" | "center" | "end" = "start"
      ) => {
        // Provide fallback implementation if scrolling methods not available
        if (options.scrolling.scrollToIndex) {
          options.scrolling.scrollToIndex(index, position);
        } else {
          console.warn("scrollToIndex not implemented");
        }
        return component;
      },

      /**
       * Scrolls to a specific page
       * @param {number} page - Page number to scroll to
       * @param {string} position - Position ('start', 'center', 'end')
       * @returns {Promise<Object>} Promise that resolves with component instance
       */
      scrollToPage: async (
        page: number,
        position: "start" | "center" | "end" = "start"
      ) => {
        // Provide fallback implementation if scrolling methods not available
        if (options.scrolling.scrollToPage) {
          await options.scrolling.scrollToPage(page, position);
        } else {
          console.warn("scrollToPage not implemented");
        }
        return component;
      },

      // Performance operations
      /**
       * Gets performance metrics
       * @returns {Object} Performance metrics
       */
      getMetrics: () => options.performance.getMetrics(),

      /**
       * Resets performance metrics
       * @returns {Object} Component instance for chaining
       */
      resetMetrics: () => {
        options.performance.resetMetrics();
        return component;
      },

      // Template operations
      /**
       * Sets a new template for rendering items
       * @param {any} template - New template
       */
      setTemplate: (template: any): void => {
        options.template.setTemplate(template);
      },

      /**
       * Gets the current template
       * @returns {any} Current template
       */
      getTemplate: () => options.template.getTemplate(),

      // Event operations
      /**
       * Adds an event listener
       * @param {string} event - Event name
       * @param {Function} handler - Event handler
       * @returns {Object} Component instance for chaining
       */
      on: (event: string, handler: Function) => {
        options.events.on(event, handler);
        return component;
      },

      /**
       * Removes an event listener
       * @param {string} event - Event name
       * @param {Function} handler - Event handler
       * @returns {Object} Component instance for chaining
       */
      off: (event: string, handler: Function) => {
        options.events.off(event, handler);
        return component;
      },

      /**
       * Emits an event
       * @param {string} event - Event name
       * @param {any} data - Event data
       */
      emit: (event: string, data: any): void => {
        options.events.emit(event, data);
      },

      /**
       * Subscribes to events using observer pattern
       * @param {Function} observer - Observer function
       * @returns {Function} Unsubscribe function
       */
      subscribe: (observer: Function): Function => {
        return options.events.subscribe(observer);
      },

      // Lifecycle operations
      /**
       * Destroys the component and cleans up resources
       */
      destroy: (): void => {
        options.lifecycle.destroy();
      },

      // Configuration access
      /**
       * Gets component configuration
       * @returns {Object} Component configuration
       */
      getConfig: () => options.config,
    };
  };

export default withApi;
