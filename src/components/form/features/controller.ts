// src/components/form/features/controller.ts

/**
 * Controller feature for Form component
 * Manages form modes (read/create/update) and control buttons (submit/cancel)
 */

import type {
  FormConfig,
  BaseFormComponent,
  FormMode,
  FormState,
  FormFieldRegistry,
  FormField,
} from "../types";
import { FORM_MODES, FORM_EVENTS } from "../constants";
import { getModeClass, getAllModeClasses, FORM_DEFAULTS } from "../config";

/**
 * Updates the form's mode CSS classes
 */
const updateModeClasses = (
  element: HTMLElement,
  mode: FormMode,
  prefix: string,
  componentName: string,
): void => {
  // Remove all mode classes
  const allModeClasses = getAllModeClasses(prefix, componentName);
  for (const cls of allModeClasses) {
    element.classList.remove(cls);
  }

  // Add current mode class
  const modeClass = getModeClass(mode, prefix, componentName);
  element.classList.add(modeClass);
};

/**
 * Enables or disables all form fields
 */
const setFieldsEnabled = (
  fields: FormFieldRegistry,
  enabled: boolean,
): void => {
  for (const [, field] of fields) {
    if (enabled && typeof field.enable === "function") {
      field.enable();
    } else if (!enabled && typeof field.disable === "function") {
      field.disable();
    }
  }
};

/**
 * Gets control button components from the UI registry
 */
const getControlButtons = (
  ui: Record<string, unknown>,
  controlNames: string[],
): Map<string, FormField> => {
  const controls = new Map<string, FormField>();

  for (const name of controlNames) {
    const control = ui[name];
    if (control && typeof control === "object" && "element" in control) {
      controls.set(name, control as FormField);
    }
  }

  return controls;
};

/**
 * Enables or disables control buttons
 */
const setControlsEnabled = (
  controls: Map<string, FormField>,
  enabled: boolean,
): void => {
  for (const [, control] of controls) {
    if (enabled && typeof control.enable === "function") {
      control.enable();
    } else if (!enabled && typeof control.disable === "function") {
      control.disable();
    }
  }
};

/**
 * withController feature
 * Adds mode management and control button handling to the form
 */
export const withController = (config: FormConfig) => {
  return <
    T extends BaseFormComponent & {
      fields: FormFieldRegistry;
      state: FormState;
      emit?: (event: string, data?: unknown) => void;
      on?: (event: string, handler: Function) => void;
    },
  >(
    component: T,
  ): T & {
    controls: Map<string, FormField>;
    getMode: () => FormMode;
    setMode: (mode: FormMode) => void;
    enableControls: () => void;
    disableControls: () => void;
    enableFields: () => void;
    disableFields: () => void;
  } => {
    const prefix = config.prefix || FORM_DEFAULTS.prefix;
    const componentName = config.componentName || FORM_DEFAULTS.componentName;
    const controlNames = config.controls
      ? [...config.controls]
      : [...FORM_DEFAULTS.controls];

    // Get control buttons from UI
    const controls = controlNames
      ? getControlButtons(component.ui || {}, controlNames)
      : new Map<string, FormField>();

    // Initialize controls as disabled
    if (controls.size > 0) {
      setControlsEnabled(controls, false);
    }

    const enhanced = {
      ...component,
      controls,

      /**
       * Get current form mode
       */
      getMode(): FormMode {
        return component.state.mode;
      },

      /**
       * Set form mode
       * Triggers mode:change event and updates UI accordingly
       */
      setMode(mode: FormMode): void {
        const previousMode = component.state.mode;
        component.state.mode = mode;

        // Update CSS classes
        if (component.element) {
          updateModeClasses(component.element, mode, prefix, componentName);
        }

        // Handle mode-specific behavior
        switch (mode) {
          case FORM_MODES.READ:
            // In read mode, disable controls
            setControlsEnabled(controls, false);
            break;

          case FORM_MODES.CREATE:
            // In create mode, enable controls
            setControlsEnabled(controls, true);
            break;

          case FORM_MODES.UPDATE:
            // In update mode, enable controls
            setControlsEnabled(controls, true);
            break;
        }

        // Emit mode change event
        component.emit?.(FORM_EVENTS.MODE_CHANGE, {
          mode,
          previousMode,
        });
      },

      /**
       * Enable control buttons
       */
      enableControls(): void {
        setControlsEnabled(controls, true);
      },

      /**
       * Disable control buttons
       */
      disableControls(): void {
        setControlsEnabled(controls, false);
      },

      /**
       * Enable all form fields
       */
      enableFields(): void {
        setFieldsEnabled(component.fields, true);
        component.state.disabled = false;
      },

      /**
       * Disable all form fields
       */
      disableFields(): void {
        setFieldsEnabled(component.fields, false);
        component.state.disabled = true;
      },
    };

    // Listen for change events to auto-switch to update mode
    if (config.useChanges !== false && component.on) {
      component.on("field:change", () => {
        if (component.state.mode === FORM_MODES.READ) {
          enhanced.setMode(FORM_MODES.UPDATE);
        }
      });

      // Listen for modified:change to enable/disable controls when data reverts
      // This handles the case where user changes a field then reverts to original value
      component.on(
        FORM_EVENTS.MODIFIED_CHANGE,
        (event: { modified: boolean }) => {
          console.log(
            "[Form:controller] modified:change event:",
            event.modified,
          );
          if (event.modified) {
            // Data has been modified - enable controls and switch to UPDATE mode
            enhanced.setMode(FORM_MODES.UPDATE);
            setControlsEnabled(controls, true);
          } else {
            // Data reverted to initial state - disable controls and switch to READ mode
            enhanced.setMode(FORM_MODES.READ);
            setControlsEnabled(controls, false);
          }
        },
      );
    }

    return enhanced;
  };
};

export default withController;
