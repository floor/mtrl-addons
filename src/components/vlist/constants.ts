/**
 * mtrl-addons List Component Constants
 *
 * Constants for the addons list component.
 * Note: Base mtrl list functionality is handled by mtrl core.
 * These constants are for addons-specific features only.
 */

/**
 * CSS class names for VList component
 * Following BEM convention: component__element--modifier
 * Note: mtrl prefix is added automatically by core DOM classes system
 */
export const VLIST_CLASSES = {
  /** List element */
  LIST: "vlist",
  /** List item */
  ITEM: "viewport-item",
  /** Selected list item */
  SELECTED: "viewport-item--selected",
  /** Empty state */
  EMPTY: "vlist--empty",
  /** Scrolled state - list is not at the top */
  SCROLLED: "vlist--scrolled",
} as const;
