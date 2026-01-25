// src/components/colorpicker/features/pipette.ts

import { createIconButton } from "mtrl";
import { COLORPICKER_EVENTS } from "../constants";
import { ColorPickerConfig, ColorPickerState } from "../types";
import { rgbToHex, hexToHsv } from "../utils";
import { createInitialState } from "../config";

/**
 * Check if the native EyeDropper API is supported
 */
export const isEyeDropperSupported = (): boolean => {
  return "EyeDropper" in window;
};

/**
 * Pipette feature interface
 */
export interface PipetteFeature {
  /** The pipette button element */
  element: HTMLElement;
  /** Start pipette sampling */
  pick: () => Promise<string | null>;
  /** Set the image source for canvas fallback */
  setImageSource: (source: HTMLImageElement | string | null) => void;
  /** Check if currently sampling */
  isSampling: () => boolean;
  /** Destroy and cleanup */
  destroy: () => void;
}

/**
 * Pipette configuration options
 */
export interface PipetteConfig {
  /**
   * Whether to show the pipette button
   * @default true (when supported or imageSource provided)
   */
  showPipette?: boolean;

  /**
   * Image source for canvas-based fallback sampling
   * Can be an HTMLImageElement, URL string, or null
   */
  imageSource?: HTMLImageElement | string | null;

  /**
   * Callback when pipette sampling starts
   */
  onPipetteStart?: () => void;

  /**
   * Callback when pipette sampling ends
   */
  onPipetteEnd?: (color: string | null) => void;
}

// Extend ColorPickerConfig to include pipette options
declare module "../types" {
  interface ColorPickerConfig extends PipetteConfig {}
}

/**
 * Pipette icon SVG path
 */
const PIPETTE_ICON = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
  <path d="M20.71 5.63l-2.34-2.34a1 1 0 0 0-1.41 0l-3.12 3.12-1.41-1.41-1.42 1.41 1.42 1.42-8.29 8.29a1 1 0 0 0-.29.7V19a1 1 0 0 0 1 1h2.17a1 1 0 0 0 .71-.29l8.29-8.29 1.41 1.41 1.41-1.41-1.41-1.41 3.12-3.12a1 1 0 0 0 .16-1.26zM6.41 19H5v-1.41l8.29-8.29 1.41 1.41z"/>
