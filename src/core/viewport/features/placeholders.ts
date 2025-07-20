// src/core/viewport/features/placeholders.ts

/**
 * Placeholder Feature - Smart placeholder generation
 * Analyzes first loaded data to generate realistic masked placeholders
 * Shows placeholders while data is loading
 */

import type { ViewportContext } from "../types";
import type { CollectionComponent } from "./collection";
import { VIEWPORT_CONSTANTS } from "../constants";

/**
 * Configuration for placeholder feature
 */
export interface PlaceholderConfig {
  enabled?: boolean;
  analyzeFirstLoad?: boolean;
  maskCharacter?: string;
  randomLengthVariance?: boolean;
}

/**
 * Field structure for placeholder generation
 */
interface FieldStructure {
  minLength: number;
  maxLength: number;
  avgLength: number;
}

export interface PlaceholderComponent {
  placeholders: {
    analyzeDataStructure: (items: any[]) => void;
    hasAnalyzedStructure: () => boolean;
    generatePlaceholderItem: (index: number) => any;
    generatePlaceholderItems: (range: { start: number; end: number }) => any[];
    showPlaceholders: (range: { start: number; end: number }) => void;
    isPlaceholder: (item: any) => boolean;
    replacePlaceholders: (items: any[], offset: number) => void;
    clear: () => void;
  };
}

/**
 * Adds placeholder functionality to viewport component
 */
