// src/components/colorpicker/features/input.ts

import { COLORPICKER_CLASSES, COLORPICKER_EVENTS } from "../constants";
import { ColorPickerState } from "../types";
import { isValidHex, normalizeHex, hexToHsv } from "../utils";

// Dynamic import for textfield to avoid circular dependencies
let createTextfield: any = null;

const loadTextfield = async () => {
  if (!createTextfield) {
    const module = await import("mtrl");
    createTextfield = module.createTextfield;
  }
  return createTextfield;
};

/**
 * Component interface for input feature
 */
interface InputComponent {
  element: HTMLElement;
  state: ColorPickerState;
  getClass: (name: string) => string;
  emit: (event: string, ...args: unknown[]) => void;
  config: {
    disabled?: boolean;
    showInput?: boolean;
    showPreview?: boolean;
    onChange?: (color: string) => void;
    prefix?: string;
  };
  pickerContent: HTMLElement;
  updateUI?: () => void;
  popup?: {
    close: () => void;
  };
}

/**
 * Input feature interface
 */
export interface InputFeature {
  element: HTMLElement;
  textfield: any | null;
  preview: HTMLElement | null;
  update: () => void;
}

/**
 * Adds the hex input field (using mtrl textfield) and color preview to a color picker component
 *
 * @returns Component enhancer function
 */
export const withInput =
  () =>
  <T extends InputComponent>(component: T): T & { input: InputFeature } => {
    const { getClass, state, config, pickerContent } = component;

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
        input: emptyFeature,
      };
    }

    // Create row container
    const row = document.createElement("div");
    row.className = getClass(COLORPICKER_CLASSES.VALUE);

    let previewEl: HTMLElement | null = null;
    let textfieldComponent: any = null;
    let inputEl: HTMLInputElement | null = null;

    // Create preview square
    if (showPreview) {
      previewEl = document.createElement("div");
      previewEl.className = getClass(COLORPICKER_CLASSES.PREVIEW);
      row.appendChild(previewEl);
    }

    // Create textfield asynchronously
    if (showInput) {
      loadTextfield().then((createTf) => {
        textfieldComponent = createTf({
          variant: "filled",
          density: "compact",
          value: state.hex.toUpperCase(),
          maxLength: 7,
          class: getClass("colorpicker__textfield"),
        });

        // Get the actual input element
        inputEl = textfieldComponent.input;

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
      });
    }

    pickerContent.appendChild(row);

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
    const handleInputChange = (): void => {
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

          // Update UI
          if (component.updateUI) {
            component.updateUI();
          } else {
            update();
          }

          component.emit(COLORPICKER_EVENTS.CHANGE, state.hex);
          config.onChange?.(state.hex);
        }
      } else {
        // Revert to current valid color
        textfieldComponent.setValue(state.hex.toUpperCase());
      }
    };

    /**
     * Handle keydown on input
     */
    const handleKeyDown = (e: KeyboardEvent): void => {
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
        // Close popup if exists
        if (component.popup) {
          component.popup.close();
        }
      }
    };

    /**
     * Handle blur on input
     */
    const handleBlur = (): void => {
      handleInputChange();
    };

    // Initial render
    updatePreview();

    // Create input feature object
    const inputFeature: InputFeature = {
      element: row,
      textfield: null, // Will be set when loaded
      preview: previewEl,
      update,
    };

    // Update textfield reference when loaded
    loadTextfield().then(() => {
      inputFeature.textfield = textfieldComponent;
    });

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
      input: inputFeature,
    };
  };
