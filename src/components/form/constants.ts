// src/components/form/constants.ts

/**
 * Form mode constants
 */
export const FORM_MODES = {
  READ: "read",
  CREATE: "create",
  UPDATE: "update",
} as const;

/**
 * Form event constants
 */
export const FORM_EVENTS = {
  CHANGE: "change",
  SUBMIT: "submit",
  CANCEL: "cancel",
  MODE_CHANGE: "mode:change",
  MODIFIED_CHANGE: "modified:change",
  DATA_SET: "data:set",
  DATA_GET: "data:get",
  FIELD_CHANGE: "field:change",
  VALIDATION_ERROR: "validation:error",
  SUBMIT_SUCCESS: "submit:success",
  SUBMIT_ERROR: "submit:error",
  RENDER: "render",
  RESET: "reset",
} as const;

/**
 * Form CSS classes
 */
export const FORM_CLASSES = {
  ROOT: "form",
  FORM_ELEMENT: "form__element",
  SECTION: "form__section",
  SECTION_TITLE: "form__section-title",
  GROUP: "form__group",
  ROW: "form__row",
  FIELD: "form__field",
  CONTROLS: "form__controls",
  READ_MODE: "form--read",
  CREATE_MODE: "form--create",
  UPDATE_MODE: "form--update",
  MODIFIED: "form--modified",
  SUBMITTING: "form--submitting",
  DISABLED: "form--disabled",
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
  mode: FORM_MODES.READ,
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
