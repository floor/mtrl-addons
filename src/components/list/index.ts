/**
 * mtrl-addons List Component
 *
 * Next-generation list component powered by the collection system.
 * Built for high performance, template-driven rendering, and modern UX.
 *
 * @module components/list
 */

// Main component export
export { createList as default, createList } from "./list";

// Type exports
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
} from "./types";

// Configuration exports
export {
  createBaseConfig,
  getElementConfig,
  getApiConfig,
  getCollectionConfig,
  getListManagerConfig,
  validateConfig,
} from "./config";

// Feature exports
export { withListManager } from "./features/list-manager";
export { withAPI } from "./api";
