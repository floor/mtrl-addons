/**
 * Data Operations Plugin
 *
 * Handles CRUD operations on collection items (add, update, remove, clear)
 */

import type { CollectionItem, BaseCollection } from "../../types";
import { CollectionDataEvents } from "../../types";
import { DATA_LOGGING } from "../../constants";

export interface DataOperationsFeatures<T extends CollectionItem> {
  addItems(items: T[]): Promise<T[]>;
  updateItems(items: Partial<T>[]): Promise<T[]>;
  removeItems(ids: string[]): Promise<void>;
  clearItems(): Promise<void>;
}

/**
 * Data Operations Plugin
 */
export const withDataOperations =
  <T extends CollectionItem = CollectionItem>() =>
  (
    baseCollection: BaseCollection<T>
  ): BaseCollection<T> & DataOperationsFeatures<T> => {
    /**
     * Apply data transformations if configured
     */
    const applyDataTransformations = (items: any[]): T[] => {
      let processedItems = [...items];

      // Apply normalization if configured
      if (baseCollection._config.normalize) {
        processedItems = baseCollection._config.normalize(processedItems);
      }

      // Apply transformation if configured
      if (baseCollection._config.transform) {
        processedItems = processedItems.map(baseCollection._config.transform);
      }

      // Apply validation if configured
      if (baseCollection._config.validate) {
        processedItems = processedItems.filter(baseCollection._config.validate);
      }

      return processedItems;
    };

    /**
     * Add items to the collection
     */
    const addItems = async (items: T[]): Promise<T[]> => {
      const processedItems = applyDataTransformations(items);
      const currentState = baseCollection.getState();

      // Add to existing items
      const newItems = [...currentState.items, ...processedItems];

      baseCollection.setState({
        items: newItems,
        totalCount: newItems.length,
      });

      // Emit data event
      baseCollection.emit(CollectionDataEvents.ITEMS_ADDED, {
        items: processedItems,
        indices: [currentState.items.length],
      });

      return processedItems;
    };

    /**
     * Update existing items in the collection
     */
    const updateItems = async (items: Partial<T>[]): Promise<T[]> => {
      const currentState = baseCollection.getState();
      const updatedItems: T[] = [];

      // Update existing items
      const newItems = currentState.items.map((item: T) => {
        const update = items.find((u) => u.id === item.id);
        if (update) {
          const updatedItem = { ...item, ...update };
          updatedItems.push(updatedItem);
          return updatedItem;
        }
        return item;
      });

      baseCollection.setState({ items: newItems });

      // Emit data event
      baseCollection.emit(CollectionDataEvents.ITEMS_UPDATED, {
        items: updatedItems,
        indices: [],
      });

      return updatedItems;
    };

    /**
     * Remove items from the collection
     */
    const removeItems = async (ids: string[]): Promise<void> => {
      const currentState = baseCollection.getState();

      // Remove items by ID
      const newItems = currentState.items.filter(
        (item: T) => !ids.includes(item.id)
      );

      baseCollection.setState({
        items: newItems,
        totalCount: newItems.length,
      });

      // Emit data event
      baseCollection.emit(CollectionDataEvents.ITEMS_REMOVED, {
        ids,
      });
    };

    /**
     * Clear all items from the collection
     */
    const clearItems = async (): Promise<void> => {
      baseCollection.setState({
        items: [],
        filteredItems: [],
        totalCount: 0,
      });

      // Emit data event
      baseCollection.emit(CollectionDataEvents.ITEMS_CLEARED, {});
    };

    console.log(`${DATA_LOGGING.PREFIX} Data Operations plugin installed`);

    return Object.assign(baseCollection, {
      addItems,
      updateItems,
      removeItems,
      clearItems,
    });
  };
