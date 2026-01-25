// src/components/colorpicker/api.ts

import { ColorPickerComponent, ColorSwatch, HSVColor, RGBColor } from "./types";
import { hexToHsv, hexToRgb, hsvToHex, rgbToHex, normalizeHex } from "./utils";
import { COLORPICKER_EVENTS } from "./constants";
import { AreaFeature } from "./features/area";
import { HueFeature } from "./features/hue";
import { SwatchesFeature } from "./features/swatches";
import { InputFeature } from "./features/input";
import { PopupFeature } from "./features/popup";

/**
 * API configuration options for color picker component
 * @category Components
 * @internal
 */
interface ApiOptions {
  element: HTMLElement;
  state: {
    hsv: HSVColor;
    hex: string;
    isDragging: boolean;
    dragTarget: "area" | "hue" | null;
    swatches: ColorSwatch[];
    isOpen: boolean;
  };
  disabled: {
    enable: () => void;
    disable: () => void;
    isDisabled: () => boolean;
  };
  lifecycle: {
    destroy: () => void;
  };
  getClass: (name: string) => string;
  emit: (event: string, ...args: unknown[]) => void;
  handlers: Record<string, Array<(...args: unknown[]) => void>>;
  // Optional features
  area?: AreaFeature;
  hue?: HueFeature;
  swatches?: SwatchesFeature;
  input?: InputFeature;
  popup?: PopupFeature;
  config: {
    onChange?: (color: string) => void;
  };
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
      state,
      disabled,
      lifecycle,
      getClass,
      emit,
      handlers,
      area,
      hue,
      swatches,
      input,
      popup,
      config,
    } = options;

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
    const setHSVInternal = (hsv: HSVColor, emitChange: boolean = false): void => {
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

      // ============= Popup Methods =============

      open: () => {
        if (popup) {
          popup.open();
        }
        return colorPickerComponent;
      },

      close: () => {
        if (popup) {
          popup.close();
        }
        return colorPickerComponent;
      },

      toggle: () => {
        if (popup) {
          popup.toggle();
        }
        return colorPickerComponent;
      },

      isOpen: () => {
        return popup ? popup.isOpen() : true;
      },

      // ============= Event Methods =============

      on: (event: string, handler: (...args: unknown[]) => void) => {
        if (!handlers[event]) {
          handlers[event] = [];
        }
        handlers[event].push(handler);
        return colorPickerComponent;
      },

      off: (event: string, handler: (...args: unknown[]) => void) => {
        const eventHandlers = handlers[event];
        if (eventHandlers) {
          const index = eventHandlers.indexOf(handler);
          if (index > -1) {
            eventHandlers.splice(index, 1);
          }
        }
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

    return colorPickerComponent;
  };
