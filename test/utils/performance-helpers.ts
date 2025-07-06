// test/utils/performance-helpers.ts - Performance Testing Utilities

/**
 * Measures the execution time of a function
 * @param callback - Function to measure
 * @returns Promise that resolves with the execution time in milliseconds
 */
export function measureExecutionTime(
  callback: () => Promise<void> | void
): Promise<number> {
  return new Promise(async (resolve) => {
    const start = performance.now();
    await callback();
    const end = performance.now();
    resolve(end - start);
  });
}

/**
 * Measures the time it takes to render content
 * @param callback - Render function
 * @returns Promise that resolves with render time in milliseconds
 */
export function measureRenderTime(
  callback: () => Promise<void> | void
): Promise<number> {
  return measureExecutionTime(callback);
}

/**
 * Creates a large dataset for performance testing
 * @param count - Number of items to create
 * @param template - Template function for creating items
 * @returns Array of test items
 */
export function createLargeDataset<T>(
  count: number = 10000,
  template: (index: number) => T = (i) =>
    ({
      id: i.toString(),
      name: `Item ${i}`,
      value: Math.random() * 1000,
    } as T)
): T[] {
  return Array.from({ length: count }, (_, i) => template(i));
}

/**
 * Creates test items with varying sizes for dynamic height testing
 * @param count - Number of items to create
 * @returns Array of items with different content lengths
 */
export function createVariableSizeDataset(count: number = 1000) {
  return Array.from({ length: count }, (_, i) => ({
    id: i.toString(),
    name: `Item ${i}`,
    description: "Lorem ipsum ".repeat(Math.floor(Math.random() * 10) + 1),
    tags: Array.from(
      { length: Math.floor(Math.random() * 5) + 1 },
      (_, j) => `tag${j}`
    ),
  }));
}

/**
 * Measures frame rate during a series of operations
 * @param operations - Array of operations to perform
 * @param duration - Duration to measure in milliseconds
 * @returns Promise that resolves with average FPS
 */
export function measureFrameRate(
  operations: (() => void)[],
  duration: number = 1000
): Promise<number> {
  return new Promise((resolve) => {
    let frameCount = 0;
    let lastTime = performance.now();
    const endTime = lastTime + duration;
    let operationIndex = 0;

    function frame() {
      const currentTime = performance.now();

      if (currentTime >= endTime) {
        const fps = (frameCount / duration) * 1000;
        resolve(fps);
        return;
      }

      // Perform operation
      if (operations.length > 0) {
        operations[operationIndex % operations.length]();
        operationIndex++;
      }

      frameCount++;
      requestAnimationFrame(frame);
    }

    requestAnimationFrame(frame);
  });
}

/**
 * Measures scroll performance by simulating rapid scrolling
 * @param container - Container element to scroll
 * @param scrollDistance - Total distance to scroll
 * @param scrollSteps - Number of scroll steps
 * @returns Promise that resolves with performance metrics
 */
export function measureScrollPerformance(
  container: HTMLElement,
  scrollDistance: number = 10000,
  scrollSteps: number = 100
): Promise<{
  averageFrameTime: number;
  maxFrameTime: number;
  minFrameTime: number;
  droppedFrames: number;
}> {
  return new Promise((resolve) => {
    const frameTimes: number[] = [];
    const stepSize = scrollDistance / scrollSteps;
    let currentStep = 0;
    let lastTime = performance.now();
    const targetFrameTime = 16.67; // 60fps = 16.67ms per frame

    function scrollStep() {
      const currentTime = performance.now();
      const frameTime = currentTime - lastTime;
      frameTimes.push(frameTime);

      if (currentStep >= scrollSteps) {
        const averageFrameTime =
          frameTimes.reduce((a, b) => a + b, 0) / frameTimes.length;
        const maxFrameTime = Math.max(...frameTimes);
        const minFrameTime = Math.min(...frameTimes);
        const droppedFrames = frameTimes.filter(
          (time) => time > targetFrameTime
        ).length;

        resolve({
          averageFrameTime,
          maxFrameTime,
          minFrameTime,
          droppedFrames,
        });
        return;
      }

      // Perform scroll
      container.scrollTop = currentStep * stepSize;
      const scrollEvent = new Event("scroll", { bubbles: true });
      container.dispatchEvent(scrollEvent);

      currentStep++;
      lastTime = currentTime;
      requestAnimationFrame(scrollStep);
    }

    requestAnimationFrame(scrollStep);
  });
}

/**
 * Measures memory usage (approximate)
 * @returns Memory usage information
 */
export function measureMemoryUsage(): {
  heapUsed: number;
  heapTotal: number;
  external: number;
} {
  // For browser environment, we can't access precise memory info
  // This is a placeholder that would work in Node.js
  if (typeof process !== "undefined" && process.memoryUsage) {
    const usage = process.memoryUsage();
    return {
      heapUsed: usage.heapUsed,
      heapTotal: usage.heapTotal,
      external: usage.external,
    };
  }

  // Browser fallback - approximate values
  return {
    heapUsed: 0,
    heapTotal: 0,
    external: 0,
  };
}

