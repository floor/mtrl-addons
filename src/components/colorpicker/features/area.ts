// src/components/colorpicker/features/area.ts

import { COLORPICKER_CLASSES, COLORPICKER_EVENTS } from "../constants";
import { ColorPickerConfig, ColorPickerState } from "../types";
import {
  hsvToHex,
  clamp,
  getContrastColor,
  hexToHsv,
  normalizeHex,
} from "../utils";
import { getSizeDimensions, createInitialState } from "../config";

/**
 * Area feature interface
 */
export interface AreaFeature {
  element: HTMLElement;
  gradient: HTMLElement;
  handle: HTMLElement;
  updateBackground: () => void;
  updateHandle: () => void;
}

/**
 * Adds the saturation/brightness area to a color picker component
 *
 * @param config - Color picker configuration
 * @returns Component enhancer function
 */
export const withArea =
  (config: ColorPickerConfig) =>
  <
    T extends {
      element: HTMLElement;
      getClass: (name: string) => string;
      emit: (event: string, data?: unknown) => void;
      state?: ColorPickerState;
      pickerContent?: HTMLElement;
    },
  >(
    component: T,
  ): T & { area: AreaFeature; state: ColorPickerState } => {
    const { element, getClass, emit } = component;

    // Initialize state if not present
    const state: ColorPickerState =
      component.state || createInitialState(config);

    // Get dimensions based on size
    const dimensions = getSizeDimensions(config.size || "m");

    // Use pickerContent if available (for dropdown/dialog), otherwise use element
    const container = component.pickerContent || element;

    // Create area container
    const area = document.createElement("div");
    area.className = getClass(COLORPICKER_CLASSES.AREA);
    area.style.height = `${dimensions.areaHeight}px`;

    // Create gradient overlay
    const gradient = document.createElement("div");
    gradient.className = getClass(COLORPICKER_CLASSES.AREA_GRADIENT);

    // Create handle
    const handle = document.createElement("div");
    handle.className = getClass(COLORPICKER_CLASSES.AREA_HANDLE);

    area.appendChild(gradient);
    area.appendChild(handle);
    container.appendChild(area);

    /**
     * Update the area background based on current hue
     */
    const updateBackground = (): void => {
      const hueColor = hsvToHex(state.hsv.h, 100, 100);
      gradient.style.background = `
        linear-gradient(to top, #000, transparent),
        linear-gradient(to right, #fff, ${hueColor})
      `;
    };

    /**
     * Update the handle position and color
     */
    const updateHandle = (): void => {
      const x = (state.hsv.s / 100) * area.offsetWidth;
      const y = ((100 - state.hsv.v) / 100) * area.offsetHeight;
      handle.style.left = `${x}px`;
      handle.style.top = `${y}px`;
      handle.style.backgroundColor = state.hex;
      handle.style.borderColor = getContrastColor(state.hex);
    };

    /**
     * Handle mouse/touch move on area
     */
    const handleAreaMove = (clientX: number, clientY: number): void => {
      const rect = area.getBoundingClientRect();
      const x = clamp(clientX - rect.left, 0, rect.width);
      const y = clamp(clientY - rect.top, 0, rect.height);

      const s = (x / rect.width) * 100;
      const v = 100 - (y / rect.height) * 100;

      state.hsv.s = Math.round(s);
      state.hsv.v = Math.round(v);
      state.hex = hsvToHex(state.hsv.h, state.hsv.s, state.hsv.v);

      // Update this feature
      updateHandle();

      emit(COLORPICKER_EVENTS.INPUT, state.hex);
      config.onInput?.(state.hex);
    };

    /**
     * Handle mouse down on area
     */
    const handleMouseDown = (e: MouseEvent): void => {
      if (config.disabled) return;
      e.preventDefault();

      state.isDragging = true;
      state.dragTarget = "area";
      element.classList.add(getClass(COLORPICKER_CLASSES.DRAGGING));

      handleAreaMove(e.clientX, e.clientY);

      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    };

    /**
     * Handle mouse move (document level)
     */
    const handleMouseMove = (e: MouseEvent): void => {
      if (!state.isDragging || state.dragTarget !== "area") return;
      handleAreaMove(e.clientX, e.clientY);
    };

    /**
     * Handle mouse up (document level)
     */
    const handleMouseUp = (): void => {
      if (state.isDragging && state.dragTarget === "area") {
        state.isDragging = false;
        state.dragTarget = null;
        element.classList.remove(getClass(COLORPICKER_CLASSES.DRAGGING));

        emit(COLORPICKER_EVENTS.CHANGE, state.hex);
        config.onChange?.(state.hex);
      }

      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };

    /**
     * Handle touch start on area
     */
    const handleTouchStart = (e: TouchEvent): void => {
      if (config.disabled) return;
      e.preventDefault();

      state.isDragging = true;
      state.dragTarget = "area";
      element.classList.add(getClass(COLORPICKER_CLASSES.DRAGGING));

      const touch = e.touches[0];
      handleAreaMove(touch.clientX, touch.clientY);

      document.addEventListener("touchmove", handleTouchMove, {
        passive: false,
      });
      document.addEventListener("touchend", handleTouchEnd);
    };

    /**
     * Handle touch move (document level)
     */
    const handleTouchMove = (e: TouchEvent): void => {
      if (!state.isDragging || state.dragTarget !== "area") return;
      e.preventDefault();
      const touch = e.touches[0];
      handleAreaMove(touch.clientX, touch.clientY);
    };

    /**
     * Handle touch end (document level)
     */
    const handleTouchEnd = (): void => {
      if (state.isDragging && state.dragTarget === "area") {
        state.isDragging = false;
        state.dragTarget = null;
        element.classList.remove(getClass(COLORPICKER_CLASSES.DRAGGING));

        emit(COLORPICKER_EVENTS.CHANGE, state.hex);
        config.onChange?.(state.hex);
      }

      document.removeEventListener("touchmove", handleTouchMove);
      document.removeEventListener("touchend", handleTouchEnd);
    };

    // Attach event listeners
    area.addEventListener("mousedown", handleMouseDown);
    area.addEventListener("touchstart", handleTouchStart, { passive: false });

    // Initial render
    updateBackground();
    updateHandle();

    // Create area feature object
    const areaFeature: AreaFeature = {
      element: area,
      gradient,
      handle,
      updateBackground,
      updateHandle,
    };

    // Extend lifecycle destroy if it exists
    const originalDestroy = (component as any).lifecycle?.destroy;
    if (originalDestroy) {
      (component as any).lifecycle.destroy = () => {
        area.removeEventListener("mousedown", handleMouseDown);
        area.removeEventListener("touchstart", handleTouchStart);
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
        document.removeEventListener("touchmove", handleTouchMove);
        document.removeEventListener("touchend", handleTouchEnd);
        originalDestroy();
      };
    }

    return {
      ...component,
      state,
      area: areaFeature,
    };
  };
