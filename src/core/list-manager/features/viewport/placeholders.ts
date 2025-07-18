/**
 * Placeholders Feature - Smart Structure Analysis
 * Analyzes first loaded data to generate realistic masked placeholders
 */

import type { ListManagerComponent, ItemRange } from "../../types";
import { PLACEHOLDER } from "../../constants";
import { VIEWPORT_CONSTANTS } from "./constants";

/**
 * Configuration for placeholders enhancer
 */
export interface PlaceholdersConfig {
  enabled?: boolean;
  analyzeFirstLoad?: boolean;
}

/**
 * Field structure analysis result
 */
export interface FieldStructure {
  minLength: number;
  maxLength: number;
  avgLength: number;
}

/**
 * Component interface after placeholders enhancement
 */
export interface PlaceholdersComponent {
  placeholders: {
    // Structure analysis
    analyzeDataStructure(items: any[]): void;
    hasAnalyzedStructure(): boolean;

    // Placeholder generation
    generatePlaceholderItem(index: number): any;
    generatePlaceholderItems(range: ItemRange): any[];

    // Placeholder management
    showPlaceholders(range: ItemRange): void;
    isPlaceholder(item: any): boolean;

    // State
    isEnabled(): boolean;
    clear(): void;
  };
}

/**
 * Adds placeholders functionality to a List Manager component
 */
export const withPlaceholders =
  (config: PlaceholdersConfig = {}) =>
  <T extends ListManagerComponent>(component: T): T & PlaceholdersComponent => {
    // Configuration with defaults
    const placeholdersConfig: PlaceholdersConfig = {
      enabled: config.enabled !== false,
      analyzeFirstLoad: config.analyzeFirstLoad !== false,
    };

    // Placeholder state
    let fieldStructures: Map<string, FieldStructure> | null = null;
    let hasAnalyzed = false;
    let placeholderIdCounter = 0;

    /**
     * Analyze data structure from first loaded items
     */
    const analyzeDataStructure = (items: any[]): void => {
      if (!placeholdersConfig.enabled || hasAnalyzed || !items.length) {
        return;
      }

      console.log(
        `🔍 [PLACEHOLDERS] Analyzing data structure from ${items.length} items`
      );

      const structures = new Map<string, FieldStructure>();
      const sampleSize = Math.min(
        items.length,
        VIEWPORT_CONSTANTS.PLACEHOLDER.MAX_SAMPLE_SIZE
      );

      // Analyze each field across all sample items
      const fieldStats = new Map<string, number[]>();

      for (let i = 0; i < sampleSize; i++) {
        const item = items[i];
        if (!item || typeof item !== "object") continue;

        Object.keys(item).forEach((field) => {
          // Skip internal fields
          if (field.startsWith("_") || field === PLACEHOLDER.PLACEHOLDER_FLAG) {
            return;
          }

          const value = item[field];
          if (value === null || value === undefined) return;

          const length = String(value).length;

          if (!fieldStats.has(field)) {
            fieldStats.set(field, []);
          }
          fieldStats.get(field)!.push(length);
        });
      }

      // Calculate min/max/avg for each field
      fieldStats.forEach((lengths, field) => {
        if (lengths.length === 0) return;

        const minLength = Math.min(...lengths);
        const maxLength = Math.max(...lengths);
        const avgLength = Math.round(
          lengths.reduce((sum, len) => sum + len, 0) / lengths.length
        );

        structures.set(field, {
          minLength,
          maxLength,
          avgLength,
        });

        console.log(
          `📊 [PLACEHOLDERS] Field "${field}": min=${minLength}, max=${maxLength}, avg=${avgLength}`
        );
      });

      fieldStructures = structures;
      hasAnalyzed = true;

      component.emit?.("placeholders:analyzed", {
        fieldCount: structures.size,
        sampleSize,
      });
    };

    /**
     * Generate a single placeholder item based on analyzed structure
     */
    const generatePlaceholderItem = (index: number): any => {
      if (!placeholdersConfig.enabled || !fieldStructures) {
        return null;
      }

      const placeholder: Record<string, any> = {
        id: `placeholder-${++placeholderIdCounter}`,
        [PLACEHOLDER.PLACEHOLDER_FLAG]: true,
      };

      // Generate masked values for each analyzed field
      fieldStructures.forEach((structure, field) => {
        const { minLength, maxLength } = structure;

        // Random length within the range
        const length =
          minLength === maxLength
            ? minLength
            : Math.floor(Math.random() * (maxLength - minLength + 1)) +
              minLength;

        // Generate masked string
        placeholder[field] =
          VIEWPORT_CONSTANTS.PLACEHOLDER.MASK_CHARACTER.repeat(length);
      });

      return placeholder;
    };

    /**
     * Generate multiple placeholder items for a range
     */
    const generatePlaceholderItems = (range: ItemRange): any[] => {
      const items: any[] = [];

      for (let i = range.start; i <= range.end; i++) {
        items.push(generatePlaceholderItem(i));
      }

      return items;
    };

    /**
     * Show placeholders for a range
     */
    const showPlaceholders = (range: ItemRange): void => {
      if (!placeholdersConfig.enabled || !hasAnalyzed) {
        return;
      }

      const placeholderItems = generatePlaceholderItems(range);

      // Add placeholders to component items
      placeholderItems.forEach((item, index) => {
        const targetIndex = range.start + index;
        const existingItem = component.items[targetIndex];
        const shouldReplace = !existingItem || isPlaceholder(existingItem);

        if (shouldReplace) {
          component.items[targetIndex] = item;
        }
      });

      component.emit?.("placeholders:shown", {
        range,
        count: placeholderItems.length,
      });
    };

    /**
     * Check if an item is a placeholder
     */
    const isPlaceholder = (item: any): boolean => {
      return (
        item &&
        typeof item === "object" &&
        item[PLACEHOLDER.PLACEHOLDER_FLAG] === true
      );
    };

    /**
     * Check if placeholders are enabled
     */
    const isEnabled = (): boolean => {
      return placeholdersConfig.enabled || false;
    };

    /**
     * Clear placeholder state
     */
    const clear = (): void => {
      fieldStructures = null;
      hasAnalyzed = false;
      placeholderIdCounter = 0;
    };

    /**
     * Check if structure has been analyzed
     */
    const hasAnalyzedStructure = (): boolean => {
      return hasAnalyzed;
    };

    // Listen for first data load to analyze structure
    if (placeholdersConfig.analyzeFirstLoad && component.on) {
      component.on("range:loaded", (data: any) => {
        if (
          !hasAnalyzed &&
          data?.items?.length >= VIEWPORT_CONSTANTS.PLACEHOLDER.MIN_SAMPLE_SIZE
        ) {
          analyzeDataStructure(data.items);
        }
      });
    }

    // Placeholders API
    const placeholdersAPI = {
      // Structure analysis
      analyzeDataStructure,
      hasAnalyzedStructure,

      // Placeholder generation
      generatePlaceholderItem,
      generatePlaceholderItems,

      // Placeholder management
      showPlaceholders,
      isPlaceholder,

      // State
      isEnabled,
      clear,
    };

    return {
      ...component,
      placeholders: placeholdersAPI,
    };
  };
