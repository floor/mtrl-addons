// src/components/form/features/data.ts

/**
 * Data feature for Form component
 * Handles form data operations: get/set data, change tracking, snapshots
 */

import type {
  FormConfig,
  BaseFormComponent,
  FormData,
  FormState,
  FieldValue,
  FormFieldRegistry,
} from "../types";
import {
  createInitialState,
  hasDataChanged,
  getModifiedFields,
} from "../config";
import { getFieldValue, setFieldValue, syncTrackedFieldValues } from "./fields";
import { FORM_EVENTS, DATA_STATE } from "../constants";

/**
 * Collects current values from all fields
 */
const collectFieldData = (fields: FormFieldRegistry): FormData => {
  const data: FormData = {};

  for (const [name, field] of fields) {
    const value = getFieldValue(field);
    if (value !== undefined) {
      data[name] = value;
    }
  }

  return data;
};

/**
 * Sets values on fields from a data object
 * Supports dot notation for nested values (e.g., { 'user.name': 'John' })
 */
const setFieldsData = (
  fields: FormFieldRegistry,
  data: FormData,
  silent: boolean = false,
): void => {
  for (const [name, field] of fields) {
    // Check for exact match first
    if (name in data) {
      setFieldValue(field, data[name], silent);
      continue;
    }

    // Check for nested value using dot notation
    // e.g., field name 'username' might be in data as nested { info: { username: 'value' } }
    const value = getNestedValue(data, name);
    if (value !== undefined) {
      setFieldValue(field, value as FieldValue, silent);
    }
  }
};

/**
 * Gets a nested value from an object using dot notation
 */
const getNestedValue = (
  obj: Record<string, unknown>,
  path: string,
): unknown => {
  const parts = path.split(".");
  let current: unknown = obj;

  for (const part of parts) {
    if (current === null || current === undefined) {
      return undefined;
    }
    if (typeof current !== "object") {
      return undefined;
    }
    current = (current as Record<string, unknown>)[part];
  }

  return current;
};

/**
 * Sets a nested value in an object using dot notation
 */
const setNestedValue = (
  obj: Record<string, unknown>,
  path: string,
  value: unknown,
): void => {
  const parts = path.split(".");
  let current = obj;

  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];
    if (!(part in current) || typeof current[part] !== "object") {
      current[part] = {};
    }
    current = current[part] as Record<string, unknown>;
  }

  current[parts[parts.length - 1]] = value;
};

/**
 * Converts flat field data to nested object structure
 * e.g., { 'user.name': 'John' } -> { user: { name: 'John' } }
 */
const flatToNested = (data: FormData): Record<string, unknown> => {
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(data)) {
    if (key.includes(".")) {
      setNestedValue(result, key, value);
    } else {
      result[key] = value;
    }
  }

  return result;
};

/**
 * withData feature
 * Adds data management capabilities to the form
 */