</svg>`;

/**
 * Creates a canvas-based color sampler for an image
 */
class CanvasSampler {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private image: HTMLImageElement | null = null;
  private overlay: HTMLElement | null = null;
  private magnifier: HTMLElement | null = null;
  private crosshair: HTMLElement | null = null;
  private colorPreview: HTMLElement | null = null;
  private isActive = false;
  private resolvePromise: ((color: string | null) => void) | null = null;
  private boundMouseMove: (e: MouseEvent) => void;
  private boundMouseDown: (e: MouseEvent) => void;
  private boundKeyDown: (e: KeyboardEvent) => void;
  private boundTouchMove: (e: TouchEvent) => void;
  private boundTouchEnd: (e: TouchEvent) => void;

  constructor() {
    this.canvas = document.createElement("canvas");
    this.ctx = this.canvas.getContext("2d", { willReadFrequently: true })!;

    this.boundMouseMove = this.handleMouseMove.bind(this);
    this.boundMouseDown = this.handleMouseDown.bind(this);
    this.boundKeyDown = this.handleKeyDown.bind(this);
    this.boundTouchMove = this.handleTouchMove.bind(this);
    this.boundTouchEnd = this.handleTouchEnd.bind(this);
  }

  /**
   * Set the image to sample from
   */
  setImage(source: HTMLImageElement | string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (source instanceof HTMLImageElement) {
        if (source.complete && source.naturalWidth > 0) {
          this.image = source;
          this.drawToCanvas();
          resolve();
        } else {
          source.onload = () => {
            this.image = source;
            this.drawToCanvas();
            resolve();
          };
          source.onerror = reject;
        }
      } else if (typeof source === "string") {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {
          this.image = img;
          this.drawToCanvas();
          resolve();
        };
        img.onerror = reject;
        img.src = source;
      } else {
        reject(new Error("Invalid image source"));
      }
    });
  }

  /**
   * Draw the image to the internal canvas
   */
  private drawToCanvas(): void {
    if (!this.image) return;
    this.canvas.width = this.image.naturalWidth;
    this.canvas.height = this.image.naturalHeight;
    this.ctx.drawImage(this.image, 0, 0);
  }

  /**
   * Get the color at a specific position in the image
   */
  getColorAt(x: number, y: number): string | null {
    if (!this.image) return null;

    // Clamp coordinates to image bounds
    const clampedX = Math.max(0, Math.min(x, this.canvas.width - 1));
    const clampedY = Math.max(0, Math.min(y, this.canvas.height - 1));

    try {
      const pixel = this.ctx.getImageData(clampedX, clampedY, 1, 1).data;
      return rgbToHex(pixel[0], pixel[1], pixel[2]);
    } catch (e) {
      console.warn("Failed to get pixel color (CORS issue?):", e);
      return null;
    }
  }

  /**
   * Create the sampling overlay UI
   */
  private createOverlay(): void {
    // Create fullscreen overlay
    this.overlay = document.createElement("div");
    this.overlay.className = "mtrl-pipette-overlay";
    this.overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      z-index: 10000;
      cursor: crosshair;
      background: rgba(0, 0, 0, 0.3);
      display: flex;
      align-items: center;
      justify-content: center;
    `;

    // Create image container
    const imageContainer = document.createElement("div");
    imageContainer.style.cssText = `
      position: relative;
      max-width: 90vw;
      max-height: 90vh;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
      border-radius: 8px;
      overflow: hidden;
    `;

    // Clone and display the image
    const displayImage = this.image!.cloneNode(true) as HTMLImageElement;
    displayImage.style.cssText = `
      display: block;
      max-width: 90vw;
      max-height: 90vh;
      object-fit: contain;
    `;
    displayImage.draggable = false;
    imageContainer.appendChild(displayImage);

    // Create crosshair
    this.crosshair = document.createElement("div");
    this.crosshair.style.cssText = `
      position: absolute;
      width: 20px;
      height: 20px;
      border: 2px solid white;
      border-radius: 50%;
      box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.3), inset 0 0 0 1px rgba(0, 0, 0, 0.3);
      pointer-events: none;
      transform: translate(-50%, -50%);
      display: none;
    `;
    imageContainer.appendChild(this.crosshair);

    // Create magnifier (optional zoom preview)
    this.magnifier = document.createElement("div");
    this.magnifier.style.cssText = `
      position: absolute;
      width: 80px;
      height: 80px;
      border: 3px solid white;
      border-radius: 50%;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      pointer-events: none;
      overflow: hidden;
      display: none;
      background-size: 400%;
      background-repeat: no-repeat;
      image-rendering: pixelated;
    `;
    imageContainer.appendChild(this.magnifier);

    // Create color preview
    this.colorPreview = document.createElement("div");
    this.colorPreview.style.cssText = `
      position: fixed;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%);
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 20px;
      background: white;
      border-radius: 24px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
      font-family: system-ui, sans-serif;
      font-size: 14px;
    `;

    const colorSwatch = document.createElement("div");
    colorSwatch.className = "pipette-swatch";
    colorSwatch.style.cssText = `
      width: 32px;
      height: 32px;
      border-radius: 50%;
      border: 2px solid rgba(0, 0, 0, 0.1);
    `;

    const colorText = document.createElement("span");
    colorText.className = "pipette-text";
    colorText.textContent = "Click to select color";
    colorText.style.cssText = `
      font-family: monospace;
      min-width: 70px;
    `;

    const helpText = document.createElement("span");
    helpText.textContent = "ESC to cancel";
    helpText.style.cssText = `
      color: #666;
      font-size: 12px;
    `;

    this.colorPreview.appendChild(colorSwatch);
    this.colorPreview.appendChild(colorText);
    this.colorPreview.appendChild(helpText);

    this.overlay.appendChild(imageContainer);
    this.overlay.appendChild(this.colorPreview);

    // Store reference to image container for coordinate calculations
    (this.overlay as any)._imageContainer = imageContainer;
    (this.overlay as any)._displayImage = displayImage;

    document.body.appendChild(this.overlay);
  }

  /**
   * Remove the sampling overlay
   */
  private removeOverlay(): void {
    if (this.overlay) {
      this.overlay.remove();
      this.overlay = null;
      this.magnifier = null;
      this.crosshair = null;
      this.colorPreview = null;
    }
  }

  /**
   * Get image coordinates from mouse event
   */
  private getImageCoordinates(clientX: number, clientY: number): { x: number; y: number; imageX: number; imageY: number } | null {
    if (!this.overlay || !this.image) return null;

    const displayImage = (this.overlay as any)._displayImage as HTMLImageElement;
    const rect = displayImage.getBoundingClientRect();

    // Check if mouse is over the image
    if (
      clientX < rect.left ||
      clientX > rect.right ||
      clientY < rect.top ||
      clientY > rect.bottom
    ) {
      return null;
    }

    // Calculate position relative to image
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    // Scale to actual image dimensions
    const scaleX = this.image.naturalWidth / rect.width;
    const scaleY = this.image.naturalHeight / rect.height;
    const imageX = Math.floor(x * scaleX);
    const imageY = Math.floor(y * scaleY);

    return { x, y, imageX, imageY };
  }

  /**
   * Update the UI during sampling
   */
  private updateSamplingUI(clientX: number, clientY: number): void {
    const coords = this.getImageCoordinates(clientX, clientY);

    if (!coords) {
      if (this.crosshair) this.crosshair.style.display = "none";
      if (this.magnifier) this.magnifier.style.display = "none";
      return;
    }

    const color = this.getColorAt(coords.imageX, coords.imageY);

    // Update crosshair position
    if (this.crosshair) {
      this.crosshair.style.display = "block";
      this.crosshair.style.left = `${coords.x}px`;
      this.crosshair.style.top = `${coords.y}px`;
      if (color) {
        this.crosshair.style.borderColor = this.isLightColor(color) ? "#333" : "#fff";
      }
    }

    // Update magnifier
    if (this.magnifier && this.image) {
      this.magnifier.style.display = "block";
      // Position magnifier offset from cursor
      const offsetX = coords.x + 100 > (this.overlay as any)._displayImage.width ? -100 : 50;
      const offsetY = coords.y + 100 > (this.overlay as any)._displayImage.height ? -100 : 50;
      this.magnifier.style.left = `${coords.x + offsetX}px`;
      this.magnifier.style.top = `${coords.y + offsetY}px`;

      // Set magnified background
      const bgX = (coords.imageX / this.image.naturalWidth) * 100;
      const bgY = (coords.imageY / this.image.naturalHeight) * 100;
      this.magnifier.style.backgroundImage = `url(${this.image.src})`;
      this.magnifier.style.backgroundPosition = `${bgX}% ${bgY}%`;
    }

    // Update color preview
    if (this.colorPreview && color) {
      const swatch = this.colorPreview.querySelector(".pipette-swatch") as HTMLElement;
      const text = this.colorPreview.querySelector(".pipette-text") as HTMLElement;
      if (swatch) swatch.style.backgroundColor = color;
      if (text) text.textContent = color.toUpperCase();
    }
  }

  /**
   * Check if a color is light (for contrast)
   */
  private isLightColor(hex: string): boolean {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.5;
  }

  /**
   * Handle mouse move during sampling
   */
  private handleMouseMove(e: MouseEvent): void {
    if (!this.isActive) return;
    this.updateSamplingUI(e.clientX, e.clientY);
  }

  /**
   * Handle mouse down to select color
   */
  private handleMouseDown(e: MouseEvent): void {
    if (!this.isActive) return;

    const coords = this.getImageCoordinates(e.clientX, e.clientY);
    if (coords) {
      const color = this.getColorAt(coords.imageX, coords.imageY);
      this.endSampling(color);
    }
  }

  /**
   * Handle touch move during sampling
   */
  private handleTouchMove(e: TouchEvent): void {
    if (!this.isActive || !e.touches.length) return;
    e.preventDefault();
    const touch = e.touches[0];
    this.updateSamplingUI(touch.clientX, touch.clientY);
  }

  /**
   * Handle touch end to select color
   */
  private handleTouchEnd(e: TouchEvent): void {
    if (!this.isActive) return;

    const touch = e.changedTouches[0];
    const coords = this.getImageCoordinates(touch.clientX, touch.clientY);
    if (coords) {
      const color = this.getColorAt(coords.imageX, coords.imageY);
      this.endSampling(color);
    }
  }

  /**
   * Handle keyboard events
   */
  private handleKeyDown(e: KeyboardEvent): void {
    if (e.key === "Escape") {
      this.endSampling(null);
    }
  }

  /**
   * Start sampling mode
   */
  startSampling(): Promise<string | null> {
    return new Promise((resolve) => {
      if (!this.image) {
        resolve(null);
        return;
      }

      this.isActive = true;
      this.resolvePromise = resolve;

      this.createOverlay();

      // Add event listeners
      document.addEventListener("mousemove", this.boundMouseMove);
      document.addEventListener("mousedown", this.boundMouseDown);
      document.addEventListener("keydown", this.boundKeyDown);
      document.addEventListener("touchmove", this.boundTouchMove, { passive: false });
      document.addEventListener("touchend", this.boundTouchEnd);
    });
  }

  /**
   * End sampling mode
   */
  private endSampling(color: string | null): void {
    this.isActive = false;

    // Remove event listeners
    document.removeEventListener("mousemove", this.boundMouseMove);
    document.removeEventListener("mousedown", this.boundMouseDown);
    document.removeEventListener("keydown", this.boundKeyDown);
    document.removeEventListener("touchmove", this.boundTouchMove);
    document.removeEventListener("touchend", this.boundTouchEnd);

    this.removeOverlay();

    if (this.resolvePromise) {
      this.resolvePromise(color);
      this.resolvePromise = null;
    }
  }

  /**
   * Check if currently sampling
   */
  isSampling(): boolean {
    return this.isActive;
  }

  /**
   * Cleanup
   */
  destroy(): void {
    this.endSampling(null);
    this.image = null;
  }
}

