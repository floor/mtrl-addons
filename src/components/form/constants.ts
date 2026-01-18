// src/components/form/constants.ts

/**
 * Data state constants
 * Tracks whether form data has been modified from initial state
 */
export const DATA_STATE = {
  /** Data matches initial state - no changes made */
  PRISTINE: "pristine",
  /** Data has been modified from initial state */
  DIRTY: "dirty",
} as const;

/**
 * Form event constants
 */
export const FORM_EVENTS = {
  /** Fired when any field value changes */
  CHANGE: "change",
  /** Fired when form is submitted */
  SUBMIT: "submit",
  /** Fired when data state changes (pristine <-> dirty) */
  STATE_CHANGE: "state:change",
  /** Fired when data is set on the form */
  DATA_SET: "data:set",
  /** Fired when data is retrieved from the form */
  DATA_GET: "data:get",
  /** Fired when a specific field changes */
  FIELD_CHANGE: "field:change",
  /** Fired when validation fails */
  VALIDATION_ERROR: "validation:error",
  /** Fired when submit succeeds */
  SUBMIT_SUCCESS: "submit:success",
  /** Fired when submit fails */
  SUBMIT_ERROR: "submit:error",
  /** Fired when form is reset to initial state */
  RESET: "reset",
  /** Fired when setData is called with unsaved changes (protection enabled) */
  DATA_CONFLICT: "data:conflict",
} as const;

/**
 * Form CSS class modifiers
 */
export const FORM_CLASSES = {
  /** Applied when data has been modified */
  MODIFIED: "modified",
  /** Applied when form is submitting */
  SUBMITTING: "submitting",
  /** Applied when form is disabled */
  DISABLED: "disabled",
  /** Applied when form body is scrolled away from top */
  SCROLLED: "mtrl-form--scrolled",
} as const;

/**
 * Default form configuration
 */
export const FORM_DEFAULTS = {
  prefix: "mtrl",
  componentName: "form",
  tag: "div",
  formTag: "form",
  method: "POST",
  autocomplete: "off",
  useChanges: true,
  controls: ["submit", "cancel"],
} as const;

/**
 * Field name prefixes used for extraction
 */
export const FIELD_PREFIXES = {
  INFO: "info.",
  FILE: "file.",
  DATA: "data.",
} as const;
