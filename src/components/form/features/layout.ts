// src/components/form/features/layout.ts

/**
 * Layout feature for Form component
 * Builds the form structure from a layout schema using mtrl-addons layout system
 */

import { createLayout } from "../../../core/layout";
import type { FormConfig, BaseFormComponent } from "../types";
import { FORM_DEFAULTS } from "../constants";

// Scroll threshold in pixels
const SCROLLED_THRESHOLD = 1;

// CSS class names
const SCROLLED_CLASS = "mtrl-form--scrolled";

/**
 * Creates the form element
 */
const createFormElement = (config: FormConfig): HTMLFormElement => {
  const form = document.createElement("form");

  if (config.method) {
    form.setAttribute("method", config.method);
  }

  if (config.action) {
    form.setAttribute("action", config.action);
  }

  if (config.autocomplete) {
    form.setAttribute("autocomplete", config.autocomplete);
  }

  // Prevent default form submission - we handle it programmatically
  form.addEventListener("submit", (e) => {
    e.preventDefault();
  });

  return form;
};

/**
 * Processes layout schema and extracts named components
 */
const processLayoutSchema = (
  schema: unknown[],
  form: HTMLFormElement,
  config: FormConfig,
): { ui: Record<string, unknown>; layoutResult: unknown } => {
  if (!schema || !Array.isArray(schema) || schema.length === 0) {
    return { ui: {}, layoutResult: null };
  }

  // Use mtrl-addons createLayout to process the schema
  const layoutResult = createLayout(schema, form, {});

  // Extract named components from layout result
  const ui: Record<string, unknown> = {};

  if (layoutResult && typeof layoutResult === "object") {
    // The layout result contains component references
    const result = layoutResult as { component?: Record<string, unknown> };
    if (result.component) {
      Object.assign(ui, result.component);
    }
  }

  return { ui, layoutResult };
};

/**
 * Sets up scroll detection on body elements to toggle --scrolled class on form container
 */
const setupScrollIndicator = (
  form: HTMLFormElement,
  formContainer: HTMLElement,
): (() => void) => {
  const cleanupFns: Array<() => void> = [];

  // Find body element to calculate shadow position
  const bodyElement = form.querySelector<HTMLElement>(".mtrl-body");
  if (bodyElement) {
    // Set CSS variable for shadow positioning at top of body
    const updateBodyTop = () => {
      const bodyTop = bodyElement.offsetTop;
      formContainer.style.setProperty("--mtrl-form-body-top", `${bodyTop}px`);
    };
    updateBodyTop();

    // Update on resize
    const resizeObserver = new ResizeObserver(updateBodyTop);
    resizeObserver.observe(form);

    cleanupFns.push(() => {
      resizeObserver.disconnect();
      formContainer.style.removeProperty("--mtrl-form-body-top");
    });
  }

  // Find body elements (mtrl-body class added by layout system)
  const bodyElements = form.querySelectorAll<HTMLElement>(".mtrl-body");

  bodyElements.forEach((bodyElement) => {
    let isScrolled = false;

    const handleScroll = () => {
      const shouldBeScrolled = bodyElement.scrollTop > SCROLLED_THRESHOLD;
      if (shouldBeScrolled !== isScrolled) {
        isScrolled = shouldBeScrolled;
        formContainer.classList.toggle(SCROLLED_CLASS, shouldBeScrolled);
      }
    };

    // Initial check
    handleScroll();

    // Listen for scroll events
    bodyElement.addEventListener("scroll", handleScroll, { passive: true });

    cleanupFns.push(() => {
      bodyElement.removeEventListener("scroll", handleScroll);
      formContainer.classList.remove(SCROLLED_CLASS);
    });
  });

  // Return cleanup function
  return () => {
    cleanupFns.forEach((fn) => fn());
  };
};

/**
 * withLayout feature
 * Adds form element creation and layout processing
 */
export const withLayout = (config: FormConfig) => {
  return <T extends BaseFormComponent>(
    component: T,
  ): T & {
    form: HTMLFormElement;
    ui: Record<string, unknown>;
    layoutResult: unknown;
    _cleanupScrollIndicator?: () => void;
  } => {
    // Create the form element
    const form = createFormElement(config);

    // Append form to component's root element
    if (component.element) {
      component.element.appendChild(form);
    }

    // Process layout schema if provided
    const { ui, layoutResult } = config.layout
      ? processLayoutSchema(config.layout, form, config)
      : { ui: {}, layoutResult: null };

    // Setup scroll indicator on body elements
    const cleanupScrollIndicator = setupScrollIndicator(
      form,
      component.element,
    );

    return {
      ...component,
      form,
      ui,
      layoutResult,
      _cleanupScrollIndicator: cleanupScrollIndicator,
    };
  };
};

export default withLayout;
