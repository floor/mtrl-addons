// src/components/form/features/controller.ts

/**
 * Controller feature for Form component
 * Manages control buttons (submit/cancel) based on data state (pristine/dirty)
 */

import type {
  FormConfig,
  BaseFormComponent,
  FormState,
  FormFieldRegistry,
  FormField,
} from "../types";
import { DATA_STATE, FORM_EVENTS, FORM_CLASSES } from "../constants";
import { FORM_DEFAULTS } from "../config";

/**
 * Updates the form's state CSS class
 */
const updateStateClass = (
  element: HTMLElement,
  modified: boolean,
  prefix: string,
  componentName: string,
): void => {
  const modifiedClass = `${prefix}-${componentName}--${FORM_CLASSES.MODIFIED}`;
  element.classList.toggle(modifiedClass, modified);
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
 * Adds control button handling based on data state (pristine/dirty)
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
    getDataState: () => string;
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

    // Initialize controls as disabled (pristine state)
    if (controls.size > 0) {
      setControlsEnabled(controls, false);
    }

    const enhanced = {
      ...component,
      controls,

      /**
       * Get current data state (pristine or dirty)
       */
      getDataState(): string {
        return component.state.modified
          ? DATA_STATE.DIRTY
          : DATA_STATE.PRISTINE;
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

    // Listen for state changes to enable/disable controls
    if (config.useChanges !== false && component.on) {
      component.on(
        FORM_EVENTS.STATE_CHANGE,
        (event: { modified: boolean; state: string }) => {
          if (event.modified) {
            // Data is dirty - enable controls
            setControlsEnabled(controls, true);
          } else {
            // Data is pristine - disable controls
            setControlsEnabled(controls, false);
          }

          // Update CSS class
          if (component.element) {
            updateStateClass(
              component.element,
              event.modified,
              prefix,
              componentName,
            );
          }
        },
      );
    }

    return enhanced;
  };
};

export default withController;
