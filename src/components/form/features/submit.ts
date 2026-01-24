// src/components/form/features/submit.ts

/**
 * Submit feature for Form component
 * Handles form validation and submission with automatic field error display
 */

import type {
  FormConfig,
  BaseFormComponent,
  FormData,
  FormState,
  FormFieldRegistry,
  FormField,
  FormValidationRule,
  FormValidationResult,
  FormSubmitOptions,
} from "../types";
import { FORM_EVENTS, FORM_CLASSES } from "../constants";

/**
 * Default headers for JSON requests
 */
const DEFAULT_HEADERS: Record<string, string> = {
  Accept: "application/json",
  "Content-Type": "application/json",
};

/**
 * Validates form data against validation rules
 */
const validateData = (
  data: FormData,
  rules: FormValidationRule[],
): FormValidationResult => {
  const errors: Record<string, string> = {};
  let valid = true;

  for (const rule of rules) {
    const value = data[rule.field];
    const result = rule.validate(value, data);

    if (result === false) {
      valid = false;
      errors[rule.field] = rule.message || `${rule.field} is invalid`;
    } else if (typeof result === "string") {
      valid = false;
      errors[rule.field] = result;
    }
  }

  return { valid, errors };
};

/**
 * Validates a single field against its validation rules
 */
const validateField = (
  fieldName: string,
  data: FormData,
  rules: FormValidationRule[],
): string | undefined => {
  const fieldRules = rules.filter((rule) => rule.field === fieldName);

  for (const rule of fieldRules) {
    const value = data[rule.field];
    const result = rule.validate(value, data);

    if (result === false) {
      return rule.message || `${rule.field} is invalid`;
    } else if (typeof result === "string") {
      return result;
    }
  }

  return undefined;
};

/**
 * Performs the actual HTTP request
 */
const performRequest = async (
  url: string,
  data: FormData,
  options: FormSubmitOptions,
): Promise<unknown> => {
  const method = options.method || "POST";
  const headers = { ...DEFAULT_HEADERS, ...options.headers };

  const fetchOptions: RequestInit = {
    method,
    headers,
  };

  // Add body for non-GET requests
  if (method !== "GET") {
    fetchOptions.body = JSON.stringify(data);
  }

  const response = await fetch(url, fetchOptions);

  // Parse response
  const contentType = response.headers.get("content-type");
  let result: unknown;

  if (contentType && contentType.includes("application/json")) {
    result = await response.json();
  } else {
    result = await response.text();
  }

  // Check for HTTP errors
  if (!response.ok) {
    // Try to extract error message from server response
    let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
    if (result && typeof result === "object") {
      const serverError = (result as Record<string, unknown>).error;
      if (typeof serverError === "string") {
        errorMessage = serverError;
      }
    }
    const error = new Error(errorMessage);
    (error as Error & { response: unknown }).response = result;
    throw error;
  }

  return result;
};

/**
 * withSubmit feature
 * Adds validation and submission capabilities to the form
 */