export const withData = (config: FormConfig) => {
  return <
    T extends BaseFormComponent & {
      fields: FormFieldRegistry;
      emit?: (event: string, data?: unknown) => void;
    },
  >(
    component: T,
  ): T & {
    state: FormState;
    getData: () => FormData;
    setData: (data: FormData, silent?: boolean) => void;
    getFieldValue: (name: string) => FieldValue;
    setFieldValue: (name: string, value: FieldValue, silent?: boolean) => void;
    isModified: () => boolean;
    getModifiedData: () => FormData;
    snapshot: () => void;
    reset: () => void;
    clear: () => void;
  } => {
    // Initialize state
    const state = createInitialState(config);

    // If initial data was provided, set it on fields
    if (config.data && component.fields) {
      setFieldsData(component.fields, config.data, true);
      state.currentData = collectFieldData(component.fields);
      state.initialData = { ...state.currentData };
    }

    // Handler for field/file changes to update state
    const handleChange = (event: { name: string; value: FieldValue }) => {
      state.currentData[event.name] = event.value;
      const wasModified = state.modified;
      state.modified = hasDataChanged(state.initialData, state.currentData);

      // Emit state:change event when modified state changes
      // This allows the controller to enable/disable controls accordingly
      if (wasModified !== state.modified) {
        component.emit?.(FORM_EVENTS.STATE_CHANGE, {
          modified: state.modified,
          state: state.modified ? DATA_STATE.DIRTY : DATA_STATE.PRISTINE,
          name: event.name,
          value: event.value,
        });
      }
    };

    // Listen for field changes to update state
    if (component.on) {
      component.on("field:change", handleChange);
      // Also listen for file changes
      component.on("file:change", handleChange);
    }

    const enhanced = {
      ...component,
      state,

      /**
       * Get all form data
       */
      getData(): FormData {
        // Always collect fresh data from fields
        const data = collectFieldData(component.fields);
        state.currentData = data;
        component.emit?.(FORM_EVENTS.DATA_GET, data);
        return data;
      },

      /**
       * Set form data
       * @param data - Data object to set
       * @param silent - If true, don't emit change events and update initial state
       */
      setData(data: FormData, silent: boolean = false): void {
        setFieldsData(component.fields, data, silent);
        state.currentData = collectFieldData(component.fields);

        if (silent) {
          // When setting data silently, also update initial data snapshot
          // This is typically used when loading data from server
          state.initialData = { ...state.currentData };
          state.modified = false;
          // Sync the field value tracker for event deduplication
          syncTrackedFieldValues(component.fields);
        } else {
          component.emit?.(FORM_EVENTS.DATA_SET, state.currentData);
        }
      },

      /**
       * Get a specific field's value
       */
      getFieldValue(name: string): FieldValue {
        const field = component.fields.get(name);
        if (field) {
          return getFieldValue(field);
        }
        return state.currentData[name];
      },

      /**
       * Set a specific field's value
       */
      setFieldValue(
        name: string,
        value: FieldValue,
        silent: boolean = false,
      ): void {
        const field = component.fields.get(name);
        if (field) {
          setFieldValue(field, value, silent);
          state.currentData[name] = value;
          state.modified = hasDataChanged(state.initialData, state.currentData);

          if (!silent) {
            component.emit?.(FORM_EVENTS.FIELD_CHANGE, { name, value });
            component.emit?.(FORM_EVENTS.CHANGE, { name, value });
          }
        }
      },

      /**
       * Check if form has been modified from initial state
       */
      isModified(): boolean {
        const currentData = collectFieldData(component.fields);
        state.modified = hasDataChanged(state.initialData, currentData);
        return state.modified;
      },

      /**
       * Get only the fields that have been modified
       */
      getModifiedData(): FormData {
        const currentData = collectFieldData(component.fields);
        return getModifiedFields(state.initialData, currentData);
      },

      /**
       * Take a snapshot of current data as the new baseline
       * Future isModified() calls will compare against this snapshot
       */
      snapshot(): void {
        state.initialData = { ...collectFieldData(component.fields) };
        state.currentData = { ...state.initialData };
        state.modified = false;
      },

      /**
       * Reset form to initial data state
       */
      reset(): void {
        setFieldsData(component.fields, state.initialData, true);
        state.currentData = { ...state.initialData };
        state.modified = false;
        state.errors = {};
        component.emit?.(FORM_EVENTS.RESET);
      },

      /**
       * Clear all form fields
       */
      clear(): void {
        const emptyData: FormData = {};
        for (const name of component.fields.keys()) {
          emptyData[name] = null;
        }
        setFieldsData(component.fields, emptyData, true);
        state.currentData = {};
        state.modified = hasDataChanged(state.initialData, state.currentData);
        component.emit?.(FORM_EVENTS.RESET);
      },
    };

    return enhanced;
  };
};

export { flatToNested, getNestedValue, setNestedValue };
export default withData;
