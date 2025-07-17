/**
 * Placeholders Feature - Intelligent Structure Analysis Enhancer
 * Handles data structure analysis and masked placeholder generation
 */

import type { ListManagerComponent, ItemRange } from "../../types";
import { LIST_MANAGER_CONSTANTS, PLACEHOLDER } from "../../constants";

/**
 * Configuration for placeholders enhancer
 */
export interface PlaceholdersConfig {
  enabled?: boolean;
  maskCharacter?: string;
  analyzeAfterInitialLoad?: boolean;
  randomLengthVariance?: boolean;
  sampleSize?: number;
  mode?: "masked" | "skeleton" | "blank" | "dots" | "realistic";
  cssClass?: string;
}

/**
 * Placeholder structure analysis result
 */
export interface PlaceholderStructure {
  field: string;
  minLength: number;
  maxLength: number;
  avgLength: number;
  type: "text" | "email" | "url" | "number" | "date" | "unknown";
  examples: string[];
}

/**
 * Component interface after placeholders enhancement
 */
export interface PlaceholdersComponent {
  placeholders: {
    // Structure analysis
    analyzeDataStructure(items: any[]): Map<string, PlaceholderStructure>;
    getPlaceholderStructure(): Map<string, PlaceholderStructure> | null;
    hasAnalyzedStructure(): boolean;

    // Placeholder generation
    generatePlaceholderItem(index: number): any;
    generatePlaceholderItems(range: ItemRange): any[];
    generatePlaceholderField(
      fieldName: string,
      structure: PlaceholderStructure
    ): string;

    // Placeholder management
    showPlaceholders(range: ItemRange): void;
    replacePlaceholder(index: number, realItem: any): void;
    replacePlaceholders(items: any[], startIndex: number): void;

    // Placeholder detection
    isPlaceholder(item: any): boolean;
    getPlaceholderIndices(): number[];
    countPlaceholders(): number;

    // Configuration
    updateConfig(config: Partial<PlaceholdersConfig>): void;
    getConfig(): PlaceholdersConfig;

    // State
    isEnabled(): boolean;
    clear(): void;
  };
}

/**
 * Adds placeholders functionality to a List Manager component
 *
 * @param config - Placeholders configuration
 * @returns Function that enhances a component with placeholder capabilities
 */