/**
 * Use the native EyeDropper API
 */
async function useNativeEyeDropper(): Promise<string | null> {
  if (!isEyeDropperSupported()) {
    return null;
  }

  try {
    // @ts-ignore - EyeDropper API
    const eyeDropper = new window.EyeDropper();
    const result = await eyeDropper.open();
    return result.sRGBHex;
  } catch (e) {
    // User cancelled or error occurred
    return null;
  }
}

/**
 * Adds pipette/color picker functionality to a color picker component
 *
 * @param config - Color picker configuration
 * @returns Component enhancer function
 */
export const withPipette =
  (config: ColorPickerConfig) =>
  <
    T extends {
      element: HTMLElement;
      getClass: (name: string) => string;
      emit: (event: string, data?: unknown) => void;
      state?: ColorPickerState;
      pickerContent?: HTMLElement;
      input?: {
        element: HTMLElement;
      };
    },
  >(
    component: T,
  ): T & { pipette: PipetteFeature; state: ColorPickerState } => {
    const { element, getClass, emit } = component;

    // Initialize state if not present
    const state: ColorPickerState =
      component.state || createInitialState(config);

    // Use pickerContent if available (for dropdown/dialog), otherwise use element
    const container = component.pickerContent || element;

    // Determine if we should show the pipette
    const hasImageSource = !!config.imageSource;
    const hasNativeSupport = isEyeDropperSupported();
    const showPipette = config.showPipette ?? (hasNativeSupport || hasImageSource);

    if (!showPipette) {
      // Create a no-op feature
      const emptyFeature: PipetteFeature = {
        element: document.createElement("div"),
        pick: async () => null,
        setImageSource: () => {},
        isSampling: () => false,
        destroy: () => {},
      };
      return {
        ...component,
        state,
        pipette: emptyFeature,
      };
    }

    // Create canvas sampler for fallback
    const canvasSampler = new CanvasSampler();
    let currentImageSource: HTMLImageElement | string | null = config.imageSource || null;
    let isSampling = false;

    // Initialize image source if provided
    if (currentImageSource) {
      canvasSampler.setImage(currentImageSource).catch((e) => {
        console.warn("Failed to load pipette image source:", e);
      });
    }

    // Create button container (to be inserted near the input/preview row)
    const buttonContainer = document.createElement("div");
    buttonContainer.className = getClass("colorpicker__pipette");
    buttonContainer.style.cssText = `
      display: flex;
      align-items: center;
      justify-content: center;
      margin-top: 8px;
    `;

    // Create pipette button
    const button = createIconButton({
      icon: PIPETTE_ICON,
      ariaLabel: "Pick color from image",
      variant: "standard",
      class: getClass("colorpicker__pipette-btn"),
    });

    buttonContainer.appendChild(button.element);

    // Insert after the value row (input/preview) or at the end
    if (component.input?.element) {
      component.input.element.after(buttonContainer);
    } else {
      container.appendChild(buttonContainer);
    }

    /**
     * Update all UI features
     */
    const updateAllUI = (): void => {
      (component as any).area?.updateBackground?.();
      (component as any).area?.updateHandle?.();
      (component as any).hue?.updateHandle?.();
      (component as any).input?.update?.();
      (component as any).swatches?.update?.();
    };

    /**
     * Handle picked color
     */
    const handlePickedColor = (color: string | null): void => {
      isSampling = false;
      config.onPipetteEnd?.(color);

      if (color) {
        const hsv = hexToHsv(color);
        if (hsv) {
          state.hsv = hsv;
          state.hex = color.toLowerCase();
          updateAllUI();

          emit(COLORPICKER_EVENTS.INPUT, state.hex);
          emit(COLORPICKER_EVENTS.CHANGE, state.hex);
          config.onInput?.(state.hex);
          config.onChange?.(state.hex);
        }
      }
    };

    /**
     * Start pipette picking
     */
    const pick = async (): Promise<string | null> => {
      if (isSampling) return null;

      isSampling = true;
      config.onPipetteStart?.();

      let color: string | null = null;

      // Try native API first if supported and no specific image source
      if (hasNativeSupport && !currentImageSource) {
        color = await useNativeEyeDropper();
      } else if (currentImageSource) {
        // Use canvas sampler for specific image
        color = await canvasSampler.startSampling();
      } else if (hasNativeSupport) {
        // Fallback to native if available
        color = await useNativeEyeDropper();
      }

      handlePickedColor(color);
      return color;
    };

    /**
     * Set the image source for canvas sampling
     */
    const setImageSource = (source: HTMLImageElement | string | null): void => {
      currentImageSource = source;
      if (source) {
        canvasSampler.setImage(source).catch((e) => {
          console.warn("Failed to load pipette image source:", e);
        });
      }
    };

    // Button click handler
    button.on("click", () => {
      pick();
    });

    // Create pipette feature object
    const pipetteFeature: PipetteFeature = {
      element: buttonContainer,
      pick,
      setImageSource,
      isSampling: () => isSampling || canvasSampler.isSampling(),
      destroy: () => {
        canvasSampler.destroy();
        button.destroy?.();
        buttonContainer.remove();
      },
    };

    // Extend lifecycle destroy if it exists
    const originalDestroy = (component as any).lifecycle?.destroy;
    if (originalDestroy) {
      (component as any).lifecycle.destroy = () => {
        pipetteFeature.destroy();
        originalDestroy();
      };
    }

    return {
      ...component,
      state,
      pipette: pipetteFeature,
    };
  };
