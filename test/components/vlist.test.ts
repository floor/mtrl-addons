// test/components/vlist.test.ts

import { describe, it, expect, beforeEach } from "bun:test";
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

// Import VList after DOM setup
import { createVList } from "../../src/components/vlist";

describe("VList Component", () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  it("should create a VList component", () => {
    const vlist = createVList({
      container,
      items: ["Item 1", "Item 2", "Item 3"],
      template: (item) => `<div>${item}</div>`,
    });

    expect(vlist).toBeDefined();
    expect(vlist.element).toBeDefined();
    expect(vlist.element.tagName).toBe("DIV");
    expect(vlist.element.className).toContain("mtrl-vlist");
  });

  it("should have viewport functionality", () => {
    const vlist = createVList({
      container,
      items: Array.from({ length: 100 }, (_, i) => `Item ${i}`),
    });

    expect(vlist.viewport).toBeDefined();
    expect(typeof vlist.viewport.scrollToIndex).toBe("function");
    expect(typeof vlist.viewport.getVisibleRange).toBe("function");
  });

  it("should have public API methods", () => {
    const vlist = createVList({ container });

    expect(typeof vlist.setItems).toBe("function");
    expect(typeof vlist.getItems).toBe("function");
    expect(typeof vlist.scrollToIndex).toBe("function");
    expect(typeof vlist.scrollToTop).toBe("function");
    expect(typeof vlist.scrollToBottom).toBe("function");
    expect(typeof vlist.getState).toBe("function");
    expect(typeof vlist.destroy).toBe("function");
  });
});
