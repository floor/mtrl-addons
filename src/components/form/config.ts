// src/components/form/config.ts

import type { FormConfig, FormState, FormData } from "./types";
import { FORM_DEFAULTS, FORM_MODES } from "./constants";

// Re-export FORM_DEFAULTS for use in other modules
export { FORM_DEFAULTS };

/**
 * Creates the base configuration with defaults applied
 */
export const createBaseConfig = (config: FormConfig = {}): FormConfig => {
  return {
    ...FORM_DEFAULTS,
    ...config,
    prefix: config.prefix || FORM_DEFAULTS.prefix,
    componentName: config.componentName || FORM_DEFAULTS.componentName,
    mode: config.mode || FORM_DEFAULTS.mode,
    controls:
      config.controls !== undefined
        ? config.controls
        : [...FORM_DEFAULTS.controls],
    sysinfo: config.sysinfo || [],
    validation: config.validation || [],
    on: config.on || {},
  };
};

/**
 * Creates the initial form state
 */
export const createInitialState = (config: FormConfig): FormState => {
  const initialData = config.data ? { ...config.data } : {};

  return {
    mode: config.mode || FORM_MODES.READ,
    modified: false,
    submitting: false,
    disabled: false,
    initialData,
    currentData: { ...initialData },
    errors: {},
  };
};

/**
 * Gets the element configuration for withElement
 */
export const getElementConfig = (config: FormConfig) => {
  const prefix = config.prefix || FORM_DEFAULTS.prefix;
  const componentName = config.componentName || FORM_DEFAULTS.componentName;

  const classNames = [`${prefix}-${componentName}`];

  if (config.class) {
    classNames.push(config.class);
  }

  // Add initial mode class
  const modeClass = getModeClass(
    config.mode || FORM_MODES.READ,
    prefix,
    componentName,
  );
  if (modeClass) {
    classNames.push(modeClass);
  }

  return {
    tag: "div",
    className: classNames.join(" "),
    attributes: {
      "data-component": componentName,
    },
  };
};

/**
 * Gets the CSS class for a form mode
 */
export const getModeClass = (
  mode: string,
  prefix: string = FORM_DEFAULTS.prefix,
  componentName: string = FORM_DEFAULTS.componentName,
): string => {
  return `${prefix}-${componentName}--${mode}`;
};

/**
 * Gets all mode classes for removal
 */
export const getAllModeClasses = (
  prefix: string = FORM_DEFAULTS.prefix,
  componentName: string = FORM_DEFAULTS.componentName,
): string[] => {
  return Object.values(FORM_MODES).map((mode) =>
    getModeClass(mode, prefix, componentName),
  );
};

/**
 * Gets the API configuration based on the enhanced component
 */
export const getApiConfig = (component: unknown) => {
  return {
    component,
    // Additional API config can be added here
  };
};

/**
 * Extracts field name from a prefixed name (e.g., 'info.username' -> 'username')
 */
export const extractFieldName = (prefixedName: string): string => {
  const parts = prefixedName.split(".");
  return parts.length > 1 ? parts.slice(1).join(".") : prefixedName;
};

/**
 * Gets the full field path including prefix
 */
export const getFieldPath = (name: string, prefix: string = "info"): string => {
  if (name.includes(".")) {
    return name;
  }
  return `${prefix}.${name}`;
};

/**
 * Checks if a name is a field name (starts with info. or data.)
 */
export const isFieldName = (name: string): boolean => {
  return name.startsWith("info.") || name.startsWith("data.");
};

/**
 * Checks if a name is a file field name
 */
export const isFileName = (name: string): boolean => {
  return name.startsWith("file.");
};

/**
 * Deep comparison of two values for change detection
 */
export const isValueEqual = (a: unknown, b: unknown): boolean => {
  // Handle null/undefined
  if (a === b) return true;
  if (a == null || b == null) return a == b;

  // Handle arrays
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    return a.every((val, idx) => isValueEqual(val, b[idx]));
  }

  // Handle objects
  if (typeof a === "object" && typeof b === "object") {
    const keysA = Object.keys(a as object);
    const keysB = Object.keys(b as object);
    if (keysA.length !== keysB.length) return false;
    return keysA.every((key) =>
      isValueEqual(
        (a as Record<string, unknown>)[key],
        (b as Record<string, unknown>)[key],
      ),
    );
  }

  // Handle primitives (with type coercion for string/number comparison)
  // eslint-disable-next-line eqeqeq
  return a == b;
};

/**
 * Checks if form data has been modified from initial state
 */
export const hasDataChanged = (
  initial: FormData,
  current: FormData,
): boolean => {
  const allKeys = new Set([...Object.keys(initial), ...Object.keys(current)]);

  for (const key of allKeys) {
    if (!isValueEqual(initial[key], current[key])) {
      return true;
    }
  }

  return false;
};

/**
 * Gets only the modified fields between initial and current data
 */
export const getModifiedFields = (
  initial: FormData,
  current: FormData,
): FormData => {
  const modified: FormData = {};
  const allKeys = new Set([...Object.keys(initial), ...Object.keys(current)]);

  for (const key of allKeys) {
    if (!isValueEqual(initial[key], current[key])) {
      modified[key] = current[key];
    }
  }

  return modified;
};

/**
 * Normalizes a value for comparison (handles empty strings, null, undefined)
 */
export const normalizeValue = (value: unknown): unknown => {
  if (value === "" || value === null || value === undefined) {
    return null;
  }
  return value;
};
