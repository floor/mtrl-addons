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
  FormMode,
  FormState,
  FormValidationRule,
  FormValidationResult,
  FormSubmitOptions,
  FormEventHandlers,
  FieldValue,
} from "./form/types";

// Form constants
export {
  FORM_MODES,
  FORM_EVENTS,
  FORM_CLASSES,
  FORM_DEFAULTS,
} from "./form/constants";
