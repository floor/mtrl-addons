// src/components/colorpicker/features/variant.ts

import {
  COLORPICKER_CLASSES,
  COLORPICKER_EVENTS,
  COLORPICKER_VARIANTS,
} from "../constants";
import { ColorPickerConfig, ColorPickerState } from "../types";
import { createInitialState } from "../config";

/**
 * Variant feature interface
 */
export interface VariantFeature {
  backdrop: HTMLElement | null;
  container: HTMLElement;
  open: () => void;
  close: () => void;
  toggle: () => void;
  isOpen: () => boolean;
  position: () => void;
}

/**
 * Adds variant-specific behavior (dropdown/dialog) to a color picker component.
 * Handles positioning, open/close, backdrop, and event management that CSS cannot handle.
 *
 * @param config - Color picker configuration
 * @returns Component enhancer function
 */
export const withVariant =
  (config: ColorPickerConfig) =>
  <
    T extends {
      element: HTMLElement;
      getClass: (name: string) => string;
      emit: (event: string, data?: unknown) => void;
      state?: ColorPickerState;
    },
  >(
    component: T,
  ): T & {
    variant: VariantFeature;
    pickerContent: HTMLElement;
    state: ColorPickerState;
  } => {
    const { element, getClass, emit } = component;

    // Initialize state if not present
    const state: ColorPickerState =
      component.state || createInitialState(config);

    const variantType = config.variant || COLORPICKER_VARIANTS.INLINE;

    // Only apply variant behavior for dropdown/dialog variants
    const needsVariantBehavior =
      variantType === COLORPICKER_VARIANTS.DROPDOWN ||
      variantType === COLORPICKER_VARIANTS.DIALOG;

    if (!needsVariantBehavior) {
      // Return a no-op variant feature for inline variant
      const noopFeature: VariantFeature = {
        backdrop: null,
        container: element,
        open: () => {},
        close: () => {},
        toggle: () => {},
        isOpen: () => true,
        position: () => {},
      };
      return {
        ...component,
        state,
        pickerContent: element,
        variant: noopFeature,
      };
    }

    // Create backdrop (for dialog or click-outside detection)
    const backdrop = document.createElement("div");
    backdrop.className = getClass(COLORPICKER_CLASSES.BACKDROP);
    element.insertBefore(backdrop, element.firstChild);

    // Create container for picker content
    const container = document.createElement("div");
    container.className = getClass(COLORPICKER_CLASSES.CONTAINER);

    // Add container to element
    element.appendChild(container);

    // Append to body for proper positioning
    document.body.appendChild(element);

    /**
     * Position the container relative to trigger (dropdown) or center (dialog)
     */
    const position = (): void => {
      if (!config.trigger) return;

      const triggerRect = config.trigger.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const margin = 4;

      if (variantType === COLORPICKER_VARIANTS.DIALOG) {
        // Center on screen
        container.style.position = "fixed";
        const containerRect = container.getBoundingClientRect();
        container.style.left = `${(viewportWidth - containerRect.width) / 2}px`;
        container.style.top = `${(viewportHeight - containerRect.height) / 2}px`;
      } else {
        // Dropdown positioning
        container.style.position = "fixed";
        container.style.width = `${triggerRect.width}px`;
        container.style.minWidth = `${triggerRect.width}px`;

        // Horizontal: align with trigger left edge
        container.style.left = `${triggerRect.left}px`;

        // Measure container height after setting width
        const containerRect = container.getBoundingClientRect();

        // Vertical: prefer below trigger, but flip above if no space
        const spaceBelow = viewportHeight - triggerRect.bottom - margin;
        const spaceAbove = triggerRect.top - margin;

        // Remove position class first
        element.classList.remove(getClass("colorpicker--position-top"));

        if (spaceBelow < containerRect.height && spaceAbove > spaceBelow) {
          // Position above
          const top = triggerRect.top - containerRect.height - margin;
          container.style.top = `${top}px`;
          element.classList.add(getClass("colorpicker--position-top"));
        } else {
          // Position below
          const top = triggerRect.bottom + margin;
          container.style.top = `${top}px`;
        }
      }
    };

    /**
     * Open the picker
     */
    const open = (): void => {
      if (state.isOpen || config.disabled) return;

      state.isOpen = true;
      element.classList.add(getClass(COLORPICKER_CLASSES.OPEN));

      // Position after adding open class (so we can measure)
      requestAnimationFrame(() => {
        position();
      });

      // Add document click listener after a short delay (like menu does)
      // to avoid closing immediately from the same click that opened it
      setTimeout(() => {
        if (state.isOpen) {
          document.addEventListener("click", handleDocumentClick);
        }
      }, 0);

      emit(COLORPICKER_EVENTS.OPEN);
    };

    /**
     * Close the picker
     */
    const close = (): void => {
      if (!state.isOpen) return;

      state.isOpen = false;
      element.classList.remove(getClass(COLORPICKER_CLASSES.OPEN));

      // Remove document click listener
      document.removeEventListener("click", handleDocumentClick);

      emit(COLORPICKER_EVENTS.CLOSE);
    };

    /**
     * Toggle open/closed
     */
    const toggle = (): void => {
      if (state.isOpen) {
        close();
      } else {
        open();
      }
    };

    /**
     * Check if open
     */
    const isOpen = (): boolean => state.isOpen;

    // ============= Event Handlers =============

    const handleTriggerClick = (e: MouseEvent): void => {
      e.preventDefault();
      e.stopPropagation();
      toggle();
    };

    const handleBackdropClick = (e: MouseEvent): void => {
      if (e.target === backdrop) {
        close();
      }
    };

    const handleDocumentClick = (e: MouseEvent): void => {
      // Don't close if clicked inside the picker container
      if (container.contains(e.target as Node)) {
        return;
      }

      // Don't close if clicked on the trigger
      if (config.trigger && config.trigger.contains(e.target as Node)) {
        return;
      }

      // Close the picker
      close();
    };

    const handleKeyDown = (e: KeyboardEvent): void => {
      if (e.key === "Escape" && state.isOpen) {
        close();
      }
    };

    const handleResize = (): void => {
      if (state.isOpen) {
        position();
      }
    };

    const handleScroll = (): void => {
      if (state.isOpen && variantType === COLORPICKER_VARIANTS.DROPDOWN) {
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

    // Create variant feature object
    const variantFeature: VariantFeature = {
      backdrop,
      container,
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
        if (config.trigger) {
          config.trigger.removeEventListener("click", handleTriggerClick);
        }
        backdrop.removeEventListener("click", handleBackdropClick);
        document.removeEventListener("click", handleDocumentClick);
        document.removeEventListener("keydown", handleKeyDown);
        window.removeEventListener("resize", handleResize);
        window.removeEventListener("scroll", handleScroll, true);

        if (element.parentNode === document.body) {
          document.body.removeChild(element);
        }

        originalDestroy();
      };
    }

    return {
      ...component,
      state,
      pickerContent: container,
      variant: variantFeature,
    };
  };
