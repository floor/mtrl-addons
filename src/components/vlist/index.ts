/**
 * VList Component - Virtual List with direct viewport integration
 *
 * A high-performance virtual list component that uses the viewport
 * feature directly without the list-manager layer.
 *
 * Supports optional layout configuration for building complete list UIs
 * with headers, filters, footers, and the virtual scrolling viewport.
 *
 * @example
 * ```typescript
 * // Basic usage
 * const vlist = createVList({
 *   container: '#my-list',
 *   template: itemTemplate,
 *   collection: { adapter: { read: fetchItems } }
 * });
 *
 * // With layout, search, and filter
 * const vlist = createVList({
 *   container: '#my-list',
 *   layout: [
 *     ['head', { class: 'head' },
 *       [createIconButton, 'search', { icon: iconSearch, toggle: true }],
 *       [createIconButton, 'filter', { icon: iconFilter, toggle: true }]
 *     ],
 *     ['filter-panel', { class: 'filter-panel' },
 *       [createSelect, 'country', { options: countries }]
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
 *     controls: { country: 'country' },
 *   },
 *   template: userTemplate,
 *   collection: { adapter: { read: fetchUsers } }
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

export { createVList } from "./vlist";
export type {
  RemoveItemOptions,
  VListConfig,
  VListComponent,
  VListItem,
  VListAPI,
  VListState,
  VListEvents,
  ListKeyboardConfig,
} from "./types";

// Layout feature exports
export { withLayout } from "./features/layout";
export type {
  LayoutSchema,
  LayoutResult,
  WithLayoutComponent,
} from "./features/layout";

// Search feature exports
export { withSearch } from "./features/search";
export type { SearchConfig, WithSearchComponent } from "./features/search";

// Filter feature exports
export { withFilter } from "./features/filter";
export type { FilterConfig, WithFilterComponent } from "./features/filter";
