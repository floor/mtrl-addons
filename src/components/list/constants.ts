/**
 * mtrl-addons List Component Constants
 *
 * Constants for the addons list component.
 * Note: Base mtrl list functionality is handled by mtrl core.
 * These constants are for addons-specific features only.
 */

/**
 * CSS class names for List component
 * Following BEM convention: component__element--modifier
 * Note: mtrl prefix is added automatically by core DOM classes system
 */
export const LIST_CLASSES = {
  BASE: "list",
  ADDONS: "list-addons", // Addons-specific class
} as const;

/**
 * Default values for List component configuration
 * These supplement mtrl's base list defaults with addons-specific values
 */
export const LIST_DEFAULTS = {
  // Collection defaults (addons-specific)
  INITIAL_CAPACITY: 100,
  RENDER_BUFFER_SIZE: 10,
  RENDER_DEBOUNCE: 16, // ~1 frame at 60fps

  // Template defaults (addons-specific)
  TEMPLATE_ENGINE: "object" as const,

  // Performance defaults (addons-specific)
  PERFORMANCE_TRACKING: true,
} as const;

/**
 * Event names for List component
 * Following mtrl event naming conventions
 */
export const LIST_EVENTS = {
  // Core events (inherited from mtrl base)
  CREATED: "list:created",
  DESTROYED: "list:destroyed",

  // Data events (addons-specific)
  DATA_LOADED: "list:data-loaded",
  DATA_ERROR: "list:data-error",
  DATA_UPDATED: "list:data-updated",

  // Selection events (addons-specific enhancements)
  SELECTION_CHANGED: "list:selection-changed",
  SELECTION_CLEARED: "list:selection-cleared",

  // Performance events (addons-specific)
  PERFORMANCE_METRICS: "list:performance-metrics",
} as const;
