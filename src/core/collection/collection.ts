/**
 * Collection - Composable data management
 *
 * Uses pipe composition to build a collection with features
 */

import type { CollectionItem, CollectionConfig, Collection } from "./types";
import { pipe } from "../compose/pipe";
import { withAPI } from "./features/api";
import { withLoading } from "./features/loading";
import { withOperations } from "./features/operations";

/**
 * Creates a collection with all features composed
 */
export function createCollection<T extends CollectionItem = CollectionItem>(
  config: CollectionConfig<T> = {}
): Collection<T> {
  return pipe(
    // 1. Core API (state, events, base methods)
    withAPI(config),

    // 2. Loading features (adapter, range management)
    withLoading({
      pageSize: config.pageSize,
      rangeSize: config.rangeSize,
    }),

    // 3. Data operations (filter, sort, search)
    withOperations()

    // 4. Future features can be added here:
    // withCache(config.cache),
    // withPersistence(config.persistence),
    // withValidation(config.validation),
  )({} as any) as Collection<T>;
}
