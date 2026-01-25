// src/components/colorpicker/config.ts

import {
  COLORPICKER_DEFAULTS,
  COLORPICKER_SIZES,
  COLORPICKER_VARIANTS,
  SIZE_DIMENSIONS,
} from "./constants";
import { ColorPickerConfig, ColorPickerState, HSVColor } from "./types";
import { hexToHsv, normalizeHex } from "./utils";

/**
 * Default configuration for the ColorPicker component.
 * These values will be used when not explicitly specified by the user.
 *
 * @category Components
 */
export const defaultConfig: ColorPickerConfig = {
  value: COLORPICKER_DEFAULTS.VALUE,
  variant: COLORPICKER_VARIANTS.INLINE,
  size: COLORPICKER_SIZES.M,
  swatchSize: COLORPICKER_DEFAULTS.SWATCH_SIZE,
  showInput: COLORPICKER_DEFAULTS.SHOW_INPUT,
  showPreview: COLORPICKER_DEFAULTS.SHOW_PREVIEW,
  showSwatches: COLORPICKER_DEFAULTS.SHOW_SWATCHES,
  showHue: true,
  showArea: true,
  maxSwatches: COLORPICKER_DEFAULTS.MAX_SWATCHES,
  closeOnSelect: COLORPICKER_DEFAULTS.CLOSE_ON_SELECT,
  disabled: false,
  prefix: "mtrl",
};

/**
 * Creates the base configuration for ColorPicker component by merging
 * user-provided config with default values.
 *
 * @param config - User provided configuration
 * @returns Complete configuration with defaults applied
 * @category Components
 * @internal
 */
export const createBaseConfig = (
  config: ColorPickerConfig = {}
): Required<
  Pick<
    ColorPickerConfig,
    | "value"
    | "variant"
    | "size"
    | "swatchSize"
    | "showInput"
    | "showPreview"
    | "showSwatches"
    | "showHue"
    | "showArea"
    | "maxSwatches"
    | "closeOnSelect"
    | "disabled"
    | "prefix"
  >
> &
  ColorPickerConfig => {
  return {
    ...defaultConfig,
    ...config,
    value: config.value || defaultConfig.value!,
    variant: config.variant || defaultConfig.variant!,
    size: config.size || defaultConfig.size!,
    swatchSize: config.swatchSize ?? defaultConfig.swatchSize!,
    showInput: config.showInput ?? defaultConfig.showInput!,
    showPreview: config.showPreview ?? defaultConfig.showPreview!,
    showSwatches: config.showSwatches ?? defaultConfig.showSwatches!,
    showHue: config.showHue ?? true,
    showArea: config.showArea ?? true,
    maxSwatches: config.maxSwatches || defaultConfig.maxSwatches!,
    closeOnSelect: config.closeOnSelect ?? defaultConfig.closeOnSelect!,
    disabled: config.disabled || false,
    prefix: config.prefix || defaultConfig.prefix!,
  };
};

/**
 * Gets the size dimensions based on the size configuration
 *
 * @param size - Size key ('s', 'm', 'l')
 * @returns Dimension object with width, areaHeight, hueHeight
 * @category Components
 * @internal
 */
export const getSizeDimensions = (
  size: string
): { width: number; areaHeight: number; hueHeight: number } => {
  return (
    SIZE_DIMENSIONS[size as keyof typeof SIZE_DIMENSIONS] ||
    SIZE_DIMENSIONS[COLORPICKER_SIZES.M]
  );
};

/**
 * Creates the initial state for the color picker
 *
 * @param config - Color picker configuration
 * @returns Initial state object
 * @category Components
 * @internal
 */
export const createInitialState = (config: ColorPickerConfig): ColorPickerState => {
  const initialHsv: HSVColor = hexToHsv(config.value || COLORPICKER_DEFAULTS.VALUE) || {
    h: 0,
    s: 100,
    v: 100,
  };

  return {
    hsv: initialHsv,
    hex: normalizeHex(config.value || COLORPICKER_DEFAULTS.VALUE),
    isDragging: false,
    dragTarget: null,
    swatches: [],
    isOpen: false,
  };
};

/**
 * Creates the API configuration for the ColorPicker component.
 * This connects the core component features to the public API methods.
 *
 * @param comp - Component with features applied
 * @returns API configuration object
 * @category Components
 * @internal
 */
export const getApiConfig = (comp: {
  element: HTMLElement;
  state: ColorPickerState;
  disabled: {
    enable: () => void;
    disable: () => void;
    isDisabled: () => boolean;
  };
  lifecycle: {
    destroy: () => void;
  };
  getClass: (name: string) => string;
  emit: (event: string, ...args: unknown[]) => void;
  handlers: Record<string, Array<(...args: unknown[]) => void>>;
  // Optional features
  area?: {
    updateBackground: () => void;
    updateHandle: () => void;
  };
  hue?: {
    updateHandle: () => void;
  };
  swatches?: {
    update: () => void;
    set: (swatches: unknown[]) => void;
    add: (color: string, label?: string) => void;
    remove: (color: string) => void;
    clear: () => void;
    get: () => unknown[];
  };
  input?: {
    update: () => void;
  };
  preview?: {
    update: () => void;
  };
  popup?: {
    open: () => void;
    close: () => void;
    toggle: () => void;
    isOpen: () => boolean;
  };
  config: ColorPickerConfig;
}) => ({
  element: comp.element,
  state: comp.state,
  disabled: comp.disabled,
  lifecycle: comp.lifecycle,
  getClass: comp.getClass,
  emit: comp.emit,
  handlers: comp.handlers,
  area: comp.area,
  hue: comp.hue,
  swatches: comp.swatches,
  input: comp.input,
  preview: comp.preview,
  popup: comp.popup,
  config: comp.config,
});

export default defaultConfig;
