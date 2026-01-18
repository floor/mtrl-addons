// src/components/form/features/data.ts

/**
 * Data feature for Form component
 * Handles form data operations: get/set data, change tracking, snapshots,
 * and change protection (beforeunload warning, data conflict detection)
 */

import type {
  FormConfig,
  BaseFormComponent,
  FormData,
  FormState,
  FieldValue,
  FormFieldRegistry,
  ProtectChangesConfig,
  DataConflictEvent,
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
 * Normalizes protection config to a consistent object format
 */
const normalizeProtectConfig = (
  config: boolean | ProtectChangesConfig | undefined,
): ProtectChangesConfig => {
  if (!config) {
    return { beforeUnload: false, onDataOverwrite: false };
  }
  if (config === true) {
    return { beforeUnload: true, onDataOverwrite: true };
  }
  return {
    beforeUnload: config.beforeUnload ?? false,
    onDataOverwrite: config.onDataOverwrite ?? false,
  };
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
    reset: (force?: boolean) => boolean;
    clear: (force?: boolean) => boolean;
  } => {
    // Initialize state
    const state = createInitialState(config);

    // Normalize protection configuration
    const protectConfig = normalizeProtectConfig(config.protectChanges);

    // Track the beforeunload handler so we can remove it
    let beforeUnloadHandler: ((e: BeforeUnloadEvent) => void) | null = null;

    /**
     * Beforeunload handler - warns user when leaving with unsaved changes
     */
    const handleBeforeUnload = (e: BeforeUnloadEvent): void => {
      if (state.modified) {
        // Standard way to trigger the browser's "unsaved changes" dialog
        e.preventDefault();
        // For older browsers - returnValue must be set
        e.returnValue = "";
      }
    };

    /**
     * Registers the beforeunload handler if protection is enabled
     */
    const registerBeforeUnload = (): void => {
      if (protectConfig.beforeUnload && !beforeUnloadHandler) {
        beforeUnloadHandler = handleBeforeUnload;
        window.addEventListener("beforeunload", beforeUnloadHandler);
      }
    };

    /**
     * Unregisters the beforeunload handler
     */
    const unregisterBeforeUnload = (): void => {
      if (beforeUnloadHandler) {
        window.removeEventListener("beforeunload", beforeUnloadHandler);
        beforeUnloadHandler = null;
      }
    };

    /**
     * Updates beforeunload registration based on modified state
     */
    const updateBeforeUnloadState = (modified: boolean): void => {
      if (protectConfig.beforeUnload) {
        if (modified) {
          registerBeforeUnload();
        }
        // We keep the handler registered but it only prevents unload when modified
        // This is more efficient than constantly adding/removing the listener
      }
    };

    // If initial data was provided, set it on fields
    if (config.data && component.fields) {
      setFieldsData(component.fields, config.data, true);
      state.currentData = collectFieldData(component.fields);
      state.initialData = { ...state.currentData };
      // Sync the field value tracker for event deduplication
      // This ensures change detection works correctly when fields are modified
      syncTrackedFieldValues(component.fields);
    }

    // Initialize beforeunload protection if enabled
    if (protectConfig.beforeUnload) {
      registerBeforeUnload();
    }

    // Handler for field/file changes to update state
    const handleChange = (event: { name: string; value: FieldValue }) => {
      state.currentData[event.name] = event.value;
      const wasModified = state.modified;
      state.modified = hasDataChanged(state.initialData, state.currentData);

      // Update beforeunload state when modified changes
      if (wasModified !== state.modified) {
        updateBeforeUnloadState(state.modified);
      }

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

    /**
     * Internal function to perform the actual setData operation
     */
    const performSetData = (data: FormData, silent: boolean): void => {
      setFieldsData(component.fields, data, silent);
      state.currentData = collectFieldData(component.fields);

      if (silent) {
        // When setting data silently, also update initial data snapshot
        // This is typically used when loading data from server
        state.initialData = { ...state.currentData };
        state.modified = false;
        // Sync the field value tracker for event deduplication
        syncTrackedFieldValues(component.fields);
        // Update beforeunload state since we're no longer modified
        updateBeforeUnloadState(false);
      } else {
        component.emit?.(FORM_EVENTS.DATA_SET, state.currentData);
      }
    };

    /**
     * Internal function to perform the actual reset operation
     */
    const performReset = (): void => {
      setFieldsData(component.fields, state.initialData, true);
      state.currentData = { ...state.initialData };
      state.modified = false;
      state.errors = {};
      // Update beforeunload state since we're no longer modified
      updateBeforeUnloadState(false);
      // Emit state:change so protection overlay gets removed
      component.emit?.(FORM_EVENTS.STATE_CHANGE, {
        modified: false,
        state: DATA_STATE.PRISTINE,
      });
      component.emit?.(FORM_EVENTS.RESET);
    };

    /**
     * Internal function to perform the actual clear operation
     */
    const performClear = (): void => {
      const emptyData: FormData = {};
      for (const name of component.fields.keys()) {
        emptyData[name] = null;
      }
      setFieldsData(component.fields, emptyData, true);
      state.currentData = {};
      state.initialData = {};
      state.modified = false;
      // Update beforeunload state
      updateBeforeUnloadState(false);
      // Emit state:change so protection overlay gets removed
      component.emit?.(FORM_EVENTS.STATE_CHANGE, {
        modified: false,
        state: DATA_STATE.PRISTINE,
      });
      component.emit?.(FORM_EVENTS.RESET);
    };

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
       *
       * When protectChanges.onDataOverwrite is enabled and the form has unsaved changes,
       * this will emit a 'data:conflict' event. The event handler can call cancel()
       * to prevent the data from being set, or let it proceed by default.
       */
      setData(data: FormData, silent: boolean = false): void {
        // Check for data conflict protection
        // Only applies when:
        // - Protection is enabled
        // - Form has been modified
        // - Not a silent operation (silent is for loading data)
        if (protectConfig.onDataOverwrite && state.modified && !silent) {
          // Create conflict event
          let cancelled = false;
          let proceeded = false;

          const conflictEvent: DataConflictEvent = {
            currentData: { ...state.currentData },
            newData: data,
            cancelled: false,
            cancel: () => {
              cancelled = true;
              conflictEvent.cancelled = true;
            },
            proceed: () => {
              proceeded = true;
              performSetData(data, silent);
            },
          };

          // Emit the conflict event
          component.emit?.(FORM_EVENTS.DATA_CONFLICT, conflictEvent);

          // If cancelled, don't set the data
          if (cancelled) {
            return;
          }

          // If proceed() was called in the handler, data is already set
          if (proceeded) {
            return;
          }

          // If neither cancel() nor proceed() was called, proceed by default
          // This maintains backward compatibility
        }

        // Perform the actual setData operation
        performSetData(data, silent);
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

          // Update beforeunload state
          updateBeforeUnloadState(state.modified);

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
        // Update beforeunload state since we're no longer modified
        updateBeforeUnloadState(false);
      },

      /**
       * Reset form to initial data state
       *
       * Note: Protection is handled by the blocking overlay in the protection feature.
       * reset() no longer emits data:conflict events - it just resets the form.
       * Use force parameter for backwards compatibility (ignored).
       *
       * @param {boolean} force - Ignored (kept for backwards compatibility)
       * @returns {boolean} Always returns true
       */
      reset(force: boolean = false): boolean {
        performReset();
        return true;
      },

      /**
       * Clear all form fields
       *
       * Note: Protection is handled by the blocking overlay in the protection feature.
       * clear() no longer emits data:conflict events - it just clears the form.
       * Use force parameter for backwards compatibility (ignored).
       *
       * @param {boolean} force - Ignored (kept for backwards compatibility)
       * @returns {boolean} Always returns true
       */
      clear(force: boolean = false): boolean {
        performClear();
        return true;
      },
    };

    // Register cleanup for beforeunload handler when component is destroyed
    // We need to hook into the lifecycle destroy mechanism
    const originalLifecycle = component.lifecycle;
    if (originalLifecycle) {
      const originalDestroy = originalLifecycle.destroy;
      originalLifecycle.destroy = () => {
        // Clean up beforeunload handler
        unregisterBeforeUnload();
        // Call original destroy
        originalDestroy?.();
      };
    }

    return enhanced;
  };
};

export { flatToNested, getNestedValue, setNestedValue };
export default withData;
