// src/components/colorpicker/index.ts

/**
 * ColorPicker component module
 * @module components/colorpicker
 */

export { default as createColorPicker } from "./colorpicker";

// Constants
export {
  COLORPICKER_EVENTS,
  COLORPICKER_SIZES,
  COLORPICKER_VARIANTS,
  COLORPICKER_CLASSES,
  COLORPICKER_DEFAULTS,
  SWATCH_SIZES,
  SIZE_DIMENSIONS,
  PALETTE_SWATCH_ORDER,
} from "./constants";

// Types
export type {
  ColorPickerConfig,
  ColorPickerComponent,
  ColorPickerState,
  HSVColor,
  RGBColor,
  ColorSwatch,
} from "./types";

// Config helpers
export {
  defaultConfig,
  createBaseConfig,
  getSizeDimensions,
  createInitialState,
  getApiConfig,
} from "./config";

// Utilities
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
  clamp,
} from "./utils";

// Features
export { withArea } from "./features/area";
export type { AreaFeature } from "./features/area";

export { withHue } from "./features/hue";
export type { HueFeature } from "./features/hue";

export { withSwatches } from "./features/swatches";
export type { SwatchesFeature } from "./features/swatches";

export { withInput } from "./features/input";
export type { InputFeature } from "./features/input";

export { withVariant } from "./features/variant";
export type { VariantFeature } from "./features/variant";

// API
export { withAPI } from "./api";
