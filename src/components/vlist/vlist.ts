// src/components/vlist/vlist.ts

/**
 * VList Component - Virtual List with direct viewport integration
 *
 * A simplified virtual list that uses the viewport feature directly
 * without the list-manager abstraction layer.
 *
 * Supports optional layout configuration for building complete list UIs
 * with headers, filters, footers, and the virtual scrolling viewport.
 *
 * @example
 * ```typescript
 * // Simple usage (no layout)
 * const vlist = createVList({
 *   container: '#my-list',
 *   template: itemTemplate,
 *   collection: { adapter: { read: fetchItems } }
 * });
 *
 * // With layout (complete UI)
 * const vlist = createVList({
 *   container: '#my-list',
 *   class: 'users',
 *   layout: [
 *     ['head', { class: 'head' },
 *       ['title', { text: 'Users' }]
 *     ],
 *     ['viewport'],
 *     ['foot', { class: 'foot' },
 *       ['count', { text: '0' }]
 *     ]
 *   ],
 *   template: userTemplate,
 *   collection: { adapter: { read: fetchUsers } }
 * });
 *
 * // Access layout elements
 * vlist.layout.title.textContent = 'Users (1,245)';
 * vlist.layout.count.textContent = '1,245';
 *
 * // With search and filter
 * const vlist = createVList({
 *   container: '#my-list',
 *   class: 'users',
 *   layout: [
 *     ['head', { class: 'head' },
 *       [createIconButton, 'search', { icon: iconSearch, toggle: true }],
 *       [createIconButton, 'filter', { icon: iconFilter, toggle: true }]
 *     ],
 *     ['filter-panel', { class: 'filter-panel' },
 *       [createSelect, 'country', { options: countries }],
 *       [Button, 'clear', { icon: iconCancel }]
 *     ],
 *     [createSearch, 'search-bar', { placeholder: 'Search...' }],
 *     ['viewport'],
 *   ],
 *   search: {
 *     toggleButton: 'search',
 *     searchBar: 'search-bar',
 *   },
 *   filter: {
 *     toggleButton: 'filter',
 *     panel: 'filter-panel',
 *     clearButton: 'clear',
 *     controls: { country: 'country' },
 *   },
 *   template: userTemplate,
 *   collection: {
 *     adapter: {
 *       read: async ({ page, limit, search, filters }) => {
 *         // search and filters automatically available
 *       }
 *     }
 *   }
 * });
 *
 * // Events
 * vlist.on('search:change', ({ query }) => console.log('Searching:', query));
 * vlist.on('filter:change', ({ filters }) => console.log('Filters:', filters));
 *
 * // API
 * vlist.search('john');
 * vlist.setFilter('country', 'FR');
 * ```
 */

import type { VListConfig, VListComponent, VListItem } from "./types";
import type { SearchConfig } from "./features/search";
import type { FilterConfig } from "./features/filter";

/**
 * Mutable reference for late binding in functional composition.
 * Allows features applied early in the pipeline to access features applied later.
 * Similar to React's useRef pattern.
 */
interface SelfRef<T> {
  current: T | null;
}

// Import mtrl compose system
import { pipe } from "mtrl";
import { createBase, withElement } from "mtrl";
import { withEvents, withLifecycle } from "mtrl";

// Import VList features
import { withViewport } from "./features/viewport";
import { withAPI } from "./features/api";
import { withSelection } from "./features/selection";
import { withKeyboard } from "./features/keyboard";
import { withLayout } from "./features/layout";
import { withSearch } from "./features/search";
import { withFilter } from "./features/filter";

/**
 * Creates a new VList component using direct viewport integration
 *
 * @param {VListConfig} config - List configuration options
 * @returns {VListComponent} A fully configured virtual list component
 */
export const createVList = <T extends VListItem = VListItem>(
  config: VListConfig<T> & {
    layout?: any[];
    search?: SearchConfig;
    filter?: FilterConfig;
  } = {},
): VListComponent<T> => {
  try {
    // Determine the CSS class name for the root element
    // When layout is provided, add the custom class suffix (e.g., 'mtrl-vlist-users')
    let className = config.className || "mtrl-vlist";
    if (config.class && !className.includes(`mtrl-vlist-${config.class}`)) {
      className = `mtrl-vlist mtrl-vlist-${config.class}`;
    }

    // Create mutable self reference for late binding
    // This allows features applied early (like collection) to access
    // features applied later (like search/filter) via selfRef.current
    const selfRef: SelfRef<VListComponent<T>> = { current: null };

    // Build the enhancement pipeline
    const enhancers: Array<(c: any) => any> = [
      // 1. Foundation layer
      createBase,
      // 1.5. Inject self reference (must come after createBase which creates fresh object)
      (c: any) => ({ ...c, _selfRef: selfRef }),
      withEvents(),
      withElement({
        tag: "div",
        className,
        attributes: {
          role: "list",
          "aria-label": config.ariaLabel || "Virtual List",
        },
      }),
    ];

    // 2. Layout feature (optional) - MUST come before withViewport
    // This processes the layout schema and sets up _viewportContainer
    // for withViewport to use
    if (config.layout && Array.isArray(config.layout)) {
      enhancers.push(withLayout(config));
    }

    // 3. Viewport integration
    // When withLayout was applied, this will use the layout's viewport container
    // Otherwise, it creates its own viewport structure
    enhancers.push(
      withViewport({
        ...config,
        autoSelectFirst: config.selection?.autoSelectFirst,
      }),
    );

    // 4. Component lifecycle
    enhancers.push(withLifecycle());

    // 5. Public API layer
    enhancers.push(withAPI(config));

    // 6. Selection capabilities (if enabled) - must be after API
    if (config.selection?.enabled) {
      enhancers.push(withSelection(config));
    }

    // 7. Keyboard navigation (if selection enabled or explicitly configured)
    if (config.selection?.enabled || config.keyboard?.enabled) {
      enhancers.push(withKeyboard(config));
    }

    // 8. Search feature (if configured)
    // Must come after API (needs reload method) and layout (needs layout elements)
    if (config.search) {
      enhancers.push(withSearch(config));
    }

    // 9. Filter feature (if configured)
    // Must come after API (needs reload method) and layout (needs layout elements)
    if (config.filter) {
      enhancers.push(withFilter(config));
    }

    // Create the component through functional composition
    const component = pipe(...enhancers)({
      ...config,
      componentName: "vlist",
      prefix: config.prefix || "mtrl",
    });

    // Update selfRef to point to the final component
    // This enables late binding: features applied early (collection) can access
    // features applied later (search/filter) via _selfRef.current
    selfRef.current = component;

    return component as VListComponent<T>;
  } catch (error) {
    console.error("❌ [VLIST] Failed to create VList component:", error);
    throw error;
  }
};
