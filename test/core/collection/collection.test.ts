// test/core/collection/collection.test.ts - Core Collection Tests
import {
  describe,
  test,
  expect,
  mock,
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

  // Add missing DOM APIs
  global.getComputedStyle =
    (window as any).getComputedStyle ||
    (() => ({
      position: "static",
      getPropertyValue: () => "",
    }));

  // Add IntersectionObserver mock
  if (!(window as any).IntersectionObserver) {
    const IntersectionObserverMock = class {
      constructor() {}
      observe() {}
      disconnect() {}
      unobserve() {}
    };
    (window as any).IntersectionObserver = IntersectionObserverMock as any;
    (global as any).IntersectionObserver = IntersectionObserverMock as any;
  }

  // Add ResizeObserver mock
  if (!(window as any).ResizeObserver) {
    const ResizeObserverMock = class {
      constructor() {}
      observe() {}
      disconnect() {}
      unobserve() {}
    };
    (window as any).ResizeObserver = ResizeObserverMock as any;
    (global as any).ResizeObserver = ResizeObserverMock as any;
  }
});

afterAll(() => {
  // Restore original globals
  global.document = originalGlobalDocument;
  global.window = originalGlobalWindow;

  // Clean up jsdom
  window.close();
});

// Import the collection after DOM setup
// TODO: Implement these imports as we build the system
// import { createCollection, pipe, withEvents, withLifecycle } from "../../../src/core/collection";

// Test data interfaces
interface TestItem {
  id: string;
  name: string;
  email: string;
  age: number;
  active: boolean;
}

interface TestProduct {
  id: string;
  title: string;
  price: number;
  category: string;
}

// Helper functions for creating test data
function createTestItem(
  id: string,
  overrides: Partial<TestItem> = {}
): TestItem {
  return {
    id,
    name: `User ${id}`,
    email: `user${id}@example.com`,
    age: 20 + parseInt(id),
    active: true,
    ...overrides,
  };
}

function createTestProduct(
  id: string,
  overrides: Partial<TestProduct> = {}
): TestProduct {
  return {
    id,
    title: `Product ${id}`,
    price: parseFloat(id) * 10,
    category: "electronics",
    ...overrides,
  };
}

// Mock template engine
const mockTemplateEngine = {
  render: mock((template: any, data: any) => {
    const element = document.createElement("div");
    element.className = "test-item";
    element.setAttribute("data-id", data.id);
    element.innerHTML = `
      <div class="item-name">${data.name}</div>
      <div class="item-email">${data.email}</div>
    `;
    return element;
  }),

  compile: mock((template: any) => {
    return (data: any) => mockTemplateEngine.render(template, data);
  }),
};

// Mock adapter for data loading
const mockAdapter = {
  read: mock(async (params: any) => {
    const page = params.page || 1;
    const limit = params.limit || params.per_page || 20;
    const startId = (page - 1) * limit + 1;

    const items: TestItem[] = [];
    for (let i = 0; i < limit; i++) {
      const id = startId + i;
      if (id <= 100) {
        items.push(createTestItem(id.toString()));
      }
    }

    return {
      items,
      meta: {
        total: 100,
        page,
        hasNext: page * limit < 100,
        nextCursor: items.length > 0 ? items[items.length - 1].id : null,
      },
    };
  }),
};

