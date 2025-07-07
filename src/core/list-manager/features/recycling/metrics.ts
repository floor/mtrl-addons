import type { ListManagerPlugin } from "../../types";
import { LOGGING } from "../../constants";

/**
 * Pool metrics interface
 */
export interface PoolMetrics {
  hitRate: number;
  memoryUsage: number;
  utilization: number;
  avgElementAge: number;
  totalCreated: number;
  totalRecycled: number;
  totalDestroyed: number;
  currentPoolSize: number;
  peakPoolSize: number;
}

/**
 * Pool metrics tracking plugin
 */
export const poolMetrics = (config: {} = {}): ListManagerPlugin => ({
  name: "pool-metrics",
  version: "1.0.0",
  dependencies: ["element-recycling-pool"],

  install: (listManager, pluginConfig) => {
    // Metrics collection
    const metrics: PoolMetrics = {
      hitRate: 0,
      memoryUsage: 0,
      utilization: 0,
      avgElementAge: 0,
      totalCreated: 0,
      totalRecycled: 0,
      totalDestroyed: 0,
      currentPoolSize: 0,
      peakPoolSize: 0,
    };

    /**
     * Update metrics
     */
    const updateMetrics = (): void => {
      // Get pool stats from recycling pool
      const poolStats = listManager.getPoolStats?.();
      if (poolStats) {
        Object.assign(metrics, poolStats);
      }

      // Emit metrics update
      listManager.emit("metrics:updated", { ...metrics });
    };

    /**
     * Get performance report
     */
    const getPerformanceReport = (): {
      efficiency: "excellent" | "good" | "poor";
      recommendations: string[];
      metrics: PoolMetrics;
    } => {
      const efficiency =
        metrics.hitRate > 0.8
          ? "excellent"
          : metrics.hitRate > 0.6
          ? "good"
          : "poor";

      const recommendations: string[] = [];

      if (metrics.hitRate < 0.6) {
        recommendations.push("Consider increasing pool size");
      }

      if (metrics.utilization > 0.9) {
        recommendations.push("Pool utilization is high - consider optimizing");
      }

      if (metrics.avgElementAge > 300000) {
        // 5 minutes
        recommendations.push(
          "Elements are aging - consider more aggressive cleanup"
        );
      }

      return {
        efficiency,
        recommendations,
        metrics: { ...metrics },
      };
    };

    // Update metrics periodically
    const metricsInterval = setInterval(updateMetrics, 5000);

    // Return metrics API
    return {
      getMetrics: () => ({ ...metrics }),
      updateMetrics,
      getPerformanceReport,

      destroy(): void {
        clearInterval(metricsInterval);
        console.log(`${LOGGING.PREFIX} Pool metrics destroyed`);
      },
    };
  },
});
