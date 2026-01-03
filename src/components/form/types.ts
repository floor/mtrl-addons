// src/components/form/types.ts

import type { DATA_STATE, FORM_EVENTS } from "./constants";

/**
 * Data state type (pristine or dirty)
 */
export type DataState = (typeof DATA_STATE)[keyof typeof DATA_STATE];

/**
 * Form event type
 */
export type FormEvent = (typeof FORM_EVENTS)[keyof typeof FORM_EVENTS];

/**
 * Field value types supported by the form
 */
export type FieldValue =
  | string
  | number
  | boolean
  | string[]
  | null
  | undefined;

/**
 * Form data object - key-value pairs of field names and values
 */
export type FormData = Record<string, FieldValue>;

/**
 * Form field interface - represents a form field component
 */
export interface FormField {
  /** The field's DOM element */
  element: HTMLElement;

  /** Get the field's current value */
  getValue?: () => FieldValue;

  /** Set the field's value */
  setValue?: (value: FieldValue) => void;

  /** Enable the field */
  enable?: () => void;

  /** Disable the field */
  disable?: () => void;

  /** Check if field is disabled */
  isDisabled?: () => boolean;

  /** Add event listener */
  on?: (event: string, handler: Function) => void;

  /** Remove event listener */
  off?: (event: string, handler: Function) => void;

  /** Destroy the field */
  destroy?: () => void;
}

/**
 * Form field registry - maps field names to field components
 */
export type FormFieldRegistry = Map<string, FormField>;

/**
 * Layout schema item - can be a component factory, string, or nested array
 */
export type LayoutSchemaItem =
  | Function
  | string
  | Record<string, unknown>
  | LayoutSchema;

/**
 * Layout schema - array-based layout definition
 */
export type LayoutSchema = LayoutSchemaItem[];

/**
 * Form section configuration
 */
export interface FormSectionConfig {
  /** Section title */
  title?: string;

  /** Section CSS class */
  class?: string;

  /** Section layout schema */
  layout?: LayoutSchema;
}

/**
 * Form validation rule
 */
export interface FormValidationRule {
  /** Field name to validate */
  field: string;

  /** Validation function - returns true if valid, string error message if invalid */
  validate: (value: FieldValue, data: FormData) => boolean | string;

  /** Error message if validation returns false */
  message?: string;
}

/**
 * Form validation result
 */
export interface FormValidationResult {
  /** Whether the form is valid */
  valid: boolean;

  /** Validation errors by field name */
  errors: Record<string, string>;
}

/**
 * Form submit options
 */
export interface FormSubmitOptions {
  /** HTTP method */
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

  /** Request headers */
  headers?: Record<string, string>;

  /** Whether to validate before submit */
  validate?: boolean;

  /** Custom submit handler - if provided, replaces default fetch */
  handler?: (data: FormData, form: FormComponent) => Promise<unknown>;
}

/**
 * Form event handlers configuration
 */
export interface FormEventHandlers {
  /** Called when any field value changes */
  change?: (data: FormData, fieldName: string) => void;

  /** Called when form is submitted */
  submit?: (data: FormData) => void;

  /** Called when form submit succeeds */
  "submit:success"?: (response: unknown) => void;

  /** Called when form submit fails */
  "submit:error"?: (error: Error) => void;

  /** Called when data state changes (pristine <-> dirty) */
  "state:change"?: (event: { modified: boolean; state: DataState }) => void;

  /** Called when form data is set */
  "data:set"?: (data: FormData) => void;

  /** Called when form is reset */
  reset?: () => void;
}

/**
 * Submit button handler - called when submit button is clicked
 * Return a promise that resolves with the result or rejects with an error
 */
export type SubmitHandler = (
  data: FormData,
  form: FormComponent,
) => Promise<unknown>;

/**
 * Cancel button handler - called when cancel button is clicked
 */
export type CancelHandler = (form: FormComponent) => void;

/**
 * Form configuration
 */