export function withPlaceholders(config: PlaceholderConfig = {}) {
  return <T extends ViewportContext & CollectionComponent>(
    component: T
  ): T & PlaceholderComponent => {
    const {
      enabled = true,
      analyzeFirstLoad = true,
      maskCharacter = VIEWPORT_CONSTANTS.PLACEHOLDER.MASK_CHARACTER,
      randomLengthVariance = VIEWPORT_CONSTANTS.PLACEHOLDER
        .RANDOM_LENGTH_VARIANCE,
    } = config;

    // State
    let fieldStructures: Map<string, FieldStructure> | null = null;
    let hasAnalyzed = false;
    let placeholderIdCounter = 0;

    /**
     * Analyze data structure from first loaded items
     */
    const analyzeDataStructure = (items: any[]): void => {
      if (!enabled || hasAnalyzed || !items.length) {
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
          if (
            field.startsWith("_") ||
            field === VIEWPORT_CONSTANTS.PLACEHOLDER.PLACEHOLDER_FLAG
          ) {
            return;
          }

          const value = String(item[field] || "");
          const length = value.length;

          if (!fieldStats.has(field)) {
            fieldStats.set(field, []);
          }
          fieldStats.get(field)!.push(length);
        });
      }

      // Calculate statistics for each field
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
      });

      fieldStructures = structures;
      hasAnalyzed = true;

      console.log(
        `✅ [PLACEHOLDERS] Structure analyzed:`,
        Object.fromEntries(structures)
      );

      // Emit event
      component.emit?.("viewport:placeholders-structure-analyzed", {
        structure: Object.fromEntries(structures),
      });
    };

    /**
     * Generate a single placeholder item
     */
    const generatePlaceholderItem = (index: number): any => {
      const placeholder: Record<string, any> = {
        id: `placeholder-${placeholderIdCounter++}`,
        [VIEWPORT_CONSTANTS.PLACEHOLDER.PLACEHOLDER_FLAG]: true,
        _index: index,
      };

      if (!fieldStructures || fieldStructures.size === 0) {
        // No structure analyzed yet - return basic placeholder
        placeholder.label = maskCharacter.repeat(10);
        return placeholder;
      }

      // Generate fields based on analyzed structure
      fieldStructures.forEach((structure, field) => {
        let length: number;

        if (
          randomLengthVariance &&
          structure.minLength !== structure.maxLength
        ) {
          // Random length within range
          length = Math.floor(
            Math.random() * (structure.maxLength - structure.minLength + 1) +
              structure.minLength
          );
        } else {
          // Use average length
          length = structure.avgLength;
        }

        // Apply some variation to make it look more natural
        if (randomLengthVariance && Math.random() < 0.3) {
          length = Math.max(1, length + Math.floor(Math.random() * 3) - 1);
        }

        placeholder[field] = maskCharacter.repeat(length);
      });

      return placeholder;
    };

    /**
     * Generate multiple placeholder items
     */
    const generatePlaceholderItems = (range: {
      start: number;
      end: number;
    }): any[] => {
      const items: any[] = [];
      for (let i = range.start; i <= range.end; i++) {
        items.push(generatePlaceholderItem(i));
      }
      return items;
    };

    /**
     * Show placeholders for a range
     */
    const showPlaceholders = (range: { start: number; end: number }): void => {
      if (!enabled) return;

      const placeholders = generatePlaceholderItems(range);

      // Update items array
      if (component.items) {
        for (let i = 0; i < placeholders.length; i++) {
          const index = range.start + i;
          if (!component.items[index]) {
            component.items[index] = placeholders[i];
          }
        }
      }

      console.log(
        `🔄 [PLACEHOLDERS] Showing ${placeholders.length} placeholders for range ${range.start}-${range.end}`
      );

      // Emit event
      component.emit?.("viewport:placeholders-shown", {
        range,
        count: placeholders.length,
      });
    };

    /**
     * Check if an item is a placeholder
     */
    const isPlaceholder = (item: any): boolean => {
      return (
        item &&
        typeof item === "object" &&
        item[VIEWPORT_CONSTANTS.PLACEHOLDER.PLACEHOLDER_FLAG] === true
      );
    };

    /**
     * Replace placeholders with real data
     */
    const replacePlaceholders = (items: any[], offset: number): void => {
      if (!component.items) return;

      let replacedCount = 0;

      for (let i = 0; i < items.length; i++) {
        const index = offset + i;
        const currentItem = component.items[index];

        if (isPlaceholder(currentItem)) {
          component.items[index] = items[i];
          replacedCount++;
        }
      }

      if (replacedCount > 0) {
        console.log(
          `✨ [PLACEHOLDERS] Replaced ${replacedCount} placeholders at offset ${offset}`
        );

        // Emit event
        component.emit?.("viewport:placeholders-replaced", {
          offset,
          count: replacedCount,
        });
      }
    };

    /**
     * Clear all placeholder state
     */
    const clear = (): void => {
      fieldStructures = null;
      hasAnalyzed = false;
      placeholderIdCounter = 0;
    };

    // Initialize function
    const initialize = () => {
      if (!enabled) return;

      // Listen for first data load to analyze structure
      if (analyzeFirstLoad) {
        const handleRangeLoaded = (data: any) => {
          if (!hasAnalyzed && data.items && data.items.length > 0) {
            analyzeDataStructure(data.items);
          }

          // Replace any placeholders with real data
          replacePlaceholders(data.items, data.offset);
        };

        component.on?.("viewport:range-loaded", handleRangeLoaded);
      }

      // Show initial placeholders if configured
      const totalItems = component.collection?.getTotalItems() || 0;
      if (totalItems > 0) {
        const initialRange = {
          start: 0,
          end: Math.min(
            VIEWPORT_CONSTANTS.PLACEHOLDER.MAX_SAMPLE_SIZE - 1,
            totalItems - 1
          ),
        };
        showPlaceholders(initialRange);
      }
    };

    // Cleanup function
    const destroy = () => {
      clear();
    };

    // Store functions for viewport to call
    (component as any)._placeholdersInitialize = initialize;
    (component as any)._placeholdersDestroy = destroy;

    // Return enhanced component
    return {
      ...component,
      placeholders: {
        analyzeDataStructure,
        hasAnalyzedStructure: () => hasAnalyzed,
        generatePlaceholderItem,
        generatePlaceholderItems,
        showPlaceholders,
        isPlaceholder,
        replacePlaceholders,
        clear,
      },
    };
  };
}
