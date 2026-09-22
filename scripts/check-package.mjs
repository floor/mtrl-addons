import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, symlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const run = (command, args, cwd) => {
  const result = spawnSync(command, args, { cwd, encoding: "utf8" });
  assert.equal(result.status, 0, `${command} ${args.join(" ")}\n${result.error ?? ""}\n${result.stdout}\n${result.stderr}`);
  return result.stdout;
};

// Exercise the tarball consumers receive, outside the source checkout.
const root = process.cwd();
const fixture = mkdtempSync(join(tmpdir(), "mtrl-addons-package-"));
try {
  const result = JSON.parse(run("npm", ["pack", "--ignore-scripts", "--json", "--cache", join(fixture, "cache"), "--pack-destination", fixture], root));
  // npm 11 returns an array; npm 12 keys the results by package name.
  const [packed] = Array.isArray(result) ? result : Object.values(result);
  const modules = join(fixture, "node_modules");
  const addon = join(modules, "mtrl-addons");
  mkdirSync(addon, { recursive: true });
  run("tar", ["-xzf", join(fixture, packed.filename), "--strip-components=1", "-C", addon], root);
  symlinkSync(resolve(root, "node_modules/mtrl"), join(modules, "mtrl"), "junction");
  const pkg = JSON.parse(readFileSync(join(addon, "package.json"), "utf8"));
  const specifiers = [];
  for (const [entry, conditions] of Object.entries(pkg.exports)) {
    const components = entry.includes("*") ? ["form", "colorpicker"] : [""];
    for (const component of components) {
      const paths = typeof conditions === "string" ? [conditions] : Object.values(conditions);
      for (const path of paths) {
        assert.ok(existsSync(join(addon, path.replace("*", component))), `Missing export: ${path}`);
      }
      if (entry !== "./styles") {
        specifiers.push(entry === "." ? pkg.name : pkg.name + entry.slice(1).replace("*", component));
      }
    }
  }
  run(process.execPath, ["--input-type=module", "-e", `
    import assert from 'node:assert/strict';
    import { createRequire } from 'node:module';
    const require = createRequire(import.meta.url);
    for (const specifier of ${JSON.stringify(specifiers)}) {
      const esm = await import(specifier);
      const cjs = require(specifier);
      assert.ok(Object.keys(esm).length, specifier + ' has no exports');
      assert.deepEqual(Object.keys(cjs).sort(), Object.keys(esm).sort(), specifier);
    }
  `], fixture);
  console.log(`Packed ${pkg.name}@${pkg.version}: ${specifiers.length} entry points passed ESM/CommonJS checks; types and CSS exist.`);
} finally {
  rmSync(fixture, { recursive: true, force: true });
}
