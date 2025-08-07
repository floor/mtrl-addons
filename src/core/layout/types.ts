/**
 * @module core/layout/types
 * @description Essential type definitions for layout creation system
 * Core types are defined in schema.ts for better tree-shaking
 */

// Re-export core types from schema processor for backward compatibility
import type {
  LayoutConfig,
  LayoutItemConfig,
  LayoutOptions,
  LayoutResult,
} from "./schema";

export type { LayoutConfig, LayoutItemConfig, LayoutOptions, LayoutResult };

/**
 * Interface for component-like objects
 */
export interface ComponentLike {
  /** DOM element reference */
  element: any;
  /** Optional method to clean up resources */
  destroy?: () => void;
  /** Allow additional properties */
  [key: string]: any;
}

/**
 * Extended options for element creation
 * Used in object-based schemas
 */
export interface ElementOptions extends Record<string, any> {
  /** Layout configuration for the element */
  layout?: LayoutConfig;

  /** Layout item configuration */
  layoutItem?: LayoutItemConfig;

  /** CSS classes to apply (with automatic mtrl- prefix) */
  class?: string;

  /** Additional CSS classes (alias for class) */
  className?: string;

  /** CSS classes to apply without prefix */
  rawClass?: string | string[];

  /** HTML tag name for createElement */
  tag?: string;

  /** Text content for the element */
  textContent?: string;

  /** Inline styles */
  style?: Record<string, string | number>;

  /** HTML attributes */
  attributes?: Record<string, string>;

  /** Event handlers */
  events?: Record<string, Function>;

  /** Legacy event handler support */
  event?: Record<string, Function>;
}

/**
 * Definition for a single element in object-based layout schemas
 */
export interface ElementDefinition {
  /** Optional name to reference the element */
  name?: string;

  /** Creator function that produces a DOM element or ComponentLike */
  creator?: (options?: Record<string, any>) => any;

  /** Options to pass to the creator function */
  options?: ElementOptions;

  /** Child elements to create and attach */
  children?: Record<string, ElementDefinition>;
}

/**
 * Schema for object-based layout creation
 * Array-based schemas are handled directly as arrays
 */
export interface Schema {
  /** Root element definition */
  element?: ElementDefinition;

  /** Additional elements */
  [key: string]: ElementDefinition | undefined;
}