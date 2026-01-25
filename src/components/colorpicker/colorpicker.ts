// src/components/colorpicker/colorpicker.ts

import { COLORPICKER_CLASSES, COLORPICKER_VARIANTS } from "./constants";
import {
  ColorPickerConfig,
  ColorPickerComponent,
  ColorPickerState,
} from "./types";
import {
  createBaseConfig,
  getSizeDimensions,
  createInitialState,
} from "./config";
import { withArea } from "./features/area";
import { withHue } from "./features/hue";
import { withSwatches } from "./features/swatches";
import { withInput } from "./features/input";
import { withPopup } from "./features/popup";
import { withAPI } from "./api";

/**
 * Base component interface before features are applied
 */
interface BaseComponent {
  element: HTMLElement;
  pickerContent: HTMLElement;
  state: ColorPickerState;
  config: ColorPickerConfig;
  dimensions: ReturnType<typeof getSizeDimensions>;
  getClass: (name: string) => string;
  emit: (event: string, ...args: unknown[]) => void;
  handlers: Record<string, Array<(...args: unknown[]) => void>>;
  disabled: {
    enable: () => void;
    disable: () => void;
    isDisabled: () => boolean;
  };
  lifecycle: {
    destroy: () => void;
  };
  updateUI?: () => void;
}

/**
 * Creates the base component structure
 */
const createBaseComponent = (config: ColorPickerConfig): BaseComponent => {
  const prefix = config.prefix || "mtrl";
  const getClass = (name: string): string => `${prefix}-${name}`;

  // Create state
  const state = createInitialState(config);

  // Get dimensions based on size
  const dimensions = getSizeDimensions(config.size || "m");

  // Event handlers registry
  const handlers: Record<string, Array<(...args: unknown[]) => void>> = {};

  /**
   * Emit an event to all registered handlers
   */
  const emit = (event: string, ...args: unknown[]): void => {
    const eventHandlers = handlers[event];
    if (eventHandlers) {
      eventHandlers.forEach((handler) => handler(...args));
    }
  };

  // Create root element
  const element = document.createElement("div");
  element.className = getClass(COLORPICKER_CLASSES.ROOT);

  if (config.class) {
    element.classList.add(config.class);
  }

  // Add variant class
  const variant = config.variant || COLORPICKER_VARIANTS.INLINE;
  if (variant === COLORPICKER_VARIANTS.DROPDOWN) {
    element.classList.add(getClass(COLORPICKER_CLASSES.DROPDOWN));
  } else if (variant === COLORPICKER_VARIANTS.DIALOG) {
    element.classList.add(getClass(COLORPICKER_CLASSES.DIALOG));
  } else {
    element.classList.add(getClass(COLORPICKER_CLASSES.INLINE));
  }

  // Create picker content container
  // For popup variants, this will be moved into the popup element
  const pickerContent = element;
  pickerContent.style.width = `${dimensions.width}px`;

  // Disabled state management
  let isDisabled = config.disabled || false;

  const disabled = {
    enable: () => {
      isDisabled = false;
      element.classList.remove(getClass(COLORPICKER_CLASSES.DISABLED));
    },
    disable: () => {
      isDisabled = true;
      element.classList.add(getClass(COLORPICKER_CLASSES.DISABLED));
    },
    isDisabled: () => isDisabled,
  };

  // Apply initial disabled state
  if (isDisabled) {
    element.classList.add(getClass(COLORPICKER_CLASSES.DISABLED));
  }

  // Lifecycle management
  const cleanupFunctions: Array<() => void> = [];

  const lifecycle = {
    destroy: () => {
      // Run all cleanup functions
      cleanupFunctions.forEach((fn) => fn());
      cleanupFunctions.length = 0;

      // Clear handlers
      Object.keys(handlers).forEach((key) => {
        handlers[key] = [];
      });

      // Remove element
      element.remove();
    },
  };

  return {
    element,
    pickerContent,
    state,
    config,
    dimensions,
    getClass,
    emit,
    handlers,
    disabled,
    lifecycle,
  };
};

/**
 * Creates a ColorPicker component
 *
 * A color picker with optional saturation/brightness area, hue slider,
 * hex input, and color swatches. Supports inline, dropdown, and dialog variants.
 *
 * @param config - Configuration options
 * @returns ColorPicker component instance
 *
 * @example
 * ```ts
 * // Inline variant (default) - always visible
 * const picker = createColorPicker({
 *   value: '#ff5722',
 *   swatches: ['#f44336', '#e91e63', '#9c27b0'],
 *   onChange: (color) => console.log('Color:', color)
 * });
 * document.body.appendChild(picker.element);
 *
 * // Dropdown variant with trigger element
 * const dropdown = createColorPicker({
 *   variant: 'dropdown',
 *   trigger: document.getElementById('color-button'),
 *   value: '#ff5722',
 *   onChange: (color) => console.log('Color:', color)
 * });
 *
 * // Minimal picker with only swatches
 * const swatchPicker = createColorPicker({
 *   variant: 'dropdown',
 *   trigger: myButton,
 *   showArea: false,
 *   showHue: false,
 *   showInput: false,
 *   swatches: ['#ff0000', '#00ff00', '#0000ff']
 * });
 *
 * // Dialog variant with all features
 * const dialog = createColorPicker({
 *   variant: 'dialog',
 *   trigger: document.getElementById('color-button'),
 *   value: '#ff5722',
 *   size: 'l'
 * });
 * ```
 */
const createColorPicker = (
  config: ColorPickerConfig = {},
): ColorPickerComponent => {
  // Merge with defaults
  const fullConfig = createBaseConfig(config);

  // Create base component
  let component: any = createBaseComponent(fullConfig);

  // Determine which features to apply based on config
  const isPopup =
    fullConfig.variant === COLORPICKER_VARIANTS.DROPDOWN ||
    fullConfig.variant === COLORPICKER_VARIANTS.DIALOG;

  // Apply popup feature first if needed (it restructures the DOM)
  if (isPopup) {
    component = withPopup()(component);
  }

  // Apply optional features based on config
  if (fullConfig.showArea !== false) {
    component = withArea()(component);
  }

  if (fullConfig.showHue !== false) {
    component = withHue()(component);
  }

  if (fullConfig.showInput !== false || fullConfig.showPreview !== false) {
    component = withInput()(component);
  }

  if (fullConfig.showSwatches !== false) {
    component = withSwatches()(component);
  }

  // Create updateUI function that updates all features
  const updateUI = (): void => {
    component.area?.updateBackground?.();
    component.area?.updateHandle?.();
    component.hue?.updateHandle?.();
    component.input?.update?.();
    component.swatches?.update?.();
  };

  // Attach updateUI to component for features to use
  component.updateUI = updateUI;

  // Apply API wrapper
  const apiConfig = {
    element: component.element,
    state: component.state,
    disabled: component.disabled,
    lifecycle: component.lifecycle,
    getClass: component.getClass,
    emit: component.emit,
    handlers: component.handlers,
    area: component.area,
    hue: component.hue,
    swatches: component.swatches,
    input: component.input,
    popup: component.popup,
    config: fullConfig,
  };

  const colorPicker = withAPI(apiConfig)(component);

  // Initial UI update for inline variant
  if (!isPopup) {
    updateUI();
  }

  return colorPicker;
};

export default createColorPicker;
