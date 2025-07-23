/**
 * Operations Feature - Data filtering, sorting, and searching
 * Composable feature for collection
 */

import type { CollectionItem } from "../types";
import type { CollectionContext } from "./api";

export interface OperationsFeature<T extends CollectionItem> {
  filter(predicate: (item: T) => boolean): T[];
  sort(compareFn: (a: T, b: T) => number): T[];
  search(query: string, fields?: string[]): T[];
}

/**
 * Adds data operations functionality to collection
 */
export function withOperations<T extends CollectionItem = CollectionItem>() {
  return <TBase extends CollectionContext>(
    base: TBase
  ): TBase & OperationsFeature<T> => {
    const filter = (predicate: (item: T) => boolean): T[] => {
      return base._stateStore.get().items.filter(predicate);
    };

    const sort = (compareFn: (a: T, b: T) => number): T[] => {
      const items = [...base._stateStore.get().items];
      return items.sort(compareFn);
    };

    const search = (query: string, fields: string[] = ["id"]): T[] => {
      if (query.length < 2) {
        return base._stateStore.get().items;
      }

      const searchQuery = query.toLowerCase();
      return base._stateStore.get().items.filter((item) => {
        return fields.some((field) => {
          const fieldValue = (item as any)[field];
          return (
            fieldValue &&
            fieldValue.toString().toLowerCase().includes(searchQuery)
          );
        });
      });
    };

    // Return enhanced collection
    return Object.assign(base, {
      filter,
      sort,
      search,
    });
  };
}