export interface FormConfig {
  /** Component prefix for class names */
  prefix?: string;

  /** Component name */
  componentName?: string;

  /** Additional CSS class for the form container */
  class?: string;

  /** Form action URL for submission */
  action?: string;

  /** HTTP method for form submission */
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

  /** Form autocomplete attribute */
  autocomplete?: "on" | "off";

  /** Layout schema defining form structure */
  layout?: LayoutSchema;

  /** System info fields (excluded from form data) */
  sysinfo?: string[];

  /** Whether to track changes and auto-enable/disable controls */
  useChanges?: boolean;

  /** Control button names (default: ['submit', 'cancel']) */
  controls?: string[] | null;

  /** Handler called when submit button is clicked */
  onSubmit?: SubmitHandler;

  /** Handler called when cancel button is clicked */
  onCancel?: CancelHandler;

  /** Initial form data */
  data?: FormData;

  /** Validation rules */
  validation?: FormValidationRule[];

  /** Event handlers */
  on?: FormEventHandlers;

  /** Container element to append form to */
  container?: HTMLElement;
}

/**
 * Form state
 */
export interface FormState {
  /** Whether form has been modified from initial data */
  modified: boolean;

  /** Whether form is currently submitting */
  submitting: boolean;

  /** Whether form is disabled */
  disabled: boolean;

  /** Initial data snapshot for change detection */
  initialData: FormData;

  /** Current form data */
  currentData: FormData;

  /** Validation errors */
  errors: Record<string, string>;
}

/**
 * Form component public API
 */
export interface FormAPI {
  /** Get all form data */
  getData: () => FormData;

  /** Set form data */
  setData: (data: FormData, silent?: boolean) => FormComponent;

  /** Get a specific field value */
  getFieldValue: (name: string) => FieldValue;

  /** Set a specific field value */
  setFieldValue: (
    name: string,
    value: FieldValue,
    silent?: boolean,
  ) => FormComponent;

  /** Get a field component by name */
  getField: (name: string) => FormField | undefined;

  /** Get all field names */
  getFieldNames: () => string[];

  /** Check if form has been modified */
  isModified: () => boolean;

  /** Get current data state (pristine or dirty) */
  getDataState: () => DataState;

  /** Validate the form */
  validate: () => FormValidationResult;

  /** Submit the form */
  submit: (options?: FormSubmitOptions) => Promise<unknown>;

  /** Reset form to initial data */
  reset: () => FormComponent;

  /** Clear all form fields */
  clear: () => FormComponent;

  /** Enable all form fields */
  enable: () => FormComponent;

  /** Disable all form fields */
  disable: () => FormComponent;

  /** Enable control buttons */
  enableControls: () => FormComponent;

  /** Disable control buttons */
  disableControls: () => FormComponent;
}

/**
 * Form component interface
 */
export interface FormComponent extends FormAPI {
  /** The form container element */
  element: HTMLElement;

  /** The form element */
  form: HTMLFormElement;

  /** Layout result with named components */
  ui: Record<string, unknown>;

  /** Field registry */
  fields: FormFieldRegistry;

  /** Current form state */
  state: FormState;

  /** Add event listener */
  on: (event: string, handler: Function) => FormComponent;

  /** Remove event listener */
  off: (event: string, handler: Function) => FormComponent;

  /** Emit an event */
  emit: (event: string, data?: unknown) => void;

  /** Destroy the form and clean up */
  destroy: () => void;
}

/**
 * Internal component structure before API is applied
 */
export interface BaseFormComponent {
  element: HTMLElement;
  form?: HTMLFormElement;
  ui?: Record<string, unknown>;
  fields?: FormFieldRegistry;
  state?: FormState;
  config?: FormConfig;
  componentName?: string;
  getClass?: (name: string) => string;
  on?: (event: string, handler: Function) => void;
  off?: (event: string, handler: Function) => void;
  emit?: (event: string, data?: unknown) => void;
  lifecycle?: {
    destroy: () => void;
  };
}
