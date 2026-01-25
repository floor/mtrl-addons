// src/components/colorpicker/features/popup.ts

import {
  COLORPICKER_CLASSES,
  COLORPICKER_EVENTS,
  COLORPICKER_VARIANTS,
} from "../constants";
import { ColorPickerState } from "../types";

/**
 * Component interface for popup feature
 */
interface PopupComponent {
  element: HTMLElement;
  state: ColorPickerState;
  getClass: (name: string) => string;
  emit: (event: string, ...args: unknown[]) => void;
  config: {
    variant?: string;
    trigger?: HTMLElement;
    disabled?: boolean;
    prefix?: string;
  };
  pickerContent: HTMLElement;
  updateUI?: () => void;
}

/**
 * Popup feature interface
 */
export interface PopupFeature {
  backdrop: HTMLElement | null;
  popup: HTMLElement;
  open: () => void;
  close: () => void;
  toggle: () => void;
  isOpen: () => boolean;
  position: () => void;
}

/**
 * Adds popup functionality (dropdown/dialog) to a color picker component
 *
 * @returns Component enhancer function
 */
export const withPopup =
  () =>
  <T extends PopupComponent>(component: T): T & { popup: PopupFeature } => {
    const { element, getClass, state, config, pickerContent } = component;
    const variant = config.variant || COLORPICKER_VARIANTS.INLINE;

    // Only apply popup behavior for dropdown/dialog variants
    const isPopup =
      variant === COLORPICKER_VARIANTS.DROPDOWN ||
      variant === COLORPICKER_VARIANTS.DIALOG;

    if (!isPopup) {
      // Return a no-op popup feature for inline variant
      const noopFeature: PopupFeature = {
        backdrop: null,
        popup: pickerContent,
        open: () => {},
        close: () => {},
        toggle: () => {},
        isOpen: () => true,
        position: () => {},
      };
      return {
        ...component,
        popup: noopFeature,
      };
    }

    // Create backdrop (for dialog or click-outside detection)
    const backdrop = document.createElement("div");
    backdrop.className = getClass(COLORPICKER_CLASSES.BACKDROP);
    element.insertBefore(backdrop, element.firstChild);

    // Create popup container and move picker content into it
    const popup = document.createElement("div");
    popup.className = getClass(COLORPICKER_CLASSES.POPUP);

    // Move all children from pickerContent to popup
    while (pickerContent.firstChild) {
      popup.appendChild(pickerContent.firstChild);
    }

    // Replace pickerContent with popup in the element
    element.appendChild(popup);

    // Append to body for proper positioning
    document.body.appendChild(element);

    /**
     * Position the popup relative to trigger (dropdown) or center (dialog)
     */
    const position = (): void => {
      if (!config.trigger) return;

      const triggerRect = config.trigger.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const margin = 4;

      if (variant === COLORPICKER_VARIANTS.DIALOG) {
        // Center on screen - measure after positioning
        popup.style.position = "fixed";
        const popupRect = popup.getBoundingClientRect();
        popup.style.left = `${(viewportWidth - popupRect.width) / 2}px`;
        popup.style.top = `${(viewportHeight - popupRect.height) / 2}px`;
      } else {
        // Dropdown positioning - match trigger width
        popup.style.position = "fixed";
        popup.style.width = `${triggerRect.width}px`;
        popup.style.minWidth = `${triggerRect.width}px`;

        // Horizontal: align with trigger left edge
        const left = triggerRect.left;
        popup.style.left = `${left}px`;

        // Measure popup height after setting width
        const popupRect = popup.getBoundingClientRect();

        // Vertical: prefer below trigger, but flip above if no space
        const spaceBelow = viewportHeight - triggerRect.bottom - margin;
        const spaceAbove = triggerRect.top - margin;

        // Remove position class first
        element.classList.remove(getClass("colorpicker--position-top"));

        if (spaceBelow < popupRect.height && spaceAbove > spaceBelow) {
          // Position above
          const top = triggerRect.top - popupRect.height - margin;
          popup.style.top = `${top}px`;
          // Add class for CSS transform-origin
          element.classList.add(getClass("colorpicker--position-top"));
        } else {
          // Position below
          const top = triggerRect.bottom + margin;
          popup.style.top = `${top}px`;
        }
      }
    };

    /**
     * Open the popup
     */
    const open = (): void => {
      if (state.isOpen || config.disabled) return;

      state.isOpen = true;
      element.classList.add(getClass(COLORPICKER_CLASSES.OPEN));

      // Position after adding open class (so we can measure)
      requestAnimationFrame(() => {
        position();
        // Update UI elements now that they're visible
        if (component.updateUI) {
          component.updateUI();
        }
      });

      component.emit(COLORPICKER_EVENTS.OPEN);
    };

    /**
     * Close the popup
     */
    const close = (): void => {
      if (!state.isOpen) return;

      state.isOpen = false;
      element.classList.remove(getClass(COLORPICKER_CLASSES.OPEN));

      component.emit(COLORPICKER_EVENTS.CLOSE);
    };

    /**
     * Toggle the popup
     */
    const toggle = (): void => {
      if (state.isOpen) {
        close();
      } else {
        open();
      }
    };

    /**
     * Check if popup is open
     */
    const isOpen = (): boolean => state.isOpen;

    // ============= Event Handlers =============

    /**
     * Handle trigger click
     */
    const handleTriggerClick = (e: MouseEvent): void => {
      e.preventDefault();
      e.stopPropagation();
      toggle();
    };

    /**
     * Handle backdrop click (close popup)
     */
    const handleBackdropClick = (e: MouseEvent): void => {
      if (e.target === backdrop) {
        close();
      }
    };

    /**
     * Handle keyboard events
     */
    const handleKeyDown = (e: KeyboardEvent): void => {
      if (e.key === "Escape" && state.isOpen) {
        close();
      }
    };

    /**
     * Handle window resize (reposition popup)
     */
    const handleResize = (): void => {
      if (state.isOpen) {
        position();
      }
    };

    /**
     * Handle scroll (reposition popup for dropdown)
     */
    const handleScroll = (): void => {
      if (state.isOpen && variant === COLORPICKER_VARIANTS.DROPDOWN) {
        position();
      }
    };

    // ============= Attach Event Listeners =============

    if (config.trigger) {
      config.trigger.addEventListener("click", handleTriggerClick);
    }

    backdrop.addEventListener("click", handleBackdropClick);
    document.addEventListener("keydown", handleKeyDown);
    window.addEventListener("resize", handleResize);
    window.addEventListener("scroll", handleScroll, true);

    // Create popup feature object
    const popupFeature: PopupFeature = {
      backdrop,
      popup,
      open,
      close,
      toggle,
      isOpen,
      position,
    };

    // Extend lifecycle destroy if it exists
    const originalDestroy = (component as any).lifecycle?.destroy;
    if (originalDestroy) {
      (component as any).lifecycle.destroy = () => {
        // Remove event listeners
        if (config.trigger) {
          config.trigger.removeEventListener("click", handleTriggerClick);
        }
        backdrop.removeEventListener("click", handleBackdropClick);
        document.removeEventListener("keydown", handleKeyDown);
        window.removeEventListener("resize", handleResize);
        window.removeEventListener("scroll", handleScroll, true);

        // Remove element from body
        if (element.parentNode === document.body) {
          document.body.removeChild(element);
        }

        originalDestroy();
      };
    }

    // Update pickerContent reference to point to popup
    (component as any).pickerContent = popup;

    return {
      ...component,
      popup: popupFeature,
    };
  };
