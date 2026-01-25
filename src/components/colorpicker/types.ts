// src/components/colorpicker/types.ts

import { ColorPickerSize, ColorPickerVariant, SwatchSize } from "./constants";

/**
 * HSV color representation
 */
export interface HSVColor {
  /** Hue (0-360) */
  h: number;
  /** Saturation (0-100) */
  s: number;
  /** Value/Brightness (0-100) */
  v: number;
}

/**
 * RGB color representation
 */
export interface RGBColor {
  /** Red (0-255) */
  r: number;
  /** Green (0-255) */
  g: number;
  /** Blue (0-255) */
  b: number;
}

/**
 * Color swatch definition
 */
export interface ColorSwatch {
  /** Hex color value */
  color: string;
  /** Optional label for the swatch */
  label?: string;
  /** Whether this swatch is selected */
  selected?: boolean;
}

/**
 * Configuration interface for the ColorPicker component
 */
export interface ColorPickerConfig {
  /**
   * Initial color value (hex format)
   * @default '#ff0000'
   */
  value?: string;

  /**
   * Display variant
   * - 'inline': Always visible, no trigger (default)
   * - 'dropdown': Attached to trigger element, opens below/above
   * - 'dialog': Modal overlay centered on screen
   * @default 'inline'
   */
  variant?: ColorPickerVariant | string;

  /**
   * Trigger element for dropdown/dialog variants
   * The picker will position relative to this element (dropdown)
   * or use it to toggle open/close (both)
   */
  trigger?: HTMLElement;

  /**
   * Whether to close on swatch select (dropdown/dialog variants)
   * @default true
   */
  closeOnSelect?: boolean;

  /**
   * Whether to show the saturation/brightness area
   * @default true
   */
  showArea?: boolean;

  /**
   * Whether to show the hue slider
   * @default true
   */
  showHue?: boolean;

  /**
   * Component size
   * @default 'm'
   */
  size?: ColorPickerSize | string;

  /**
   * Swatch size in pixels
   * @default 32
   */
  swatchSize?: SwatchSize | number;

  /**
   * Predefined color swatches
   */
  swatches?: string[] | ColorSwatch[];

  /**
   * Whether to show the hex input field
   * @default true
   */
  showInput?: boolean;

  /**
   * Whether to show the color preview square
   * @default true
   */
  showPreview?: boolean;

  /**
   * Whether to show the swatches row
   * @default true
   */
  showSwatches?: boolean;

  /**
   * Maximum number of swatches to display
   * @default 8
   */
  maxSwatches?: number;

  /**
   * Whether the color picker is disabled
   * @default false
   */
  disabled?: boolean;

  /**
   * Additional CSS class for the root element
   */
  class?: string;

  /**
   * Component prefix for class names
   * @default 'mtrl'
   */
  prefix?: string;

  /**
   * Callback when color changes (committed)
   */
  onChange?: (color: string) => void;

  /**
   * Callback during color selection (live preview)
   */
  onInput?: (color: string) => void;
}

/**
 * Internal state for the color picker
 */
export interface ColorPickerState {
  /** Current HSV color */
  hsv: HSVColor;
  /** Current hex color */
  hex: string;
  /** Whether the user is currently dragging */
  isDragging: boolean;
  /** Current drag target ('area' | 'hue' | null) */
  dragTarget: "area" | "hue" | null;
  /** Available swatches */
  swatches: ColorSwatch[];
  /** Whether the picker is open (dropdown/dialog variants) */
  isOpen: boolean;
}

/**
 * Color picker component interface
 */
export interface ColorPickerComponent {
  /** The root DOM element */
  element: HTMLElement;

  /**
   * Gets the current color value (hex format)
   * @returns Hex color string
   */
  getValue: () => string;

  /**
   * Sets the color value
   * @param color - Hex color string
   * @returns The component for chaining
   */
  setValue: (color: string) => ColorPickerComponent;

  /**
   * Gets the current HSV color
   * @returns HSV color object
   */
  getHSV: () => HSVColor;

  /**
   * Sets the color from HSV values
   * @param hsv - HSV color object
   * @returns The component for chaining
   */
  setHSV: (hsv: HSVColor) => ColorPickerComponent;

  /**
   * Gets the current RGB color
   * @returns RGB color object
   */
  getRGB: () => RGBColor;

  /**
   * Sets the color from RGB values
   * @param rgb - RGB color object
   * @returns The component for chaining
   */
  setRGB: (rgb: RGBColor) => ColorPickerComponent;

  /**
   * Sets the swatches
   * @param swatches - Array of hex colors or swatch objects
   * @returns The component for chaining
   */
  setSwatches: (swatches: string[] | ColorSwatch[]) => ColorPickerComponent;

  /**
   * Gets the current swatches
   * @returns Array of swatch objects
   */
  getSwatches: () => ColorSwatch[];

  /**
   * Adds a swatch
   * @param color - Hex color to add
   * @param label - Optional label
   * @returns The component for chaining
   */
  addSwatch: (color: string, label?: string) => ColorPickerComponent;

  /**
   * Removes a swatch
   * @param color - Hex color to remove
   * @returns The component for chaining
   */
  removeSwatch: (color: string) => ColorPickerComponent;

  /**
   * Clears all swatches
   * @returns The component for chaining
   */
  clearSwatches: () => ColorPickerComponent;

  /**
   * Enables the color picker
   * @returns The component for chaining
   */
  enable: () => ColorPickerComponent;

  /**
   * Disables the color picker
   * @returns The component for chaining
   */
  disable: () => ColorPickerComponent;

  /**
   * Checks if the color picker is disabled
   * @returns True if disabled
   */
  isDisabled: () => boolean;

  /**
   * Adds an event listener
   * @param event - Event name
   * @param handler - Event handler
   * @returns The component for chaining
   */
  on: (
    event: string,
    handler: (...args: unknown[]) => void,
  ) => ColorPickerComponent;

  /**
   * Removes an event listener
   * @param event - Event name
   * @param handler - Event handler
   * @returns The component for chaining
   */
  off: (
    event: string,
    handler: (...args: unknown[]) => void,
  ) => ColorPickerComponent;

  /**
   * Opens the color picker (dropdown/dialog variants only)
   * @returns The component for chaining
   */
  open: () => ColorPickerComponent;

  /**
   * Closes the color picker (dropdown/dialog variants only)
   * @returns The component for chaining
   */
  close: () => ColorPickerComponent;

  /**
   * Toggles the color picker open/closed (dropdown/dialog variants only)
   * @returns The component for chaining
   */
  toggle: () => ColorPickerComponent;

  /**
   * Checks if the color picker is open (dropdown/dialog variants)
   * @returns True if open
   */
  isOpen: () => boolean;

  /**
   * Destroys the component and cleans up resources
   */
  destroy: () => void;
}
