import type { ListManagerPlugin, ElementPool } from "../../types";
import { ELEMENT_RECYCLING, ATTRIBUTES, LOGGING } from "../../constants";

/**
 * Pool statistics interface
 */
export interface PoolStats {
  totalCreated: number;
  totalRecycled: number;
  totalDestroyed: number;
  currentPoolSize: number;
  peakPoolSize: number;
  hitRate: number;
  utilizationRatio: number;
  avgElementAge: number;
  memoryUsage: number;
}

/**
 * Recycled element interface with tracking metadata
 */
export interface RecycledElement extends HTMLElement {
  _recycled: boolean;
  _poolId: string;
  _createdAt: number;
  _lastUsedAt: number;
  _useCount: number;
  _itemId?: string;
  _elementType?: string;
}

/**
 * Recycling pool configuration
 */
export interface RecyclingPoolConfig {
  enabled: boolean;
  maxPoolSize: number;
  minPoolSize: number;
  cleanupThreshold: number;
  cleanupInterval: number;
  preCreateElements: number;
  recyclingStrategy: "fifo" | "lru" | "size-based";
  reuseStrategy: "same-type" | "any-type" | "strict";
}

/**
 * Element recycling pool implementation
 */
class RecyclingPoolImpl implements ElementPool {
  private pool: RecycledElement[] = [];
  private typeMap = new Map<string, RecycledElement[]>();
  private stats: PoolStats;
  private config: Required<RecyclingPoolConfig>;
  private cleanupInterval: number | null = null;

  constructor(config: Required<RecyclingPoolConfig>) {
    this.config = config;
    this.stats = this.createInitialStats();

    // Initialize pool if pre-creation is enabled
    if (this.config.preCreateElements > 0) {
      this.preCreateElements(this.config.preCreateElements);
    }

    // Setup cleanup interval
    if (this.config.cleanupInterval > 0) {
      this.setupCleanup();
    }
  }

  /**
   * Create initial statistics object
   */
  private createInitialStats(): PoolStats {
    return {
      totalCreated: 0,
      totalRecycled: 0,
      totalDestroyed: 0,
      currentPoolSize: 0,
      peakPoolSize: 0,
      hitRate: 0,
      utilizationRatio: 0,
      avgElementAge: 0,
      memoryUsage: 0,
    };
  }

