// src/core/viewport/features/placeholders.ts

/**
 * Placeholder Feature for Viewport
 * Analyzes first loaded data to generate realistic masked placeholders
 * Shows placeholders while data is loading
 */

import type { ViewportHost } from "../types";
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

/**
 * Placeholder feature interface
 */
export interface PlaceholderFeature {
  // Core feature methods
  name: string;
  initialize: (host: ViewportHost) => void;
  destroy: () => void;

  // Structure analysis
  analyzeDataStructure: (items: any[]) => void;
  hasAnalyzedStructure: () => boolean;

  // Placeholder generation
  generatePlaceholderItem: (index: number) => any;
  generatePlaceholderItems: (range: { start: number; end: number }) => any[];

  // Placeholder management
  showPlaceholders: (range: { start: number; end: number }) => void;
  isPlaceholder: (item: any) => boolean;
  replacePlaceholders: (items: any[], offset: number) => void;

  // State
  isEnabled: () => boolean;
  clear: () => void;
}

/**
 * Creates placeholder functionality for viewport
 */
export function createPlaceholderFeature(
  config: PlaceholderConfig = {}
): PlaceholderFeature {
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
  let viewportHost: ViewportHost | null = null;

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

    // Emit event if viewport host is available
    if (viewportHost && "emit" in viewportHost) {
      (viewportHost as any).emit?.("placeholders:analyzed", {
        fieldCount: structures.size,
        sampleSize,
      });
    }
  };

  /**
   * Generate a single placeholder item based on analyzed structure
   */
  const generatePlaceholderItem = (index: number): any => {
    if (!enabled) {
      return null;
    }

    const placeholder: Record<string, any> = {
      id: `placeholder-${++placeholderIdCounter}`,
      [VIEWPORT_CONSTANTS.PLACEHOLDER.PLACEHOLDER_FLAG]: true,
    };

    if (!fieldStructures) {
      // Generate default placeholder if no structure analyzed
      placeholder.text = maskCharacter.repeat(20);
      placeholder.subtitle = maskCharacter.repeat(30);
      return placeholder;
    }

    // Generate masked values for each analyzed field
    fieldStructures.forEach((structure, field) => {
      const { minLength, maxLength } = structure;

      // Random length within the range
      let length: number;
      if (randomLengthVariance && minLength !== maxLength) {
        length =
          Math.floor(Math.random() * (maxLength - minLength + 1)) + minLength;
      } else {
        length = structure.avgLength;
      }

      // Generate masked string
      placeholder[field] = maskCharacter.repeat(length);
    });

    return placeholder;
  };

  /**
   * Generate multiple placeholder items for a range
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
    if (!enabled || !viewportHost) {
      return;
    }

    console.log(
      `🔲 [PLACEHOLDERS] Showing placeholders for range ${range.start}-${range.end}`
    );

    const placeholderItems = generatePlaceholderItems(range);

    // Emit event for viewport to handle
    if ("emit" in viewportHost) {
      (viewportHost as any).emit?.("placeholders:show", {
        range,
        items: placeholderItems,
      });
    }
  };

  /**
   * Replace placeholders with real data
   */
  const replacePlaceholders = (items: any[], offset: number): void => {
    if (!enabled || !viewportHost) {
      return;
    }

    let replacedCount = 0;
    items.forEach((item, index) => {
      const targetIndex = offset + index;
      if (item && !isPlaceholder(item)) {
        replacedCount++;
      }
    });

    if (replacedCount > 0) {
      console.log(
        `✅ [PLACEHOLDERS] Replaced ${replacedCount} placeholders with real data`
      );

      if ("emit" in viewportHost) {
        (viewportHost as any).emit?.("placeholders:replaced", {
          offset,
          count: replacedCount,
        });
      }
    }
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
   * Check if placeholders are enabled
   */
  const isEnabled = (): boolean => {
    return enabled;
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

  return {
    name: "placeholders",

    initialize(host: ViewportHost) {
      viewportHost = host;

      // Listen for first data load if configured
      if (analyzeFirstLoad && "on" in host) {
        (host as any).on?.("collection:range-loaded", (data: any) => {
          if (
            !hasAnalyzed &&
            data?.items?.length >=
              VIEWPORT_CONSTANTS.PLACEHOLDER.MIN_SAMPLE_SIZE
          ) {
            analyzeDataStructure(data.items);
          }
        });
      }
    },

    destroy() {
      clear();
      viewportHost = null;
    },

    // API methods
    analyzeDataStructure,
    hasAnalyzedStructure,
    generatePlaceholderItem,
    generatePlaceholderItems,
    showPlaceholders,
    isPlaceholder,
    replacePlaceholders,
    isEnabled,
    clear,
  };
}
