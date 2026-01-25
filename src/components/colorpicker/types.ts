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
   * Whether to show the opacity/alpha slider
   * @default false
   */
  showOpacity?: boolean;

  /**
   * Initial opacity value (0-1)
   * @default 1
   */
  opacity?: number;

  /**
   * Component size
   * @default 'm'
   */
  size?: ColorPickerSize | string;

  /**
   * Component density
   * - 'default': Standard layout with gaps and padding
   * - 'compact': Minimal layout, hue bar directly under area, no input/preview
   * @default 'default'
   */
  density?: "default" | "compact";

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
   * Label for the input field
   * @default 'Hex'
   */
  inputLabel?: string;

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
   * Component name for class generation
   * @default 'colorpicker'
   * @internal
   */
  componentName?: string;

  /**
   * Callback when color changes (committed)
   */
  onChange?: (color: string) => void;

  /**
   * Callback during color selection (live preview)
   */
  onInput?: (color: string) => void;

  /**
   * Whether to show the pipette button
   * @default true (when native API supported or imageSource provided)
   */
  showPipette?: boolean;

  /**
   * Image source for canvas-based pipette sampling
   * Can be an HTMLImageElement, URL string, or null
   * When provided, clicking pipette will sample from this image
   * When not provided and native EyeDropper API is available, uses that instead
   */
  imageSource?: HTMLImageElement | string | null;

  /**
   * Callback when pipette sampling starts
   */
  onPipetteStart?: () => void;

  /**
   * Callback when pipette sampling ends
   * @param color - The picked color (hex) or null if cancelled
   */
  onPipetteEnd?: (color: string | null) => void;
}

/**
 * Feature references for cross-feature updates
 */
export interface ColorPickerRefs {
  input?: { update: () => void };
  opacity?: { updateBackground: () => void; updateHandle: () => void };
  area?: { updateBackground: () => void; updateHandle: () => void };
  hue?: { updateHandle: () => void };
  swatches?: { update: () => void };
}

/**
 * Internal state for the color picker
 */
export interface ColorPickerState {
  /** Current HSV color */
  hsv: HSVColor;
  /** Current hex color */
  hex: string;
  /** Current opacity/alpha value (0-1) */
  opacity: number;
  /** Whether the user is currently dragging */
  isDragging: boolean;
  /** Current drag target ('area' | 'hue' | 'opacity' | null) */
  dragTarget: "area" | "hue" | "opacity" | null;
  /** Available swatches */
  swatches: ColorSwatch[];
  /** Whether the picker is open (dropdown/dialog variants) */
  isOpen: boolean;
  /** Mutable refs to features for cross-feature updates */
  refs: ColorPickerRefs;
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

  // ============= Pipette Methods =============

  /**
   * Start pipette color picking
   * Uses native EyeDropper API when available, or canvas sampling from imageSource
   * @returns Promise resolving to picked color (hex) or null if cancelled
   */
  pickColor: () => Promise<string | null>;

  /**
   * Set the image source for canvas-based pipette sampling
   * @param source - HTMLImageElement, URL string, or null
   * @returns The component for chaining
   */
  setImageSource: (
    source: HTMLImageElement | string | null,
  ) => ColorPickerComponent;

  /**
   * Check if pipette is currently sampling
   * @returns True if sampling is in progress
   */
  isSampling: () => boolean;

  // ============= Opacity Methods =============

  /**
   * Gets the current opacity value
   * @returns Opacity value (0-1)
   */
  getOpacity: () => number;

  /**
   * Sets the opacity value
   * @param opacity - Opacity value (0-1)
   * @returns The component for chaining
   */
  setOpacity: (opacity: number) => ColorPickerComponent;

  /**
   * Destroys the component and cleans up resources
   */
  destroy: () => void;
}
