import type { ListManagerPlugin } from "../../types";
import { ELEMENT_RECYCLING, LOGGING } from "../../constants";

/**
 * Cleanup configuration
 */
export interface CleanupConfig {
  enabled: boolean;
  interval: number;
  idleThreshold: number;
  maxRetention: number;
  memoryThreshold: number;
  aggressiveCleanup: boolean;
}

/**
 * Memory cleanup plugin for element recycling
 */
export const memoryCleanup = (
  config: Partial<CleanupConfig> = {}
): ListManagerPlugin => ({
  name: "memory-cleanup",
  version: "1.0.0",
  dependencies: ["element-recycling-pool"],

  install: (listManager, pluginConfig) => {
    // Configuration with defaults
    const cleanupConfig: CleanupConfig = {
      enabled: true,
      interval: 30000, // 30 seconds
      idleThreshold: 60000, // 1 minute
      maxRetention: 100,
      memoryThreshold: 50 * 1024 * 1024, // 50MB
      aggressiveCleanup: false,
      ...config,
    };

    let cleanupInterval: number | null = null;
    let isDestroyed = false;

    /**
     * Perform cleanup cycle
     */
    const performCleanup = (): void => {
      if (isDestroyed) return;

      const now = Date.now();

      // Get memory usage if available
      const memoryUsage = (performance as any).memory?.usedJSHeapSize || 0;

      // Determine cleanup intensity
      const shouldCleanup =
        memoryUsage > cleanupConfig.memoryThreshold ||
        cleanupConfig.aggressiveCleanup;

      if (shouldCleanup) {
        listManager.emit("cleanup:start", {
          timestamp: now,
          memoryUsage,
          aggressive: cleanupConfig.aggressiveCleanup,
        });

        // Force garbage collection if available
        if ((window as any).gc) {
          (window as any).gc();
        }

        listManager.emit("cleanup:complete", {
          timestamp: now,
          memoryUsage: (performance as any).memory?.usedJSHeapSize || 0,
        });
      }
    };

    /**
     * Start cleanup cycle
     */
    const startCleanup = (): void => {
      if (!cleanupConfig.enabled || cleanupInterval) return;

      cleanupInterval = window.setInterval(
        performCleanup,
        cleanupConfig.interval
      );
      console.log(`${LOGGING.PREFIX} Memory cleanup started`);
    };

    /**
     * Stop cleanup cycle
     */
    const stopCleanup = (): void => {
      if (cleanupInterval) {
        clearInterval(cleanupInterval);
        cleanupInterval = null;
      }
    };

    // Auto-start cleanup
    startCleanup();

    // Return cleanup API
    return {
      performCleanup,
      startCleanup,
      stopCleanup,

      updateConfig(newConfig: Partial<CleanupConfig>): void {
        Object.assign(cleanupConfig, newConfig);
      },

      destroy(): void {
        isDestroyed = true;
        stopCleanup();
        console.log(`${LOGGING.PREFIX} Memory cleanup destroyed`);
      },
    };
  },
});
