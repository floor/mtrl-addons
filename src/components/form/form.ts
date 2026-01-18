// src/components/form/form.ts

/**
 * Form Component - Functional form builder with mtrl composition
 *
 * A form component that uses the mtrl-addons layout system to build
 * forms from schema definitions, with built-in data management,
 * validation, and submission handling.
 */

import type { FormConfig, FormComponent } from "./types";

// Import mtrl compose system
import { pipe } from "mtrl";
import { createBase, withElement } from "mtrl";
import { withEvents, withLifecycle } from "mtrl";

// Import form features
import {
  withLayout,
  withFields,
  withData,
  withController,
  withSubmit,
  withProtection,
  withAPI,
} from "./features";

// Import configuration
import { createBaseConfig, getElementConfig } from "./config";

/**
 * Creates a new Form component using functional composition
 *
 * @param {FormConfig} config - Form configuration options
 * @returns {FormComponent} A fully configured form component
 *
 * @example
 * ```typescript
 * import { createForm } from 'mtrl-addons'
 * import { createTextfield, createSwitch, createChips } from 'mtrl'
 *
 * const form = createForm({
 *   class: 'account-form',
 *   action: '/api/users/',
 *   layout: [
 *     ['section', { class: 'user-section' },
 *       ['div', { class: 'section-title', text: 'User' }],
 *       [createTextfield, 'info.username', { label: 'Username' }],
 *       [createChips, 'info.role', {
 *         label: 'Role',
 *         chips: [
 *           { text: 'registered', value: 'registered' },
 *           { text: 'admin', value: 'admin' },
 *           { text: 'premium', value: 'premium' }
 *         ]
 *       }],
 *       [createSwitch, 'info.enabled', { label: 'Enabled' }]
 *     ]
 *   ],
 *   on: {
 *     change: (data) => console.log('Form changed:', data),
 *     submit: (data) => console.log('Form submitted:', data)
 *   }
 * })
 *
 * // Append to DOM
 * document.body.appendChild(form.element)
 *
 * // Set data
 * form.setData({
 *   username: 'john_doe',
 *   role: 'admin',
 *   enabled: true
 * })
 *
 * // Get data
 * const data = form.getData()
 *
 * // Check if modified
 * if (form.isModified()) {
 *   await form.submit()
 * }
 * ```
 */
export const createForm = (config: FormConfig = {}): FormComponent => {
  try {
    // Process configuration with defaults
    const baseConfig = createBaseConfig(config);

    // Build the form through functional composition
    // Each function in the pipe adds specific capabilities
    const component = pipe(
      // 1. Foundation layer - Base component with config
      createBase,

      // 2. Event system - Adds on/off/emit methods
      withEvents(),

      // 3. DOM element - Creates the root container element
      withElement(getElementConfig(baseConfig)),

      // 4. Layout - Creates form element and processes layout schema
      withLayout(baseConfig),

      // 5. Fields - Extracts fields from layout and creates registry
      withFields(baseConfig),

      // 6. Data - Adds data management (get/set, change tracking)
      withData(baseConfig),

      // 7. Controller - Adds mode management (read/create/update)
      withController(baseConfig),

      // 8. Submit - Adds validation and submission handling
      withSubmit(baseConfig),

      // 9. Protection - Adds blocking overlay when form has unsaved changes
      withProtection(baseConfig),

      // 10. Lifecycle - Adds lifecycle management (destroy)
      withLifecycle(),

      // 11. API - Creates clean public API
      withAPI(baseConfig),
    )(baseConfig);

    // Append to container if provided
    if (config.container && component.element) {
      config.container.appendChild(component.element);
    }

    return component as FormComponent;
  } catch (error) {
    console.error("Form creation error:", error);
    throw new Error(`Failed to create form: ${(error as Error).message}`);
  }
};

export default createForm;
