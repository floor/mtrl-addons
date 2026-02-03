// build.js
import { mkdir } from "fs/promises";
import { existsSync } from "fs";
import { join, dirname, extname } from "path";
import { fileURLToPath } from "url";
import { watch } from "fs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const isWatch = process.argv.includes("--watch");
const isProduction =
  process.argv.includes("--production") ||
  process.env.NODE_ENV === "production";

// Define consistent output paths
const DIST_DIR = join(__dirname, "dist");
const JS_OUTPUT = join(DIST_DIR, "index.js");
const MJS_OUTPUT = join(DIST_DIR, "index.mjs");
const CSS_OUTPUT = join(DIST_DIR, "styles.css");
const STYLES_ENTRY = join(__dirname, "src/styles/index.scss");

// Granular module entry points for tree-shaking
const MODULES = [
  {
    name: "layout",
    entry: "src/core/layout/index.ts",
    outDir: "dist/core/layout",
  },
  {
    name: "viewport",
    entry: "src/core/viewport/index.ts",
    outDir: "dist/core/viewport",
  },
  {
    name: "gestures",
    entry: "src/core/gestures/index.ts",
    outDir: "dist/core/gestures",
  },
  {
    name: "components",
    entry: "src/components/index.ts",
    outDir: "dist/components",
  },
];

// Log build mode
console.log(`Building in ${isProduction ? "PRODUCTION" : "DEVELOPMENT"} mode`);

const buildStyles = async () => {
  console.log("┌─────────────────────────────────────────");
  console.log("│ SCSS Build");
  console.log("│ Mode:", isProduction ? "PRODUCTION" : "DEVELOPMENT");
  console.log("└─────────────────────────────────────────");

  try {
    // Check if source file exists
    if (!existsSync(STYLES_ENTRY)) {
      console.log("⚠️ No SCSS entry found at", STYLES_ENTRY);
      return true; // Not an error, just no styles to build
    }

    // Build sass arguments
    const sassArgs = [
      "sass",
      STYLES_ENTRY,
      CSS_OUTPUT,
      isProduction ? "--style=compressed" : "--style=expanded",
    ];

    // Add source map in development
    if (!isProduction) {
      sassArgs.push("--source-map");
    } else {
      sassArgs.push("--no-source-map");
    }

    const sassProcess = Bun.spawn(["npx", ...sassArgs], {
      cwd: __dirname,
      stdio: ["inherit", "pipe", "pipe"],
    });

    const stdout = await new Response(sassProcess.stdout).text();
    const stderr = await new Response(sassProcess.stderr).text();
    const exitCode = await sassProcess.exited;

    if (exitCode !== 0) {
      console.error("❌ SCSS build failed");
      if (stdout.trim()) console.error("STDOUT:", stdout);
      if (stderr.trim()) console.error("STDERR:", stderr);
      return false;
    }

    // Get file size
    const cssSize = existsSync(CSS_OUTPUT)
      ? (await Bun.file(CSS_OUTPUT).size) / 1024
      : 0;

    console.log("✓ SCSS build successful");
    console.log(`  CSS bundle: ${cssSize.toFixed(2)} KB`);

    return true;
  } catch (error) {
    console.error("❌ SCSS build error:", error.message);

    // Check if sass is available
    try {
      const checkSass = Bun.spawn(["npx", "sass", "--version"], {
        stdio: ["inherit", "pipe", "pipe"],
      });
      const versionExitCode = await checkSass.exited;

      if (versionExitCode !== 0) {
        console.error("💡 Sass compiler not found. Install it with:");
        console.error("   npm install -D sass");
        console.error("   or");
        console.error("   bun add -D sass");
      }
    } catch {
      console.error("💡 Sass compiler not found. Install it with:");
      console.error("   npm install -D sass");
      console.error("   or");
      console.error("   bun add -D sass");
    }

    return false;
  }
};

const buildModule = async (module) => {
  const entryPath = join(__dirname, module.entry);
  const outDir = join(__dirname, module.outDir);

  // Skip if entry doesn't exist
  if (!existsSync(entryPath)) {
    console.log(`  ⚠️ Skipping ${module.name}: entry not found`);
    return true;
  }

  await mkdir(outDir, { recursive: true });

  // Build CJS version
  const cjsResult = await Bun.build({
    entrypoints: [entryPath],
    outdir: outDir,
    minify: isProduction,
    sourcemap: isProduction ? "none" : "inline",
    format: "cjs",
    target: "node",
    external: ["mtrl"],
  });

  // Build ESM version
  const esmResult = await Bun.build({
    entrypoints: [entryPath],
    outdir: outDir,
    minify: isProduction,
    sourcemap: isProduction ? "none" : "inline",
    format: "esm",
    target: "node",
    naming: {
      entry: "index.mjs",
    },
    external: ["mtrl"],
  });

  if (!cjsResult.success || !esmResult.success) {
    console.error(`  ❌ ${module.name} build failed`);
    return false;
  }

  const cjsSize = (await Bun.file(join(outDir, "index.js")).size) / 1024;
  const esmSize = (await Bun.file(join(outDir, "index.mjs")).size) / 1024;
  console.log(
    `  ✓ ${module.name}: CJS ${cjsSize.toFixed(1)}KB, ESM ${esmSize.toFixed(1)}KB`,
  );

  return true;
};

