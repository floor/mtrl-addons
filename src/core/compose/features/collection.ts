/**
 * @module core/compose/features
 * @description Collection integration feature for components
 */

import { createCollection } from "../../collection";
import type { ListItem } from "../../../components/list/types";
import type { TemplateEngineType } from "../../collection/types";

/**
 * Configuration for collection feature
 */
export interface CollectionConfig<T extends ListItem = ListItem> {
  container?: HTMLElement;
  items?: T[];
  adapter?: any;
  transform?: (item: any) => T;
  validate?: (item: T) => boolean;
  template?: any;
  templateEngine?: TemplateEngineType;
  initialCapacity?: number;
  [key: string]: any;
}

/**
 * Component with collection capabilities
 */
export interface CollectionComponent<T extends ListItem = ListItem> {
  // Collection methods
  add: (items: T | T[]) => Promise<void>;
  update: (id: string, updates: Partial<T>) => Promise<void>;
  remove: (id: string) => Promise<void>;
  clear: () => Promise<void>;
  getItems: () => T[];
  getItem: (id: string) => T | undefined;
  query: (filter: (item: T) => boolean) => T[];
  sort: (compareFn?: (a: T, b: T) => number) => Promise<void>;
  getSize: () => number;
  isEmpty: () => boolean;
  isLoading: () => boolean;
  getError: () => string | null;
  subscribe: (event: string, handler: Function) => void;
  refresh: () => Promise<void>;
  render: () => void;
  setTemplate: (template: any) => void;
  getTemplate: () => any;

  // Internal collection reference
  _collection?: any;
}

/**
 * Default template for collection items
 */
function getDefaultCollectionTemplate() {
  return {
    tag: "div",
    className: "mtrl-collection-item",
    attributes: { "data-id": "{{id}}", role: "listitem" },
    children: [
      {
        tag: "div",
        className: "mtrl-collection-item__content",
        textContent: "{{name || id}}",
      },
    ],
  };
}

/**
 * Adds collection functionality to a component
 *
 * @param config - Collection configuration
 * @returns Component enhancer that adds collection capabilities
 *
 * @example
 * ```typescript
 * const component = pipe(
 *   createBase,
 *   withElement(),
 *   withCollection({
 *     items: myData,
 *     template: myTemplate,
 *     adapter: myAdapter
 *   })
 * )(config);
 * ```
 */
export function withCollection<T extends ListItem = ListItem>(
  config: CollectionConfig<T>
) {
  return (component: any): any & CollectionComponent<T> => {
    console.log("🗂️ [MTRL-ADDONS] Adding collection capabilities");

    // Create the collection using the component's element as container
    const collection = createCollection({
      container: component.element,
      items: config.items,
      adapter: config.adapter,
      transform: config.transform,
      validate: config.validate,
      template: config.template || getDefaultCollectionTemplate(),
      templateEngine: config.templateEngine,
      initialCapacity: config.initialCapacity,
    });

    // Merge collection methods into component
    return {
      ...component,
      ...collection,

      // Keep original element reference from withElement
      element: component.element,

      // Store collection reference for internal use
      _collection: collection,
    };
  };
}
