// src/components/colorpicker/features/hue.ts

import { createSlider } from "mtrl";
import { COLORPICKER_CLASSES, COLORPICKER_EVENTS } from "../constants";
import { ColorPickerConfig, ColorPickerState } from "../types";
import { hsvToHex } from "../utils";
import { createInitialState } from "../config";

/**
 * Hue feature interface
 */
export interface HueFeature {
  element: HTMLElement;
  slider: ReturnType<typeof createSlider>;
  updateHandle: () => void;
}

/**
 * Adds the hue slider to a color picker component using mtrl slider
 *
 * @param config - Color picker configuration
 * @returns Component enhancer function
 */
export const withHue =
  (config: ColorPickerConfig) =>
  <
    T extends {
      element: HTMLElement;
      getClass: (name: string) => string;
      emit: (event: string, data?: unknown) => void;
      state?: ColorPickerState;
      pickerContent?: HTMLElement;
      area?: {
        element: HTMLElement;
        updateBackground: () => void;
        updateHandle: () => void;
      };
    },
  >(
    component: T,
  ): T & { hue: HueFeature; state: ColorPickerState } => {
    const { element, getClass, emit } = component;

    // Initialize state if not present
    const state: ColorPickerState =
      component.state || createInitialState(config);

    // Use pickerContent if available (for dropdown/dialog), otherwise use element
    const container = component.pickerContent || element;

    // Create slider
    const sliderComponent = createSlider({
      min: 0,
      max: 360,
      value: state.hsv.h,
      step: 1,
      showValue: false,
      disabled: config.disabled,
      size: "S",
      class: getClass("colorpicker__hue-slider"),
    });

    // Add hue class to slider element
    if (sliderComponent.element) {
      sliderComponent.element.classList.add(getClass(COLORPICKER_CLASSES.HUE));

      // Insert after area element if it exists, otherwise append
      if (component.area?.element) {
        component.area.element.insertAdjacentElement(
          "afterend",
          sliderComponent.element,
        );
      } else {
        container.appendChild(sliderComponent.element);
      }
    }

    /**
     * Update the slider position based on current hue
     */
    const updateHandle = (): void => {
      sliderComponent.setValue(state.hsv.h, false);
    };

    /**
     * Handle slider input (live preview while dragging)
     */
    const handleInput = (event: { value: number }): void => {
      const h = Math.round(event.value);
      state.hsv.h = h;
      state.hex = hsvToHex(state.hsv.h, state.hsv.s, state.hsv.v);

      // Update area if present
      if (component.area) {
        component.area.updateBackground();
        component.area.updateHandle();
      }

      emit(COLORPICKER_EVENTS.INPUT, state.hex);
      config.onInput?.(state.hex);
    };

    /**
     * Handle slider change (committed value)
     */
    const handleChange = (event: { value: number }): void => {
      const h = Math.round(event.value);
      state.hsv.h = h;
      state.hex = hsvToHex(state.hsv.h, state.hsv.s, state.hsv.v);

      // Update area if present
      if (component.area) {
        component.area.updateBackground();
        component.area.updateHandle();
      }

      emit(COLORPICKER_EVENTS.CHANGE, state.hex);
      config.onChange?.(state.hex);
    };

    // Handle events
    sliderComponent.on("input", handleInput);
    sliderComponent.on("change", handleChange);

    // Create hue feature object
    const hueFeature: HueFeature = {
      element: sliderComponent.element,
      slider: sliderComponent,
      updateHandle,
    };

    // Extend lifecycle destroy if it exists
    const originalDestroy = (component as any).lifecycle?.destroy;
    if (originalDestroy) {
      (component as any).lifecycle.destroy = () => {
        sliderComponent.destroy();
        originalDestroy();
      };
    }

    return {
      ...component,
      state,
      hue: hueFeature,
    };
  };
