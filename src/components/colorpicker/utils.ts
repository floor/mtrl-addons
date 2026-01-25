// src/components/colorpicker/utils.ts

import { HSVColor, RGBColor } from "./types";

/**
 * Converts HSV to RGB
 * @param h - Hue (0-360)
 * @param s - Saturation (0-100)
 * @param v - Value (0-100)
 * @returns RGB color object
 */
export const hsvToRgb = (h: number, s: number, v: number): RGBColor => {
  const sNorm = s / 100;
  const vNorm = v / 100;

  const c = vNorm * sNorm;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = vNorm - c;

  let rPrime = 0;
  let gPrime = 0;
  let bPrime = 0;

  if (h >= 0 && h < 60) {
    rPrime = c;
    gPrime = x;
    bPrime = 0;
  } else if (h >= 60 && h < 120) {
    rPrime = x;
    gPrime = c;
    bPrime = 0;
  } else if (h >= 120 && h < 180) {
    rPrime = 0;
    gPrime = c;
    bPrime = x;
  } else if (h >= 180 && h < 240) {
    rPrime = 0;
    gPrime = x;
    bPrime = c;
  } else if (h >= 240 && h < 300) {
    rPrime = x;
    gPrime = 0;
    bPrime = c;
  } else {
    rPrime = c;
    gPrime = 0;
    bPrime = x;
  }

  return {
    r: Math.round((rPrime + m) * 255),
    g: Math.round((gPrime + m) * 255),
    b: Math.round((bPrime + m) * 255),
  };
};

/**
 * Converts RGB to HSV
 * @param r - Red (0-255)
 * @param g - Green (0-255)
 * @param b - Blue (0-255)
 * @returns HSV color object
 */
export const rgbToHsv = (r: number, g: number, b: number): HSVColor => {
  const rNorm = r / 255;
  const gNorm = g / 255;
  const bNorm = b / 255;

  const max = Math.max(rNorm, gNorm, bNorm);
  const min = Math.min(rNorm, gNorm, bNorm);
  const delta = max - min;

  let h = 0;
  let s = 0;
  const v = max * 100;

  if (delta !== 0) {
    s = (delta / max) * 100;

    if (max === rNorm) {
      h = 60 * (((gNorm - bNorm) / delta) % 6);
    } else if (max === gNorm) {
      h = 60 * ((bNorm - rNorm) / delta + 2);
    } else {
      h = 60 * ((rNorm - gNorm) / delta + 4);
    }
  }

  if (h < 0) {
    h += 360;
  }

  return {
    h: Math.round(h),
    s: Math.round(s),
    v: Math.round(v),
  };
};

/**
 * Converts RGB to hex string
 * @param r - Red (0-255)
 * @param g - Green (0-255)
 * @param b - Blue (0-255)
 * @returns Hex color string (e.g., '#ff0000')
 */
export const rgbToHex = (r: number, g: number, b: number): string => {
  const toHex = (n: number): string => {
    const hex = Math.max(0, Math.min(255, Math.round(n))).toString(16);
    return hex.length === 1 ? "0" + hex : hex;
  };
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
};

/**
 * Converts hex string to RGB
 * @param hex - Hex color string (e.g., '#ff0000' or 'ff0000')
 * @returns RGB color object or null if invalid
 */
export const hexToRgb = (hex: string): RGBColor | null => {
  // Remove # if present
  const cleanHex = hex.replace(/^#/, "");

  // Handle 3-character hex
  let fullHex = cleanHex;
  if (cleanHex.length === 3) {
    fullHex = cleanHex
      .split("")
      .map((c) => c + c)
      .join("");
  }

  // Validate hex string
  if (!/^[0-9A-Fa-f]{6}$/.test(fullHex)) {
    return null;
  }

  const num = parseInt(fullHex, 16);
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
};

/**
 * Converts HSV to hex string
 * @param h - Hue (0-360)
 * @param s - Saturation (0-100)
 * @param v - Value (0-100)
 * @returns Hex color string
 */
export const hsvToHex = (h: number, s: number, v: number): string => {
  const rgb = hsvToRgb(h, s, v);
  return rgbToHex(rgb.r, rgb.g, rgb.b);
};

/**
 * Converts hex string to HSV
 * @param hex - Hex color string
 * @returns HSV color object or null if invalid
 */
export const hexToHsv = (hex: string): HSVColor | null => {
  const rgb = hexToRgb(hex);
  if (!rgb) return null;
  return rgbToHsv(rgb.r, rgb.g, rgb.b);
};

/**
 * Validates a hex color string
 * @param hex - String to validate
 * @returns True if valid hex color
 */
export const isValidHex = (hex: string): boolean => {
  return /^#?([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(hex);
};

/**
 * Normalizes a hex color to 6-character format with #
 * @param hex - Hex color string
 * @returns Normalized hex string or original if invalid
 */
export const normalizeHex = (hex: string): string => {
  if (!isValidHex(hex)) return hex;

  let cleanHex = hex.replace(/^#/, "");

  // Expand 3-character hex
  if (cleanHex.length === 3) {
    cleanHex = cleanHex
      .split("")
      .map((c) => c + c)
      .join("");
  }

  return `#${cleanHex.toLowerCase()}`;
};

/**
 * Clamps a number between min and max
 * @param value - Value to clamp
 * @param min - Minimum value
 * @param max - Maximum value
 * @returns Clamped value
 */
export const clamp = (value: number, min: number, max: number): number => {
  return Math.min(Math.max(value, min), max);
};

/**
 * Gets contrasting text color (black or white) for a background
 * @param hex - Background hex color
 * @returns '#000000' or '#ffffff'
 */
export const getContrastColor = (hex: string): string => {
  const rgb = hexToRgb(hex);
  if (!rgb) return "#000000";

  // Calculate relative luminance
  const luminance = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;

  return luminance > 0.5 ? "#000000" : "#ffffff";
};
