// src/components/colorpicker/features/swatches.ts

import { COLORPICKER_CLASSES, COLORPICKER_EVENTS } from "../constants";
import { ColorPickerState, ColorSwatch } from "../types";
import { normalizeHex, hexToHsv } from "../utils";

/**
 * Component interface for swatches feature
 */
interface SwatchesComponent {
  element: HTMLElement;
  state: ColorPickerState;
  getClass: (name: string) => string;
  emit: (event: string, ...args: unknown[]) => void;
  config: {
    disabled?: boolean;
    swatchSize?: number;
    maxSwatches?: number;
    swatches?: string[] | ColorSwatch[];
    closeOnSelect?: boolean;
    onChange?: (color: string) => void;
    prefix?: string;
  };
  updateUI?: () => void;
  pickerContent: HTMLElement;
  setColor?: (hex: string, emitChange: boolean) => void;
  popup?: {
    close: () => void;
  };
}

/**
 * Swatches feature interface
 */
export interface SwatchesFeature {
  element: HTMLElement;
  update: () => void;
  set: (swatches: string[] | ColorSwatch[]) => void;
  add: (color: string, label?: string) => void;
  remove: (color: string) => void;
  clear: () => void;
  get: () => ColorSwatch[];
}

/**
 * Normalize swatches array to ColorSwatch objects
 */
const normalizeSwatches = (
  swatches: string[] | ColorSwatch[],
  maxSwatches: number,
): ColorSwatch[] => {
  return swatches.slice(0, maxSwatches).map((s) => {
    if (typeof s === "string") {
      return { color: normalizeHex(s), selected: false };
    }
    return { ...s, color: normalizeHex(s.color) };
  });
};

/**
 * Adds swatches (color presets) to a color picker component
 *
 * @returns Component enhancer function
 */
export const withSwatches =
  () =>
  <T extends SwatchesComponent>(
    component: T,
  ): T & { swatches: SwatchesFeature } => {
    const { getClass, state, config, pickerContent } = component;

    const swatchSize = config.swatchSize || 32;
    const maxSwatches = config.maxSwatches || 8;

    // Initialize swatches from config
    if (config.swatches) {
      state.swatches = normalizeSwatches(config.swatches, maxSwatches);
    }

    // Create swatches container
    const container = document.createElement("div");
    container.className = getClass(COLORPICKER_CLASSES.SWATCHES);
    pickerContent.appendChild(container);

    /**
     * Handle swatch click
     */
    const handleSwatchClick = (swatch: ColorSwatch): void => {
      if (config.disabled) return;

      // Update state directly
      const hsv = hexToHsv(swatch.color);
      if (hsv) {
        state.hsv = hsv;
        state.hex = normalizeHex(swatch.color);

        // Update UI if available
        if (component.updateUI) {
          component.updateUI();
        }

        // Emit change event
        component.emit(COLORPICKER_EVENTS.CHANGE, state.hex);
        config.onChange?.(state.hex);
      }

      component.emit(COLORPICKER_EVENTS.SWATCH_SELECT, swatch.color);

      // Close popup if configured
      if (config.closeOnSelect && component.popup) {
        component.popup.close();
      }
    };

    /**
     * Update the swatches display
     */
    const update = (): void => {
      container.innerHTML = "";

      state.swatches.forEach((swatch) => {
        const swatchEl = document.createElement("button");
        swatchEl.type = "button";
        swatchEl.className = getClass(COLORPICKER_CLASSES.SWATCH);
        swatchEl.style.backgroundColor = swatch.color;

        // Mark as selected if matches current color
        if (swatch.color.toLowerCase() === state.hex.toLowerCase()) {
          swatchEl.classList.add(getClass(COLORPICKER_CLASSES.SWATCH_SELECTED));
        }

        // Add tooltip if label exists
        if (swatch.label) {
          swatchEl.title = swatch.label;
        }

        swatchEl.addEventListener("click", () => handleSwatchClick(swatch));

        container.appendChild(swatchEl);
      });
    };

    /**
     * Set swatches array
     */
    const set = (swatches: string[] | ColorSwatch[]): void => {
      state.swatches = normalizeSwatches(swatches, maxSwatches);
      update();
      component.emit(COLORPICKER_EVENTS.SWATCHES_CHANGE, state.swatches);
    };

    /**
     * Add a swatch
     */
    const add = (color: string, label?: string): void => {
      if (state.swatches.length >= maxSwatches) {
        state.swatches.shift();
      }
      state.swatches.push({
        color: normalizeHex(color),
        label,
        selected: false,
      });
      update();
      component.emit(COLORPICKER_EVENTS.SWATCHES_CHANGE, state.swatches);
    };

    /**
     * Remove a swatch by color
     */
    const remove = (color: string): void => {
      const normalizedColor = normalizeHex(color);
      state.swatches = state.swatches.filter(
        (s) => s.color.toLowerCase() !== normalizedColor.toLowerCase(),
      );
      update();
      component.emit(COLORPICKER_EVENTS.SWATCHES_CHANGE, state.swatches);
    };

    /**
     * Clear all swatches
     */
    const clear = (): void => {
      state.swatches = [];
      update();
      component.emit(COLORPICKER_EVENTS.SWATCHES_CHANGE, state.swatches);
    };

    /**
     * Get current swatches
     */
    const get = (): ColorSwatch[] => {
      return [...state.swatches];
    };

    // Initial render
    update();

    // Create swatches feature object
    const swatchesFeature: SwatchesFeature = {
      element: container,
      update,
      set,
      add,
      remove,
      clear,
      get,
    };

    return {
      ...component,
      swatches: swatchesFeature,
    };
  };
