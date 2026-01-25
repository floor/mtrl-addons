// src/components/colorpicker/features/input.ts

import { createTextfield } from "mtrl";
import { COLORPICKER_CLASSES, COLORPICKER_EVENTS } from "../constants";
import { ColorPickerConfig, ColorPickerState } from "../types";
import { isValidHex, normalizeHex, hexToHsv } from "../utils";
import { createInitialState } from "../config";

/**
 * Input feature interface
 */
export interface InputFeature {
  element: HTMLElement;
  textfield: ReturnType<typeof createTextfield> | null;
  preview: HTMLElement | null;
  update: () => void;
}

/**
 * Adds the hex input field (using mtrl textfield) and color preview to a color picker component
 *
 * @param config - Color picker configuration
 * @returns Component enhancer function
 */
export const withInput =
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
    },
  >(
    component: T,
  ): T & { input: InputFeature; state: ColorPickerState } => {
    const { element, getClass, emit } = component;

    // Initialize state if not present
    const state: ColorPickerState =
      component.state || createInitialState(config);

    // Use pickerContent if available (for dropdown/dialog), otherwise use element
    const container = component.pickerContent || element;

    const showInput = config.showInput ?? true;
    const showPreview = config.showPreview ?? true;

    // Only create if at least one is enabled
    if (!showInput && !showPreview) {
      const emptyFeature: InputFeature = {
        element: document.createElement("div"),
        textfield: null,
        preview: null,
        update: () => {},
      };
      return {
        ...component,
        state,
        input: emptyFeature,
      };
    }

    // Create row container
    const row = document.createElement("div");
    row.className = getClass(COLORPICKER_CLASSES.VALUE);

    let previewEl: HTMLElement | null = null;
    let textfieldComponent: ReturnType<typeof createTextfield> | null = null;
    let inputEl: HTMLInputElement | null = null;

    // Create preview square
    if (showPreview) {
      previewEl = document.createElement("div");
      previewEl.className = getClass(COLORPICKER_CLASSES.PREVIEW);
      row.appendChild(previewEl);
    }

    // Create textfield synchronously
    if (showInput) {
      textfieldComponent = createTextfield({
        variant: "filled",
        density: "compact",
        label: config.inputLabel || "Hex",
        value: state.hex.toUpperCase(),
        maxLength: 7,
        class: getClass("colorpicker__textfield"),
      });

      // Get the actual input element
      inputEl = textfieldComponent.input as HTMLInputElement;

      // Style adjustments for color picker context
      if (textfieldComponent.element) {
        textfieldComponent.element.style.flex = "1";
        row.appendChild(textfieldComponent.element);

        // Apply monospace font to input
        if (inputEl) {
          inputEl.style.fontFamily = "monospace";
          inputEl.style.textTransform = "uppercase";
          inputEl.spellcheck = false;
          inputEl.autocomplete = "off";
        }
      }

      // Handle input change
      textfieldComponent.on("change", handleInputChange);
      textfieldComponent.on("blur", handleBlur);

      // Handle keydown for Enter/Escape
      if (inputEl) {
        inputEl.addEventListener("keydown", handleKeyDown);
      }
    }

    container.appendChild(row);

    /**
     * Update all UI features
     */
    const updateAllUI = (): void => {
      component.area?.updateBackground?.();
      component.area?.updateHandle?.();
      component.hue?.updateHandle?.();
      update();
    };

    /**
     * Update the preview color
     */
    const updatePreview = (): void => {
      if (previewEl) {
        previewEl.style.backgroundColor = state.hex;
      }
    };

    /**
     * Update the textfield value (only if not focused)
     */
    const updateInput = (): void => {
      if (textfieldComponent && inputEl && document.activeElement !== inputEl) {
        textfieldComponent.setValue(state.hex.toUpperCase());
      }
    };

    /**
     * Update both preview and input
     */
    const update = (): void => {
      updatePreview();
      updateInput();
    };

    /**
     * Handle input change (blur or enter)
     */
    function handleInputChange(): void {
      if (!textfieldComponent) return;

      let value = textfieldComponent.getValue().trim();

      // Add # if missing
      if (value && !value.startsWith("#")) {
        value = "#" + value;
      }

      if (isValidHex(value)) {
        const hsv = hexToHsv(value);
        if (hsv) {
          state.hsv = hsv;
          state.hex = normalizeHex(value);

          // Update all UI
          updateAllUI();

          emit(COLORPICKER_EVENTS.CHANGE, state.hex);
          config.onChange?.(state.hex);
        }
      } else {
        // Revert to current valid color
        textfieldComponent.setValue(state.hex.toUpperCase());
      }
    }

    /**
     * Handle keydown on input
     */
    function handleKeyDown(e: KeyboardEvent): void {
      if (e.key === "Enter") {
        handleInputChange();
        inputEl?.blur();
      }
      if (e.key === "Escape") {
        // Revert and blur
        if (textfieldComponent) {
          textfieldComponent.setValue(state.hex.toUpperCase());
        }
        inputEl?.blur();
        // Close dropdown/dialog if exists
        if (component.variant) {
          component.variant.close();
        }
      }
    }

    /**
     * Handle blur on input
     */
    function handleBlur(): void {
      handleInputChange();
    }

    // Initial render
    updatePreview();

    // Create input feature object
    const inputFeature: InputFeature = {
      element: row,
      textfield: textfieldComponent,
      preview: previewEl,
      update,
    };

    // Register in refs for cross-feature access
    state.refs.input = { update };

    // Extend lifecycle destroy if it exists
    const originalDestroy = (component as any).lifecycle?.destroy;
    if (originalDestroy) {
      (component as any).lifecycle.destroy = () => {
        if (inputEl) {
          inputEl.removeEventListener("keydown", handleKeyDown);
        }
        if (textfieldComponent) {
          textfieldComponent.destroy();
        }
        originalDestroy();
      };
    }

    return {
      ...component,
      state,
      input: inputFeature,
    };
  };
