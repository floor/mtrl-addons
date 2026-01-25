// src/components/colorpicker/features/opacity.ts

import { COLORPICKER_EVENTS } from "../constants";
import { ColorPickerConfig, ColorPickerState } from "../types";
import { hsvToHex } from "../utils";
import { createInitialState } from "../config";

/**
 * Opacity feature interface
 */
export interface OpacityFeature {
  element: HTMLElement;
  handle: HTMLElement;
  updateHandle: () => void;
  updateBackground: () => void;
}

/**
 * Adds an opacity/alpha bar with checkerboard background and draggable handle
 *
 * @param config - Color picker configuration
 * @returns Component enhancer function
 */
export const withOpacity =
  (config: ColorPickerConfig) =>
  <
    T extends {
      element: HTMLElement;
      getClass: (name: string) => string;
      emit: (event: string, data?: unknown) => void;
      state?: ColorPickerState;
      pickerContent?: HTMLElement;
      hue?: {
        element: HTMLElement;
      };
    },
  >(
    component: T,
  ): T & { opacity: OpacityFeature; state: ColorPickerState } => {
    const { element, getClass, emit } = component;

    // Initialize state if not present
    const state: ColorPickerState =
      component.state || createInitialState(config);

    // Initialize opacity in state if not present
    if (state.opacity === undefined) {
      state.opacity = config.opacity ?? 1;
    }

    // Use pickerContent if available (for dropdown/dialog), otherwise use element
    const container = component.pickerContent || element;

    // Create opacity bar container
    const opacityBar = document.createElement("div");
    opacityBar.className = getClass("colorpicker__opacity");

    // Create checkerboard background (for transparency visualization)
    const checkerboard = document.createElement("div");
    checkerboard.className = getClass("colorpicker__opacity-checkerboard");
    opacityBar.appendChild(checkerboard);

    // Create gradient track (transparent to solid color)
    const track = document.createElement("div");
    track.className = getClass("colorpicker__opacity-track");
    opacityBar.appendChild(track);

    // Create draggable handle
    const handle = document.createElement("div");
    handle.className = getClass("colorpicker__opacity-handle");
    opacityBar.appendChild(handle);

    // Insert after hue element if it exists, otherwise append
    if (component.hue?.element) {
      component.hue.element.insertAdjacentElement("afterend", opacityBar);
    } else {
      container.appendChild(opacityBar);
    }

    // Dragging state
    let isDragging = false;

    /**
     * Update the gradient background based on current color
     */
    const updateBackground = (): void => {
      const solidColor = hsvToHex(state.hsv.h, state.hsv.s, state.hsv.v);
      track.style.background = `linear-gradient(to right, transparent, ${solidColor})`;
    };

    /**
     * Update handle position based on current opacity
     */
    const updateHandle = (): void => {
      const percent = state.opacity * 100;
      handle.style.left = `${percent}%`;
      // Set handle color with current opacity
      const solidColor = hsvToHex(state.hsv.h, state.hsv.s, state.hsv.v);
      handle.style.backgroundColor = solidColor;
      handle.style.opacity = String(state.opacity);
    };

    /**
     * Calculate opacity from mouse/touch position
     */
    const getOpacityFromPosition = (clientX: number): number => {
      const rect = opacityBar.getBoundingClientRect();
      const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
      const percent = x / rect.width;
      return Math.round(percent * 100) / 100; // Round to 2 decimal places
    };

    /**
     * Update state and emit events
     */
    const updateOpacity = (opacity: number, isCommit: boolean): void => {
      state.opacity = opacity;

      updateHandle();

      // Update aria value
      opacityBar.setAttribute(
        "aria-valuenow",
        String(Math.round(opacity * 100)),
      );

      // Update input field via refs
      state.refs.input?.update?.();

      if (isCommit) {
        emit(COLORPICKER_EVENTS.CHANGE, state.hex);
        config.onChange?.(state.hex);
      } else {
        emit(COLORPICKER_EVENTS.INPUT, state.hex);
        config.onInput?.(state.hex);
      }
    };

    /**
     * Handle pointer down on opacity bar
     */
    const handlePointerDown = (e: PointerEvent): void => {
      if (config.disabled) return;

      e.preventDefault();
      isDragging = true;
      state.isDragging = true;
      state.dragTarget = "opacity";

      // Capture pointer for tracking outside element
      opacityBar.setPointerCapture(e.pointerId);

      // Add dragging class
      element.classList.add(getClass("colorpicker--dragging"));

      // Update opacity immediately
      const opacity = getOpacityFromPosition(e.clientX);
      updateOpacity(opacity, false);
    };

    /**
     * Handle pointer move
     */
    const handlePointerMove = (e: PointerEvent): void => {
      if (!isDragging) return;

      e.preventDefault();
      const opacity = getOpacityFromPosition(e.clientX);
      updateOpacity(opacity, false);
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
      opacityBar.releasePointerCapture(e.pointerId);

      // Remove dragging class
      element.classList.remove(getClass("colorpicker--dragging"));

      // Emit final change
      const opacity = getOpacityFromPosition(e.clientX);
      updateOpacity(opacity, true);
    };

    /**
     * Handle keyboard navigation
     */
    const handleKeyDown = (e: KeyboardEvent): void => {
      if (config.disabled) return;

      let opacity = state.opacity;
      const step = e.shiftKey ? 0.1 : 0.01;

      switch (e.key) {
        case "ArrowLeft":
        case "ArrowDown":
          e.preventDefault();
          opacity = Math.max(0, opacity - step);
          break;
        case "ArrowRight":
        case "ArrowUp":
          e.preventDefault();
          opacity = Math.min(1, opacity + step);
          break;
        case "Home":
          e.preventDefault();
          opacity = 0;
          break;
        case "End":
          e.preventDefault();
          opacity = 1;
          break;
        default:
          return;
      }

      // Round to avoid floating point issues
      opacity = Math.round(opacity * 100) / 100;
      updateOpacity(opacity, true);
    };

    // Add event listeners
    opacityBar.addEventListener("pointerdown", handlePointerDown);
    opacityBar.addEventListener("pointermove", handlePointerMove);
    opacityBar.addEventListener("pointerup", handlePointerUp);
    opacityBar.addEventListener("pointercancel", handlePointerUp);

    // Make opacity bar focusable for keyboard navigation
    opacityBar.tabIndex = 0;
    opacityBar.setAttribute("role", "slider");
    opacityBar.setAttribute("aria-label", "Opacity");
    opacityBar.setAttribute("aria-valuemin", "0");
    opacityBar.setAttribute("aria-valuemax", "100");
    opacityBar.setAttribute(
      "aria-valuenow",
      String(Math.round(state.opacity * 100)),
    );
    opacityBar.addEventListener("keydown", handleKeyDown);

    // Register in refs for cross-feature access
    state.refs.opacity = { updateBackground, updateHandle };

    // Initial updates
    updateBackground();
    updateHandle();

    // Create opacity feature object
    const opacityFeature: OpacityFeature = {
      element: opacityBar,
      handle,
      updateHandle,
      updateBackground,
    };

    // Extend lifecycle destroy if it exists
    const originalDestroy = (component as any).lifecycle?.destroy;
    if (originalDestroy) {
      (component as any).lifecycle.destroy = () => {
        opacityBar.removeEventListener("pointerdown", handlePointerDown);
        opacityBar.removeEventListener("pointermove", handlePointerMove);
        opacityBar.removeEventListener("pointerup", handlePointerUp);
        opacityBar.removeEventListener("pointercancel", handlePointerUp);
        opacityBar.removeEventListener("keydown", handleKeyDown);
        opacityBar.remove();
        originalDestroy();
      };
    }

    return {
      ...component,
      state,
      opacity: opacityFeature,
    };
  };