  /**
   * Generate unique pool ID for element tracking
   */
  private generatePoolId(): string {
    return `pool-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Create a new element with recycling metadata
   */
  private createElement(elementType: string = "div"): RecycledElement {
    const element = document.createElement(elementType) as RecycledElement;
    const now = Date.now();

    // Add recycling metadata
    element._recycled = true;
    element._poolId = this.generatePoolId();
    element._createdAt = now;
    element._lastUsedAt = 0;
    element._useCount = 0;
    element._elementType = elementType;

    // Add tracking attributes
    element.setAttribute(ATTRIBUTES.POOL_ID, element._poolId);
    element.setAttribute(ATTRIBUTES.CREATED_AT, now.toString());
    element.setAttribute(ATTRIBUTES.RECYCLED, "true");

    this.stats.totalCreated++;
    return element;
  }

  /**
   * Pre-create elements for the pool
   */
  private preCreateElements(count: number): void {
    for (let i = 0; i < count; i++) {
      const element = this.createElement();
      this.pool.push(element);
    }
    this.updateStats();

    console.log(
      `${LOGGING.PREFIX} Pre-created ${count} elements in recycling pool`
    );
  }

  /**
   * Setup cleanup interval for idle elements
   */
  private setupCleanup(): void {
    this.cleanupInterval = window.setInterval(() => {
      this.cleanupIdleElements();
    }, this.config.cleanupInterval);
  }

  /**
   * Clean up elements that have been idle too long
   */
  private cleanupIdleElements(): void {
    const now = Date.now();
    const idleThreshold = this.config.cleanupThreshold;

    // Clean up main pool
    const initialPoolSize = this.pool.length;
    this.pool = this.pool.filter((element) => {
      const isIdle = now - element._lastUsedAt > idleThreshold;
      const canRemove = this.pool.length > this.config.minPoolSize;

      if (isIdle && canRemove) {
        element.remove();
        this.stats.totalDestroyed++;
        return false;
      }
      return true;
    });

    // Clean up type-specific pools
    this.typeMap.forEach((elements, type) => {
      const filtered = elements.filter((element) => {
        const isIdle = now - element._lastUsedAt > idleThreshold;

        if (isIdle) {
          element.remove();
          this.stats.totalDestroyed++;
          return false;
        }
        return true;
      });

      if (filtered.length === 0) {
        this.typeMap.delete(type);
      } else {
        this.typeMap.set(type, filtered);
      }
    });

    const cleanedCount = initialPoolSize - this.pool.length;
    if (cleanedCount > 0) {
      console.log(
        `${LOGGING.PREFIX} Cleaned up ${cleanedCount} idle elements from pool`
      );
    }

    this.updateStats();
  }

  /**
   * Reset element to clean state for reuse
   */
  private resetElement(element: RecycledElement): void {
    // Clear content and styling
    element.innerHTML = "";
    element.className = "";
    element.style.cssText = "";

    // Remove non-pool attributes
    const attributesToKeep = [
      ATTRIBUTES.POOL_ID,
      ATTRIBUTES.CREATED_AT,
      ATTRIBUTES.RECYCLED,
    ];

    const attributesToRemove: string[] = [];
    for (let i = 0; i < element.attributes.length; i++) {
      const attr = element.attributes[i];
      if (!attributesToKeep.includes(attr.name)) {
        attributesToRemove.push(attr.name);
      }
    }

    attributesToRemove.forEach((attr) => element.removeAttribute(attr));

    // Reset recycling metadata
    element._itemId = undefined;
    element.setAttribute(ATTRIBUTES.RECYCLED, "true");
  }

  /**
   * Update internal statistics
   */
  private updateStats(): void {
    const totalPoolSize =
      this.pool.length +
      Array.from(this.typeMap.values()).reduce(
        (sum, arr) => sum + arr.length,
        0
      );

    this.stats.currentPoolSize = totalPoolSize;
    this.stats.peakPoolSize = Math.max(this.stats.peakPoolSize, totalPoolSize);

    const totalRequests = this.stats.totalCreated + this.stats.totalRecycled;
    this.stats.hitRate =
      totalRequests > 0 ? this.stats.totalRecycled / totalRequests : 0;
    this.stats.utilizationRatio =
      this.config.maxPoolSize > 0 ? totalPoolSize / this.config.maxPoolSize : 0;

    // Calculate average element age
    const allElements = [
      ...this.pool,
      ...Array.from(this.typeMap.values()).flat(),
    ];
    if (allElements.length > 0) {
      const now = Date.now();
      const totalAge = allElements.reduce(
        (sum, el) => sum + (now - el._createdAt),
        0
      );
      this.stats.avgElementAge = totalAge / allElements.length;
    }
  }

  /**
   * Acquire element from pool based on strategy
   */
  acquire(): RecycledElement | null {
    if (!this.config.enabled) {
      return this.createElement();
    }

    let element: RecycledElement | null = null;

    // Try to get from main pool first
    if (this.pool.length > 0) {
      switch (this.config.recyclingStrategy) {
        case "fifo":
          element = this.pool.shift() || null;
          break;
        case "lru":
          // Find least recently used element
          this.pool.sort((a, b) => a._lastUsedAt - b._lastUsedAt);
          element = this.pool.shift() || null;
          break;
        case "size-based":
          // For now, simple LIFO - could be enhanced with size considerations
          element = this.pool.pop() || null;
          break;
        default:
          element = this.pool.pop() || null;
      }
    }

    // If no element available, create new one if under max capacity
    if (!element) {
      const totalSize = this.size();
      if (totalSize < this.config.maxPoolSize) {
        element = this.createElement();
      }
    } else {
      this.stats.totalRecycled++;
    }

    // Mark element as acquired
    if (element) {
      const now = Date.now();
      element._lastUsedAt = now;
      element._useCount++;
      element.setAttribute(ATTRIBUTES.LAST_USED, now.toString());
      element.setAttribute(ATTRIBUTES.RECYCLED, "false");
    }

    this.updateStats();
    return element;
  }

  /**
   * Release element back to pool
   */
  release(element: RecycledElement): void {
    if (!element || !this.config.enabled) {
      element?.remove();
      return;
    }

    // Reset element for reuse
    this.resetElement(element);

    // Mark as recycled
    element._lastUsedAt = Date.now();

    // Determine which pool to return to based on reuse strategy
    const elementType = element._elementType || "div";

    switch (this.config.reuseStrategy) {
      case "same-type":
        // Return to type-specific pool
        if (!this.typeMap.has(elementType)) {
          this.typeMap.set(elementType, []);
        }
        const typePool = this.typeMap.get(elementType)!;
        if (typePool.length < this.config.maxPoolSize / 4) {
          // 1/4 max for each type
          typePool.push(element);
        } else {
          element.remove();
          this.stats.totalDestroyed++;
        }
        break;

      case "strict":
        // Only reuse if meets strict criteria
        if (this.validateStrictReuse(element)) {
          this.pool.push(element);
        } else {
          element.remove();
          this.stats.totalDestroyed++;
        }
        break;

      case "any-type":
      default:
        // Return to main pool
        if (this.pool.length < this.config.maxPoolSize) {
          this.pool.push(element);
        } else {
          element.remove();
          this.stats.totalDestroyed++;
        }
        break;
    }

    this.updateStats();
  }

  /**
   * Validate element for strict reuse
   */
  private validateStrictReuse(element: RecycledElement): boolean {
    // Check if element meets strict reuse criteria
    return (
      element._useCount < 50 && // Not overused
      Date.now() - element._createdAt < 300000
    ); // Less than 5 minutes old
  }

  /**
   * Clear the entire pool
   */
  clear(): void {
    // Remove all elements from DOM
    this.pool.forEach((element) => element.remove());
    this.typeMap.forEach((elements) =>
      elements.forEach((element) => element.remove())
    );

    // Clear pools
    this.pool = [];
    this.typeMap.clear();

    // Update stats
    this.stats.totalDestroyed += this.stats.currentPoolSize;
    this.stats.currentPoolSize = 0;

    this.updateStats();
    console.log(`${LOGGING.PREFIX} Recycling pool cleared`);
  }

  /**
   * Get current pool size
   */
  size(): number {
    return this.stats.currentPoolSize;
  }

  /**
   * Get pool capacity
   */
  capacity(): number {
    return this.config.maxPoolSize;
  }

  /**
   * Get utilization ratio
   */
  utilizationRatio(): number {
    return this.stats.utilizationRatio;
  }

  /**
   * Get detailed statistics
   */
  getStats(): PoolStats {
    this.updateStats();
    return { ...this.stats };
  }

  /**
   * Optimize pool performance
   */
  optimize(): void {
    // Remove excess elements if over capacity
    const targetSize = Math.floor(this.config.maxPoolSize * 0.8); // 80% of max

    if (this.size() > targetSize) {
      const excessCount = this.size() - targetSize;
      this.cleanupIdleElements();

      // If still over capacity, remove oldest elements
      if (this.size() > targetSize) {
        this.pool.sort((a, b) => a._createdAt - b._createdAt); // Sort by age
        const toRemove = Math.min(excessCount, this.pool.length);

        for (let i = 0; i < toRemove; i++) {
          const element = this.pool.shift();
          if (element) {
            element.remove();
            this.stats.totalDestroyed++;
          }
        }
      }
    }

    this.updateStats();
    console.log(`${LOGGING.PREFIX} Recycling pool optimized`);
  }

  /**
   * Resize pool capacity
   */
  resize(newCapacity: number): void {
    this.config.maxPoolSize = Math.max(newCapacity, this.config.minPoolSize);
    this.optimize(); // Adjust current pool to new capacity

    console.log(`${LOGGING.PREFIX} Recycling pool resized to ${newCapacity}`);
  }

  /**
   * Destroy the pool
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }

    this.clear();
    console.log(`${LOGGING.PREFIX} Recycling pool destroyed`);
  }
}

/**
 * Element recycling pool plugin
 */
export const elementRecyclingPool = (
  config: Partial<RecyclingPoolConfig> = {}
): ListManagerPlugin => ({
  name: "element-recycling-pool",
  version: "1.0.0",
  dependencies: [],

  install: (listManager, pluginConfig) => {
    // Configuration with defaults
    const poolConfig: Required<RecyclingPoolConfig> = {
      enabled: true,
      maxPoolSize: ELEMENT_RECYCLING.DEFAULT_MAX_POOL_SIZE,
      minPoolSize: ELEMENT_RECYCLING.DEFAULT_MIN_POOL_SIZE,
      cleanupThreshold: 60000, // 1 minute
      cleanupInterval: 30000, // 30 seconds
      preCreateElements: 10,
      recyclingStrategy: ELEMENT_RECYCLING.DEFAULT_STRATEGY as "lru",
      reuseStrategy: ELEMENT_RECYCLING.DEFAULT_REUSE_STRATEGY as "same-type",
      ...config,
    };

    // Create pool instance
    const pool = new RecyclingPoolImpl(poolConfig);

    // Return recycling API
    return {
      acquire(): RecycledElement | null {
        return pool.acquire();
      },

      release(element: HTMLElement): void {
        pool.release(element as RecycledElement);
      },

      clear(): void {
        pool.clear();
      },

      size(): number {
        return pool.size();
      },

      capacity(): number {
        return pool.capacity();
      },

      utilizationRatio(): number {
        return pool.utilizationRatio();
      },

      getStats(): PoolStats {
        return pool.getStats();
      },

      optimize(): void {
        pool.optimize();
      },

      resize(newCapacity: number): void {
        pool.resize(newCapacity);
      },

      destroy(): void {
        pool.destroy();
      },
    };
  },
});
