/**
 * Basic list component tests
 *
 * Tests the pipe composition list component that wraps the collection system
 */

import { describe, test, expect, beforeEach } from "bun:test";
import { JSDOM } from "jsdom";

// Mock DOM environment for testing
const dom = new JSDOM("<!DOCTYPE html><html><body></body></html>");
global.document = dom.window.document;
global.HTMLElement = dom.window.HTMLElement;
global.window = dom.window as any;
global.navigator = dom.window.navigator;
global.requestAnimationFrame = (cb: FrameRequestCallback) => {
  setTimeout(cb, 0);
  return 0;
};

// Mock scrollIntoView since JSDOM doesn't implement it
global.HTMLElement.prototype.scrollIntoView = function (
  options?: ScrollIntoViewOptions
) {
  // Mock implementation - just logs the call
  console.log(`Mock scrollIntoView called with options:`, options);
};

// Import our list component
import { createList, type ListItem } from "../../src/components/list";

// Test data interface
interface TestUser extends ListItem {
  id: string;
  name: string;
  email: string;
  age: number;
}

// Test data
const testUsers: TestUser[] = [
  { id: "1", name: "John Doe", email: "john@example.com", age: 30 },
  { id: "2", name: "Jane Smith", email: "jane@example.com", age: 25 },
  { id: "3", name: "Bob Johnson", email: "bob@example.com", age: 35 },
];

describe("List Component (Pipe Composition)", () => {
  let container: HTMLElement;

  beforeEach(() => {
    // Create a fresh container for each test
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  test("creates list with pipe composition pattern", () => {
    const list = createList<TestUser>({
      container,
      items: testUsers,
      className: "user-list",
      ariaLabel: "User List",
    });

    // mtrl creates a new element and mounts it to the container
    expect(list.element).not.toBe(container);
    expect(list.element.parentElement).toBe(container);
    expect(list.getSize()).toBe(3);
    expect(list.isEmpty()).toBe(false);
    expect(list.element.classList.contains("mtrl-list")).toBe(true);
    expect(list.element.getAttribute("aria-label")).toBe("User List");
    expect(list.element.getAttribute("role")).toBe("list");
  });

  test("applies list styling through composition", async () => {
    const list = createList<TestUser>({
      container,
      items: testUsers,
      listStyle: {
        itemSize: 60,
        gap: 8,
        padding: 16,
        striped: true,
        hoverable: true,
        bordered: false,
      },
    });

    // Wait for rendering
    await new Promise((resolve) => setTimeout(resolve, 10));

    // Check styling on the list element, not the container
    expect(list.element.style.getPropertyValue("--mtrl-list-gap")).toBe("8px");
    expect(list.element.style.getPropertyValue("--mtrl-list-padding")).toBe(
      "16px"
    );
    expect(list.element.style.getPropertyValue("--mtrl-list-item-height")).toBe(
      "60px"
    );
    expect(list.element.classList.contains("mtrl-list--striped")).toBe(true);
    expect(list.element.classList.contains("mtrl-list--hoverable")).toBe(true);
    expect(list.element.classList.contains("mtrl-list--bordered")).toBe(false);
  });

  test("enables selection through composition", async () => {
    const list = createList<TestUser>({
      container,
      items: testUsers,
      selection: {
        enabled: true,
        multiple: true,
      },
    });

    // Wait for rendering
    await new Promise((resolve) => setTimeout(resolve, 10));

    // Test selection methods exist
    expect(typeof list.selectItem).toBe("function");
    expect(typeof list.deselectItem).toBe("function");
    expect(typeof list.selectAll).toBe("function");
    expect(typeof list.deselectAll).toBe("function");
    expect(typeof list.getSelectedItems).toBe("function");
    expect(typeof list.getSelectedIds).toBe("function");

    // Test selection functionality
    list.selectItem("1");
    expect(list.getSelectedIds()).toContain("1");
    expect(list.getSelectedItems().length).toBe(1);

    list.selectItem("2");
    expect(list.getSelectedIds()).toHaveLength(2);

    list.deselectItem("1");
    expect(list.getSelectedIds()).toHaveLength(1);
    expect(list.getSelectedIds()).toContain("2");

    list.deselectAll();
    expect(list.getSelectedIds()).toHaveLength(0);
  });

  test("tracks performance through composition", async () => {
    const list = createList<TestUser>({
      container,
      items: testUsers,
      performance: {
        recycleElements: true,
        bufferSize: 50,
      },
    });

    // Wait for rendering
    await new Promise((resolve) => setTimeout(resolve, 10));

    // Test performance methods exist
    expect(typeof list.getMetrics).toBe("function");
    expect(typeof list.resetMetrics).toBe("function");

    const metrics = list.getMetrics();
    expect(typeof metrics.renderCount).toBe("number");
    expect(typeof metrics.scrollCount).toBe("number");
    expect(typeof metrics.averageRenderTime).toBe("number");
    expect(typeof metrics.averageScrollTime).toBe("number");
  });

  test("provides list API through composition", async () => {
    const list = createList<TestUser>({
      container,
      items: testUsers,
    });

    // Wait for rendering
    await new Promise((resolve) => setTimeout(resolve, 10));

    // Test API methods exist
    expect(typeof list.scrollToItem).toBe("function");
    expect(typeof list.scrollToIndex).toBe("function");
    expect(typeof list.scrollToPage).toBe("function");

    // Test scrolling doesn't crash
    list.scrollToItem("2");
    list.scrollToIndex(1);
  });

  test("maintains collection functionality", async () => {
    const list = createList<TestUser>({
      container,
      items: [testUsers[0]],
    });

    // Test collection methods still work
    expect(list.getSize()).toBe(1);

    const newUser: TestUser = {
      id: "4",
      name: "Alice Brown",
      email: "alice@example.com",
      age: 28,
    };
    await list.add(newUser);

    expect(list.getSize()).toBe(2);
    expect(list.getItem("4")?.name).toBe("Alice Brown");

    await list.remove("1");
    expect(list.getSize()).toBe(1);
    expect(list.getItem("1")).toBeUndefined();
  });

  test("console shows pipe composition pattern", () => {
    // Capture console logs
    const logs: string[] = [];
    const originalLog = console.log;
    console.log = (message: string) => {
      logs.push(message);
    };

    try {
      createList<TestUser>({
        container,
        items: testUsers,
        selection: { enabled: true },
        listStyle: { striped: true },
      });

      // Restore console
      console.log = originalLog;

      // Verify composition pattern logs
      expect(
        logs.some((log) =>
          log.includes("Creating list component (mtrl compose system)")
        )
      ).toBe(true);
      expect(
        logs.some((log) => log.includes("Adding collection capabilities"))
      ).toBe(true);
      expect(
        logs.some((log) => log.includes("Adding styling capabilities"))
      ).toBe(true);
      expect(
        logs.some((log) => log.includes("Adding selection capabilities"))
      ).toBe(true);
      expect(
        logs.some((log) => log.includes("Adding performance tracking"))
      ).toBe(true);
      expect(logs.some((log) => log.includes("Adding list API methods"))).toBe(
        true
      );
      expect(
        logs.some((log) => log.includes("created via mtrl compose system"))
      ).toBe(true);
    } finally {
      console.log = originalLog;
    }
  });
});
