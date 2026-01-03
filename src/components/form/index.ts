// src/components/form/index.ts

/**
 * Form Component
 * A functional form builder using mtrl composition pattern
 */

// Main component factory
export { createForm, default } from './form'

// Constants
export {
  FORM_MODES,
  FORM_EVENTS,
  FORM_CLASSES,
  FORM_DEFAULTS,
  FIELD_PREFIXES
} from './constants'

// Types
export type {
  FormMode,
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
  BaseFormComponent
} from './types'

// Configuration utilities
export {
  createBaseConfig,
  createInitialState,
  getElementConfig,
  getModeClass,
  getAllModeClasses,
  extractFieldName,
  getFieldPath,
  isFieldName,
  isFileName,
  isValueEqual,
  hasDataChanged,
  getModifiedFields,
  normalizeValue
} from './config'

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
  performRequest
} from './features'
