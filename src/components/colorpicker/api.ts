// src/components/colorpicker/api.ts

import {
  ColorPickerComponent,
  ColorPickerConfig,
  ColorPickerState,
  ColorSwatch,
  HSVColor,
  RGBColor,
} from "./types";
import { hexToHsv, hexToRgb, hsvToHex, rgbToHex, normalizeHex } from "./utils";
import { COLORPICKER_EVENTS } from "./constants";
import { AreaFeature } from "./features/area";
import { HueFeature } from "./features/hue";
import { SwatchesFeature } from "./features/swatches";
import { InputFeature } from "./features/input";
import { VariantFeature } from "./features/variant";
import { PipetteFeature } from "./features/pipette";

/**
 * API configuration options for color picker component
 * @category Components
 * @internal
 */
interface ApiOptions {
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
  area?: AreaFeature;
  hue?: HueFeature;
  swatches?: SwatchesFeature;
  input?: InputFeature;
  variant?: VariantFeature;
  pipette?: PipetteFeature;
}

/**
 * Enhances a color picker component with API methods.
 * This follows the higher-order function pattern to add public API methods
 * to the component, making them available to the end user.
 *
 * @param options - API configuration options
 * @returns Higher-order function that adds API methods to component
 * @category Components
 * @internal
 */
export const withAPI =
  (options: ApiOptions) =>
  (component: unknown): ColorPickerComponent => {
    const {
      element,
      config,
      getClass,
      emit,
      on,
      off,
      disabled,
      lifecycle,
      state,
      area,
      hue,
      swatches,
      input,
      variant,
      pipette,
    } = options;

    // Ensure state exists
    if (!state) {
      throw new Error("ColorPicker: state is required");
    }

    /**
     * Update all UI elements
     */
    const updateUI = (): void => {
      area?.updateBackground();
      area?.updateHandle();
      hue?.updateHandle();
      input?.update();
      swatches?.update();
    };

    /**
     * Set color from hex value
     */
    const setColor = (hex: string, emitChange: boolean = false): void => {
      const hsv = hexToHsv(hex);
      if (!hsv) return;

      state.hsv = hsv;
      state.hex = normalizeHex(hex);
      updateUI();

      if (emitChange) {
        emit(COLORPICKER_EVENTS.CHANGE, state.hex);
        config.onChange?.(state.hex);
      }
    };

    /**
     * Set color from HSV values
     */
    const setHSVInternal = (
      hsv: HSVColor,
      emitChange: boolean = false,
    ): void => {
      state.hsv = {
        h: Math.max(0, Math.min(360, hsv.h)),
        s: Math.max(0, Math.min(100, hsv.s)),
        v: Math.max(0, Math.min(100, hsv.v)),
      };
      state.hex = hsvToHex(state.hsv.h, state.hsv.s, state.hsv.v);
      updateUI();

      if (emitChange) {
        emit(COLORPICKER_EVENTS.CHANGE, state.hex);
        config.onChange?.(state.hex);
      }
    };

    // Build the component API
    const colorPickerComponent: ColorPickerComponent = {
      element,

      // ============= Value Methods =============

      getValue: () => state.hex,

      setValue: (color: string) => {
        setColor(color, false);
        return colorPickerComponent;
      },

      getHSV: () => ({ ...state.hsv }),

      setHSV: (hsv: HSVColor) => {
        setHSVInternal(hsv, false);
        return colorPickerComponent;
      },

      getRGB: (): RGBColor => {
        const rgb = hexToRgb(state.hex);
        return rgb || { r: 0, g: 0, b: 0 };
      },

      setRGB: (rgb: RGBColor) => {
        const hex = rgbToHex(rgb.r, rgb.g, rgb.b);
        setColor(hex, false);
        return colorPickerComponent;
      },

      // ============= Swatches Methods =============

      setSwatches: (swatchesArray: string[] | ColorSwatch[]) => {
        if (swatches) {
          swatches.set(swatchesArray);
        }
        return colorPickerComponent;
      },

      getSwatches: () => {
        return swatches ? swatches.get() : [];
      },

      addSwatch: (color: string, label?: string) => {
        if (swatches) {
          swatches.add(color, label);
        }
        return colorPickerComponent;
      },

      removeSwatch: (color: string) => {
        if (swatches) {
          swatches.remove(color);
        }
        return colorPickerComponent;
      },

      clearSwatches: () => {
        if (swatches) {
          swatches.clear();
        }
        return colorPickerComponent;
      },

      // ============= State Methods =============

      enable: () => {
        disabled.enable();
        return colorPickerComponent;
      },

      disable: () => {
        disabled.disable();
        return colorPickerComponent;
      },

      isDisabled: () => disabled.isDisabled(),

      // ============= Variant Methods (dropdown/dialog) =============

      open: () => {
        if (variant) {
          variant.open();
        }
        return colorPickerComponent;
      },

      close: () => {
        if (variant) {
          variant.close();
        }
        return colorPickerComponent;
      },

      toggle: () => {
        if (variant) {
          variant.toggle();
        }
        return colorPickerComponent;
      },

      isOpen: () => {
        return variant ? variant.isOpen() : true;
      },

      // ============= Pipette Methods =============

      pickColor: async () => {
        if (pipette) {
          return pipette.pick();
        }
        return null;
      },

      setImageSource: (source: HTMLImageElement | string | null) => {
        if (pipette) {
          pipette.setImageSource(source);
        }
        return colorPickerComponent;
      },

      isSampling: () => {
        return pipette ? pipette.isSampling() : false;
      },

      // ============= Event Methods =============

      on: (event: string, handler: (...args: unknown[]) => void) => {
        on(event, handler);
        return colorPickerComponent;
      },

      off: (event: string, handler: (...args: unknown[]) => void) => {
        off(event, handler);
        return colorPickerComponent;
      },

      // ============= Lifecycle Methods =============

      destroy: () => {
        lifecycle.destroy();
      },
    };

    // Attach internal methods to component for features to use
    (colorPickerComponent as any).setColor = setColor;
    (colorPickerComponent as any).updateUI = updateUI;

    // Initial UI update for inline variant
    if (!variant || variant.isOpen()) {
      updateUI();
    }

    return colorPickerComponent;
  };
