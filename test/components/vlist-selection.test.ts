// test/components/vlist-selection.test.ts

import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { createVList } from "../../src/components/vlist";
import type { VListComponent } from "../../src/components/vlist/types";

describe("VList Selection", () => {
  let container: HTMLElement;
  let vlist: VListComponent<any>;

  beforeEach(() => {
    // Create container
    container = document.createElement("div");
    container.style.height = "400px";
    container.style.width = "300px";
    document.body.appendChild(container);
  });

  afterEach(() => {
    // Cleanup
    if (vlist?.destroy) {
      vlist.destroy();
    }
    document.body.removeChild(container);
  });

  test("should initialize without selection when not enabled", () => {
    const items = Array.from({ length: 10 }, (_, i) => ({
      id: `item-${i}`,
      name: `Item ${i}`,
    }));

    vlist = createVList({
      container,
      items,
      template: (item) => {
        const div = document.createElement("div");
        div.className = "list-item";
        div.textContent = item.name;
        return div;
      },
    });

    // Selection methods should not be available
    expect(vlist.selectItems).toBeUndefined();
    expect(vlist.getSelectedItems).toBeUndefined();
  });

  test("should initialize with selection when enabled", () => {
    const items = Array.from({ length: 10 }, (_, i) => ({
      id: `item-${i}`,
      name: `Item ${i}`,
    }));

    vlist = createVList({
      container,
      items,
      selection: {
        enabled: true,
        mode: "single",
      },
      template: (item) => {
        const div = document.createElement("div");
        div.className = "list-item";
        div.textContent = item.name;
        return div;
      },
    });

    // Selection methods should be available
    expect(vlist.selectItems).toBeDefined();
    expect(vlist.getSelectedItems).toBeDefined();
    expect(vlist.clearSelection).toBeDefined();
  });

  test("should handle single selection mode", () => {
    const items = Array.from({ length: 10 }, (_, i) => ({
      id: `item-${i}`,
      name: `Item ${i}`,
    }));

    vlist = createVList({
      container,
      items,
      selection: {
        enabled: true,
        mode: "single",
      },
      template: (item) => {
        const div = document.createElement("div");
        div.className = "list-item";
        div.textContent = item.name;
        return div;
      },
    });

    // Select first item
    vlist.selectItems([0]);
    expect(vlist.getSelectedIndices()).toEqual([0]);
    expect(vlist.getSelectedItems()).toEqual([items[0]]);

    // Select another item - should replace selection
    vlist.selectItems([2]);
    expect(vlist.getSelectedIndices()).toEqual([2]);
    expect(vlist.getSelectedItems()).toEqual([items[2]]);
  });

  test("should handle multiple selection mode", () => {
    const items = Array.from({ length: 10 }, (_, i) => ({
      id: `item-${i}`,
      name: `Item ${i}`,
    }));

    vlist = createVList({
      container,
      items,
      selection: {
        enabled: true,
        mode: "multiple",
      },
      template: (item) => {
        const div = document.createElement("div");
        div.className = "list-item";
        div.textContent = item.name;
        return div;
      },
    });

    // Select multiple items
    vlist.selectItems([0, 2, 4]);
    expect(vlist.getSelectedIndices().sort()).toEqual([0, 2, 4]);

    // Deselect one item
    vlist.deselectItems([2]);
    expect(vlist.getSelectedIndices().sort()).toEqual([0, 4]);

    // Clear selection
    vlist.clearSelection();
    expect(vlist.getSelectedIndices()).toEqual([]);
  });

  test("should handle click selection", async () => {
    const items = Array.from({ length: 10 }, (_, i) => ({
      id: `item-${i}`,
      name: `Item ${i}`,
    }));

    vlist = createVList({
      container,
      items,
      selection: {
        enabled: true,
        mode: "single",
      },
      template: (item) => {
        const div = document.createElement("div");
        div.className = "list-item";
        div.textContent = item.name;
        return div;
      },
    });

    // Wait for render
    await new Promise((resolve) => setTimeout(resolve, 50));

    // Find first item element
    const firstItem = container.querySelector(
      '[data-index="0"]'
    ) as HTMLElement;
    expect(firstItem).toBeTruthy();

    // Click on first item
    firstItem.click();

    // Check selection
    expect(vlist.getSelectedIndices()).toEqual([0]);
    expect(firstItem.classList.contains("mtrl-list-item--selected")).toBe(true);
  });

  test("should emit selection events", async () => {
    const items = Array.from({ length: 10 }, (_, i) => ({
      id: `item-${i}`,
      name: `Item ${i}`,
    }));

    let selectionChangeEvent: any = null;

    vlist = createVList({
      container,
      items,
      selection: {
        enabled: true,
        mode: "single",
        onSelectionChange: (selectedItems, selectedIndices) => {
          selectionChangeEvent = { selectedItems, selectedIndices };
        },
      },
      template: (item) => {
        const div = document.createElement("div");
        div.className = "list-item";
        div.textContent = item.name;
        return div;
      },
    });

    // Select an item
    vlist.selectItems([3]);

    // Check event was fired
    expect(selectionChangeEvent).toBeTruthy();
    expect(selectionChangeEvent.selectedIndices).toEqual([3]);
    expect(selectionChangeEvent.selectedItems).toEqual([items[3]]);
  });

  test("should handle initial selection", () => {
    const items = Array.from({ length: 10 }, (_, i) => ({
      id: `item-${i}`,
      name: `Item ${i}`,
    }));

    vlist = createVList({
      container,
      items,
      selection: {
        enabled: true,
        mode: "multiple",
        selectedIndices: [1, 3, 5],
      },
      template: (item) => {
        const div = document.createElement("div");
        div.className = "list-item";
        div.textContent = item.name;
        return div;
      },
    });

    // Check initial selection
    expect(vlist.getSelectedIndices().sort()).toEqual([1, 3, 5]);
  });
});
