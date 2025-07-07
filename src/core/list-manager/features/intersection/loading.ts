import type { ListManagerPlugin } from "../../types";
import { VIEWPORT, CLASSES, LOGGING } from "../../constants";

/**
 * Lazy loading configuration
 */
export interface LazyLoadingConfig {
  enabled: boolean;
  rootMargin: string;
  threshold: number;
  preloadDistance: number;
  batchSize: number;
  debounceMs: number;
}

/**
 * Lazy loading plugin using intersection observer
 */
export const lazyLoading = (
  config: Partial<LazyLoadingConfig> = {}
): ListManagerPlugin => ({
  name: "lazy-loading",
  version: "1.0.0",
  dependencies: [],

  install: (listManager, pluginConfig) => {
    // Configuration with defaults
    const loadingConfig: LazyLoadingConfig = {
      enabled: true,
      rootMargin: VIEWPORT.DEFAULT_INTERSECTION_ROOT_MARGIN,
      threshold: VIEWPORT.DEFAULT_INTERSECTION_THRESHOLD,
      preloadDistance: 500,
      batchSize: 10,
      debounceMs: 100,
      ...config,
    };

    let intersectionObserver: IntersectionObserver | null = null;
    let loadingQueue: HTMLElement[] = [];
    let isLoading = false;

    /**
     * Handle intersection events
     */
    const handleIntersection = (entries: IntersectionObserverEntry[]): void => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const element = entry.target as HTMLElement;
          queueForLoading(element);
        }
      });
    };

    /**
     * Queue element for loading
     */
    const queueForLoading = (element: HTMLElement): void => {
      if (!loadingQueue.includes(element)) {
        loadingQueue.push(element);
        processLoadingQueue();
      }
    };

    /**
     * Process loading queue
     */
    const processLoadingQueue = (): void => {
      if (isLoading || loadingQueue.length === 0) return;

      isLoading = true;
      const batch = loadingQueue.splice(0, loadingConfig.batchSize);

      Promise.all(batch.map(loadElement))
        .then(() => {
          isLoading = false;
          if (loadingQueue.length > 0) {
            setTimeout(processLoadingQueue, loadingConfig.debounceMs);
          }
        })
        .catch((error) => {
          console.error(`${LOGGING.PREFIX} Loading error:`, error);
          isLoading = false;
        });
    };

    /**
     * Load individual element
     */
    const loadElement = async (element: HTMLElement): Promise<void> => {
      // Mark as loading
      element.classList.add("loading");

      // Emit loading event
      listManager.emit("item:loading", { element });

      // Simulate loading (replace with actual loading logic)
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Mark as loaded
      element.classList.remove("loading");
      element.classList.add("loaded");

      // Emit loaded event
      listManager.emit("item:loaded", { element });
    };

    /**
     * Setup intersection observer
     */
    const setupObserver = (): void => {
      if (!loadingConfig.enabled || typeof IntersectionObserver === "undefined")
        return;

      intersectionObserver = new IntersectionObserver(handleIntersection, {
        rootMargin: loadingConfig.rootMargin,
        threshold: loadingConfig.threshold,
      });
    };

    /**
     * Observe element
     */
    const observeElement = (element: HTMLElement): void => {
      if (intersectionObserver) {
        intersectionObserver.observe(element);
      }
    };

    /**
     * Unobserve element
     */
    const unobserveElement = (element: HTMLElement): void => {
      if (intersectionObserver) {
        intersectionObserver.unobserve(element);
      }
    };

    // Initialize
    setupObserver();

    // Return lazy loading API
    return {
      observeElement,
      unobserveElement,
      queueForLoading,

      isLoading: () => isLoading,
      getQueueSize: () => loadingQueue.length,

      updateConfig(newConfig: Partial<LazyLoadingConfig>): void {
        Object.assign(loadingConfig, newConfig);
      },

      destroy(): void {
        if (intersectionObserver) {
          intersectionObserver.disconnect();
        }
        loadingQueue = [];
        console.log(`${LOGGING.PREFIX} Lazy loading destroyed`);
      },
    };
  },
});
