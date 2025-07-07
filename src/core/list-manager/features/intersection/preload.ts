import type { ListManagerPlugin } from "../../types";
import { VIEWPORT, LOGGING } from "../../constants";

/**
 * Preload configuration
 */
export interface PreloadConfig {
  enabled: boolean;
  strategy: "aggressive" | "conservative" | "adaptive";
  preloadDistance: number;
  maxPreloadItems: number;
  prefetchThreshold: number;
}

/**
 * Preload plugin for anticipatory loading
 */
export const preloadTrigger = (
  config: Partial<PreloadConfig> = {}
): ListManagerPlugin => ({
  name: "preload-trigger",
  version: "1.0.0",
  dependencies: [],

  install: (listManager, pluginConfig) => {
    // Configuration with defaults
    const preloadConfig: PreloadConfig = {
      enabled: true,
      strategy: "adaptive",
      preloadDistance: 1000,
      maxPreloadItems: 50,
      prefetchThreshold: 0.7,
      ...config,
    };

    let preloadQueue: number[] = [];
    let preloadedItems = new Set<number>();
    let isPreloading = false;

    /**
     * Calculate preload range based on current viewport
     */
    const calculatePreloadRange = (): { start: number; end: number } => {
      const viewportInfo = listManager.getViewportInfo();
      const direction = viewportInfo.direction;
      const itemHeight = 50; // TODO: Get from size manager

      let preloadStart = viewportInfo.visibleRange.start;
      let preloadEnd = viewportInfo.visibleRange.end;

      switch (preloadConfig.strategy) {
        case "aggressive":
          // Preload in both directions
          const aggressiveRange = Math.floor(
            preloadConfig.preloadDistance / itemHeight
          );
          preloadStart = Math.max(0, preloadStart - aggressiveRange);
          preloadEnd = Math.min(
            viewportInfo.visibleRange.end + aggressiveRange,
            viewportInfo.visibleRange.end + aggressiveRange
          );
          break;

        case "conservative":
          // Preload only in scroll direction
          const conservativeRange = Math.floor(
            preloadConfig.preloadDistance / itemHeight / 2
          );
          if (direction === "down") {
            preloadEnd += conservativeRange;
          } else if (direction === "up") {
            preloadStart = Math.max(0, preloadStart - conservativeRange);
          }
          break;

        case "adaptive":
        default:
          // Adaptive based on scroll speed and direction
          const adaptiveRange = Math.floor(
            preloadConfig.preloadDistance / itemHeight
          );
          const bias = direction === "down" ? 0.7 : 0.3;
          preloadStart = Math.max(
            0,
            preloadStart - Math.floor(adaptiveRange * (1 - bias))
          );
          preloadEnd = preloadEnd + Math.floor(adaptiveRange * bias);
          break;
      }

      return { start: preloadStart, end: preloadEnd };
    };

    /**
     * Queue items for preloading
     */
    const queuePreload = (indices: number[]): void => {
      const newItems = indices.filter(
        (index) => !preloadedItems.has(index) && !preloadQueue.includes(index)
      );

      preloadQueue.push(...newItems);
      preloadQueue = preloadQueue.slice(-preloadConfig.maxPreloadItems);

      if (newItems.length > 0) {
        processPreloadQueue();
      }
    };

    /**
     * Process preload queue
     */
    const processPreloadQueue = (): void => {
      if (isPreloading || preloadQueue.length === 0) return;

      isPreloading = true;
      const index = preloadQueue.shift();

      if (index !== undefined) {
        preloadItem(index)
          .then(() => {
            preloadedItems.add(index);
            isPreloading = false;

            // Continue with next item
            if (preloadQueue.length > 0) {
              setTimeout(processPreloadQueue, 10);
            }
          })
          .catch((error) => {
            console.warn(
              `${LOGGING.PREFIX} Preload error for item ${index}:`,
              error
            );
            isPreloading = false;
          });
      }
    };

    /**
     * Preload individual item
     */
    const preloadItem = async (index: number): Promise<void> => {
      // Emit preload event
      listManager.emit("item:preload:start", { index });

      // Simulate preloading (replace with actual preload logic)
      await new Promise((resolve) => setTimeout(resolve, 5));

      // Emit preload complete
      listManager.emit("item:preload:complete", { index });
    };

    /**
     * Handle viewport changes
     */
    const handleViewportChange = (): void => {
      if (!preloadConfig.enabled) return;

      const range = calculatePreloadRange();
      const indices = [];

      for (let i = range.start; i <= range.end; i++) {
        indices.push(i);
      }

      queuePreload(indices);
    };

    /**
     * Clear preload cache
     */
    const clearPreloadCache = (): void => {
      preloadedItems.clear();
      preloadQueue = [];
    };

    // Listen to viewport changes
    listManager.subscribe((payload) => {
      if (payload.event === "viewport:changed") {
        handleViewportChange();
      }
    });

    // Return preload API
    return {
      queuePreload,
      clearPreloadCache,

      isPreloading: () => isPreloading,
      getQueueSize: () => preloadQueue.length,
      getPreloadedCount: () => preloadedItems.size,

      updateConfig(newConfig: Partial<PreloadConfig>): void {
        Object.assign(preloadConfig, newConfig);
      },

      destroy(): void {
        clearPreloadCache();
        console.log(`${LOGGING.PREFIX} Preload trigger destroyed`);
      },
    };
  },
});
