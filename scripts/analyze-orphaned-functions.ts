#!/usr/bin/env bun

import * as fs from "fs";
import * as path from "path";

// List of orphaned functions from the previous analysis
const orphanedFunctions = [
  {
    name: "hasOverlappingPendingRange",
    file: "features/collection/collection.ts",
    line: 198,
  },
  {
    name: "getCursorForOffset",
    file: "features/collection/collection.ts",
    line: 603,
  },
  { name: "getElements", file: "features/viewport/scrollbar.ts", line: 57 },
  {
    name: "updateScrollbarDimensions",
    file: "features/viewport/scrollbar.ts",
    line: 104,
  },
  {
    name: "updateScrollbarPosition",
    file: "features/viewport/scrollbar.ts",
    line: 127,
  },
  {
    name: "getScrollRatioFromVirtualPosition",
    file: "features/viewport/scrollbar.ts",
    line: 141,
  },
  {
    name: "getVirtualPositionFromScrollRatio",
    file: "features/viewport/scrollbar.ts",
    line: 152,
  },
  { name: "hideScrollbar", file: "features/viewport/scrollbar.ts", line: 179 },
  {
    name: "handleThumbMouseDown",
    file: "features/viewport/scrollbar.ts",
    line: 190,
  },
  {
    name: "handleThumbDrag",
    file: "features/viewport/scrollbar.ts",
    line: 210,
  },
  {
    name: "handleThumbMouseUp",
    file: "features/viewport/scrollbar.ts",
    line: 243,
  },
  {
    name: "handleTrackClick",
    file: "features/viewport/scrollbar.ts",
    line: 319,
  },
  {
    name: "generatePlaceholderItems",
    file: "features/viewport/placeholders.ts",
    line: 175,
  },
  {
    name: "hasAnalyzedStructure",
    file: "features/viewport/placeholders.ts",
    line: 242,
  },
  {
    name: "initializeTracking",
    file: "features/viewport/scrolling.ts",
    line: 186,
  },
  {
    name: "startIdleDetection",
    file: "features/viewport/scrolling.ts",
    line: 194,
  },
  { name: "checkIdle", file: "features/viewport/scrolling.ts", line: 195 },
  {
    name: "setVelocityToZero",
    file: "features/viewport/scrolling.ts",
    line: 219,
  },
  {
    name: "updateVelocityTracking",
    file: "features/viewport/scrolling.ts",
    line: 255,
  },
  {
    name: "calculateWindowedVelocity",
    file: "features/viewport/scrolling.ts",
    line: 340,
  },
  {
    name: "setupScrollbarEvents",
    file: "features/viewport/scrolling.ts",
    line: 635,
  },
  {
    name: "checkForMissingData",
    file: "features/viewport/viewport.ts",
    line: 155,
  },
  {
    name: "setupCollectionEventListeners",
    file: "features/viewport/viewport.ts",
    line: 298,
  },
  {
    name: "setupScrollbarPlugin",
    file: "features/viewport/viewport.ts",
    line: 437,
  },
  { name: "setupContainer", file: "features/viewport/viewport.ts", line: 509 },
  {
    name: "setupResizeObserver",
    file: "features/viewport/viewport.ts",
    line: 557,
  },
  {
    name: "measureContainer",
    file: "features/viewport/viewport.ts",
    line: 571,
  },
  {
    name: "calculateIndexFromVirtualPosition",
    file: "features/viewport/virtual.ts",
    line: 241,
  },
  {
    name: "getMaxScrollPosition",
    file: "features/viewport/virtual.ts",
    line: 263,
  },
  { name: "getRangeKey", file: "features/viewport/loading.ts", line: 75 },
  { name: "canLoad", file: "features/viewport/loading.ts", line: 82 },
  { name: "processQueue", file: "features/viewport/loading.ts", line: 109 },
  { name: "executeLoad", file: "features/viewport/loading.ts", line: 181 },
  {
    name: "cancelPendingLoads",
    file: "features/viewport/loading.ts",
    line: 223,
  },
  { name: "cacheItemSize", file: "features/viewport/item-size.ts", line: 69 },
  {
    name: "triggerBatchedUpdates",
    file: "features/viewport/item-size.ts",
    line: 83,
  },
  {
    name: "scheduleBatchedUpdates",
    file: "features/viewport/item-size.ts",
    line: 101,
  },
  {
    name: "updateEstimatedSize",
    file: "features/viewport/item-size.ts",
    line: 153,
  },
  {
    name: "calculateTotalSize",
    file: "features/viewport/item-size.ts",
    line: 183,
  },
  { name: "clearCache", file: "features/viewport/item-size.ts", line: 216 },
  {
    name: "getMeasuredSizes",
    file: "features/viewport/item-size.ts",
    line: 231,
  },
];

const underusedExports = [
  {
    name: "getLoadingTemplate",
    file: "features/viewport/template.ts",
    line: 59,
  },
  { name: "getEmptyTemplate", file: "features/viewport/template.ts", line: 72 },
  { name: "getErrorTemplate", file: "features/viewport/template.ts", line: 85 },
  {
    name: "convertRenderItemToTemplate",
    file: "features/viewport/template.ts",
    line: 99,
  },
  {
    name: "substituteVariables",
    file: "features/viewport/template.ts",
    line: 177,
  },
  {
    name: "calculateOptimalOverscan",
    file: "utils/calculations.ts",
    line: 144,
  },
  { name: "validateContainer", file: "config.ts", line: 232 },
  { name: "validateListManagerConfig", file: "config.ts", line: 253 },
  { name: "getFeatureConfigs", file: "config.ts", line: 356 },
];

interface FunctionCategory {
  category: string;
  description: string;
  functions: typeof orphanedFunctions;
  recommendation: string;
}