describe("Collection System", () => {
  let container: HTMLElement;

  beforeEach(() => {
    // Create fresh container for each test
    container = document.createElement("div");
    container.style.height = "400px";
    container.style.overflow = "auto";
    document.body.appendChild(container);

    // Reset mocks
    mockTemplateEngine.render.mockClear();
    mockTemplateEngine.compile.mockClear();
    mockAdapter.read.mockClear();
  });

  afterEach(() => {
    // Cleanup container
    if (container && container.parentNode) {
      container.parentNode.removeChild(container);
    }
  });

  describe("Basic Infrastructure", () => {
    test("DOM environment is properly set up", () => {
      expect(document).toBeDefined();
      expect(document.createElement).toBeDefined();
      expect(global.IntersectionObserver).toBeDefined();
      expect(global.ResizeObserver).toBeDefined();
    });

    test("test container is created correctly", () => {
      expect(container).toBeDefined();
      expect(container.style.height).toBe("400px");
      expect(container.style.overflow).toBe("auto");
      expect(container.parentNode).toBe(document.body);
    });

    test("test data helpers work correctly", () => {
      const item = createTestItem("123");
      expect(item.id).toBe("123");
      expect(item.name).toBe("User 123");
      expect(item.email).toBe("user123@example.com");
      expect(item.age).toBe(143);
      expect(item.active).toBe(true);

      const customItem = createTestItem("456", { name: "Custom User" });
      expect(customItem.name).toBe("Custom User");
      expect(customItem.id).toBe("456");
    });

    test("mock template engine renders correctly", () => {
      const template = { tag: "div", text: "{{name}}" };
      const data = { id: "1", name: "John Doe", email: "john@example.com" };

      const element = mockTemplateEngine.render(template, data);

      expect(element.tagName).toBe("DIV");
      expect(element.className).toBe("test-item");
      expect(element.getAttribute("data-id")).toBe("1");
      expect(element.querySelector(".item-name")?.textContent).toBe("John Doe");
    });

    test("mock adapter generates test data correctly", async () => {
      const result = await mockAdapter.read({ page: 1, per_page: 5 });

      expect(result.items).toHaveLength(5);
      expect(result.meta.total).toBe(100);
      expect(result.meta.page).toBe(1);
      expect(result.meta.hasNext).toBe(true);

      // Check first item
      expect(result.items[0].id).toBe("1");
      expect(result.items[0].name).toBe("User 1");
    });
  });

  describe("Collection Core (Placeholder)", () => {
    test("placeholder for collection creation", () => {
      // TODO: Implement when createCollection is available
      // const collection = createCollection({ items: [] });
      // expect(collection).toBeDefined();

      // Placeholder assertion
      expect(true).toBe(true);
    });

    test("placeholder for functional composition", () => {
      // TODO: Implement when pipe and features are available
      // const collection = pipe(
      //   createCollection(config),
      //   withEvents(),
      //   withLifecycle()
      // );
      // expect(collection).toBeDefined();

      // Placeholder assertion
      expect(true).toBe(true);
    });
  });

  describe("Template Engine Integration (Placeholder)", () => {
    test("placeholder for template compilation", () => {
      // TODO: Implement when template engine is available
      // const engine = createTemplateEngine('object');
      // const template = { tag: 'div', text: '{{name}}' };
      // const compiled = engine.compile(template);
      // expect(compiled).toBeDefined();

      // Test mock for now
      const compiled = mockTemplateEngine.compile({
        tag: "div",
        text: "{{name}}",
      });
      expect(compiled).toBeDefined();
      expect(mockTemplateEngine.compile).toHaveBeenCalled();
    });

    test("placeholder for element recycling", () => {
      // TODO: Implement when recycling pool is available
      // const pool = createRecyclingPool({ maxSize: 10 });
      // const element = pool.getElement();
      // expect(element).toBeDefined();

      // Placeholder assertion
      expect(true).toBe(true);
    });
  });

  describe("Performance Testing Framework", () => {
    test("measures render time accurately", async () => {
      const start = performance.now();

      // Simulate some work
      await new Promise((resolve) => setTimeout(resolve, 10));

      const end = performance.now();
      const duration = end - start;

      expect(duration).toBeGreaterThan(5);
      expect(duration).toBeLessThan(50);
    });

    test("creates large datasets for performance testing", () => {
      const items = Array.from({ length: 1000 }, (_, i) =>
        createTestItem(i.toString())
      );

      expect(items).toHaveLength(1000);
      expect(items[0].id).toBe("0");
      expect(items[999].id).toBe("999");
    });

    test("simulates scroll events correctly", () => {
      let scrollEventFired = false;

      container.addEventListener("scroll", () => {
        scrollEventFired = true;
      });

      container.scrollTop = 100;
      const scrollEvent = new (window as any).Event("scroll", {
        bubbles: true,
      });
      container.dispatchEvent(scrollEvent);

      expect(scrollEventFired).toBe(true);
      expect(container.scrollTop).toBe(100);
    });
  });

  describe("Memory Management Testing", () => {
    test("cleans up event listeners", () => {
      const listener = mock(() => {});

      container.addEventListener("scroll", listener);

      // Simulate cleanup
      container.removeEventListener("scroll", listener);

      // Fire event - should not call listener
      const scrollEvent = new (window as any).Event("scroll", {
        bubbles: true,
      });
      container.dispatchEvent(scrollEvent);

      expect(listener).not.toHaveBeenCalled();
    });

    test("handles rapid element creation/destruction", () => {
      const elements: HTMLElement[] = [];

      // Create many elements
      for (let i = 0; i < 100; i++) {
        const element = document.createElement("div");
        element.textContent = `Item ${i}`;
        elements.push(element);
      }

      expect(elements).toHaveLength(100);

      // Clean up
      elements.forEach((element) => {
        element.remove();
      });

      expect(elements[0].isConnected).toBe(false);
    });
  });
});

// Export test utilities for use in other test files
export { createTestItem, createTestProduct, mockTemplateEngine, mockAdapter };
