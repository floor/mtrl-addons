// src/components/form/features/fields.ts

/**
 * Fields feature for Form component
 * Extracts fields from layout and manages the field registry
 */

import type {
  FormConfig,
  BaseFormComponent,
  FormField,
  FormFieldRegistry,
  FieldValue,
} from "../types";
import { isFieldName, isFileName, extractFieldName } from "../config";

/**
 * Checks if an object is a valid form field component
 * A form field must have at least getValue or setValue method
 */
const isFormField = (obj: unknown): obj is FormField => {
  if (!obj || typeof obj !== "object") return false;

  const candidate = obj as Record<string, unknown>;

  // Must have element property
  if (!candidate.element || !(candidate.element instanceof HTMLElement)) {
    return false;
  }

  // Must have getValue or setValue
  return (
    typeof candidate.getValue === "function" ||
    typeof candidate.setValue === "function"
  );
};

/**
 * Gets the value from a field component
 * Handles different field APIs (getValue, get, value property)
 */
export const getFieldValue = (field: FormField): FieldValue => {
  if (typeof field.getValue === "function") {
    return field.getValue();
  }

  // Fallback: check for get method (old material API)
  const fieldAny = field as unknown as Record<string, unknown>;
  if (typeof fieldAny.get === "function") {
    return (fieldAny.get as () => FieldValue)();
  }

  // Fallback: check for value property
  if ("value" in fieldAny) {
    return fieldAny.value as FieldValue;
  }

  return undefined;
};

/**
 * Sets the value on a field component
 * Handles different field APIs (setValue, set)
 */
export const setFieldValue = (
  field: FormField,
  value: FieldValue,
  silent: boolean = false,
): void => {
  if (typeof field.setValue === "function") {
    field.setValue(value);
    return;
  }

  // Fallback: check for set method (old material API)
  const fieldAny = field as unknown as Record<string, unknown>;
  if (typeof fieldAny.set === "function") {
    (fieldAny.set as (value: FieldValue, silent?: boolean) => void)(
      value,
      silent,
    );
    return;
  }

  // Fallback: set value property directly
  if ("value" in fieldAny) {
    fieldAny.value = value;
  }
};

/**
 * Extracts fields from the UI component registry
 * Looks for components with names starting with 'info.' or 'data.'
 */
const extractFields = (
  ui: Record<string, unknown>,
  config: FormConfig,
): { fields: FormFieldRegistry; files: FormFieldRegistry } => {
  const fields: FormFieldRegistry = new Map();
  const files: FormFieldRegistry = new Map();

  if (!ui) return { fields, files };

  for (const [name, component] of Object.entries(ui)) {
    // Skip non-field components
    if (!isFormField(component)) continue;

    if (isFieldName(name)) {
      // Extract field name without prefix (info.username -> username)
      const fieldName = extractFieldName(name);
      fields.set(fieldName, component);
    } else if (isFileName(name)) {
      // Extract file name without prefix (file.avatar -> avatar)
      const fileName = extractFieldName(name);
      files.set(fileName, component);
    }
  }

  return { fields, files };
};

/**
 * Binds change and input events to fields
 * Calls the provided callback when any field changes
 *
 * Listens to both 'input' (for immediate feedback while typing)
 * and 'change' (for components that only emit on blur/selection)
 */
const bindFieldEvents = (
  fields: FormFieldRegistry,
  onFieldChange: (name: string, value: FieldValue) => void,
): void => {
  console.log(
    "[Form:fields] Binding events to fields:",
    Array.from(fields.keys()),
  );

  for (const [name, field] of fields) {
    console.log(`[Form:fields] Field "${name}":`, {
      hasOn: typeof field.on === "function",
      hasElement: !!field.element,
      fieldType: field.element?.tagName,
      fieldClass: field.element?.className,
    });

    if (typeof field.on === "function") {
      // Listen to 'input' for immediate feedback (textfields emit this on every keystroke)
      field.on("input", () => {
        console.log(`[Form:fields] INPUT event from "${name}"`);
        const value = getFieldValue(field);
        onFieldChange(name, value);
      });

      // Also listen to 'change' for components that only emit on blur/selection
      // (e.g., select, chips, switch)
      field.on("change", () => {
        console.log(`[Form:fields] CHANGE event from "${name}"`);
        const value = getFieldValue(field);
        onFieldChange(name, value);
      });
    }
  }
};

/**
 * withFields feature
 * Adds field extraction and registry management to the form
 */
export const withFields = (config: FormConfig) => {
  return <T extends BaseFormComponent>(
    component: T,
  ): T & {
    fields: FormFieldRegistry;
    files: FormFieldRegistry;
    getField: (name: string) => FormField | undefined;
    getFieldNames: () => string[];
    hasField: (name: string) => boolean;
  } => {
    // Extract fields from UI registry
    const { fields, files } = extractFields(component.ui || {}, config);

    // Bind change events if component has emit
    if (component.emit) {
      bindFieldEvents(fields, (name, value) => {
        component.emit?.("field:change", { name, value });
        component.emit?.("change", { name, value });
      });
    }

    return {
      ...component,
      fields,
      files,

      /**
       * Get a field component by name
       */
      getField(name: string): FormField | undefined {
        return fields.get(name);
      },

      /**
       * Get all field names
       */
      getFieldNames(): string[] {
        return Array.from(fields.keys());
      },

      /**
       * Check if a field exists
       */
      hasField(name: string): boolean {
        return fields.has(name);
      },
    };
  };
};

export default withFields;