const buildApp = async () => {
  try {
    console.log("┌─────────────────────────────────────────");
    console.log("│ JavaScript Build");
    console.log("│ Mode:", isProduction ? "PRODUCTION" : "DEVELOPMENT");
    console.log("│ Minify:", isProduction ? "Yes" : "No");
    console.log("│ Sourcemaps:", isProduction ? "No" : "Yes (inline)");
    console.log("└─────────────────────────────────────────");

    // Create dist directory if it doesn't exist
    await mkdir(DIST_DIR, { recursive: true });

    // Build CJS version
    const cjsResult = await Bun.build({
      entrypoints: [join(__dirname, "src/index.ts")],
      outdir: DIST_DIR,
      minify: isProduction,
      sourcemap: isProduction ? "none" : "inline",
      format: "cjs",
      target: "node",
      external: ["mtrl"],
    });

    // Build ESM version
    const esmResult = await Bun.build({
      entrypoints: [join(__dirname, "src/index.ts")],
      outdir: DIST_DIR,
      minify: isProduction,
      sourcemap: isProduction ? "none" : "inline",
      format: "esm",
      target: "node",
      naming: {
        entry: "index.mjs",
      },
      external: ["mtrl"],
    });

    if (!cjsResult.success || !esmResult.success) {
      console.error("❌ JavaScript build failed");
      console.error(cjsResult.logs);
      console.error(esmResult.logs);
      return false;
    }

    console.log("✓ Main bundle built");
    console.log(
      `  CJS bundle: ${((await Bun.file(JS_OUTPUT).size) / 1024).toFixed(2)} KB`,
    );
    console.log(
      `  ESM bundle: ${((await Bun.file(MJS_OUTPUT).size) / 1024).toFixed(
        2,
      )} KB`,
    );

    // Build granular modules
    console.log("Building granular modules...");
    for (const module of MODULES) {
      const success = await buildModule(module);
      if (!success) {
        console.error(`❌ Module ${module.name} build failed`);
        return false;
      }
    }
    console.log("✓ All granular modules built");

    // Generate type definitions with better error handling
    console.log("Generating TypeScript declarations...");

    try {
      const tscProcess = Bun.spawn(
        ["tsc", "--emitDeclarationOnly", "--outDir", DIST_DIR],
        {
          cwd: __dirname,
          stdio: ["inherit", "pipe", "pipe"],
        },
      );

      // Capture stdout and stderr
      const stdout = await new Response(tscProcess.stdout).text();
      const stderr = await new Response(tscProcess.stderr).text();

      const tscExitCode = await tscProcess.exited;

      if (tscExitCode !== 0) {
        console.warn(
          "⚠️ TypeScript declaration generation had errors (non-blocking)",
        );
        if (stdout.trim()) {
          console.warn(
            "STDOUT:",
            stdout.slice(0, 500) + (stdout.length > 500 ? "..." : ""),
          );
        }
        if (stderr.trim()) {
          console.warn(
            "STDERR:",
            stderr.slice(0, 500) + (stderr.length > 500 ? "..." : ""),
          );
        }

        // Check if tsc is available
        const whichResult = Bun.spawn(["which", "tsc"], {
          stdio: ["inherit", "pipe", "pipe"],
        });
        const tscPath = await new Response(whichResult.stdout).text();
        if (!tscPath.trim()) {
          console.error(
            "💡 TypeScript compiler (tsc) not found. Install it with:",
          );
          console.error("   npm install -g typescript");
          console.error("   or");
          console.error("   bun add -g typescript");
        }

        // Continue build despite tsc errors (JS bundles are still valid)
        return true;
      }

      console.log("✓ TypeScript declarations generated");
      if (stdout.trim()) {
        console.log("TSC output:", stdout);
      }

      return true;
    } catch (tscError) {
      console.warn("⚠️ Error running TypeScript compiler:", tscError.message);

      // Check if TypeScript is installed
      try {
        const checkTsc = Bun.spawn(["tsc", "--version"], {
          stdio: ["inherit", "pipe", "pipe"],
        });
        const versionOutput = await new Response(checkTsc.stdout).text();
        const versionExitCode = await checkTsc.exited;

        if (versionExitCode === 0) {
          console.log("TypeScript version:", versionOutput.trim());
        } else {
          console.warn(
            "💡 TypeScript compiler not properly installed. Install with:",
          );
          console.warn("   npm install -g typescript");
          console.warn("   or");
          console.warn("   bun add -g typescript");
        }
      } catch (versionError) {
        console.warn("💡 TypeScript compiler not found. Install it with:");
        console.warn("   npm install -g typescript");
        console.warn("   or");
        console.warn("   bun add -g typescript");
      }

      // Continue build despite tsc errors (JS bundles are still valid)
      return true;
    }
  } catch (error) {
    console.error("❌ JavaScript build error:", error);
    console.error(error.stack);
    return false;
  }
};

