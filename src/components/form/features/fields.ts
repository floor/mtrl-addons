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
 * All mtrl components now have unified getValue() API:
 * - Textfield: returns string
 * - Select: returns string or string[]
 * - Chips: returns string[]
 * - Switch/Checkbox: returns boolean (updated in mtrl core)
 */
export const getFieldValue = (field: FormField): FieldValue => {
  if (typeof field.getValue === "function") {
    return field.getValue();
  }

  // Fallback: check for value property
  const fieldAny = field as unknown as Record<string, unknown>;
  if ("value" in fieldAny) {
    return fieldAny.value as FieldValue;
  }

  return undefined;
};

/**
 * Sets the value on a field component
 * All mtrl components now have unified setValue() API:
 * - Textfield: accepts string
 * - Select: accepts string or string[]
 * - Chips: accepts string[]
 * - Switch/Checkbox: accepts boolean or string ("true"/"false") (updated in mtrl core)
 *
 * For silent updates (no change events), we set directly on the input element
 */
export const setFieldValue = (
  field: FormField,
  value: FieldValue,
  silent: boolean = false,
): void => {
  const fieldAny = field as unknown as Record<string, unknown>;

  if (silent) {
    // Silent update: set directly on input to avoid triggering change events
    const input = fieldAny.input as
      | HTMLInputElement
      | HTMLTextAreaElement
      | undefined;
    if (input) {
      // Check if this is a checkbox/switch (has checked property)
      if (input.type === "checkbox") {
        const shouldBeChecked =
          value === true || value === "true" || value === 1;
        input.checked = shouldBeChecked;
        // Update visual state by toggling the checked class
        const element = fieldAny.element as HTMLElement | undefined;
        if (element) {
          const classList = Array.from(element.classList);
          const baseClass = classList.find(
            (c) => c.startsWith("mtrl-") && !c.includes("--"),
          );
          if (baseClass) {
            element.classList.toggle(`${baseClass}--checked`, shouldBeChecked);
          }
        }
      } else {
        // Text input - set value directly
        input.value = (value as string) ?? "";
        // Update visual state - toggle --empty class based on value
        const element = fieldAny.element as HTMLElement | undefined;
        if (element) {
          const classList = Array.from(element.classList);
          const baseClass = classList.find(
            (c) => c.startsWith("mtrl-") && !c.includes("--"),
          );
          if (baseClass) {
            const isEmpty = !input.value;
            element.classList.toggle(`${baseClass}--empty`, isEmpty);
          }
        }
      }
    }
    return;
  }

  // Normal update: use component's setValue method
  if (typeof field.setValue === "function") {
    field.setValue(value);
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
 * Compares two field values for equality
 * Handles arrays (for chips/multi-select) and primitive values
 */
const valuesEqual = (a: FieldValue, b: FieldValue): boolean => {
  // Handle null/undefined
  if (a === b) return true;
  if (a == null || b == null) return false;

  // Handle arrays (chips, multi-select)
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    return a.every((val, i) => val === b[i]);
  }

  return false;
};

/**
 * Binds change and input events to fields
 * Calls the provided callback when any field changes
 *
 * Listens to both 'input' (for immediate feedback while typing)
 * and 'change' (for components that only emit on blur/selection)
 *
 * Deduplicates events to prevent double-firing when both input and change
 * emit for the same value (e.g., textfield input followed by blur)
 */
/**
 * Tracks last emitted values per field for deduplication
 * Exposed so that setData can update it when setting values silently
 */
let fieldValueTracker: Map<string, FieldValue> | null = null;

/**
 * Updates the tracked value for a field
 * Called when setData is used with silent=true to keep deduplication in sync
 */
export const updateTrackedFieldValue = (
  name: string,
  value: FieldValue,
): void => {
  if (fieldValueTracker) {
    fieldValueTracker.set(name, value);
  }
};

/**
 * Updates all tracked field values from a fields registry
 * Called after silent setData to sync deduplication state
 */
export const syncTrackedFieldValues = (fields: FormFieldRegistry): void => {
  if (fieldValueTracker) {
    for (const [name, field] of fields) {
      fieldValueTracker.set(name, getFieldValue(field));
    }
  }
};

const bindFieldEvents = (
  fields: FormFieldRegistry,
  onFieldChange: (name: string, value: FieldValue) => void,
): void => {
  // Track last emitted value per field to dedupe events
  const lastEmittedValues = new Map<string, FieldValue>();

  // Expose the tracker so setData can update it
  fieldValueTracker = lastEmittedValues;

  for (const [name, field] of fields) {
    if (typeof field.on === "function") {
      // Initialize with current value
      lastEmittedValues.set(name, getFieldValue(field));

      // Handler that dedupes based on value
      const handleChange = () => {
        const value = getFieldValue(field);
        const lastValue = lastEmittedValues.get(name);

        // Only emit if value actually changed
        if (!valuesEqual(value, lastValue)) {
          lastEmittedValues.set(name, value);
          onFieldChange(name, value);
        }
      };

      // Listen to 'input' for immediate feedback (textfields emit this on every keystroke)
      field.on("input", handleChange);

      // Also listen to 'change' for components that only emit on blur/selection
      // (e.g., select, chips, switch)
      field.on("change", handleChange);
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
