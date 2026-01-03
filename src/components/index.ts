/**
 * Components Module Exports
 *
 * Central export point for all components
 */

// VList component (virtual list with viewport)
export { createVList } from "./vlist";
export type { VListConfig, VListComponent } from "./vlist/types";

// Form component (functional form builder)
export { createForm } from "./form";
export type {
  FormConfig,
  FormComponent,
  FormField,
  FormData,
  DataState,
  FormState,
  FormValidationRule,
  FormValidationResult,
  FormSubmitOptions,
  FormEventHandlers,
  FieldValue,
  SubmitHandler,
  CancelHandler,
} from "./form/types";

// Form constants
export {
  DATA_STATE,
  FORM_EVENTS,
  FORM_CLASSES,
  FORM_DEFAULTS,
} from "./form/constants";
