// src/components/colorpicker/features/swatches.ts

import { COLORPICKER_CLASSES, COLORPICKER_EVENTS } from "../constants";
import { ColorPickerConfig, ColorPickerState, ColorSwatch } from "../types";
import { normalizeHex, hexToHsv, hsvToHex } from "../utils";
import { createInitialState } from "../config";

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
 * @param config - Color picker configuration
 * @returns Component enhancer function
 */
export const withSwatches =
  (config: ColorPickerConfig) =>
  <
    T extends {
      element: HTMLElement;
      getClass: (name: string) => string;
      emit: (event: string, data?: unknown) => void;
      state?: ColorPickerState;
      pickerContent?: HTMLElement;
      variant?: {
        close: () => void;
      };
      area?: {
        updateBackground: () => void;
        updateHandle: () => void;
      };
      hue?: {
        updateHandle: () => void;
      };
      input?: {
        update: () => void;
      };
    },
  >(
    component: T,
  ): T & { swatches: SwatchesFeature; state: ColorPickerState } => {
    const { element, getClass, emit } = component;

    // Initialize state if not present
    const state: ColorPickerState =
      component.state || createInitialState(config);

    // Use pickerContent if available (for dropdown/dialog), otherwise use element
    const container = component.pickerContent || element;

    const swatchSize = config.swatchSize || 32;
    const maxSwatches = config.maxSwatches || 8;

    // Initialize swatches from config
    if (config.swatches) {
      state.swatches = normalizeSwatches(config.swatches, maxSwatches);
    }

    // Create swatches container
    const swatchesContainer = document.createElement("div");
    swatchesContainer.className = getClass(COLORPICKER_CLASSES.SWATCHES);
    container.appendChild(swatchesContainer);

    /**
     * Update all UI features
     */
    const updateAllUI = (): void => {
      component.area?.updateBackground?.();
      component.area?.updateHandle?.();
      component.hue?.updateHandle?.();
      state.refs.opacity?.updateBackground?.();
      state.refs.opacity?.updateHandle?.();
      state.refs.input?.update?.();
      update();
    };

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

        // Update all UI
        updateAllUI();

        // Emit change event
        emit(COLORPICKER_EVENTS.CHANGE, state.hex);
        config.onChange?.(state.hex);
      }

      emit(COLORPICKER_EVENTS.SWATCH_SELECT, swatch.color);

      // Close dropdown/dialog if configured
      if (config.closeOnSelect && component.variant) {
        component.variant.close();
      }
    };

    /**
     * Update the swatches display
     */
    const update = (): void => {
      swatchesContainer.innerHTML = "";

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

        swatchEl.addEventListener("click", (e) => {
          e.stopPropagation();
          handleSwatchClick(swatch);
        });

        swatchesContainer.appendChild(swatchEl);
      });
    };

    /**
     * Set swatches array
     */
    const set = (swatches: string[] | ColorSwatch[]): void => {
      state.swatches = normalizeSwatches(swatches, maxSwatches);
      update();
      emit(COLORPICKER_EVENTS.SWATCHES_CHANGE, state.swatches);
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
      emit(COLORPICKER_EVENTS.SWATCHES_CHANGE, state.swatches);
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
      emit(COLORPICKER_EVENTS.SWATCHES_CHANGE, state.swatches);
    };

    /**
     * Clear all swatches
     */
    const clear = (): void => {
      state.swatches = [];
      update();
      emit(COLORPICKER_EVENTS.SWATCHES_CHANGE, state.swatches);
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
      element: swatchesContainer,
      update,
      set,
      add,
      remove,
      clear,
      get,
    };

    return {
      ...component,
      state,
      swatches: swatchesFeature,
    };
  };
