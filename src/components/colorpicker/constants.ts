// src/components/colorpicker/constants.ts

/**
 * Color picker component constants
 * @module components/colorpicker
 */

/**
 * Color picker events
 */
export const COLORPICKER_EVENTS = {
  /** Fired when color value changes (committed) */
  CHANGE: "change",
  /** Fired during color selection (live preview) */
  INPUT: "input",
  /** Fired when a swatch is clicked */
  SWATCH_SELECT: "swatchSelect",
  /** Fired when swatches are updated */
  SWATCHES_CHANGE: "swatchesChange",
  /** Fired when picker opens (dropdown/dialog variants) */
  OPEN: "open",
  /** Fired when picker closes (dropdown/dialog variants) */
  CLOSE: "close",
} as const;

/**
 * Color picker variants
 */
export const COLORPICKER_VARIANTS = {
  /** Inline - always visible, no trigger */
  INLINE: "inline",
  /** Dropdown - attached to trigger, opens below/above */
  DROPDOWN: "dropdown",
  /** Dialog - modal overlay centered on screen */
  DIALOG: "dialog",
} as const;

/**
 * Color picker sizes
 */
export const COLORPICKER_SIZES = {
  /** Small - 200px wide */
  S: "s",
  /** Medium - 280px wide (default) */
  M: "m",
  /** Large - 360px wide */
  L: "l",
} as const;

/**
 * Swatch sizes in pixels
 */
export const SWATCH_SIZES = {
  S: 24,
  M: 32,
  L: 40,
} as const;

/**
 * CSS classes used by the color picker component
 */
export const COLORPICKER_CLASSES = {
  ROOT: "colorpicker",

  // Main areas
  AREA: "colorpicker__area",
  AREA_GRADIENT: "colorpicker__area-gradient",
  AREA_HANDLE: "colorpicker__area-handle",

  // Hue slider
  HUE: "colorpicker__hue",
  HUE_SLIDER: "colorpicker__hue-slider",
  HUE_HANDLE: "colorpicker__hue-handle",

  // Swatches
  SWATCHES: "colorpicker__swatches",
  SWATCH: "colorpicker__swatch",
  SWATCH_SELECTED: "colorpicker__swatch--selected",
  SWATCH_ADD: "colorpicker__swatch--add",

  // Preview and value
  PREVIEW: "colorpicker__preview",
  VALUE: "colorpicker__value",
  VALUE_INPUT: "colorpicker__value-input",

  // Container for dropdown/dialog variants
  CONTAINER: "colorpicker__container",
  BACKDROP: "colorpicker__backdrop",

  // States
  DISABLED: "colorpicker--disabled",
  DRAGGING: "colorpicker--dragging",
  OPEN: "colorpicker--open",
  POSITION_TOP: "colorpicker--position-top",

  // Variants
  INLINE: "colorpicker--inline",
  DROPDOWN: "colorpicker--dropdown",
  DIALOG: "colorpicker--dialog",
} as const;

/**
 * Default color picker configuration
 */
export const COLORPICKER_DEFAULTS = {
  /** Default color value */
  VALUE: "#ff0000",
  /** Default component size */
  SIZE: COLORPICKER_SIZES.M,
  /** Default swatch size */
  SWATCH_SIZE: SWATCH_SIZES.M,
  /** Whether to show the hex input */
  SHOW_INPUT: true,
  /** Whether to show the preview square */
  SHOW_PREVIEW: true,
  /** Whether to show swatches */
  SHOW_SWATCHES: true,
  /** Maximum number of swatches */
  MAX_SWATCHES: 8,
  /** Default variant */
  VARIANT: COLORPICKER_VARIANTS.INLINE,
  /** Close on swatch select (dropdown/dialog) */
  CLOSE_ON_SELECT: true,
} as const;

/**
 * Size dimensions in pixels
 */
export const SIZE_DIMENSIONS = {
  [COLORPICKER_SIZES.S]: {
    width: 200,
    areaHeight: 120,
    hueHeight: 16,
  },
  [COLORPICKER_SIZES.M]: {
    width: 280,
    areaHeight: 160,
    hueHeight: 20,
  },
  [COLORPICKER_SIZES.L]: {
    width: 360,
    areaHeight: 200,
    hueHeight: 24,
  },
} as const;

/**
 * Vibrant palette swatch keys in order of preference
 */
export const PALETTE_SWATCH_ORDER = [
  "Vibrant",
  "Muted",
  "DarkVibrant",
  "DarkMuted",
  "LightVibrant",
  "LightMuted",
] as const;

// Type exports
export type ColorPickerEvent =
  (typeof COLORPICKER_EVENTS)[keyof typeof COLORPICKER_EVENTS];
export type ColorPickerSize =
  (typeof COLORPICKER_SIZES)[keyof typeof COLORPICKER_SIZES];
export type ColorPickerVariant =
  (typeof COLORPICKER_VARIANTS)[keyof typeof COLORPICKER_VARIANTS];
export type SwatchSize = (typeof SWATCH_SIZES)[keyof typeof SWATCH_SIZES];
