// src/components/colorpicker/config.ts

import {
  COLORPICKER_DEFAULTS,
  COLORPICKER_SIZES,
  COLORPICKER_VARIANTS,
  COLORPICKER_CLASSES,
  COLORPICKER_DENSITIES,
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
  density: COLORPICKER_DENSITIES.DEFAULT,
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
  componentName: "colorpicker",
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
  config: ColorPickerConfig = {},
): Required<
  Pick<
    ColorPickerConfig,
    | "value"
    | "variant"
    | "size"
    | "density"
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
    | "componentName"
  >
> &
  ColorPickerConfig => {
  return {
    ...defaultConfig,
    ...config,
    value: config.value || defaultConfig.value!,
    variant: config.variant || defaultConfig.variant!,
    size: config.size || defaultConfig.size!,
    density: config.density || defaultConfig.density!,
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
    componentName: defaultConfig.componentName!,
  };
};

/**
 * Gets the element configuration for withElement.
 *
 * @param config - Color picker configuration
 * @returns Element configuration object
 * @category Components
 * @internal
 */
export const getElementConfig = (config: ColorPickerConfig) => {
  const dimensions = getSizeDimensions(config.size || "m");
  const variant = config.variant || COLORPICKER_VARIANTS.INLINE;
  const density = config.density || COLORPICKER_DENSITIES.DEFAULT;

  // Build variant class
  let variantClass: string;
  if (variant === COLORPICKER_VARIANTS.DROPDOWN) {
    variantClass = `${config.prefix}-${COLORPICKER_CLASSES.DROPDOWN}`;
  } else if (variant === COLORPICKER_VARIANTS.DIALOG) {
    variantClass = `${config.prefix}-${COLORPICKER_CLASSES.DIALOG}`;
  } else {
    variantClass = `${config.prefix}-${COLORPICKER_CLASSES.INLINE}`;
  }

  // Build density class
  const densityClass =
    density === COLORPICKER_DENSITIES.COMPACT
      ? `${config.prefix}-${COLORPICKER_CLASSES.COMPACT}`
      : null;

  return {
    tag: "div",
    componentName: config.componentName,
    className: [variantClass, densityClass, config.class].filter(
      Boolean,
    ) as string[],
    style: `width: ${dimensions.width}px`,
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
  size: string,
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
export const createInitialState = (
  config: ColorPickerConfig,
): ColorPickerState => {
  const initialHsv: HSVColor = hexToHsv(
    config.value || COLORPICKER_DEFAULTS.VALUE,
  ) || {
    h: 0,
    s: 100,
    v: 100,
  };

  return {
    hsv: initialHsv,
    hex: normalizeHex(config.value || COLORPICKER_DEFAULTS.VALUE),
    opacity: config.opacity ?? 1,
    isDragging: false,
    dragTarget: null,
    swatches: [],
    isOpen: false,
    refs: {},
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
  config: ColorPickerConfig;
  getClass: (name: string) => string;
  emit: (event: string, data?: unknown) => void;
  on: (event: string, handler: (...args: unknown[]) => void) => unknown;
  off: (event: string, handler: (...args: unknown[]) => void) => unknown;
  disabled: {
    enable: () => void;
    disable: () => void;
    isDisabled: () => boolean;
  };
  lifecycle: {
    destroy: () => void;
  };
  // Optional features
  state?: ColorPickerState;
  area?: {
    updateBackground: () => void;
    updateHandle: () => void;
  };
  hue?: {
    updateHandle: () => void;
  };
  opacity?: {
    updateBackground: () => void;
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
  variant?: {
    open: () => void;
    close: () => void;
    toggle: () => void;
    isOpen: () => boolean;
  };
}) => ({
  element: comp.element,
  config: comp.config,
  getClass: comp.getClass,
  emit: comp.emit,
  on: comp.on,
  off: comp.off,
  disabled: comp.disabled,
  lifecycle: comp.lifecycle,
  state: comp.state,
  area: comp.area,
  hue: comp.hue,
  opacity: comp.opacity,
  swatches: comp.swatches,
  input: comp.input,
  variant: comp.variant,
});

export default defaultConfig;
