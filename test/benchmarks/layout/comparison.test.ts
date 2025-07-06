// test/core/layout/benchmarks.test.ts - Layout Performance Benchmarks
import {
  describe,
  test,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
  afterEach,
} from "bun:test";
import { JSDOM } from "jsdom";

// Setup for DOM testing environment
let dom: JSDOM;
let window: Window;
let document: Document;
let originalGlobalDocument: any;
let originalGlobalWindow: any;

// Setup DOM environment before importing modules
beforeAll(() => {
  // Create a new JSDOM instance
  dom = new JSDOM("<!DOCTYPE html><html><body></body></html>", {
    url: "http://localhost/",
    pretendToBeVisual: true,
    resources: "usable",
  });

  // Get window and document from jsdom
  window = dom.window as any;
  document = window.document;

  // Store original globals
  originalGlobalDocument = global.document;
  originalGlobalWindow = global.window;

  // Set globals to use jsdom
  global.document = document;
  global.window = window as any;
  global.Element = (window as any).Element;
  global.HTMLElement = (window as any).HTMLElement;
  global.DocumentFragment = (window as any).DocumentFragment;
  global.requestAnimationFrame = (window as any).requestAnimationFrame;
  global.cancelAnimationFrame = (window as any).cancelAnimationFrame;
  // Fix performance.now conflict - use custom timer
  global.performance = {
    now: () => Date.now(),
  };

  // Add missing DOM APIs
  global.getComputedStyle =
    (window as any).getComputedStyle ||
    (() => ({
      position: "static",
      getPropertyValue: () => "",
    }));
});

afterAll(() => {
  // Restore original globals
  global.document = originalGlobalDocument;
  global.window = originalGlobalWindow;

  // Clean up jsdom
  window.close();
});

// Import layout systems after DOM setup
import {
  createLayout as addonsLayout,
  grid,
  row,
  stack,
  performance as addonsPerformance,
} from "../../../src/core/layout";

// Mock mtrl createLayout for comparison
const mockMtrlLayout = (schema: any) => {
  // Simple mock that creates basic DOM structure
  const createElement = (options: any = {}) => {
    const tag = options.tag || "div";
    const element = document.createElement(tag);
    if (options.class) element.className = options.class;
    if (options.text || options.textContent) {
      element.textContent = options.text || options.textContent;
    }
    return element;
  };

  const processSchema = (items: any[], parent?: any): any => {
    const layout: any = {};
    let currentElement = null;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];

      if (typeof item === "string" && i === 0) {
        // Tag name
        currentElement = createElement({ tag: item });
        layout.element = currentElement;
      } else if (typeof item === "string" && i === 1) {
        // Name
        layout[item] = currentElement;
      } else if (typeof item === "object" && !Array.isArray(item)) {
        // Options
        if (currentElement && item.class) {
          currentElement.className = item.class;
        }
        if (currentElement && (item.text || item.textContent)) {
          currentElement.textContent = item.text || item.textContent;
        }
      } else if (Array.isArray(item)) {
        // Nested array
        const childResult = processSchema(item, currentElement);
        if (currentElement && childResult.element) {
          currentElement.appendChild(childResult.element);
        }
        Object.assign(layout, childResult);
      }
    }

    return {
      layout,
      element: layout.element,
      component: layout,
      get: (name: string) => layout[name] || null,
      getAll: () => layout,
      destroy: () => {
        if (layout.element && layout.element.parentNode) {
          layout.element.parentNode.removeChild(layout.element);
        }
      },
    };
  };

  return processSchema(Array.isArray(schema) ? schema : [schema]);
};

