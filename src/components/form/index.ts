// src/components/form/index.ts

/**
 * Form Component
 * A functional form builder using mtrl composition pattern
 */

// Main component factory
export { createForm, default } from "./form";

// Constants
export {
  DATA_STATE,
  FORM_EVENTS,
  FORM_CLASSES,
  FORM_DEFAULTS,
  FIELD_PREFIXES,
} from "./constants";

// Types
export type {
  DataState,
  FormEvent,
  FieldValue,
  FormData,
  FormField,
  FormFieldRegistry,
  LayoutSchema,
  LayoutSchemaItem,
  FormSectionConfig,
  FormValidationRule,
  FormValidationResult,
  FormSubmitOptions,
  FormEventHandlers,
  FormConfig,
  FormState,
  FormAPI,
  FormComponent,
  BaseFormComponent,
  SubmitHandler,
  CancelHandler,
  ProtectChangesConfig,
  DataConflictEvent,
} from "./types";

// Configuration utilities
export {
  createBaseConfig,
  createInitialState,
  getElementConfig,
  extractFieldName,
  getFieldPath,
  isFieldName,
  isFileName,
  isValueEqual,
  hasDataChanged,
  getModifiedFields,
} from "./config";

// Features (for advanced customization)
export {
  withLayout,
  withFields,
  withData,
  withController,
  withSubmit,
  withAPI,
  getFieldValue,
  setFieldValue,
  flatToNested,
  getNestedValue,
  setNestedValue,
  validateData,
  performRequest,
} from "./features";
