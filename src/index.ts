/**
 * mtrl-addons
 * Additional components and utilities for the mtrl system
 */

// Version info
export const version = "0.1.0";

// === Core System ===
export * from "./core";

// === Components ===
export * from "./components";

// === Default Export ===
// Export the main createLayout function for easy access
export { createLayout as default } from "./core/layout";
