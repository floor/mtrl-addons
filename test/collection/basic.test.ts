/**
 * Basic collection tests
 *
 * Tests the core functionality of the collection system
 * including creation, data operations, and template rendering.
 */

import { describe, test, expect, beforeEach } from "bun:test";
import { JSDOM } from "jsdom";

// Mock DOM environment for testing
const dom = new JSDOM("<!DOCTYPE html><html><body></body></html>");
global.document = dom.window.document;
global.HTMLElement = dom.window.HTMLElement;
global.requestAnimationFrame = (cb: FrameRequestCallback) => {
  setTimeout(cb, 0);
  return 0;
};

// Import our collection system
import {
  createCollection,
  type CollectionItem,
} from "../../src/core/collection";

// Test data interface
interface TestUser extends CollectionItem {
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

describe("Collection System", () => {
  let container: HTMLElement;

  beforeEach(() => {
    // Create a fresh container for each test
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  test("creates collection with basic configuration", () => {
    const collection = createCollection<TestUser>({
      container,
      items: testUsers,
      className: "user-list",
      ariaLabel: "User List",
    });

    expect(collection.element).toBe(container);
    expect(collection.getSize()).toBe(3);
    expect(collection.isEmpty()).toBe(false);
    expect(container.classList.contains("mtrl-collection")).toBe(true);
    expect(container.classList.contains("user-list")).toBe(true);
    expect(container.getAttribute("aria-label")).toBe("User List");
  });

  test("renders items with default template", async () => {
    const collection = createCollection<TestUser>({
      container,
      items: testUsers,
    });

    // Wait for rendering
    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(container.children.length).toBe(3);
    expect(container.children[0].textContent).toBe("1");
    expect(container.children[1].textContent).toBe("2");
    expect(container.children[2].textContent).toBe("3");
  });

  test("renders items with object template", async () => {
    const collection = createCollection<TestUser>({
      container,
      items: testUsers,
      template: {
        tag: "div",
        className: "user-item",
        children: [
          { tag: "div", className: "user-name", textContent: "{{name}}" },
          { tag: "div", className: "user-email", textContent: "{{email}}" },
        ],
      },
    });

    // Wait for rendering
    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(container.children.length).toBe(3);

    const firstUser = container.children[0] as HTMLElement;
    expect(firstUser.className).toBe("user-item");
    expect(firstUser.children.length).toBe(2);
    expect(firstUser.children[0].textContent).toBe("John Doe");
    expect(firstUser.children[1].textContent).toBe("john@example.com");
  });

  test("renders items with string template", async () => {
    const collection = createCollection<TestUser>({
      container,
      items: testUsers,
      template: "<div class='user'>{{name}} ({{email}})</div>",
    });

    // Wait for rendering
    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(container.children.length).toBe(3);
    expect(container.children[0].innerHTML).toBe(
      "<div class='user'>John Doe (john@example.com)</div>"
    );
  });

  test("adds new items", async () => {
    const collection = createCollection<TestUser>({
      container,
      items: [testUsers[0]],
    });

    expect(collection.getSize()).toBe(1);

    const newUser: TestUser = {
      id: "4",
      name: "Alice Brown",
      email: "alice@example.com",
      age: 28,
    };
    await collection.add(newUser);

    expect(collection.getSize()).toBe(2);
    const items = collection.getItems();
    expect(items.length).toBe(2);
    expect(items[1].name).toBe("Alice Brown");
  });

  test("updates existing items", async () => {
    const collection = createCollection<TestUser>({
      container,
      items: testUsers,
    });

    const updatedUser: TestUser = {
      id: "1",
      name: "John Smith",
      email: "johnsmith@example.com",
      age: 31,
    };

    await collection.update(updatedUser);

    const user = collection.getItem("1");
    expect(user?.name).toBe("John Smith");
    expect(user?.email).toBe("johnsmith@example.com");
  });

  test("removes items", async () => {
    const collection = createCollection<TestUser>({
      container,
      items: testUsers,
    });

    expect(collection.getSize()).toBe(3);

    await collection.remove("2");

    expect(collection.getSize()).toBe(2);
    expect(collection.getItem("2")).toBeUndefined();
    expect(collection.getItem("1")).toBeDefined();
    expect(collection.getItem("3")).toBeDefined();
  });

  test("clears all items", () => {
    const collection = createCollection<TestUser>({
      container,
      items: testUsers,
    });

    expect(collection.getSize()).toBe(3);

    collection.clear();

    expect(collection.getSize()).toBe(0);
    expect(collection.isEmpty()).toBe(true);
  });

  test("filters items with query", () => {
    const collection = createCollection<TestUser>({
      container,
      items: testUsers,
    });

    expect(collection.getSize()).toBe(3);

    // Filter users over 30
    collection.query((user) => user.age > 30);

    expect(collection.getSize()).toBe(1);
    expect(collection.getItems()[0].name).toBe("Bob Johnson");
  });

  test("sorts items", () => {
    const collection = createCollection<TestUser>({
      container,
      items: testUsers,
    });

    // Sort by age ascending
    collection.sort((a, b) => a.age - b.age);

    const items = collection.getItems();
    expect(items[0].name).toBe("Jane Smith"); // age 25
    expect(items[1].name).toBe("John Doe"); // age 30
    expect(items[2].name).toBe("Bob Johnson"); // age 35
  });

  test("validates items when adding", async () => {
    const collection = createCollection<TestUser>({
      container,
      items: [],
      validate: (user) => user.age >= 18,
    });

    const validUser: TestUser = {
      id: "1",
      name: "John Doe",
      email: "john@example.com",
      age: 30,
    };
    const invalidUser: TestUser = {
      id: "2",
      name: "Minor",
      email: "minor@example.com",
      age: 16,
    };

    await collection.add([validUser, invalidUser]);

    expect(collection.getSize()).toBe(1);
    expect(collection.getItems()[0].name).toBe("John Doe");
  });

  test("transforms items when adding", async () => {
    const collection = createCollection<TestUser>({
      container,
      items: [],
      transform: (user: any) => ({
        ...user,
        name: user.name.toUpperCase(),
      }),
    });

    const user: TestUser = {
      id: "1",
      name: "John Doe",
      email: "john@example.com",
      age: 30,
    };
    await collection.add(user);

    expect(collection.getItems()[0].name).toBe("JOHN DOE");
  });

  test("handles template changes", async () => {
    const collection = createCollection<TestUser>({
      container,
      items: [testUsers[0]],
    });

    // Change template
    collection.setTemplate({
      tag: "div",
      className: "new-template",
      textContent: "User: {{name}}",
    });

    // Wait for rendering
    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(container.children[0].textContent).toBe("User: John Doe");
    expect(container.children[0].className).toBe("new-template");
  });

  test("destroys collection properly", () => {
    const collection = createCollection<TestUser>({
      container,
      items: testUsers,
    });

    expect(container.children.length).toBeGreaterThan(0);

    collection.destroy();

    expect(container.children.length).toBe(0);
  });
});