describe("Layout Performance Benchmarks", () => {
  let container: HTMLElement;

  beforeEach(() => {
    // Create fresh container for each test
    container = document.createElement("div");
    container.style.height = "400px";
    container.style.overflow = "auto";
    document.body.appendChild(container);

    // Clear caches before each test
    addonsPerformance.clearAll();
  });

  afterEach(() => {
    // Cleanup container
    if (container && container.parentNode) {
      container.parentNode.removeChild(container);
    }
  });

  describe("Performance Environment", () => {
    test("DOM environment is ready", () => {
      expect(document).toBeDefined();
      expect(document.createElement).toBeDefined();
      expect(performance.now).toBeDefined();
      expect(container).toBeDefined();
    });

    test("layout systems are available", () => {
      expect(addonsLayout).toBeDefined();
      expect(mockMtrlLayout).toBeDefined();
      expect(addonsPerformance).toBeDefined();
    });
  });

  describe("Basic Performance Comparison", () => {
    test("simple layout creation speed", () => {
      const iterations = 1000;
      const schema = ["div", "test", { class: "simple-test" }];

      // Test mtrl-addons
      addonsPerformance.clearAll();
      const addonsStart = performance.now();
      for (let i = 0; i < iterations; i++) {
        const layout = addonsLayout(schema);
        layout.destroy();
      }
      const addonsEnd = performance.now();
      const addonsTime = addonsEnd - addonsStart;

      // Test mock mtrl
      const mtrlStart = performance.now();
      for (let i = 0; i < iterations; i++) {
        const layout = mockMtrlLayout(schema);
        layout.destroy();
      }
      const mtrlEnd = performance.now();
      const mtrlTime = mtrlEnd - mtrlStart;

      console.log(`\n📊 Simple Layout Performance (${iterations} iterations):`);
      console.log(`  mtrl-addons: ${addonsTime.toFixed(2)}ms`);
      console.log(`  mock-mtrl:   ${mtrlTime.toFixed(2)}ms`);
      console.log(`  Difference:  ${(addonsTime - mtrlTime).toFixed(2)}ms`);
      console.log(`  Ratio:       ${(addonsTime / mtrlTime).toFixed(2)}x`);

      expect(addonsTime).toBeGreaterThan(0);
      expect(mtrlTime).toBeGreaterThan(0);
      expect(addonsTime).toBeLessThan(5000); // Should complete in reasonable time
    });

    test("complex nested layout speed", () => {
      const iterations = 500;
      const complexSchema = [
        "div",
        "main",
        { class: "main-container" },
        [
          "div",
          "header",
          { class: "header" },
          ["h1", "title", { text: "Title", class: "title" }],
          [
            "nav",
            "nav",
            { class: "navigation" },
            ["a", "link1", { text: "Home", class: "nav-link" }],
            ["a", "link2", { text: "About", class: "nav-link" }],
          ],
        ],
        [
          "div",
          "content",
          { class: "content" },
          ["p", "paragraph", { text: "Content paragraph", class: "text" }],
        ],
      ];

      // Test mtrl-addons
      addonsPerformance.clearAll();
      const addonsStart = performance.now();
      for (let i = 0; i < iterations; i++) {
        const layout = addonsLayout(complexSchema);
        layout.destroy();
      }
      const addonsEnd = performance.now();
      const addonsTime = addonsEnd - addonsStart;

      // Test mock mtrl
      const mtrlStart = performance.now();
      for (let i = 0; i < iterations; i++) {
        const layout = mockMtrlLayout(complexSchema);
        layout.destroy();
      }
      const mtrlEnd = performance.now();
      const mtrlTime = mtrlEnd - mtrlStart;

      console.log(
        `\n📊 Complex Layout Performance (${iterations} iterations):`
      );
      console.log(`  mtrl-addons: ${addonsTime.toFixed(2)}ms`);
      console.log(`  mock-mtrl:   ${mtrlTime.toFixed(2)}ms`);
      console.log(`  Difference:  ${(addonsTime - mtrlTime).toFixed(2)}ms`);
      console.log(`  Ratio:       ${(addonsTime / mtrlTime).toFixed(2)}x`);

      expect(addonsTime).toBeGreaterThan(0);
      expect(mtrlTime).toBeGreaterThan(0);
    });
  });

  describe("Cache Effectiveness", () => {
    test("class name cache impact", () => {
      const iterations = 1000;
      const schema = [
        "div",
        "container",
        {
          layout: { type: "grid", columns: 3, gap: "1rem", align: "center" },
          layoutItem: { span: 2, width: 6 },
        },
      ];

      // First run - cache empty
      addonsPerformance.clearAll();
      const coldStart = performance.now();
      for (let i = 0; i < iterations; i++) {
        const layout = addonsLayout(schema);
        layout.destroy();
      }
      const coldEnd = performance.now();
      const coldTime = coldEnd - coldStart;

      // Second run - cache warmed
      const warmStart = performance.now();
      for (let i = 0; i < iterations; i++) {
        const layout = addonsLayout(schema);
        layout.destroy();
      }
      const warmEnd = performance.now();
      const warmTime = warmEnd - warmStart;

      const improvement = ((coldTime - warmTime) / coldTime) * 100;

      console.log(`\n🚀 Cache Performance (${iterations} iterations):`);
      console.log(`  Cold cache:  ${coldTime.toFixed(2)}ms`);
      console.log(`  Warm cache:  ${warmTime.toFixed(2)}ms`);
      console.log(`  Improvement: ${improvement.toFixed(1)}%`);

      expect(coldTime).toBeGreaterThan(0);
      expect(warmTime).toBeGreaterThan(0);
      expect(warmTime).toBeLessThanOrEqual(coldTime); // Should be same or faster
    });

    test("fragment pool effectiveness", () => {
      const iterations = 2000;
      const schema = [
        "div",
        "container",
        { class: "fragment-test" },
        ["span", "child1", { textContent: "Child 1" }],
        ["span", "child2", { textContent: "Child 2" }],
        ["span", "child3", { textContent: "Child 3" }],
      ];

      // Clear pool and measure
      addonsPerformance.clearAll();
      const start = performance.now();

      const layouts = [];
      for (let i = 0; i < iterations; i++) {
        layouts.push(addonsLayout(schema));
      }

      // Destroy all at once to test fragment recycling
      for (const layout of layouts) {
        layout.destroy();
      }

      const end = performance.now();
      const time = end - start;

      console.log(`\n♻️  Fragment Pool Test (${iterations} layouts):`);
      console.log(`  Total time:     ${time.toFixed(2)}ms`);
      console.log(`  Avg per layout: ${(time / iterations).toFixed(3)}ms`);
      console.log(`  Per layout:     ${(time / iterations).toFixed(3)}ms`);

      expect(time).toBeGreaterThan(0);
      expect(time).toBeLessThan(10000); // Should be fast
    });
  });

  describe("Convenience Functions Performance", () => {
    test("grid layout convenience function", () => {
      const iterations = 500;

      const start = performance.now();
      for (let i = 0; i < iterations; i++) {
        const layout = grid(3, { gap: "1rem" });
        layout.destroy();
      }
      const end = performance.now();
      const time = end - start;

      console.log(`\n📐 Grid Convenience Function (${iterations} iterations):`);
      console.log(`  Time:           ${time.toFixed(2)}ms`);
      console.log(`  Avg per grid:   ${(time / iterations).toFixed(3)}ms`);

      expect(time).toBeGreaterThan(0);
      expect(time).toBeLessThan(5000);
    });

    test("row and stack convenience functions", () => {
      const iterations = 500;

      const rowStart = performance.now();
      for (let i = 0; i < iterations; i++) {
        const layout = row({ gap: "1rem", mobileStack: true });
        layout.destroy();
      }
      const rowEnd = performance.now();
      const rowTime = rowEnd - rowStart;

      const stackStart = performance.now();
      for (let i = 0; i < iterations; i++) {
        const layout = stack({ gap: "2rem" });
        layout.destroy();
      }
      const stackEnd = performance.now();
      const stackTime = stackEnd - stackStart;

      console.log(`\n📦 Layout Functions (${iterations} each):`);
      console.log(`  Row layouts:    ${rowTime.toFixed(2)}ms`);
      console.log(`  Stack layouts:  ${stackTime.toFixed(2)}ms`);
      console.log(`  Total:          ${(rowTime + stackTime).toFixed(2)}ms`);

      expect(rowTime).toBeGreaterThan(0);
      expect(stackTime).toBeGreaterThan(0);
    });
  });

  describe("Memory Usage Patterns", () => {
    test("large dataset handling", () => {
      const itemCount = 1000;
      const schema = ["div", "container", { class: "large-dataset" }];

      // Add many children
      for (let i = 0; i < itemCount; i++) {
        schema.push([
          "div",
          `item${i}`,
          {
            class: "dataset-item",
            textContent: `Item ${i}`,
            layoutItem: { width: (i % 12) + 1 },
          },
        ]);
      }

      const start = performance.now();
      const layout = addonsLayout(schema);
      const end = performance.now();
      const createTime = end - start;

      const destroyStart = performance.now();
      layout.destroy();
      const destroyEnd = performance.now();
      const destroyTime = destroyEnd - destroyStart;

      console.log(`\n🗂️  Large Dataset (${itemCount} items):`);
      console.log(`  Creation:  ${createTime.toFixed(2)}ms`);
      console.log(`  Cleanup:   ${destroyTime.toFixed(2)}ms`);
      console.log(`  Total:     ${(createTime + destroyTime).toFixed(2)}ms`);

      expect(createTime).toBeGreaterThan(0);
      expect(destroyTime).toBeGreaterThan(0);
      expect(createTime).toBeLessThan(5000); // Should handle large datasets reasonably
    });
  });

  describe("Performance Summary", () => {
    test("overall performance metrics", () => {
      const testCases = [
        {
          name: "Simple div",
          schema: ["div", { class: "simple" }],
          iterations: 1000,
        },
        {
          name: "Text content",
          schema: ["p", "text", { text: "Hello World", class: "text" }],
          iterations: 1000,
        },
        {
          name: "Nested structure",
          schema: [
            "div",
            "parent",
            { class: "parent" },
            ["span", "child", { textContent: "Child" }],
          ],
          iterations: 500,
        },
        {
          name: "Layout classes",
          schema: [
            "div",
            "layout",
            {
              layout: { type: "grid", columns: 2 },
              layoutItem: { span: 1 },
            },
          ],
          iterations: 500,
        },
      ];

      console.log(`\n📋 Performance Summary:`);
      console.log(`======================`);

      const results = testCases.map((testCase) => {
        addonsPerformance.clearAll();

        const start = performance.now();
        for (let i = 0; i < testCase.iterations; i++) {
          const layout = addonsLayout(testCase.schema);
          layout.destroy();
        }
        const end = performance.now();
        const time = end - start;
        const avgTime = time / testCase.iterations;
        const opsPerSec = Math.round(testCase.iterations / (time / 1000));

        console.log(
          `  ${testCase.name.padEnd(16)}: ${avgTime.toFixed(3)}ms per operation`
        );

        return { ...testCase, time, avgTime, opsPerSec };
      });

      const totalOps = results.reduce((sum, r) => sum + r.iterations, 0);
      const totalTime = results.reduce((sum, r) => sum + r.time, 0);
      const overallOpsPerSec = Math.round(totalOps / (totalTime / 1000));

      console.log(
        `  ${"Total".padEnd(
          16
        )}: ${totalOps.toLocaleString()} operations in ${totalTime.toFixed(
          0
        )}ms`
      );
      console.log(
        `  ${"Overall".padEnd(16)}: ${(totalTime / totalOps).toFixed(
          3
        )}ms per operation`
      );

      expect(results.length).toBe(testCases.length);
      expect(overallOpsPerSec).toBeGreaterThan(1000); // Should be reasonably fast
    });
  });
});
