/**
 * mtrl-addons Components
 *
 * Exports all component modules
 */

// Export the existing list component
export { createList } from "./list";

// Export list types and utilities
export type {
  ListConfig,
  ListComponent,
  ListAPI,
  ListState,
  ListEvents,
  ListItemTemplate,
  ListScrollConfig,
  ListSelectionConfig,
  ListEventHandlers,
  ListItemContext,
} from "./list";

// List configuration utilities
export {
  createBaseConfig,
  getElementConfig,
  getApiConfig,
  getCollectionConfig,
  getListManagerConfig,
  validateConfig,
} from "./list";

// List features
export { withOrchestration } from "./list/features/orchestration";
export { withAPI } from "./list/api";

// Components will be exported here as they're added
// For example:
// export { VirtualList } from './virtual-list';
// export { DataTable } from './data-table';
// export { InfiniteScroll } from './infinite-scroll';

// Currently no other components - this is the foundation for future components
export const componentsVersion = "0.1.0";
