import type { ListManagerPlugin } from "../../types";
import { LOGGING } from "../../constants";

/**
 * Item size configuration
 */
export interface ItemSizeConfig {
  strategy: "fixed" | "dynamic" | "estimated";
  defaultHeight: number;
  estimatedHeight: number;
  measurementThreshold: number;
  cacheSize: number;
  autoMeasure: boolean;
}

/**
 * Item size management plugin
 */
export const itemSizeManager = (
  config: Partial<ItemSizeConfig> = {}
): ListManagerPlugin => ({
  name: "item-size-manager",
  version: "1.0.0",
  dependencies: [],

  install: (listManager, pluginConfig) => {
    // Configuration with defaults
    const sizeConfig: ItemSizeConfig = {
      strategy: "estimated",
      defaultHeight: 50,
      estimatedHeight: 50,
      measurementThreshold: 100,
      cacheSize: 1000,
      autoMeasure: true,
      ...config,
    };

    // Size cache
    const sizeCache = new Map<number, number>();
    let totalMeasured = 0;

    /**
     * Measure item height
     */
    const measureItemSize = (element: HTMLElement): number => {
      const height = element.getBoundingClientRect().height;
      totalMeasured++;
      return height;
    };

    /**
     * Get item height
     */
    const getItemSize = (index: number, element?: HTMLElement): number => {
      switch (sizeConfig.strategy) {
        case "fixed":
          return sizeConfig.defaultHeight;

        case "dynamic":
          if (element && sizeConfig.autoMeasure) {
            const measured = measureItemSize(element);
            sizeCache.set(index, measured);
            return measured;
          }
          return sizeCache.get(index) || sizeConfig.estimatedHeight;

        case "estimated":
        default:
          return sizeCache.get(index) || sizeConfig.estimatedHeight;
      }
    };

    /**
     * Cache item height
     */
    const cacheItemHeight = (index: number, height: number): void => {
      if (sizeCache.size >= sizeConfig.cacheSize) {
        // Remove oldest entries
        const entries = Array.from(sizeCache.entries());
        entries
          .slice(0, Math.floor(sizeConfig.cacheSize * 0.1))
          .forEach(([key]) => {
            sizeCache.delete(key);
          });
      }
      sizeCache.set(index, height);
    };

    // Return size management API
    return {
      getItemHeight: getItemSize,
      cacheItemHeight,
      measureItemHeight: measureItemSize,

      getHeightCache(): Map<number, number> {
        return new Map(sizeCache);
      },

      clearCache(): void {
        sizeCache.clear();
        totalMeasured = 0;
      },

      getStats() {
        return {
          cacheSize: sizeCache.size,
          totalMeasured,
          strategy: sizeConfig.strategy,
        };
      },

      destroy(): void {
        sizeCache.clear();
        console.log(`${LOGGING.PREFIX} Item size manager destroyed`);
      },
    };
  },
});
