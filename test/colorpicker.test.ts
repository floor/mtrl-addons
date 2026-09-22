import { beforeAll, afterAll, describe, expect, test } from "bun:test";
import { JSDOM } from "jsdom";
import createColorPicker from "../src/components/colorpicker/colorpicker";

let dom: JSDOM;
const originalGlobals = new Map<string, PropertyDescriptor | undefined>();

beforeAll(() => {
  dom = new JSDOM("<!doctype html><html><body></body></html>", {
    url: "http://localhost/",
    pretendToBeVisual: true,
  });
  const globals = {
    window: dom.window,
    document: dom.window.document,
    Element: dom.window.Element,
    HTMLElement: dom.window.HTMLElement,
    HTMLInputElement: dom.window.HTMLInputElement,
    MutationObserver: dom.window.MutationObserver,
    getComputedStyle: dom.window.getComputedStyle.bind(dom.window),
    requestAnimationFrame: dom.window.requestAnimationFrame.bind(dom.window),
    cancelAnimationFrame: dom.window.cancelAnimationFrame.bind(dom.window),
  };
  for (const [name, value] of Object.entries(globals)) {
    originalGlobals.set(name, Object.getOwnPropertyDescriptor(globalThis, name));
    Object.defineProperty(globalThis, name, { value, writable: true, configurable: true });
  }
});

afterAll(() => {
  dom.window.close();
  for (const [name, descriptor] of originalGlobals) {
    if (descriptor) Object.defineProperty(globalThis, name, descriptor);
    else Reflect.deleteProperty(globalThis, name);
  }
});

describe("ColorPicker element configuration", () => {
  for (const variant of ["inline", "dropdown", "dialog"] as const) {
    for (const [size, width] of [["s", 200], ["m", 280], ["l", 360]] as const) {
      test(`${variant} ${size} applies its width and supports color changes`, () => {
        const trigger = document.createElement("button");
        document.body.appendChild(trigger);
        const picker = createColorPicker({ variant, size, trigger, value: "#4286a9", showInput: false });
        try {
          expect(picker.element.style.width).toBe(`${width}px`);
          expect(picker.getValue()).toBe("#4286a9");
          picker.setValue("#123456");
          expect(picker.getValue()).toBe("#123456");
          if (variant !== "inline") {
            picker.open();
            expect(picker.isOpen()).toBe(true);
            picker.close();
            expect(picker.isOpen()).toBe(false);
          }
        } finally {
          picker.destroy();
          trigger.remove();
        }
      });
    }
  }
});
