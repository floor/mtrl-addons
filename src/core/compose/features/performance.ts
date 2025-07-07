/**
 * @module core/compose/features
 * @description Performance tracking feature for components
 */

/**
 * Performance metrics interface
 */
export interface PerformanceMetrics {
  renderCount: number;
  scrollCount: number;
  averageRenderTime: number;
  averageScrollTime: number;
  memoryUsage: number;
  virtualizedItems: number;
  recycledElements: number;
}

/**
 * Performance configuration
 */
export interface PerformanceConfig {
  recycleElements?: boolean;
  bufferSize?: number;
  trackMemory?: boolean;
  maxSamples?: number;
}

/**
 * Component with performance tracking capabilities
 */
export interface PerformanceComponent {
  getMetrics: () => PerformanceMetrics;
  resetMetrics: () => any;
  _trackScroll?: (startTime: number) => void;
}

/**
 * Adds performance tracking to a component
 *
 * @param config - Performance configuration
 * @returns Component enhancer that adds performance tracking
 *
 * @example
 * ```typescript
 * const component = pipe(
 *   createBase,
 *   withElement(),
 *   withPerformance({
 *     recycleElements: true,
 *     bufferSize: 50,
 *     trackMemory: true
 *   })
 * )(config);
 * ```
 */
export function withPerformance(config: PerformanceConfig = {}) {
  return (component: any): any & PerformanceComponent => {
    console.log("⚡ [MTRL-ADDONS] Adding performance tracking");

    const maxSamples = config.maxSamples || 100;

    let performanceMetrics: PerformanceMetrics = {
      renderCount: 0,
      scrollCount: 0,
      averageRenderTime: 0,
      averageScrollTime: 0,
      memoryUsage: 0,
      virtualizedItems: 0,
      recycledElements: 0,
    };

    let renderTimes: number[] = [];
    let scrollTimes: number[] = [];

    const trackRender = (startTime: number) => {
      const renderTime = performance.now() - startTime;
      renderTimes.push(renderTime);
      performanceMetrics.renderCount++;
      performanceMetrics.averageRenderTime =
        renderTimes.reduce((a, b) => a + b, 0) / renderTimes.length;

      if (renderTimes.length > maxSamples) {
        renderTimes = renderTimes.slice(-maxSamples);
      }
    };

    const trackScroll = (startTime: number) => {
      const scrollTime = performance.now() - startTime;
      scrollTimes.push(scrollTime);
      performanceMetrics.scrollCount++;
      performanceMetrics.averageScrollTime =
        scrollTimes.reduce((a, b) => a + b, 0) / scrollTimes.length;

      if (scrollTimes.length > maxSamples) {
        scrollTimes = scrollTimes.slice(-maxSamples);
      }
    };

    // Wrap render method with performance tracking if it exists
    const originalRender = component.render?.bind(component);
    if (originalRender) {
      component.render = () => {
        const startTime = performance.now();
        originalRender();
        trackRender(startTime);

        // Emit performance event using component's event system
        if (component.emit) {
          component.emit("performance:render", {
            renderTime: performance.now() - startTime,
            renderCount: performanceMetrics.renderCount,
          });
        }
      };
    }

    // Performance methods
    return {
      ...component,

      getMetrics(): PerformanceMetrics {
        return {
          ...performanceMetrics,
          memoryUsage: config.trackMemory
            ? (performance as any).memory?.usedJSHeapSize || 0
            : 0,
          virtualizedItems: component.getItems
            ? component.getItems().length
            : 0,
          recycledElements: component.element.children.length,
        };
      },

      resetMetrics() {
        performanceMetrics = {
          renderCount: 0,
          scrollCount: 0,
          averageRenderTime: 0,
          averageScrollTime: 0,
          memoryUsage: 0,
          virtualizedItems: 0,
          recycledElements: 0,
        };
        renderTimes = [];
        scrollTimes = [];
        console.log("📊 [MTRL-ADDONS] Performance metrics reset");

        // Emit reset event using component's event system
        if (component.emit) {
          component.emit("performance:reset", {});
        }

        return component;
      },

      // Internal tracking helpers
      _trackScroll: trackScroll,
    };
  };
}
