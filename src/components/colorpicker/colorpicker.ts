// src/components/colorpicker/colorpicker.ts

import { pipe } from "mtrl";
import { createBase, withElement } from "mtrl";
import { withEvents, withDisabled, withLifecycle } from "mtrl";
import { withArea } from "./features/area";
import { withHue } from "./features/hue";
import { withSwatches } from "./features/swatches";
import { withInput } from "./features/input";
import { withVariant } from "./features/variant";
import { withPipette, isEyeDropperSupported } from "./features/pipette";
import { withAPI } from "./api";
import { ColorPickerConfig, ColorPickerComponent } from "./types";
import { createBaseConfig, getElementConfig, getApiConfig } from "./config";
import { COLORPICKER_VARIANTS } from "./constants";

/**
 * Creates a new ColorPicker component with the specified configuration.
 *
 * A color picker with optional saturation/brightness area, hue slider,
 * hex input, and color swatches. Supports inline, dropdown, and dialog variants.
 *
 * The ColorPicker component is created using a functional composition pattern,
 * applying various features through the pipe function.
 *
 * @param {ColorPickerConfig} config - Configuration options for the color picker
 * @returns {ColorPickerComponent} A fully configured color picker component instance
 * @throws {Error} Throws an error if color picker creation fails
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
 * ```
 *
 * @category Components
 */
const createColorPicker = (
  config: ColorPickerConfig = {},
): ColorPickerComponent => {
  const baseConfig = createBaseConfig(config);

  try {
    const needsVariantBehavior =
      baseConfig.variant === COLORPICKER_VARIANTS.DROPDOWN ||
      baseConfig.variant === COLORPICKER_VARIANTS.DIALOG;

    const colorPicker = pipe(
      createBase,
      withEvents(),
      withElement(getElementConfig(baseConfig)),
      withDisabled(baseConfig),
      // Apply variant feature for dropdown/dialog (restructures DOM)
      needsVariantBehavior ? withVariant(baseConfig) : (c: any) => c,
      // Apply optional features based on config
      baseConfig.showArea !== false ? withArea(baseConfig) : (c: any) => c,
      baseConfig.showHue !== false ? withHue(baseConfig) : (c: any) => c,
      baseConfig.showInput !== false || baseConfig.showPreview !== false
        ? withInput(baseConfig)
        : (c: any) => c,
      baseConfig.showSwatches !== false
        ? withSwatches(baseConfig)
        : (c: any) => c,
      // Add pipette if enabled or image source provided
      baseConfig.showPipette !== false &&
        (isEyeDropperSupported() || baseConfig.imageSource)
        ? withPipette(baseConfig)
        : (c: any) => c,
      withLifecycle(),
      (comp: any) => withAPI(getApiConfig(comp))(comp),
    )(baseConfig);

    return colorPicker;
  } catch (error) {
    console.error("ColorPicker creation error:", error);
    throw new Error(
      `Failed to create ColorPicker: ${(error as Error).message}`,
    );
  }
};

export default createColorPicker;
