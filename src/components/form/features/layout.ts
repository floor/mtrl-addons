// src/components/form/features/layout.ts

/**
 * Layout feature for Form component
 * Builds the form structure from a layout schema using mtrl-addons layout system
 */

import { createLayout } from "../../../core/layout";
import type { FormConfig, BaseFormComponent } from "../types";
import { FORM_DEFAULTS } from "../constants";

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

    return {
      ...component,
      form,
      ui,
      layoutResult,
    };
  };
};

export default withLayout;
