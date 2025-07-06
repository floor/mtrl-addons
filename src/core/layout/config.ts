/**
 * @module core/layout/config
 * @description Essential layout configuration utilities
 * Core functionality is integrated into schema.ts for better performance
 */

// Configuration constants
const PREFIX = "mtrl"; // TODO: Make this configurable from main mtrl config
const PREFIX_WITH_DASH = `${PREFIX}-`;

/**
 * Simple DOM utilities
 */
function addClass(element: any, className: string): void {
  if (element && className && element.classList) {
    element.classList.add(className);
  }
}

function hasClass(element: any, className: string): boolean {
  return element && element.classList && element.classList.contains(className);
}

/**
 * Helper function to clean up previous layout classes from an element
 * Useful for dynamic class management
 *
 * @param element - Element to clean layout classes from
 */
export function cleanupLayoutClasses(element: any): void {
  if (!element || !element.classList) return;

  // Get all classes from the element
  const classList = Array.from(element.classList) as string[];

  // Find and remove layout-related classes
  const layoutClasses = classList.filter(
    (cls: string) =>
      cls.startsWith(`${PREFIX_WITH_DASH}layout--`) ||
      cls.includes(`-${PREFIX_WITH_DASH}layout--`)
  );

  // Remove each layout class
  layoutClasses.forEach((cls: string) => {
    element.classList.remove(cls);
  });
}

/**
 * Helper function to get the layout type from element classes
 *
 * @param element - Element to check
 * @returns Layout type if found, empty string otherwise
 */
export function getLayoutType(element: any): string {
  return hasClass(element, `${PREFIX_WITH_DASH}layout--stack`)
    ? "stack"
    : hasClass(element, `${PREFIX_WITH_DASH}layout--row`)
    ? "row"
    : hasClass(element, `${PREFIX_WITH_DASH}layout--grid`)
    ? "grid"
    : "";
}

/**
 * Gets the configured prefix for the layout system
 * @returns Current prefix with dash
 */
export function getLayoutPrefix(): string {
  return PREFIX_WITH_DASH;
}

/**
 * Sets layout classes on an element dynamically
 * Useful for programmatic layout updates
 *
 * @param element - Target element
 * @param layoutType - Layout type to apply
 * @param classes - Additional classes to apply
 */
export function setLayoutClasses(
  element: any,
  layoutType: string,
  classes: string[] = []
): void {
  if (!element || !layoutType) return;

  // Clean up existing layout classes first
  cleanupLayoutClasses(element);

  // Apply base layout type
  addClass(element, `${PREFIX_WITH_DASH}layout--${layoutType}`);

  // Apply additional classes
  classes.forEach((cls) => {
    if (cls.startsWith("layout--") || cls.startsWith("layout__")) {
      addClass(element, `${PREFIX_WITH_DASH}${cls}`);
    } else {
      addClass(element, cls);
    }
  });
}
