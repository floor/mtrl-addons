// src/components/form/features/api.ts

/**
 * API feature for Form component
 * Provides a clean, unified public API for the form
 * Also wires up control button click handlers (submit/cancel)
 */

import type {
  FormConfig,
  BaseFormComponent,
  FormComponent,
  FormData,
  DataState,
  FormState,
  FormField,
  FormFieldRegistry,
  FormValidationResult,
  FormSubmitOptions,
  FieldValue,
} from "../types";
import { FORM_EVENTS } from "../constants";

/**
 * Wires up click handlers for control buttons (submit, cancel)
 */
const wireControlButtons = (
  controls: Map<string, FormField>,
  api: FormComponent,
  config: FormConfig,
): void => {
  // Wire submit button
  const submitButton = controls.get("submit");
  if (submitButton?.element) {
    submitButton.element.addEventListener("click", async () => {
      if (config.onSubmit) {
        // Use custom submit handler
        // Note: We do NOT auto-disable controls here - the custom handler
        // is responsible for managing control state (e.g., it may open a dialog
        // for async operations like file uploads)
        try {
          const data = api.getData();
          await config.onSubmit(data, api);
        } catch (error) {
          console.error("Form submit error:", error);
        }
      } else {
        // Use default form submit (handles disabling internally)
        await api.submit();
      }
    });
  }

  // Wire cancel button
  const cancelButton = controls.get("cancel");
  if (cancelButton?.element) {
    cancelButton.element.addEventListener("click", () => {
      if (config.onCancel) {
        // Use custom cancel handler
        config.onCancel(api);
      } else {
        // Default: reset form to initial state
        // Use force=true to bypass protection since this is an intentional user action
        api.reset(true);
      }
      // Clear any validation errors (visual state on fields)
      api.clearErrors();
      // After cancel, disable controls (form is now pristine)
      api.disableControls();
    });
  }
};

/**
 * Extended component interface before API is applied
 */
interface EnhancedFormComponent extends BaseFormComponent {
  form: HTMLFormElement;
  ui: Record<string, unknown>;
  fields: FormFieldRegistry;
  files: FormFieldRegistry;
  state: FormState;
  controls: Map<string, FormField>;

  // Data methods
  getData: () => FormData;
  setData: (data: FormData, silent?: boolean) => void;
  getFieldValue: (name: string) => FieldValue;
  setFieldValue: (name: string, value: FieldValue, silent?: boolean) => void;
  isModified: () => boolean;
  getModifiedData: () => FormData;
  snapshot: () => void;
  reset: (force?: boolean) => boolean;
  clear: (force?: boolean) => boolean;

  // Field methods
  getField: (name: string) => FormField | undefined;
  getFieldNames: () => string[];
  hasField: (name: string) => boolean;

  // Controller methods
  getDataState: () => DataState;
  enableControls: () => void;
  disableControls: () => void;
  enableFields: () => void;
  disableFields: () => void;

  // Submit/Validation methods
  validate: () => FormValidationResult;
  validateField: (fieldName: string) => string | undefined;
  submit: (options?: FormSubmitOptions) => Promise<unknown>;
  setValidationRules: (rules: import("../types").FormValidationRule[]) => void;
  clearErrors: () => void;
  clearFieldError: (field: string) => void;
  setFieldError: (field: string, error: string) => void;
  getFieldError: (field: string) => string | undefined;

  // Event methods
  on?: (event: string, handler: Function) => void;
  off?: (event: string, handler: Function) => void;
  emit?: (event: string, data?: unknown) => void;

  // Lifecycle
  lifecycle?: {
    destroy: () => void;
  };
}

/**
 * withAPI feature
 * Creates a clean public API for the form component
 */
