/**
 * @module core/compose/features
 * @description Styling feature for components
 */

/**
 * Style configuration for components
 */
export interface StylingConfig {
  itemHeight?: number | "auto";
  gap?: number;
  padding?: number;
  striped?: boolean;
  hoverable?: boolean;
  bordered?: boolean;
  componentName?: string; // For component-specific CSS properties
  [key: string]: any;
}

/**
 * Component with styling capabilities
 */
export interface StylingComponent {
  setStyle: (style: Partial<StylingConfig>) => any;
  getStyle: () => StylingConfig | undefined;
}

/**
 * Applies styling to an element using CSS custom properties
 *
 * @param element - The element to style
 * @param style - Style configuration
 */
function applyElementStyling(element: HTMLElement, style: StylingConfig): void {
  const componentName = style.componentName || "component";

  if (style.gap !== undefined) {
    element.style.setProperty(`--mtrl-${componentName}-gap`, `${style.gap}px`);
  }

  if (style.padding !== undefined) {
    element.style.setProperty(
      `--mtrl-${componentName}-padding`,
      `${style.padding}px`
    );
  }

  if (style.itemHeight !== undefined && style.itemHeight !== "auto") {
    element.style.setProperty(
      `--mtrl-${componentName}-item-height`,
      `${style.itemHeight}px`
    );
  }

  element.classList.toggle(`mtrl-${componentName}--striped`, !!style.striped);
  element.classList.toggle(
    `mtrl-${componentName}--hoverable`,
    !!style.hoverable
  );
  element.classList.toggle(`mtrl-${componentName}--bordered`, !!style.bordered);
}

/**
 * Adds styling capabilities to a component
 *
 * @param initialStyle - Initial style configuration
 * @returns Component enhancer that adds styling capabilities
 *
 * @example
 * ```typescript
 * const component = pipe(
 *   createBase,
 *   withElement(),
 *   withStyling({
 *     gap: 8,
 *     padding: 16,
 *     striped: true,
 *     hoverable: true
 *   })
 * )(config);
 * ```
 */
export function withStyling(initialStyle?: StylingConfig) {
  return (component: any): any & StylingComponent => {
    console.log("🎨 [MTRL-ADDONS] Adding styling capabilities");

    // Apply initial styling
    if (initialStyle) {
      applyElementStyling(component.element, initialStyle);
    }

    // Add styling methods
    return {
      ...component,

      setStyle(style: Partial<StylingConfig>) {
        if (style) {
          applyElementStyling(component.element, style);
        }
        return component; // Enable chaining
      },

      getStyle() {
        return initialStyle;
      },
    };
  };
}
