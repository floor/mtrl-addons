// src/components/colorpicker/features/hue.ts

import { COLORPICKER_CLASSES, COLORPICKER_EVENTS } from "../constants";
import { ColorPickerConfig, ColorPickerState } from "../types";
import { hsvToHex } from "../utils";
import { createInitialState } from "../config";

/**
 * Hue feature interface
 */
export interface HueFeature {
  element: HTMLElement;
  handle: HTMLElement;
  updateHandle: () => void;
}

/**
 * Adds a simple hue bar with rainbow gradient and draggable handle
 *
 * @param config - Color picker configuration
 * @returns Component enhancer function
 */
export const withHue =
  (config: ColorPickerConfig) =>
  <
    T extends {
      element: HTMLElement;
      getClass: (name: string) => string;
      emit: (event: string, data?: unknown) => void;
      state?: ColorPickerState;
      pickerContent?: HTMLElement;
      area?: {
        element: HTMLElement;
        updateBackground: () => void;
        updateHandle: () => void;
      };
    },
  >(
    component: T,
  ): T & { hue: HueFeature; state: ColorPickerState } => {
    const { element, getClass, emit } = component;

    // Initialize state if not present
    const state: ColorPickerState =
      component.state || createInitialState(config);

    // Use pickerContent if available (for dropdown/dialog), otherwise use element
    const container = component.pickerContent || element;

    // Create hue bar container
    const hueBar = document.createElement("div");
    hueBar.className = getClass(COLORPICKER_CLASSES.HUE);

    // Create rainbow gradient track
    const track = document.createElement("div");
    track.className = getClass(COLORPICKER_CLASSES.HUE_SLIDER);
    hueBar.appendChild(track);

    // Create draggable handle
    const handle = document.createElement("div");
    handle.className = getClass(COLORPICKER_CLASSES.HUE_HANDLE);
    hueBar.appendChild(handle);

    // Insert after area element if it exists, otherwise append
    if (component.area?.element) {
      component.area.element.insertAdjacentElement("afterend", hueBar);
    } else {
      container.appendChild(hueBar);
    }

    // Dragging state
    let isDragging = false;

    /**
     * Update handle position based on current hue
     */
    const updateHandle = (): void => {
      const percent = (state.hsv.h / 360) * 100;
      handle.style.left = `${percent}%`;
      // Set handle color to current hue at full saturation/value
      handle.style.backgroundColor = hsvToHex(state.hsv.h, 100, 100);
    };

    /**
     * Calculate hue from mouse/touch position
     */
    const getHueFromPosition = (clientX: number): number => {
      const rect = hueBar.getBoundingClientRect();
      const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
      const percent = x / rect.width;
      return Math.round(percent * 360);
    };

    /**
     * Update state and emit events
     */
    const updateHue = (h: number, isCommit: boolean): void => {
      state.hsv.h = h;
      state.hex = hsvToHex(state.hsv.h, state.hsv.s, state.hsv.v);

      updateHandle();

      // Update area if present
      if (component.area) {
        component.area.updateBackground();
        component.area.updateHandle();
      }

      // Update other features that depend on color via refs
      state.refs.input?.update?.();
      state.refs.opacity?.updateBackground?.();
      state.refs.opacity?.updateHandle?.();

      if (isCommit) {
        emit(COLORPICKER_EVENTS.CHANGE, state.hex);
        config.onChange?.(state.hex);
      } else {
        emit(COLORPICKER_EVENTS.INPUT, state.hex);
        config.onInput?.(state.hex);
      }
    };

    /**
     * Handle pointer down on hue bar
     */
    const handlePointerDown = (e: PointerEvent): void => {
      if (config.disabled) return;

      e.preventDefault();
      isDragging = true;
      state.isDragging = true;
      state.dragTarget = "hue";

      // Capture pointer for tracking outside element
      hueBar.setPointerCapture(e.pointerId);

      // Add dragging class
      element.classList.add(getClass(COLORPICKER_CLASSES.DRAGGING));

      // Update hue immediately
      const h = getHueFromPosition(e.clientX);
      updateHue(h, false);
    };

    /**
     * Handle pointer move
     */
    const handlePointerMove = (e: PointerEvent): void => {
      if (!isDragging) return;

      e.preventDefault();
      const h = getHueFromPosition(e.clientX);
      updateHue(h, false);
    };

    /**
     * Handle pointer up
     */
    const handlePointerUp = (e: PointerEvent): void => {
      if (!isDragging) return;

      e.preventDefault();
      isDragging = false;
      state.isDragging = false;
      state.dragTarget = null;

      // Release pointer capture
      hueBar.releasePointerCapture(e.pointerId);

      // Remove dragging class
      element.classList.remove(getClass(COLORPICKER_CLASSES.DRAGGING));

      // Emit final change
      const h = getHueFromPosition(e.clientX);
      updateHue(h, true);
    };

    /**
     * Handle keyboard navigation
     */
    const handleKeyDown = (e: KeyboardEvent): void => {
      if (config.disabled) return;

      let h = state.hsv.h;
      const step = e.shiftKey ? 10 : 1;

      switch (e.key) {
        case "ArrowLeft":
        case "ArrowDown":
          e.preventDefault();
          h = (h - step + 360) % 360;
          break;
        case "ArrowRight":
        case "ArrowUp":
          e.preventDefault();
          h = (h + step) % 360;
          break;
        case "Home":
          e.preventDefault();
          h = 0;
          break;
        case "End":
          e.preventDefault();
          h = 359;
          break;
        default:
          return;
      }

      updateHue(h, true);
    };

    // Add event listeners
    hueBar.addEventListener("pointerdown", handlePointerDown);
    hueBar.addEventListener("pointermove", handlePointerMove);
    hueBar.addEventListener("pointerup", handlePointerUp);
    hueBar.addEventListener("pointercancel", handlePointerUp);

    // Make hue bar focusable for keyboard navigation
    hueBar.tabIndex = 0;
    hueBar.setAttribute("role", "slider");
    hueBar.setAttribute("aria-label", "Hue");
    hueBar.setAttribute("aria-valuemin", "0");
    hueBar.setAttribute("aria-valuemax", "360");
    hueBar.addEventListener("keydown", handleKeyDown);

    // Initial handle position
    updateHandle();

    // Create hue feature object
    const hueFeature: HueFeature = {
      element: hueBar,
      handle,
      updateHandle,
    };

    // Extend lifecycle destroy if it exists
    const originalDestroy = (component as any).lifecycle?.destroy;
    if (originalDestroy) {
      (component as any).lifecycle.destroy = () => {
        hueBar.removeEventListener("pointerdown", handlePointerDown);
        hueBar.removeEventListener("pointermove", handlePointerMove);
        hueBar.removeEventListener("pointerup", handlePointerUp);
        hueBar.removeEventListener("pointercancel", handlePointerUp);
        hueBar.removeEventListener("keydown", handleKeyDown);
        hueBar.remove();
        originalDestroy();
      };
    }

    return {
      ...component,
      state,
      hue: hueFeature,
    };
  };
