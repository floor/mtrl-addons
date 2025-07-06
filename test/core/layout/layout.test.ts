// test/core/layout/layout.test.ts
import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import { JSDOM } from "jsdom";

// Setup for DOM testing environment
let dom: JSDOM;
let window: Window;
let document: Document;
let originalGlobalDocument: any;
let originalGlobalWindow: any;

beforeAll(() => {
  // Create JSDOM instance
  dom = new JSDOM("<!DOCTYPE html><html><body></body></html>", {
    url: "http://localhost/",
    pretendToBeVisual: true,
    resources: "usable",
  });

  window = dom.window as any;
  document = window.document;

  // Store original globals
  originalGlobalDocument = global.document;
  originalGlobalWindow = global.window;

  // Set globals
  global.document = document;
  global.window = window as any;
  global.Element = (window as any).Element;
  global.HTMLElement = (window as any).HTMLElement;
  global.DocumentFragment = (window as any).DocumentFragment;

  // Add DOM APIs
  global.getComputedStyle = () => ({
    position: "static",
    getPropertyValue: () => "",
  });
});

afterAll(() => {
  // Restore globals
  global.document = originalGlobalDocument;
  global.window = originalGlobalWindow;
  window.close();
});

// Import after DOM setup
import {
  createLayout,
  layout,
  grid,
  row,
  stack,
  template,
  performance,
  type LayoutResult,
} from "../../../src/core/layout";

describe("Layout System", () => {
  test("should create a basic layout", () => {
    const result = createLayout(["div", { class: "test" }]);

    expect(result).toBeDefined();
    expect(result.element).toBeDefined();
    expect(result.get).toBeDefined();
    expect(result.getAll).toBeDefined();
    expect(result.destroy).toBeDefined();
  });

  test("should create a stack layout", () => {
    const result = stack({ gap: "2rem" });

    expect(result).toBeDefined();
    expect(result.element).toBeDefined();
  });

  test("should create a grid layout", () => {
    const result = grid(3, { gap: "1rem" });

    expect(result).toBeDefined();
    expect(result.element).toBeDefined();
  });

  test("should create a row layout", () => {
    const result = row({ gap: "1rem" });

    expect(result).toBeDefined();
    expect(result.element).toBeDefined();
  });

  test("should create a template layout", () => {
    const templateFn = (props: Record<string, any>) => [
      "div",
      { class: `template-${props.type}` },
    ];

    const result = template(templateFn, { type: "test" });

    expect(result).toBeDefined();
    expect(result.element).toBeDefined();
  });

  test("should provide performance utilities", () => {
    expect(performance.clearCache).toBeDefined();
    expect(performance.clearFragmentPool).toBeDefined();
    expect(performance.clearAll).toBeDefined();
    expect(performance.getStats).toBeDefined();

    // Should not throw
    performance.clearAll();
    const stats = performance.getStats();
    expect(stats).toBeDefined();
  });

  test("should handle array schema", () => {
    const result = createLayout([
      "div",
      "container",
      { class: "main" },
      ["span", "child", { textContent: "Hello" }],
    ]);

    expect(result).toBeDefined();
    expect(result.get("container")).toBeDefined();
    expect(result.get("child")).toBeDefined();
  });

  test("should handle object schema", () => {
    const result = createLayout({
      element: {
        creator: (opts: any) => {
          const div = document.createElement("div");
          if (opts.class) div.className = opts.class;
          return div;
        },
        options: { class: "root" },
        children: {
          child: {
            creator: (opts: any) => {
              const span = document.createElement("span");
              if (opts.textContent) span.textContent = opts.textContent;
              return span;
            },
            options: { textContent: "Hello" },
          },
        },
      },
    });

    expect(result).toBeDefined();
    expect(result.get("child")).toBeDefined();
  });

  test("should handle layout destruction", () => {
    const result = createLayout(["div", { class: "destroyable" }]);

    expect(result.element).toBeDefined();

    // Should not throw
    result.destroy();
  });

  test("should handle named components", () => {
    const result = createLayout([
      "div",
      "main",
      { class: "container" },
      ["span", "text", { textContent: "Content" }],
    ]);

    expect(result.get("main")).toBeDefined();
    expect(result.get("text")).toBeDefined();
    expect(result.get("nonexistent")).toBeNull();

    const all = result.getAll();
    expect(all.main).toBeDefined();
    expect(all.text).toBeDefined();
  });

  test("should handle layout configurations", () => {
    const result = createLayout([
      "div",
      {
        layout: {
          type: "grid",
          columns: 3,
          gap: "1rem",
          align: "center",
        },
        layoutItem: {
          span: 2,
          width: 6,
        },
      },
    ]);

    expect(result).toBeDefined();
    expect(result.element).toBeDefined();
  });
});