export const withPlaceholders =
  (config: PlaceholdersConfig = {}) =>
  <T extends ListManagerComponent>(component: T): T & PlaceholdersComponent => {
    // Configuration with defaults
    let placeholdersConfig: PlaceholdersConfig = {
      enabled: config.enabled !== false,
      maskCharacter:
        config.maskCharacter ||
        LIST_MANAGER_CONSTANTS.PLACEHOLDER.MASK_CHARACTER,
      analyzeAfterInitialLoad: config.analyzeAfterInitialLoad !== false,
      randomLengthVariance: config.randomLengthVariance !== false,
      sampleSize: config.sampleSize || PLACEHOLDER.PATTERN_ANALYSIS.SAMPLE_SIZE,
      mode: config.mode || "masked",
      cssClass:
        config.cssClass || LIST_MANAGER_CONSTANTS.PLACEHOLDER.CLASS_NAME,
    };

    // Placeholder state
    let placeholderStructure: Map<string, PlaceholderStructure> | null = null;
    let isInitialized = false;
    let placeholderIdCounter = 0;

    /**
     * Initialize placeholders
     */
    const initialize = (): void => {
      if (isInitialized || !placeholdersConfig.enabled) return;

      isInitialized = true;
      component.emit?.("placeholders:initialized", {
        config: placeholdersConfig,
      });
    };

    /**
     * Destroy placeholders
     */
    const destroy = (): void => {
      if (!isInitialized) return;

      clear();
      isInitialized = false;

      component.emit?.("placeholders:destroyed", {});
    };

    /**
     * Analyze data structure for intelligent placeholders
     */
    const analyzeDataStructure = (
      items: any[]
    ): Map<string, PlaceholderStructure> => {
      if (!placeholdersConfig.enabled || !items.length) {
        return new Map();
      }

      const structure = new Map<string, PlaceholderStructure>();
      const sampleSize = Math.min(
        items.length,
        placeholdersConfig.sampleSize || 10
      );

      // Analyze sample of items
      for (let i = 0; i < sampleSize; i++) {
        const item = items[i];
        if (!item || typeof item !== "object") continue;

        Object.keys(item).forEach((field) => {
          const value = item[field];
          if (value === null || value === undefined) return;

          const stringValue = String(value);
          const length = stringValue.length;

          if (!structure.has(field)) {
            structure.set(field, {
              field,
              minLength: length,
              maxLength: length,
              avgLength: length,
              type: detectFieldType(stringValue),
              examples: [stringValue.substring(0, 50)], // Store first 50 chars as example
            });
          } else {
            const current = structure.get(field)!;

            // Update length statistics
            current.minLength = Math.min(current.minLength, length);
            current.maxLength = Math.max(current.maxLength, length);

            // Add example if we don't have too many
            if (
              current.examples.length < 3 &&
              !current.examples.includes(stringValue.substring(0, 50))
            ) {
              current.examples.push(stringValue.substring(0, 50));
            }

            // Update type if needed (more specific wins)
            const detectedType = detectFieldType(stringValue);
            if (detectedType !== "unknown" && current.type === "unknown") {
              current.type = detectedType;
            }
          }
        });
      }

      // Calculate average lengths
      structure.forEach((fieldStructure) => {
        const totalLength = items
          .slice(0, sampleSize)
          .map((item) => item[fieldStructure.field])
          .filter((value) => value !== null && value !== undefined)
          .map((value) => String(value).length)
          .reduce((sum, length) => sum + length, 0);

        const validCount = items
          .slice(0, sampleSize)
          .filter(
            (item) =>
              item[fieldStructure.field] !== null &&
              item[fieldStructure.field] !== undefined
          ).length;

        fieldStructure.avgLength =
          validCount > 0
            ? Math.round(totalLength / validCount)
            : fieldStructure.minLength;
      });

      placeholderStructure = structure;

      component.emit?.("structure:analyzed", {
        structure: Array.from(structure.entries()).map(([field, data]) => ({
          ...data,
          field, // Override field from data if it exists
        })),
        sampleSize,
        totalFields: structure.size,
      });

      return structure;
    };

    /**
     * Detect field type based on content
     */
    const detectFieldType = (
      value: string
    ): "text" | "email" | "url" | "number" | "date" | "unknown" => {
      // Email detection
      if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
        return "email";
      }

      // URL detection
      if (/^https?:\/\//.test(value) || /^www\./.test(value)) {
        return "url";
      }

      // Number detection
      if (/^\d+(\.\d+)?$/.test(value)) {
        return "number";
      }

      // Date detection (basic)
      if (
        /^\d{4}-\d{2}-\d{2}/.test(value) ||
        /^\d{1,2}\/\d{1,2}\/\d{4}/.test(value)
      ) {
        return "date";
      }

      // Default to text
      return value.length > 0 ? "text" : "unknown";
    };

    /**
     * Generate placeholder item based on analyzed structure
     */
    const generatePlaceholderItem = (index: number): any => {
      if (!placeholdersConfig.enabled) {
        return null;
      }

      const placeholderId = `placeholder-${++placeholderIdCounter}`;

      // Base placeholder object
      const placeholder: Record<string, any> = {
        id: placeholderId,
        [PLACEHOLDER.PLACEHOLDER_FLAG]: true,
        __placeholderIndex: index,
        __placeholderMode: placeholdersConfig.mode,
      };

      // If no structure analysis, create simple placeholder
      if (!placeholderStructure || placeholderStructure.size === 0) {
        return {
          ...placeholder,
          name: generatePlaceholderField("name", {
            field: "name",
            minLength: 5,
            maxLength: 15,
            avgLength: 10,
            type: "text",
            examples: [],
          }),
          content: generatePlaceholderField("content", {
            field: "content",
            minLength: 20,
            maxLength: 100,
            avgLength: 50,
            type: "text",
            examples: [],
          }),
        };
      }

      // Generate placeholder fields based on structure
      placeholderStructure.forEach((structure, field) => {
        placeholder[field] = generatePlaceholderField(field, structure);
      });

      return placeholder;
    };

    /**
     * Generate placeholder field based on structure
     */
    const generatePlaceholderField = (
      fieldName: string,
      structure: PlaceholderStructure
    ): string => {
      const { minLength, maxLength, avgLength, type, mode } = {
        ...structure,
        mode: placeholdersConfig.mode,
      };

      // Determine length
      let length: number;
      if (placeholdersConfig.randomLengthVariance) {
        length =
          Math.floor(Math.random() * (maxLength - minLength + 1)) + minLength;
      } else {
        length = avgLength;
      }

      // Ensure reasonable length
      length = Math.max(1, Math.min(length, 100));

      // Generate content based on mode and type
      switch (mode) {
        case "skeleton":
          return generateSkeletonContent(type, length);

        case "blank":
          return " ".repeat(length);

        case "dots":
          return "• ".repeat(Math.ceil(length / 2)).trim();

        case "realistic":
          return generateRealisticContent(type, length, structure.examples);

        case "masked":
        default:
          return (placeholdersConfig.maskCharacter || "░").repeat(length);
      }
    };

    /**
     * Generate skeleton content
     */
    const generateSkeletonContent = (type: string, length: number): string => {
      const skeletonChar = "▁";

      switch (type) {
        case "email":
          const atPos = Math.floor(length * 0.6);
          const dotPos = Math.floor(length * 0.8);
          return (
            skeletonChar.repeat(atPos) +
            "@" +
            skeletonChar.repeat(dotPos - atPos - 1) +
            "." +
            skeletonChar.repeat(length - dotPos - 1)
          );

        case "url":
          return "http://" + skeletonChar.repeat(Math.max(1, length - 7));

        case "number":
          return "1".repeat(length);

        case "date":
          return length >= 10
            ? "YYYY-MM-DD".substring(0, length)
            : skeletonChar.repeat(length);

        default:
          return skeletonChar.repeat(length);
      }
    };

    /**
     * Generate realistic content
     */
    const generateRealisticContent = (
      type: string,
      length: number,
      examples: string[]
    ): string => {
      switch (type) {
        case "email":
          const domains = PLACEHOLDER.FALLBACK_DOMAINS;
          const names = PLACEHOLDER.FALLBACK_NAMES;
          const name =
            names[Math.floor(Math.random() * names.length)].toLowerCase();
          const domain = domains[Math.floor(Math.random() * domains.length)];
          return `${name}@${domain}`.substring(0, length);

        case "url":
          return `https://example.com/${"page".repeat(
            Math.ceil((length - 20) / 4)
          )}`.substring(0, length);

        case "number":
          return Math.floor(Math.random() * Math.pow(10, Math.min(length, 10)))
            .toString()
            .padStart(length, "0");

        case "date":
          const date = new Date(
            2024,
            Math.floor(Math.random() * 12),
            Math.floor(Math.random() * 28) + 1
          );
          return date.toISOString().substring(0, length);

        default:
          // Use example if available
          if (examples.length > 0) {
            const example =
              examples[Math.floor(Math.random() * examples.length)];
            return example.substring(0, length).padEnd(length, "a");
          }
          return "Sample text"
            .repeat(Math.ceil(length / 11))
            .substring(0, length);
      }
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
      if (!placeholdersConfig.enabled) return;

      console.log(
        `🎭 [PLACEHOLDERS] showPlaceholders called for range ${range.start}-${range.end}`
      );

      const placeholderItems = generatePlaceholderItems(range);

      // Add placeholders to component items
      placeholderItems.forEach((item, index) => {
        const targetIndex = range.start + index;
        const existingItem = component.items[targetIndex];
        const shouldReplace = !existingItem || isPlaceholder(existingItem);

        console.log(
          `🎭 [PLACEHOLDERS] Index ${targetIndex}: existing=${!!existingItem}, isPlaceholder=${
            existingItem ? isPlaceholder(existingItem) : "N/A"
          }, shouldReplace=${shouldReplace}`
        );

        if (shouldReplace) {
          component.items[targetIndex] = item;
          console.log(
            `✅ [PLACEHOLDERS] Set placeholder at index ${targetIndex}`
          );
        }
      });

      component.emit?.("placeholders:shown", {
        range,
        items: placeholderItems,
        count: placeholderItems.length,
        mode: placeholdersConfig.mode,
      });
    };

    /**
     * Replace a placeholder with real data
     */
    const replacePlaceholder = (index: number, realItem: any): void => {
      if (!placeholdersConfig.enabled) return;

      const currentItem = component.items[index];
      const wasPlaceholder = isPlaceholder(currentItem);

      console.log(
        `🔄 [PLACEHOLDERS] replacePlaceholder called for index ${index}, wasPlaceholder=${wasPlaceholder}`
      );

      component.items[index] = realItem;

      if (wasPlaceholder) {
        console.log(
          `✅ [PLACEHOLDERS] Replaced placeholder at index ${index} with real data`
        );
        component.emit?.("placeholders:replaced", {
          index,
          item: realItem,
          previousPlaceholder: currentItem,
        });
      }
    };

    /**
     * Replace multiple placeholders with real data
     */
    const replacePlaceholders = (items: any[], startIndex: number): void => {
      if (!placeholdersConfig.enabled) return;

      console.log(
        `🔄 [PLACEHOLDERS] replacePlaceholders called for ${items.length} items starting at index ${startIndex}`
      );

      const replacedIndices: number[] = [];

      items.forEach((item, offset) => {
        const index = startIndex + offset;
        const wasPlaceholder = isPlaceholder(component.items[index]);

        component.items[index] = item;

        if (wasPlaceholder) {
          replacedIndices.push(index);
        }
      });

      if (replacedIndices.length > 0) {
        component.emit?.("placeholders:batch-replaced", {
          indices: replacedIndices,
          items,
          startIndex,
          count: replacedIndices.length,
        });
      }
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
     * Get indices of all placeholders
     */
    const getPlaceholderIndices = (): number[] => {
      const indices: number[] = [];

      component.items.forEach((item, index) => {
        if (isPlaceholder(item)) {
          indices.push(index);
        }
      });

      return indices;
    };

    /**
     * Count total placeholders
     */
    const countPlaceholders = (): number => {
      return component.items.filter(isPlaceholder).length;
    };

    /**
     * Update configuration
     */
    const updateConfig = (newConfig: Partial<PlaceholdersConfig>): void => {
      placeholdersConfig = { ...placeholdersConfig, ...newConfig };

      component.emit?.("placeholders:config-updated", {
        config: placeholdersConfig,
      });
    };

    /**
     * Get current configuration
     */
    const getConfig = (): PlaceholdersConfig => {
      return { ...placeholdersConfig };
    };

    /**
     * Check if placeholders are enabled
     */
    const isEnabled = (): boolean => {
      return placeholdersConfig.enabled || false;
    };

    /**
     * Clear all placeholder state
     */
    const clear = (): void => {
      placeholderStructure = null;
      placeholderIdCounter = 0;

      component.emit?.("placeholders:cleared", {});
    };

    /**
     * Get placeholder structure
     */
    const getPlaceholderStructure = (): Map<
      string,
      PlaceholderStructure
    > | null => {
      return placeholderStructure ? new Map(placeholderStructure) : null;
    };

    /**
     * Check if structure has been analyzed
     */
    const hasAnalyzedStructure = (): boolean => {
      return placeholderStructure !== null && placeholderStructure.size > 0;
    };

    // Initialize when component initializes
    const originalInitialize = component.initialize;
    component.initialize = () => {
      originalInitialize.call(component);
      initialize();
    };

    // Destroy when component destroys
    const originalDestroy = component.destroy;
    component.destroy = () => {
      destroy();
      originalDestroy.call(component);
    };

    // Auto-analyze when items are set (if enabled)
    if (placeholdersConfig.analyzeAfterInitialLoad) {
      const originalItems = component.items;
      Object.defineProperty(component, "items", {
        get: () => originalItems,
        set: (newItems: any[]) => {
          // Set items first
          originalItems.length = 0;
          originalItems.push(...newItems);

          // Auto-analyze if we have items and no structure yet
          if (newItems.length > 0 && !hasAnalyzedStructure()) {
            analyzeDataStructure(newItems);
          }
        },
        enumerable: true,
        configurable: true,
      });
    }

    // Placeholders API
    const placeholdersAPI = {
      // Structure analysis
      analyzeDataStructure,
      getPlaceholderStructure,
      hasAnalyzedStructure,

      // Placeholder generation
      generatePlaceholderItem,
      generatePlaceholderItems,
      generatePlaceholderField,

      // Placeholder management
      showPlaceholders,
      replacePlaceholder,
      replacePlaceholders,

      // Placeholder detection
      isPlaceholder,
      getPlaceholderIndices,
      countPlaceholders,

      // Configuration
      updateConfig,
      getConfig,

      // State
      isEnabled,
      clear,
    };

    return {
      ...component,
      placeholders: placeholdersAPI,
    };
  };
