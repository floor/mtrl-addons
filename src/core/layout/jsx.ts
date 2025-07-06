/**
 * @module core/layout/jsx
 * @description JSX-like syntax support for layout creation
 * Provides a simple h() function for creating elements without React dependency
 */

import type { LayoutResult } from "./types";
import { createLayout } from "./schema";

/**
 * Fragment symbol for JSX fragments
 */
export const Fragment = Symbol("Fragment");

/**
 * JSX-like hyperscript function
 * Creates elements in a React-like syntax without React dependency
 *
 * @param tag - HTML tag name, component function, or Fragment
 * @param props - Element properties and attributes
 * @param children - Child elements
 * @returns DOM element or component
 */
export function h(
  tag: string | Function | typeof Fragment,
  props?: Record<string, any> | null,
  ...children: any[]
): any {
  // Handle Fragment
  if (tag === Fragment) {
    const fragment = document.createDocumentFragment();
    children.forEach((child) => {
      if (child != null) {
        const element =
          typeof child === "string" ? document.createTextNode(child) : child;
        fragment.appendChild(element);
      }
    });
    return fragment;
  }

  // Handle string tags (HTML elements)
  if (typeof tag === "string") {
    const element = document.createElement(tag);

    // Apply props
    if (props) {
      for (const [key, value] of Object.entries(props)) {
        if (key === "className" || key === "class") {
          element.className = value;
        } else if (key.startsWith("on") && typeof value === "function") {
          // Event handler
          const eventName = key.slice(2).toLowerCase();
          element.addEventListener(eventName, value);
        } else if (key === "style" && typeof value === "object") {
          // Style object
          Object.assign(element.style, value);
        } else if (key === "dangerouslySetInnerHTML") {
          // HTML content
          element.innerHTML = value.__html || "";
        } else if (value != null) {
          // Regular attribute
          element.setAttribute(key, value.toString());
        }
      }
    }

    // Append children
    children.forEach((child) => {
      if (child != null) {
        if (typeof child === "string") {
          element.appendChild(document.createTextNode(child));
        } else if (child instanceof Node) {
          element.appendChild(child);
        } else {
          element.appendChild(document.createTextNode(String(child)));
        }
      }
    });

    return element;
  }

  // Handle component functions
  if (typeof tag === "function") {
    const allProps = props || {};
    if (children.length > 0) {
      allProps.children = children;
    }
    return tag(allProps);
  }

  // Fallback to div
  return h("div", props, ...children);
}

/**
 * Creates a layout using JSX-like syntax
 * Provides a bridge between JSX and the layout system
 *
 * @param jsxElement - JSX element created with h()
 * @param parentElement - Parent element to attach to
 * @returns Layout result
 */
export function createJsxLayout(
  jsxElement: any,
  parentElement?: any
): LayoutResult {
  // Convert JSX element to layout schema
  const schema = jsxElement;

  // Create layout using the standard createLayout function
  return createLayout(schema, parentElement);
}

/**
 * Utility to create a simple component from a function
 * Useful for creating reusable JSX components
 *
 * @param fn - Component function
 * @returns Component that can be used in JSX
 */
export function component(fn: (props: Record<string, any>) => any): Function {
  return function (props: Record<string, any>): any {
    return fn(props || {});
  };
}

/**
 * Utility to render multiple JSX elements
 * Useful for creating lists or collections
 *
 * @param elements - Array of JSX elements
 * @param parentElement - Parent element to attach to
 * @returns Array of layout results
 */
export function renderElements(
  elements: any[],
  parentElement?: any
): LayoutResult[] {
  return elements.map((element) => createJsxLayout(element, parentElement));
}

/**
 * Common JSX element creators for convenience
 */
export const jsx = {
  div: (props?: Record<string, any>, ...children: any[]) =>
    h("div", props, ...children),
  span: (props?: Record<string, any>, ...children: any[]) =>
    h("span", props, ...children),
  p: (props?: Record<string, any>, ...children: any[]) =>
    h("p", props, ...children),
  button: (props?: Record<string, any>, ...children: any[]) =>
    h("button", props, ...children),
  input: (props?: Record<string, any>) => h("input", props),
  img: (props?: Record<string, any>) => h("img", props),
  a: (props?: Record<string, any>, ...children: any[]) =>
    h("a", props, ...children),
  ul: (props?: Record<string, any>, ...children: any[]) =>
    h("ul", props, ...children),
  li: (props?: Record<string, any>, ...children: any[]) =>
    h("li", props, ...children),
  section: (props?: Record<string, any>, ...children: any[]) =>
    h("section", props, ...children),
  header: (props?: Record<string, any>, ...children: any[]) =>
    h("header", props, ...children),
  footer: (props?: Record<string, any>, ...children: any[]) =>
    h("footer", props, ...children),
  main: (props?: Record<string, any>, ...children: any[]) =>
    h("main", props, ...children),
  article: (props?: Record<string, any>, ...children: any[]) =>
    h("article", props, ...children),
};
