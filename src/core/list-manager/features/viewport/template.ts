/**
 * Viewport Template System
 * Handles all template-related functionality for item rendering
 * Part of the viewport feature as rendering is a display concern
 */

import { PLACEHOLDER } from "../../constants";

/**
 * Gets default item template if none provided
 */
export const getDefaultTemplate = <T = any>(): ((
  item: T,
  index: number
) => string) => {
  return (item: T, index: number) => {
    // Check if this is a placeholder item
    const isPlaceholder =
      item &&
      typeof item === "object" &&
      (item as any)[PLACEHOLDER.PLACEHOLDER_FLAG];
    const placeholderClass = isPlaceholder ? " mtrl-placeholder-item" : "";

    if (typeof item === "string") {
      return `<div class="mtrl-list-item__content${placeholderClass}">${item}</div>`;
    }

    if (typeof item === "object" && item !== null) {
      // Try common properties
      const obj = item as any;
      const text =
        obj.text || obj.title || obj.name || obj.label || String(item);
      const subtitle = obj.subtitle || obj.description || obj.secondary;

      return `
        <div class="mtrl-list-item__content${placeholderClass}">
          <div class="mtrl-list-item__primary">${text}</div>
          ${
            subtitle
              ? `<div class="mtrl-list-item__secondary">${subtitle}</div>`
              : ""
          }
        </div>
      `;
    }

    return `<div class="mtrl-list-item__content${placeholderClass}">${String(
      item
    )}</div>`;
  };
};

/**
 * Gets loading template
 */
export const getLoadingTemplate = (): string => {
  return `
    <div class="mtrl-list-item mtrl-list-item--loading">
      <div class="mtrl-list-item__content">
        <div class="mtrl-list-item__primary">Loading...</div>
      </div>
    </div>
  `;
};

/**
 * Gets empty state template
 */
export const getEmptyTemplate = (): string => {
  return `
    <div class="mtrl-list-item mtrl-list-item--empty">
      <div class="mtrl-list-item__content">
        <div class="mtrl-list-item__primary">No items available</div>
      </div>
    </div>
  `;
};

/**
 * Gets error template
 */
export const getErrorTemplate = (error: Error): string => {
  return `
    <div class="mtrl-list-item mtrl-list-item--error">
      <div class="mtrl-list-item__content">
        <div class="mtrl-list-item__primary">Error: ${error.message}</div>
      </div>
    </div>
  `;
};

/**
 * Converts renderItem object structure to template function
 * Handles object-based template definitions with variable substitution
 */
export const convertRenderItemToTemplate = (
  renderItem: any
): ((item: any, index: number) => HTMLElement) => {
  if (!renderItem || typeof renderItem !== "object") {
    return getDefaultTemplate();
  }

  return (item: any, index: number): HTMLElement => {
    return createElementFromTemplate(renderItem, item, index);
  };
};

/**
 * Creates DOM element from template object structure
 */
export const createElementFromTemplate = (
  template: any,
  item: any,
  index: number
): HTMLElement => {
  const {
    tag = "div",
    className,
    attributes = {},
    children = [],
    textContent,
    style,
  } = template;

  // Create the element
  const element = document.createElement(tag);

  // Apply className
  if (className) {
    element.className = substituteVariables(className, item, index);
  }

  // Apply attributes
  for (const [key, value] of Object.entries(attributes)) {
    if (typeof value === "string") {
      element.setAttribute(key, substituteVariables(value, item, index));
    } else {
      element.setAttribute(key, String(value));
    }
  }

  // Apply textContent
  if (textContent) {
    element.textContent = substituteVariables(textContent, item, index);
  }

  // Apply inline styles
  if (style && typeof style === "object") {
    for (const [key, value] of Object.entries(style)) {
      if (typeof value === "string") {
        (element.style as any)[key] = substituteVariables(value, item, index);
      } else {
        (element.style as any)[key] = String(value);
      }
    }
  }

  // Process children recursively
  if (Array.isArray(children)) {
    children.forEach((child) => {
      if (child && typeof child === "object") {
        const childElement = createElementFromTemplate(child, item, index);
        element.appendChild(childElement);
      }
    });
  }

  return element;
};

/**
 * Substitutes template variables like {{name}} with actual values
 */
export const substituteVariables = (
  template: string,
  item: any,
  index: number
): string => {
  if (!template || typeof template !== "string") {
    return String(template || "");
  }

  return template.replace(/\{\{([^}]+)\}\}/g, (match, expression) => {
    try {
      // Create a simple context for evaluation
      const context = { ...item, index, item };

      // Handle simple property access (e.g., {{name}}, {{user.email}})
      const value = expression.split(".").reduce((obj: any, prop: string) => {
        return obj && obj[prop.trim()];
      }, context);

      // Handle fallback expressions (e.g., {{name || id}})
      if (value === undefined && expression.includes("||")) {
        const parts = expression.split("||").map((part) => part.trim());
        for (const part of parts) {
          const fallbackValue = part
            .split(".")
            .reduce((obj: any, prop: string) => {
              return obj && obj[prop.trim()];
            }, context);
          if (fallbackValue !== undefined) {
            return String(fallbackValue);
          }
        }
      }

      return value !== undefined ? String(value) : "";
    } catch (error) {
      console.warn(
        `Template variable substitution failed for "${expression}":`,
        error
      );
      return match; // Return original if substitution fails
    }
  });
};
