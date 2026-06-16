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
 * Creates the blocking overlay used to disable the form.
 *
 * The overlay sits on top of the form root and intercepts every pointer
 * interaction. Crucially, it does this WITHOUT touching any input, so a
 * field's value can never change as a side effect of disabling — which means
 * `field:change` never fires and the Apply/submit button can never be
 * re-enabled by the act of disabling. It also swallows the events it catches
 * so nothing leaks through to a field underneath.
 */
const createDisabledOverlay = (
  prefix: string,
  componentName: string,
): HTMLElement => {
  const overlay = document.createElement("div");
  overlay.className = `${prefix}-${componentName}-disabled-overlay`;
  overlay.setAttribute("aria-hidden", "true");
  // Inline styles so the overlay works even before/without the stylesheet.
  overlay.style.cssText =
    "position:absolute;inset:0;z-index:5;background:transparent;cursor:not-allowed;";

  const swallow = (event: Event): void => {
    event.preventDefault();
    event.stopPropagation();
  };
  overlay.addEventListener("mousedown", swallow);
  overlay.addEventListener("click", swallow);
  overlay.addEventListener("touchstart", swallow, { passive: false });

  return overlay;
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

    // Blocking overlay used to prevent edition while disabled (created lazily)
    const disabledClass = `${prefix}-${componentName}--${FORM_CLASSES.DISABLED}`;
    let disabledOverlay: HTMLElement | null = null;

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
       * Enable all form fields and lift the blocking overlay.
       */
      enableFields(): void {
        setFieldsEnabled(component.fields, true);
        component.state.disabled = false;

        const root = component.element;
        if (root) {
          root.classList.remove(disabledClass);
          root.removeAttribute("aria-disabled");
        }
        if (disabledOverlay) {
          disabledOverlay.remove();
          disabledOverlay = null;
        }
      },

      /**
       * Disable the form to prevent edition.
       *
       * Prevention is layered so it cannot accidentally enable Apply:
       *  1. A blocking overlay swallows all pointer interaction — inputs are
       *     never touched, so no `field:change` is emitted.
       *  2. `field.disable()` drops each field out of the tab order so the
       *     overlay can't be bypassed with the keyboard.
       * Neither step alters a field's value, so the form's `modified` state
       * stays false and the submit/cancel controls remain disabled.
       */
      disableFields(): void {
        setFieldsEnabled(component.fields, false);
        component.state.disabled = true;

        const root = component.element;
        if (root) {
          root.classList.add(disabledClass);
          root.setAttribute("aria-disabled", "true");
          if (!disabledOverlay) {
            disabledOverlay = createDisabledOverlay(prefix, componentName);
            root.appendChild(disabledOverlay);
          }
        }
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
