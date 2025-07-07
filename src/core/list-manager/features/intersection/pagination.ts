import type { ListManagerPlugin } from "../../types";
import { VIEWPORT, CLASSES, LOGGING } from "../../constants";

/**
 * Pagination trigger configuration
 */
export interface PaginationTriggerConfig {
  enabled: boolean;
  rootMargin: string;
  threshold: number;
  triggerPosition: "bottom" | "top" | "both";
  preloadThreshold: number;
  debounceMs: number;
  maxTriggers: number;
}

/**
 * Pagination trigger state
 */
interface PaginationState {
  isObserving: boolean;
  triggerCount: number;
  lastTriggerTime: number;
  sentinelElements: Map<string, HTMLElement>;
  intersectionObserver: IntersectionObserver | null;
}

/**
 * Intersection-based pagination plugin
 * Triggers pagination events when scroll approaches boundaries
 */
export const paginationTrigger = (
  config: Partial<PaginationTriggerConfig> = {}
): ListManagerPlugin => ({
  name: "pagination-trigger",
  version: "1.0.0",
  dependencies: [],

  install: (listManager, pluginConfig) => {
    // Configuration with defaults
    const paginationConfig: PaginationTriggerConfig = {
      enabled: true,
      rootMargin: VIEWPORT.DEFAULT_INTERSECTION_ROOT_MARGIN,
      threshold: VIEWPORT.DEFAULT_INTERSECTION_THRESHOLD,
      triggerPosition: "bottom",
      preloadThreshold: 0.8, // Trigger when 80% scrolled
      debounceMs: 500,
      maxTriggers: 100,
      ...config,
    };

    // Pagination state
    let state: PaginationState = {
      isObserving: false,
      triggerCount: 0,
      lastTriggerTime: 0,
      sentinelElements: new Map(),
      intersectionObserver: null,
    };

    // Get container and viewport elements
    const getElements = () => {
      const container = listManager.getConfig().container;
      const viewport = container?.querySelector(
        `.${CLASSES.VIEWPORT}`
      ) as HTMLElement;
      const scrollContainer = viewport?.querySelector(
        `.${CLASSES.SCROLL_CONTAINER}`
      ) as HTMLElement;

      return { container, viewport, scrollContainer };
    };

    /**
     * Create sentinel element for intersection observation
     */
    const createSentinel = (position: "top" | "bottom"): HTMLElement => {
      const sentinel = document.createElement("div");
      sentinel.className = `pagination-sentinel pagination-sentinel--${position}`;
      sentinel.style.cssText = `
        position: absolute;
        width: 1px;
        height: 1px;
        pointer-events: none;
        opacity: 0;
        ${position}: 0;
        left: 0;
      `;
      sentinel.setAttribute("data-pagination-sentinel", position);
      return sentinel;
    };

    /**
     * Position sentinels in the scroll container
     */
    const positionSentinels = (): void => {
      const { scrollContainer } = getElements();
      if (!scrollContainer) return;

      const viewportInfo = listManager.getViewportInfo();
      const triggerDistance =
        viewportInfo.containerHeight * paginationConfig.preloadThreshold;

      // Position bottom sentinel
      const bottomSentinel = state.sentinelElements.get("bottom");
      if (bottomSentinel) {
        const bottomPosition = Math.max(
          0,
          viewportInfo.totalHeight - triggerDistance
        );
        bottomSentinel.style.top = `${bottomPosition}px`;
      }

      // Position top sentinel
      const topSentinel = state.sentinelElements.get("top");
      if (topSentinel) {
        const topPosition = Math.max(0, triggerDistance);
        topSentinel.style.top = `${topPosition}px`;
      }
    };

    /**
     * Handle intersection events
     */
    const handleIntersection = (entries: IntersectionObserverEntry[]): void => {
      const now = Date.now();

      // Debounce rapid intersection events
      if (now - state.lastTriggerTime < paginationConfig.debounceMs) {
        return;
      }

      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;

        const sentinelType = entry.target.getAttribute(
          "data-pagination-sentinel"
        );

        // Check trigger limits
        if (state.triggerCount >= paginationConfig.maxTriggers) {
          console.warn(
            `${LOGGING.PREFIX} Pagination trigger limit reached (${paginationConfig.maxTriggers})`
          );
          return;
        }

        // Emit pagination event based on sentinel position
        if (
          sentinelType === "bottom" &&
          (paginationConfig.triggerPosition === "bottom" ||
            paginationConfig.triggerPosition === "both")
        ) {
          listManager.emit("load:more:triggered", {
            direction: "forward",
            triggerType: "intersection",
            position: "bottom",
            triggerCount: state.triggerCount + 1,
            timestamp: now,
          });

          state.triggerCount++;
          state.lastTriggerTime = now;

          console.log(
            `${LOGGING.PREFIX} Bottom pagination triggered (${state.triggerCount})`
          );
        }

        if (
          sentinelType === "top" &&
          (paginationConfig.triggerPosition === "top" ||
            paginationConfig.triggerPosition === "both")
        ) {
          listManager.emit("load:more:triggered", {
            direction: "backward",
            triggerType: "intersection",
            position: "top",
            triggerCount: state.triggerCount + 1,
            timestamp: now,
          });

          state.triggerCount++;
          state.lastTriggerTime = now;

          console.log(
            `${LOGGING.PREFIX} Top pagination triggered (${state.triggerCount})`
          );
        }
      });
    };

    /**
     * Setup intersection observer
     */
    const setupIntersectionObserver = (): void => {
      if (typeof IntersectionObserver === "undefined") {
        console.warn(`${LOGGING.PREFIX} IntersectionObserver not supported`);
        return;
      }

      // Create intersection observer
      state.intersectionObserver = new IntersectionObserver(
        handleIntersection,
        {
          root: null, // Use viewport as root
          rootMargin: paginationConfig.rootMargin,
          threshold: paginationConfig.threshold,
        }
      );

      console.log(`${LOGGING.PREFIX} Pagination intersection observer created`);
    };

    /**
     * Create and position sentinel elements
     */
    const createSentinels = (): void => {
      const { scrollContainer } = getElements();
      if (!scrollContainer) {
        console.warn(
          `${LOGGING.PREFIX} No scroll container found for pagination sentinels`
        );
        return;
      }

      // Create sentinels based on trigger position
      if (
        paginationConfig.triggerPosition === "bottom" ||
        paginationConfig.triggerPosition === "both"
      ) {
        const bottomSentinel = createSentinel("bottom");
        scrollContainer.appendChild(bottomSentinel);
        state.sentinelElements.set("bottom", bottomSentinel);

        if (state.intersectionObserver) {
          state.intersectionObserver.observe(bottomSentinel);
        }
      }

      if (
        paginationConfig.triggerPosition === "top" ||
        paginationConfig.triggerPosition === "both"
      ) {
        const topSentinel = createSentinel("top");
        scrollContainer.appendChild(topSentinel);
        state.sentinelElements.set("top", topSentinel);

        if (state.intersectionObserver) {
          state.intersectionObserver.observe(topSentinel);
        }
      }

      // Position sentinels
      positionSentinels();

      console.log(
        `${LOGGING.PREFIX} Pagination sentinels created: ${state.sentinelElements.size}`
      );
    };

    /**
     * Start pagination monitoring
     */
    const startPagination = (): void => {
      if (!paginationConfig.enabled || state.isObserving) return;

      setupIntersectionObserver();
      createSentinels();
      state.isObserving = true;

      console.log(`${LOGGING.PREFIX} Pagination monitoring started`);
    };

    /**
     * Stop pagination monitoring
     */
    const stopPagination = (): void => {
      if (!state.isObserving) return;

      // Disconnect observer
      if (state.intersectionObserver) {
        state.intersectionObserver.disconnect();
        state.intersectionObserver = null;
      }

      // Remove sentinels
      state.sentinelElements.forEach((sentinel) => {
        sentinel.remove();
      });
      state.sentinelElements.clear();

      state.isObserving = false;
      console.log(`${LOGGING.PREFIX} Pagination monitoring stopped`);
    };

    /**
     * Update pagination configuration
     */
    const updateConfig = (
      newConfig: Partial<PaginationTriggerConfig>
    ): void => {
      const wasObserving = state.isObserving;

      if (wasObserving) {
        stopPagination();
      }

      Object.assign(paginationConfig, newConfig);

      if (wasObserving && paginationConfig.enabled) {
        startPagination();
      }
    };

    /**
     * Reset pagination state
     */
    const reset = (): void => {
      state.triggerCount = 0;
      state.lastTriggerTime = 0;
      positionSentinels(); // Reposition sentinels for new content

      console.log(`${LOGGING.PREFIX} Pagination state reset`);
    };

    /**
     * Manual trigger for testing/debugging
     */
    const manualTrigger = (direction: "forward" | "backward"): void => {
      const now = Date.now();

      listManager.emit("load:more:triggered", {
        direction,
        triggerType: "manual",
        position: direction === "forward" ? "bottom" : "top",
        triggerCount: state.triggerCount + 1,
        timestamp: now,
      });

      state.triggerCount++;
      state.lastTriggerTime = now;

      console.log(
        `${LOGGING.PREFIX} Manual pagination triggered: ${direction}`
      );
    };

    // Listen for viewport changes to reposition sentinels
    listManager.subscribe((payload) => {
      if (payload.event === "viewport:changed" && state.isObserving) {
        positionSentinels();
      }
    });

    // Auto-start if enabled
    if (paginationConfig.enabled) {
      // Delay to ensure viewport is ready
      setTimeout(startPagination, 100);
    }

    // Return pagination API
    return {
      // Control methods
      start: startPagination,
      stop: stopPagination,
      reset,

      // Configuration
      updateConfig,
      getConfig: () => ({ ...paginationConfig }),

      // State queries
      isObserving: () => state.isObserving,
      getTriggerCount: () => state.triggerCount,
      getLastTriggerTime: () => state.lastTriggerTime,

      // Manual control
      manualTrigger,

      // Positioning
      repositionSentinels: positionSentinels,

      // Debug helpers
      getSentinels: () => Array.from(state.sentinelElements.values()),

      // Lifecycle
      destroy(): void {
        stopPagination();
        console.log(`${LOGGING.PREFIX} Pagination trigger destroyed`);
      },
    };
  },
});