export const withAPI = (config: FormConfig) => {
  return (component: EnhancedFormComponent): FormComponent => {
    // Register event handlers from config
    if (config.on && component.on) {
      for (const [event, handler] of Object.entries(config.on)) {
        if (typeof handler === "function") {
          component.on(event, handler);
        }
      }
    }

    // Create the public API
    const api: FormComponent = {
      // Core properties
      element: component.element,
      form: component.form,
      ui: component.ui,
      fields: component.fields,
      state: component.state,

      // ==========================================
      // Data API
      // ==========================================

      /**
       * Get all form data as a key-value object
       */
      getData(): FormData {
        return component.getData();
      },

      /**
       * Set form data from a key-value object
       * @param data - Data to set
       * @param silent - If true, don't emit change events
       */
      setData(data: FormData, silent?: boolean): FormComponent {
        component.setData(data, silent);
        return api;
      },

      /**
       * Get a specific field's value
       * @param name - Field name
       */
      getFieldValue(name: string): FieldValue {
        return component.getFieldValue(name);
      },

      /**
       * Set a specific field's value
       * @param name - Field name
       * @param value - Value to set
       * @param silent - If true, don't emit change events
       */
      setFieldValue(
        name: string,
        value: FieldValue,
        silent?: boolean,
      ): FormComponent {
        component.setFieldValue(name, value, silent);
        return api;
      },

      /**
       * Get a field component by name
       * @param name - Field name
       */
      getField(name: string): FormField | undefined {
        return component.getField(name);
      },

      /**
       * Get all field names
       */
      getFieldNames(): string[] {
        return component.getFieldNames();
      },

      /**
       * Check if form has been modified from initial/snapshot state
       */
      isModified(): boolean {
        return component.isModified();
      },

      // ==========================================
      // State API
      // ==========================================

      /**
       * Get the current data state (pristine or dirty)
       */
      getDataState(): DataState {
        return component.getDataState();
      },

      // ==========================================
      // Validation API
      // ==========================================

      /**
       * Validate the form against configured rules
       * Automatically shows errors on field components
       * @returns Validation result with valid flag and errors
       */
      validate(): FormValidationResult {
        return component.validate();
      },

      /**
       * Validate a single field
       * @param fieldName - Field name to validate
       * @returns Error message if invalid, undefined if valid
       */
      validateField(fieldName: string): string | undefined {
        return component.validateField(fieldName);
      },

      /**
       * Clear all validation errors
       */
      clearErrors(): FormComponent {
        component.clearErrors();
        return api;
      },

      /**
       * Clear error for a specific field
       * @param field - Field name
       */
      clearFieldError(field: string): FormComponent {
        component.clearFieldError(field);
        return api;
      },

      /**
       * Set error for a specific field
       * @param field - Field name
       * @param error - Error message
       */
      setFieldError(field: string, error: string): FormComponent {
        component.setFieldError(field, error);
        return api;
      },

      /**
       * Get error for a specific field
       * @param field - Field name
       * @returns Error message or undefined
       */
      getFieldError(field: string): string | undefined {
        return component.getFieldError(field);
      },

      // ==========================================
      // Submit API
      // ==========================================

      /**
       * Submit the form
       * @param options - Optional submit configuration
       */
      async submit(options?: FormSubmitOptions): Promise<unknown> {
        return component.submit(options);
      },

      // ==========================================
      // State Management API
      // ==========================================

      /**
       * Reset form to initial/snapshot state
       * @param {boolean} force - If true, bypass protection and reset immediately
       * @returns {boolean} true if reset was performed, false if cancelled by protection
       */
      reset(force?: boolean): boolean {
        return component.reset(force);
      },

      /**
       * Clear all form fields
       * @param {boolean} force - If true, bypass protection and clear immediately
       * @returns {boolean} true if clear was performed, false if cancelled by protection
       */
      clear(force?: boolean): boolean {
        return component.clear(force);
      },

      /**
       * Take a snapshot of current data as the new baseline
       * Resets modified state to false and removes protection overlays
       * Useful after successful form submission
       */
      snapshot(): void {
        component.snapshot();
      },

      /**
       * Enable all form fields
       */
      enable(): FormComponent {
        component.enableFields();
        return api;
      },

      /**
       * Disable all form fields
       */
      disable(): FormComponent {
        component.disableFields();
        return api;
      },

      /**
       * Enable control buttons (submit, cancel, etc.)
       */
      enableControls(): FormComponent {
        component.enableControls();
        return api;
      },

      /**
       * Disable control buttons
       */
      disableControls(): FormComponent {
        component.disableControls();
        return api;
      },

      // ==========================================
      // Event API
      // ==========================================

      /**
       * Add an event listener
       * @param event - Event name
       * @param handler - Event handler function
       */
      on(event: string, handler: Function): FormComponent {
        component.on?.(event, handler);
        return api;
      },

      /**
       * Remove an event listener
       * @param event - Event name
       * @param handler - Event handler function
       */
      off(event: string, handler: Function): FormComponent {
        component.off?.(event, handler);
        return api;
      },

      /**
       * Emit an event
       * @param event - Event name
       * @param data - Event data
       */
      emit(event: string, data?: unknown): void {
        component.emit?.(event, data);
      },

      // ==========================================
      // Lifecycle API
      // ==========================================

      /**
       * Destroy the form and clean up resources
       */
      destroy(): void {
        // Clear all field event listeners
        for (const [, field] of component.fields) {
          if (typeof field.destroy === "function") {
            field.destroy();
          }
        }

        // Clear control event listeners
        for (const [, control] of component.controls) {
          if (typeof control.destroy === "function") {
            control.destroy();
          }
        }

        // Call lifecycle destroy if available
        if (component.lifecycle?.destroy) {
          component.lifecycle.destroy();
        }

        // Remove form element from DOM
        if (component.element?.parentNode) {
          component.element.parentNode.removeChild(component.element);
        }

        // Emit destroy event
        component.emit?.(FORM_EVENTS.RESET);
      },
    };

    // Wire up control button click handlers
    wireControlButtons(component.controls, api, config);

    return api;
  };
};

export default withAPI;
