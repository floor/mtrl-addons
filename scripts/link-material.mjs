import { lstatSync, readFileSync, renameSync, symlinkSync, unlinkSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const manifestPath = join(root, "../material/package.json");

let manifest;
try {
  manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
} catch {
  console.error("../material/package.json does not exist or is not a package manifest.");
  process.exit(1);
}

if (manifest.name !== "material") {
  console.error(`../material/package.json names ${JSON.stringify(manifest.name ?? null)}, not material.`);
  process.exit(1);
}

const installed = join(root, "node_modules/material");
const aside = join(root, "node_modules/.material-registry-copy");

let current = null;
try {
  current = lstatSync(installed);
} catch (error) {
  if (error.code !== "ENOENT") throw error;
}

if (current?.isSymbolicLink()) {
  unlinkSync(installed);
  console.log("Unlinked the symlink node_modules/material.");
} else if (current?.isDirectory()) {
  try {
    lstatSync(aside);
    console.error("node_modules/.material-registry-copy already exists; remove it by hand.");
    process.exit(1);
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
  renameSync(installed, aside);
  console.log("Renamed node_modules/material to node_modules/.material-registry-copy.");
} else if (current) {
  console.error("node_modules/material is not a symlink or a directory; remove it by hand.");
  process.exit(1);
}

symlinkSync("../../material", installed);
console.log("Linked node_modules/material to ../../material.");