function categorizeOrphanedFunctions(): FunctionCategory[] {
  const categories: FunctionCategory[] = [
    {
      category: "Scrollbar Internal Helpers",
      description:
        "Private scrollbar functions that might be part of internal implementation",
      functions: orphanedFunctions.filter(
        (f) =>
          f.file.includes("scrollbar.ts") &&
          [
            "getElements",
            "updateScrollbarDimensions",
            "updateScrollbarPosition",
            "getScrollRatioFromVirtualPosition",
            "getVirtualPositionFromScrollRatio",
            "hideScrollbar",
            "handleThumbMouseDown",
            "handleThumbDrag",
            "handleThumbMouseUp",
            "handleTrackClick",
          ].includes(f.name)
      ),
      recommendation:
        "Review if these are used via object methods or event handlers",
    },
    {
      category: "Velocity Tracking Helpers",
      description: "Functions related to scroll velocity tracking",
      functions: orphanedFunctions.filter(
        (f) =>
          f.file.includes("scrolling.ts") &&
          [
            "initializeTracking",
            "startIdleDetection",
            "checkIdle",
            "setVelocityToZero",
            "updateVelocityTracking",
            "calculateWindowedVelocity",
          ].includes(f.name)
      ),
      recommendation:
        "Check if used in closures or as part of velocity tracking system",
    },
    {
      category: "Setup Functions",
      description: "Setup and initialization functions",
      functions: orphanedFunctions.filter(
        (f) => f.name.startsWith("setup") || f.name.includes("initialize")
      ),
      recommendation: "Verify if called during component initialization",
    },
    {
      category: "Loading Manager Internals",
      description: "Internal loading queue management functions",
      functions: orphanedFunctions.filter((f) => f.file.includes("loading.ts")),
      recommendation: "Check if used within loading manager closure",
    },
    {
      category: "Size Cache Management",
      description: "Item size measurement and caching functions",
      functions: orphanedFunctions.filter((f) =>
        f.file.includes("item-size.ts")
      ),
      recommendation: "Verify if used in size management system",
    },
    {
      category: "Utility Functions",
      description: "General utility and calculation functions",
      functions: orphanedFunctions.filter(
        (f) =>
          !f.file.includes("scrollbar.ts") &&
          !f.file.includes("scrolling.ts") &&
          !f.file.includes("loading.ts") &&
          !f.file.includes("item-size.ts") &&
          !f.name.startsWith("setup")
      ),
      recommendation: "Safe to remove if truly unused",
    },
  ];

  return categories.filter((c) => c.functions.length > 0);
}

function analyzeFileForIndirectUsage(
  filePath: string,
  functionName: string
): boolean {
  try {
    const fullPath = path.join(__dirname, "../src/core/list-manager", filePath);
    const content = fs.readFileSync(fullPath, "utf-8");

    // Check for indirect usage patterns
    const patterns = [
      // Used in object/map
      new RegExp(`['"\`]${functionName}['"\`]\\s*:`),
      new RegExp(`\\[['"\`]${functionName}['"\`]\\]`),

      // Assigned to variable/property
      new RegExp(`\\w+\\.${functionName}\\s*=`),
      new RegExp(`this\\.${functionName}\\s*=`),

      // Used in return statement
      new RegExp(`return\\s+.*${functionName}`),

      // Passed as callback
      new RegExp(`\\(\\s*${functionName}\\s*\\)`),
      new RegExp(`,\\s*${functionName}\\s*[,)]`),
    ];

    return patterns.some((pattern) => pattern.test(content));
  } catch (error) {
    return false;
  }
}

// Main analysis
console.log("🔍 Detailed Analysis of Orphaned Functions\n");

const categories = categorizeOrphanedFunctions();

categories.forEach((category) => {
  console.log(`\n📁 ${category.category}`);
  console.log(`   ${category.description}`);
  console.log(`   💡 ${category.recommendation}\n`);

  category.functions.forEach((func) => {
    const hasIndirectUsage = analyzeFileForIndirectUsage(func.file, func.name);
    const status = hasIndirectUsage
      ? "⚠️  May have indirect usage"
      : "❌ Appears truly orphaned";
    console.log(`   ${status}: ${func.name} (line ${func.line})`);
  });
});

console.log("\n\n📊 Summary by Category:");
categories.forEach((category) => {
  console.log(
    `   ${category.category}: ${category.functions.length} functions`
  );
});

console.log("\n\n🔍 Underused Exported Functions:");
console.log("   These are exported but only used in their own file:\n");
underusedExports.forEach((func) => {
  console.log(`   ⚠️  ${func.name} in ${func.file} (line ${func.line})`);
});

console.log("\n\n💡 Recommendations:");
console.log(
  "   1. Start with 'Utility Functions' category - these are safest to remove"
);
console.log("   2. Review 'Setup Functions' - some might be called indirectly");
console.log(
  "   3. Check 'Loading Manager Internals' - might be used in closures"
);
console.log(
  "   4. Be careful with 'Scrollbar Internal Helpers' - might be event handlers"
);
console.log(
  "   5. Consider making underused exports private if not part of public API"
);

// Generate a cleanup script
const cleanupScript = `
// Safe to remove functions (appear truly orphaned):
${orphanedFunctions
  .filter((f) => !analyzeFileForIndirectUsage(f.file, f.name))
  .map((f) => `// - ${f.name} in ${f.file}`)
  .join("\n")}
`;

fs.writeFileSync(
  path.join(__dirname, "orphaned-functions-cleanup.txt"),
  cleanupScript
);
console.log(
  "\n\n✅ Generated orphaned-functions-cleanup.txt with safe-to-remove functions"
);
