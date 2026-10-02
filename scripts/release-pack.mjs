// Stage a publishable copy and pack that. This script does not run tests;
// prepublishOnly and the release:pack script do. The working tree is never rewritten.
import { spawnSync } from "node:child_process";
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

// scripts and devDependencies are the development fields on this package.
// The rest are tooling config keys; each is stripped only when it is present.
const DEVELOPMENT_FIELDS = ["scripts", "devDependencies"];
const TOOLING_FIELDS = [
  "eslintConfig",
  "eslintIgnore",
  "prettier",
  "jest",
  "babel",
  "commitlint",
  "stylelint",
  "typedocOptions",
  "standard",
  "husky",
  "lint-staged",
  "xo",
  "ava",
  "nyc",
  "mocha",
  "jshintConfig",
  "jscsConfig",
  "remarkConfig",
  "browserslist",
];

export function releasePack({ root = process.cwd(), destination, log = true } = {}) {
  const manifestPath = join(root, "package.json");
  const original = readFileSync(manifestPath);
  const source = JSON.parse(original.toString("utf8"));
  // The staging directory is this function's own: it makes it under the system's
  // temporary directory and removes it before returning, whether the pack worked
  // or not. Nothing else is ever removed.
  const stage = mkdtempSync(join(tmpdir(), "material-addons-release-"));
  try {
    for (const file of ["package.json", "README.md", "LICENSE"]) {
      cpSync(join(root, file), join(stage, file));
    }
    for (const rel of source.files ?? []) {
      cpSync(join(root, rel), join(stage, rel), { recursive: true });
    }

    const staged = JSON.parse(readFileSync(join(stage, "package.json"), "utf8"));
    const stripped = [...DEVELOPMENT_FIELDS, ...TOOLING_FIELDS].filter((key) => Object.hasOwn(staged, key));
    for (const key of stripped) delete staged[key];
    writeFileSync(join(stage, "package.json"), `${JSON.stringify(staged, null, 2)}\n`);

    const dest = resolve(destination ?? root);
    mkdirSync(dest, { recursive: true });
    const result = spawnSync(
      "npm",
      ["pack", "--json", "--ignore-scripts", "--pack-destination", dest],
      { cwd: stage, encoding: "utf8" },
    );
    if (result.status !== 0) {
      throw new Error(`npm pack failed (${result.status}):\n${result.stdout}\n${result.stderr}`);
    }

    if (!readFileSync(manifestPath).equals(original)) {
      throw new Error("release-pack rewrote the working tree package.json.");
    }

    const parsed = JSON.parse(result.stdout);
    const packed = Array.isArray(parsed) ? parsed[0] : Object.values(parsed)[0];
    const tarball = join(dest, packed.filename);
    const size = statSync(tarball).size;
    const files = packed.files.map((file) => file.path);
    if (log) {
      console.log(tarball);
      console.log(`size ${size}`);
      console.log(`files ${files.length}`);
      console.log(`stripped ${stripped.join(", ")}`);
    }
    return { tarball, size, files, stripped };
  } finally {
    rmSync(stage, { recursive: true, force: true });
  }
}

const invokedDirectly = process.argv[1]
  && import.meta.url === pathToFileURL(resolve(process.argv[1])).href;

if (invokedDirectly) {
  const out = process.argv.indexOf("--out");
  if (out !== -1 && !process.argv[out + 1]) {
    console.error("release-pack: --out needs a directory.");
    process.exit(1);
  }
  try {
    releasePack({ destination: out === -1 ? undefined : process.argv[out + 1] });
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}