/**
 * Measures DOM manipulation performance
 * @param manipulationFn - Function that performs DOM manipulation
 * @param iterations - Number of iterations to perform
 * @returns Promise that resolves with performance metrics
 */
export function measureDOMPerformance(
  manipulationFn: () => void,
  iterations: number = 1000
): Promise<{
  totalTime: number;
  averageTime: number;
  operationsPerSecond: number;
}> {
  return new Promise((resolve) => {
    const start = performance.now();

    for (let i = 0; i < iterations; i++) {
      manipulationFn();
    }

    const end = performance.now();
    const totalTime = end - start;
    const averageTime = totalTime / iterations;
    const operationsPerSecond = (iterations / totalTime) * 1000;

    resolve({
      totalTime,
      averageTime,
      operationsPerSecond,
    });
  });
}

/**
 * Runs a performance benchmark and compares against baseline
 * @param name - Name of the benchmark
 * @param fn - Function to benchmark
 * @param baseline - Baseline time in milliseconds
 * @returns Promise that resolves with benchmark results
 */
export function runBenchmark(
  name: string,
  fn: () => Promise<void> | void,
  baseline?: number
): Promise<{
  name: string;
  time: number;
  baseline?: number;
  ratio?: number;
  passed: boolean;
}> {
  return new Promise(async (resolve) => {
    const time = await measureExecutionTime(fn);
    const result = {
      name,
      time,
      baseline,
      ratio: baseline ? time / baseline : undefined,
      passed: baseline ? time <= baseline : true,
    };

    resolve(result);
  });
}

/**
 * Stress tests a function with increasing load
 * @param fn - Function to stress test
 * @param startLoad - Starting load (e.g., number of items)
 * @param maxLoad - Maximum load to test
 * @param stepSize - Step size for increasing load
 * @returns Promise that resolves with stress test results
 */
export function stressTest(
  fn: (load: number) => Promise<void> | void,
  startLoad: number = 100,
  maxLoad: number = 10000,
  stepSize: number = 100
): Promise<
  {
    load: number;
    time: number;
    success: boolean;
  }[]
> {
  return new Promise(async (resolve) => {
    const results: { load: number; time: number; success: boolean }[] = [];

    for (let load = startLoad; load <= maxLoad; load += stepSize) {
      try {
        const time = await measureExecutionTime(() => fn(load));
        results.push({ load, time, success: true });
      } catch (error) {
        results.push({ load, time: -1, success: false });
        break; // Stop on first failure
      }
    }

    resolve(results);
  });
}

/**
 * Measures the performance of virtual scrolling
 * @param container - Container element
 * @param itemCount - Total number of items
 * @param visibleItems - Number of visible items
 * @param scrollTests - Number of scroll positions to test
 * @returns Promise that resolves with virtual scroll performance metrics
 */
export function measureVirtualScrollPerformance(
  container: HTMLElement,
  itemCount: number = 10000,
  visibleItems: number = 20,
  scrollTests: number = 100
): Promise<{
  renderTime: number;
  scrollTime: number;
  memoryEfficiency: number;
}> {
  return new Promise(async (resolve) => {
    // Measure initial render time
    const renderTime = await measureRenderTime(async () => {
      // This would be the virtual scroll render function
      // Placeholder for now
      await new Promise((resolve) => setTimeout(resolve, 1));
    });

    // Measure scroll performance
    const scrollTime = await measureScrollPerformance(
      container,
      5000,
      scrollTests
    );

    // Calculate memory efficiency (visible items / total items)
    const memoryEfficiency = visibleItems / itemCount;

    resolve({
      renderTime,
      scrollTime: scrollTime.averageFrameTime,
      memoryEfficiency,
    });
  });
}

/**
 * Creates a performance test suite
 * @param tests - Array of test configurations
 * @returns Promise that resolves with all test results
 */
export function runPerformanceTestSuite(
  tests: {
    name: string;
    fn: () => Promise<void> | void;
    baseline?: number;
    timeout?: number;
  }[]
): Promise<
  {
    name: string;
    time: number;
    baseline?: number;
    passed: boolean;
    error?: string;
  }[]
> {
  return new Promise(async (resolve) => {
    const results: {
      name: string;
      time: number;
      baseline?: number;
      passed: boolean;
      error?: string;
    }[] = [];

    for (const test of tests) {
      try {
        const benchmark = await runBenchmark(test.name, test.fn, test.baseline);
        results.push({
          name: benchmark.name,
          time: benchmark.time,
          baseline: benchmark.baseline,
          passed: benchmark.passed,
        });
      } catch (error) {
        results.push({
          name: test.name,
          time: -1,
          baseline: test.baseline,
          passed: false,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    resolve(results);
  });
}
