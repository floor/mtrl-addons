/**
 * Components Module Exports
 *
 * Central export point for all components.
 *
 * NOTE: Constants are NOT exported here to enable tree-shaking.
 * Import constants directly from the component's constants file:
 *   import { COLORPICKER_EVENTS } from 'mtrl-addons/components/colorpicker/constants'
 *   import { FORM_EVENTS } from 'mtrl-addons/components/form/constants'
 *   import { VLIST_CLASSES } from 'mtrl-addons/components/vlist/constants'
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

// ColorPicker component
export { createColorPicker } from "./colorpicker";
export type {
  ColorPickerConfig,
  ColorPickerComponent,
  HSVColor,
  RGBColor,
  ColorSwatch,
} from "./colorpicker/types";

// ColorPicker utilities (pure functions, tree-shakeable)
export {
  hsvToRgb,
  rgbToHsv,
  hsvToHex,
  hexToHsv,
  rgbToHex,
  hexToRgb,
  isValidHex,
  normalizeHex,
  getContrastColor,
} from "./colorpicker/utils";
