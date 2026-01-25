// src/components/colorpicker/features/hue.ts

import { createSlider } from "mtrl";
import { COLORPICKER_CLASSES, COLORPICKER_EVENTS } from "../constants";
import { ColorPickerState } from "../types";
import { hsvToHex } from "../utils";

/**
 * Component interface for hue feature
 */
interface HueComponent {
  element: HTMLElement;
  state: ColorPickerState;
  getClass: (name: string) => string;
  emit: (event: string, ...args: unknown[]) => void;
  config: {
    disabled?: boolean;
    onInput?: (color: string) => void;
    onChange?: (color: string) => void;
    prefix?: string;
  };
  pickerContent: HTMLElement;
  updateUI?: () => void;
  area?: {
    element: HTMLElement;
    updateBackground: () => void;
    updateHandle: () => void;
  };
}

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
 * @returns Component enhancer function
 */
export const withHue =
  () =>
  <T extends HueComponent>(component: T): T & { hue: HueFeature } => {
    const { getClass, state, pickerContent } = component;

    // Create slider synchronously
    const sliderComponent = createSlider({
      min: 0,
      max: 360,
      value: state.hsv.h,
      step: 1,
      showValue: false,
      disabled: component.config.disabled,
      size: "XS",
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
        pickerContent.appendChild(sliderComponent.element);
      }
    }

    /**
     * Update the slider position based on current hue
     */
    const updateHandle = (): void => {
      // Don't trigger events when updating programmatically
      sliderComponent.setValue(state.hsv.h, false);
    };

    /**
     * Handle slider input (live preview while dragging)
     */
    const handleInput = (event: { value: number }): void => {
      const h = Math.round(event.value);
      state.hsv.h = h;
      state.hex = hsvToHex(state.hsv.h, state.hsv.s, state.hsv.v);

      // Update UI
      if (component.updateUI) {
        component.updateUI();
      } else {
        // Update area background if area feature exists
        if (component.area) {
          component.area.updateBackground();
          component.area.updateHandle();
        }
      }

      component.emit(COLORPICKER_EVENTS.INPUT, state.hex);
      component.config.onInput?.(state.hex);
    };

    /**
     * Handle slider change (committed value)
     */
    const handleChange = (event: { value: number }): void => {
      const h = Math.round(event.value);
      state.hsv.h = h;
      state.hex = hsvToHex(state.hsv.h, state.hsv.s, state.hsv.v);

      // Update UI
      if (component.updateUI) {
        component.updateUI();
      }

      component.emit(COLORPICKER_EVENTS.CHANGE, state.hex);
      component.config.onChange?.(state.hex);
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
      hue: hueFeature,
    };
  };
