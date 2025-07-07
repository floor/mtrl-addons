/**
 * Collection Composer (Following Blueprint Architecture)
 *
 * Uses mtrl's pipe composition pattern to build full Collection from plugins
 */

import type { CollectionItem, CollectionConfig, Collection } from "./types";
import { createBaseCollection } from "./base-collection";
import { withLoading } from "./features/api/loading";
import { withDataOperations } from "./features/operations/data-operations";

// TODO: Import from mtrl core when available
// For now, implement simple pipe function
function pipe<T>(...fns: Function[]): (value: T) => any {
  return (value: T) => fns.reduce((acc, fn) => fn(acc), value);
}

/**
 * Creates a full Collection following the blueprint architecture
 *
 * Uses functional composition to build features from plugins
 */
export function createCollection<T extends CollectionItem = CollectionItem>(
  config: CollectionConfig<T> = {}
): Collection<T> {
  // Create full collection using composition pattern
  let collection = createBaseCollection<T>(config);

  // Apply plugins sequentially
  collection = withDataOperations<T>()(collection);
  collection = withLoading<T>({
    pageSize: config.pageSize,
    sequential: true,
  })(collection);

  // TODO: Add more plugins as they're created
  // collection = withValidation<T>(config.validation)(collection);
  // collection = withCaching<T>(config.cache)(collection);
  // collection = withPersistence<T>(config.persistence)(collection);

  // The collection now has all the features from plugins
  // but still needs some additional methods to match the full Collection interface

  /**
   * Data queries (could be moved to a plugin later)
   */
  const filter = (predicate: (item: T) => boolean): T[] => {
    return collection.getItems().filter(predicate);
  };

  const sort = (compareFn: (a: T, b: T) => number): T[] => {
    const items = [...collection.getItems()];
    return items.sort(compareFn);
  };

  const search = (query: string, fields: string[] = ["id"]): T[] => {
    if (query.length < 2) {
      return collection.getItems();
    }

    const searchQuery = query.toLowerCase();
    return collection.getItems().filter((item) => {
      return fields.some((field) => {
        const fieldValue = (item as any)[field];
        return (
          fieldValue &&
          fieldValue.toString().toLowerCase().includes(searchQuery)
        );
      });
    });
  };

  const aggregate = (operations: any[]): any => {
    const items = collection.getItems();
    const results: Record<string, any> = {};

    operations.forEach((op) => {
      const alias = op.alias || `${op.operation}_${op.field}`;

      switch (op.operation) {
        case "count":
          results[alias] = items.length;
          break;
        case "sum":
          results[alias] = items.reduce(
            (sum, item) => sum + ((item as any)[op.field] || 0),
            0
          );
          break;
        case "avg":
          const sum = items.reduce(
            (sum, item) => sum + ((item as any)[op.field] || 0),
            0
          );
          results[alias] = items.length > 0 ? sum / items.length : 0;
          break;
        case "min":
          results[alias] = Math.min(
            ...items.map((item) => (item as any)[op.field] || 0)
          );
          break;
        case "max":
          results[alias] = Math.max(
            ...items.map((item) => (item as any)[op.field] || 0)
          );
          break;
        case "distinct":
          results[alias] = [
            ...new Set(items.map((item) => (item as any)[op.field])),
          ];
          break;
      }
    });

    return results;
  };

  /**
   * Persistence methods (stubs for now - would be added via plugins)
   */
  const save = async (): Promise<void> => {
    console.warn("Save method requires persistence plugin");
  };

  const load = async (): Promise<void> => {
    console.warn("Load method requires persistence plugin");
  };

  const clearCache = async (): Promise<void> => {
    collection.setState({
      items: [],
      filteredItems: [],
      totalCount: 0,
    });
  };

  const sync = async (): Promise<void> => {
    console.warn("Sync method requires sync plugin");
  };

  const prefetch = async (pages: number[]): Promise<void> => {
    console.warn("Prefetch method requires prefetch plugin");
  };

  /**
   * Plugin system (stub for now)
   */
  const use = (plugin: any): Collection<T> => {
    console.warn("Plugin system not yet implemented");
    return fullCollection;
  };

  // Create the full collection object
  const fullCollection: Collection<T> = Object.assign(collection, {
    // Data queries
    filter,
    sort,
    search,
    aggregate,

    // Data persistence (stubs)
    save,
    load,
    clearCache,
    sync,
    prefetch,

    // Plugin system
    use,
  });

  return fullCollection;
}

/**
 * Export for backward compatibility and convenience
 */
export { createCollection as createDataCollection };