const buildAll = async () => {
  const jsSuccess = await buildApp();
  const cssSuccess = await buildStyles();
  return jsSuccess && cssSuccess;
};

const build = async () => {
  try {
    const startTime = Date.now();

    console.log("┌───────────────────────────────────────────────");
    console.log("│ 🚀 MTRL-Addons Build Process");
    console.log("│ Mode:", isProduction ? "🏭 PRODUCTION" : "🔧 DEVELOPMENT");
    console.log("│ Watch:", isWatch ? "✓ Enabled" : "✗ Disabled");
    console.log("└───────────────────────────────────────────────");
    console.log("");

    // Create output directory
    await mkdir(DIST_DIR, { recursive: true });

    // Build JavaScript and CSS
    const buildSuccess = await buildAll();

    const buildTime = ((Date.now() - startTime) / 1000).toFixed(2);

    if (isWatch && !isProduction) {
      console.log("");
      console.log("┌───────────────────────────────────────────────");
      console.log("│ 👀 Watching for changes...");
      console.log("└───────────────────────────────────────────────");

      // Watch src directory for changes
      const srcDir = join(__dirname, "src");
      let debounceTimer = null;
      let isBuilding = false;

      const rebuild = async (changedFile) => {
        if (isBuilding) return;
        isBuilding = true;

        const ext = changedFile ? extname(changedFile) : "";
        const isStyleChange = [".scss", ".css"].includes(ext);
        const isJsChange = [".ts", ".tsx"].includes(ext);

        console.log("");
        console.log("┌───────────────────────────────────────────────");
        console.log(
          `│ 🔄 Change detected${changedFile ? ` (${changedFile})` : ""}, rebuilding...`,
        );
        console.log("└───────────────────────────────────────────────");

        const rebuildStart = Date.now();
        let success;

        // Selective rebuild based on file type
        if (isStyleChange) {
          success = await buildStyles();
        } else if (isJsChange) {
          success = await buildApp();
        } else {
          success = await buildAll();
        }

        const rebuildTime = ((Date.now() - rebuildStart) / 1000).toFixed(2);

        console.log("");
        console.log(
          `│ ${success ? "✅" : "⚠️"} Rebuild completed in ${rebuildTime}s`,
        );
        console.log("│ 👀 Watching for changes...");
        console.log("└───────────────────────────────────────────────");

        isBuilding = false;
      };

      const watchHandler = (eventType, filename) => {
        if (!filename) return;

        // Only watch .ts, .tsx, .scss and .css files
        const ext = extname(filename);
        if (![".ts", ".tsx", ".scss", ".css"].includes(ext)) return;

        // Debounce rapid changes
        if (debounceTimer) clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          rebuild(filename);
        }, 100);
      };

      // Watch recursively using fs.watch
      const watchDir = (dir) => {
        watch(dir, { recursive: true }, watchHandler);
      };

      watchDir(srcDir);
      console.log(`│ Watching: ${srcDir}`);

      // Keep process alive
      process.on("SIGINT", () => {
        console.log("\n│ 👋 Stopping watch mode...");
        process.exit(0);
      });
    } else {
      console.log("");
      console.log("┌───────────────────────────────────────────────");
      console.log(`│ ✅ Build completed in ${buildTime}s`);
      if (!buildSuccess) {
        console.log("│ ⚠️ Build completed with some errors");
      }
      console.log("└───────────────────────────────────────────────");

      // Only exit with error code in non-watch mode if there were failures
      if (!isWatch && !buildSuccess) {
        process.exit(1);
      }
    }
  } catch (error) {
    console.error("❌ Build failed with error:", error);
    process.exit(1);
  }
};

build();