export const withSubmit = (config: FormConfig) => {
  return <
    T extends BaseFormComponent & {
      fields: FormFieldRegistry;
      state: FormState;
      getData: () => FormData;
      getModifiedData: () => FormData;
      enableControls: () => void;
      disableControls: () => void;
      snapshot: () => void;
      emit?: (event: string, data?: unknown) => void;
      on?: (event: string, handler: (data: unknown) => void) => void;
    },
  >(
    component: T,
  ): T & {
    validate: () => FormValidationResult;
    validateField: (fieldName: string) => string | undefined;
    submit: (options?: FormSubmitOptions) => Promise<unknown>;
    setValidationRules: (rules: FormValidationRule[]) => void;
    clearErrors: () => void;
    clearFieldError: (field: string) => void;
    setFieldError: (field: string, error: string) => void;
    getFieldError: (field: string) => string | undefined;
  } => {
    // Validation rules can be updated at runtime
    let validationRules = config.validation || [];

    // Whether to show error messages in field helper text (default: true)
    const showMessages = config.showFieldErrorMessages !== false;

    /**
     * Shows or clears error on a field component
     */
    const showFieldError = (
      fieldName: string,
      error: string | undefined,
    ): void => {
      const field = component.fields.get(fieldName) as FormField | undefined;
      if (field && typeof field.setError === "function") {
        if (error) {
          // Only pass message if showFieldErrorMessages is enabled
          field.setError(true, showMessages ? error : undefined);
        } else {
          // Pass empty string to also clear the helper/supporting text message
          field.setError(false, "");
        }
      }
    };

    /**
     * Shows errors on all field components
     */
    const showAllFieldErrors = (errors: Record<string, string>): void => {
      // Clear all field errors first
      for (const [fieldName] of component.fields) {
        showFieldError(fieldName, undefined);
      }
      // Show new errors
      for (const [fieldName, error] of Object.entries(errors)) {
        showFieldError(fieldName, error);
      }
    };

    // Listen for field changes to auto-clear/revalidate errors
    if (component.on) {
      // Clear visual errors when form is reset
      component.on("reset", () => {
        showAllFieldErrors({});
      });

      component.on("field:change", (event: unknown) => {
        const { name } = event as { name: string; value: unknown };

        // If this field had an error, re-validate it
        if (component.state.errors[name]) {
          const data = component.getData();
          const error = validateField(name, data, validationRules);

          if (error) {
            // Still has error - update message
            component.state.errors[name] = error;
            showFieldError(name, error);
          } else {
            // Field is now valid - clear error
            delete component.state.errors[name];
            showFieldError(name, undefined);
          }
        }
      });
    }

    const enhanced = {
      ...component,

      /**
       * Validate form data against configured rules
       * Automatically shows errors on field components
       * @returns Validation result with valid flag and errors object
       */
      validate(): FormValidationResult {
        const data = component.getData();
        const result = validateData(data, validationRules);

        // Update state with validation errors
        component.state.errors = result.errors;

        // Show errors on field components
        showAllFieldErrors(result.errors);

        // Emit validation event if there are errors
        if (!result.valid) {
          component.emit?.(FORM_EVENTS.VALIDATION_ERROR, result.errors);
        }

        return result;
      },

      /**
       * Validate a single field
       * @returns Error message if invalid, undefined if valid
       */
      validateField(fieldName: string): string | undefined {
        const data = component.getData();
        const error = validateField(fieldName, data, validationRules);

        if (error) {
          component.state.errors[fieldName] = error;
        } else {
          delete component.state.errors[fieldName];
        }

        showFieldError(fieldName, error);
        return error;
      },

      /**
       * Submit the form
       * @param options - Optional submit configuration
       * @returns Promise resolving to the server response
       */
      async submit(options: FormSubmitOptions = {}): Promise<unknown> {
        // Prevent double submission
        if (component.state.submitting) {
          return Promise.reject(new Error("Form is already submitting"));
        }

        // Validate if requested (default: true)
        if (options.validate !== false && validationRules.length > 0) {
          const validation = this.validate();
          if (!validation.valid) {
            return Promise.reject(new Error("Validation failed"));
          }
        }

        // Mark as submitting
        component.state.submitting = true;

        // Immediately disable controls to prevent double-clicks
        component.disableControls();

        // Add submitting class to element
        if (component.element) {
          const prefix = config.prefix || "mtrl";
          const componentName = config.componentName || "form";
          component.element.classList.add(
            `${prefix}-${componentName}--${FORM_CLASSES.SUBMITTING}`,
          );
        }

        // Emit submit event
        const data = component.getData();
        component.emit?.(FORM_EVENTS.SUBMIT, data);

        try {
          let result: unknown;

          // Use custom handler if provided
          if (options.handler) {
            result = await options.handler(
              data,
              component as unknown as import("../types").FormComponent,
            );
          } else if (config.action) {
            // Use default fetch
            result = await performRequest(config.action, data, {
              method: options.method || config.method || "POST",
              headers: options.headers,
            });
          } else {
            // No action URL, just return the data
            result = data;
          }

          // Success!
          component.state.submitting = false;
          component.state.errors = {};

          // Remove submitting class
          if (component.element) {
            const prefix = config.prefix || "mtrl";
            const componentName = config.componentName || "form";
            component.element.classList.remove(
              `${prefix}-${componentName}--${FORM_CLASSES.SUBMITTING}`,
            );
          }

          // Take snapshot of current data as new baseline
          // This resets modified state to false, which will trigger state:change
          component.snapshot();

          // Disable controls (form is now pristine)
          component.disableControls();

          // Emit success event
          component.emit?.(FORM_EVENTS.SUBMIT_SUCCESS, result);

          return result;
        } catch (error) {
          // Error!
          component.state.submitting = false;

          // Remove submitting class
          if (component.element) {
            const prefix = config.prefix || "mtrl";
            const componentName = config.componentName || "form";
            component.element.classList.remove(
              `${prefix}-${componentName}--${FORM_CLASSES.SUBMITTING}`,
            );
          }

          // Re-enable controls so user can retry (form still has unsaved changes)
          component.enableControls();

          // Emit error event
          component.emit?.(FORM_EVENTS.SUBMIT_ERROR, error);

          throw error;
        }
      },

      /**
       * Set validation rules at runtime
       */
      setValidationRules(rules: FormValidationRule[]): void {
        validationRules = rules;
      },

      /**
       * Clear all validation errors and visual error states
       */
      clearErrors(): void {
        component.state.errors = {};
        showAllFieldErrors({});
      },

      /**
       * Clear error for a specific field
       */
      clearFieldError(field: string): void {
        delete component.state.errors[field];
        showFieldError(field, undefined);
      },

      /**
       * Set an error for a specific field (also shows on component)
       */
      setFieldError(field: string, error: string): void {
        component.state.errors[field] = error;
        showFieldError(field, error);
      },

      /**
       * Get the error for a specific field
       */
      getFieldError(field: string): string | undefined {
        return component.state.errors[field];
      },
    };

    return enhanced;
  };
};

export { validateData, validateField, performRequest };
export default withSubmit;
