// Run the README's examples the way a reader does, against the packed package.
//
// A fence under one of these marks, on the line above it, is checked:
//
//   <!-- example: run, shows "Save" -->
//     The fence is a whole example. It becomes a page's module script exactly as
//     written, Vite builds it from the release tarball (scripts/release-pack.mjs)
//     and the installed material, and Chromium opens it. It passes when that text
//     is visible, the page logged no error and no warning, and, when the fence
//     imports a stylesheet, the theme reached the page and something of the
//     library has a box.
//   <!-- example: continues -->
//     The fence goes on from the one before it, in the same script.
//
//   <!-- example: fragment -->
//     The fence is part of something and is not run. The text beside it should
//     read that way.
//
// A `javascript`, `typescript` or `html` fence with none of the three marks fails
// the check: an example added without its mark would otherwise ship unchecked. A
// `bash` fence needs no mark. Also checked, without a browser: every `material-addons` and `material` specifier in a fence or in
// inline code resolves from the packed package; every `createX` named in inline
// code is an export of one of this package's entries; relative links name a file
// of the repository and anchors a heading of the README; the install line names
// the tags npm has the versions under.
//
// Readability, as material's README: no paragraph or list item over 440
// characters as rendered (about four lines), no sentence with more than two
// inline code spans. A colon or a semicolon ends a sentence for this count, on
// purpose: the rule is about how many names a reader holds before a pause.
// Tables, fences and headings are not prose.
//
//   node scripts/check-readme.mjs            (after `bun run build --production`)
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { build, preview } from "vite";
import { chromium } from "playwright";
import { releasePack } from "./release-pack.mjs";

const FILE = "README.md";
const MAX_PARAGRAPH = 440;
const MAX_SPANS = 2;
const root = process.cwd();
const text = readFileSync(join(root, FILE), "utf8");
const manifest = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
const failures = [];
const fail = (message) => { failures.push(message); };
/** The languages of code a reader can copy and run; a shell command is not one. */
const CODE = ["javascript", "js", "typescript", "ts", "tsx", "jsx", "html"];

// ── The fences and the prose ──────────────────────────────────────
const lines = text.split("\n");
const blocks = [];
const proseLines = [];
for (let index = 0; index < lines.length; index++) {
  const open = /^```(\w+)\s*$/.exec(lines[index]);
  if (!open) { proseLines.push(lines[index]); continue; }
  const start = index;
  const code = [];
  for (index++; index < lines.length && lines[index] !== "```"; index++) code.push(lines[index]);
  assert(index < lines.length, `${FILE}:${start + 1}: the code block is not closed`);
  const mark = /^<!-- example: (.+) -->$/.exec(lines[start - 1] ?? "")?.[1];
  const shows = mark === undefined ? undefined : /^run, shows "([^"]+)"$/.exec(mark)?.[1];
  assert(mark === undefined || mark === "continues" || mark === "fragment" || shows !== undefined,
    `${FILE}:${start}: the mark is \`example: run, shows "<visible text>"\`, \`example: continues\` or \`example: fragment\`, not "${mark}"`);
  // Code a reader can copy is never skipped in silence: it runs, or it says it is a fragment.
  if (mark === undefined && CODE.includes(open[1])) {
    fail(`${FILE}:${start + 1}: a \`${open[1]}\` fence with no mark. Put \`<!-- example: run, shows "…" -->\`, \`<!-- example: continues -->\` or \`<!-- example: fragment -->\` on the line above it`);
  }
  blocks.push({ line: start + 1, lang: open[1], code: code.join("\n"), shows, continues: mark === "continues" });
}
const prose = proseLines.join("\n");
const spans = [...prose.matchAll(/`([^`\n]+)`/g)].map((match) => match[1]);
const links = [...prose.matchAll(/\]\(([^)\s]+)\)/g)].map((match) => match[1]);
const slug = (heading) => heading.trim().toLowerCase().replace(/[^\p{L}\p{N} _-]/gu, "").replace(/ /g, "-");
const slugs = new Set([...prose.matchAll(/^#{1,6} (.+)$/gm)].map((match) => slug(match[1])));

// A whole example with the fences that continue it.
const examples = [];
for (const block of blocks) {
  if (block.continues) {
    const previous = examples.at(-1);
    assert(previous && previous.last === blocks[blocks.indexOf(block) - 1], `${FILE}:${block.line}: nothing for this fence to continue`);
    previous.code += `\n${block.code}`;
    previous.last = block;
  } else if (block.shows !== undefined) {
    examples.push({ line: block.line, shows: block.shows, code: block.code, last: block });
  }
}
assert(examples.length, `${FILE} has no example marked to run`);

// ── Readability ───────────────────────────────────────────────────
const units = prose.split(/\n{2,}/).flatMap((paragraph) => /^- /m.test(paragraph) ? paragraph.split(/\n(?=- )/) : [paragraph])
  .map((unit) => unit.trim()).filter((unit) => unit && !/^(?:#|\||<!--)/.test(unit));
for (const unit of units) {
  const rendered = unit.replace(/\]\([^)]*\)/g, "]").replace(/[`*[\]]/g, "").replace(/\s+/g, " ");
  const start = `"${rendered.slice(0, 50)}…"`;
  if (rendered.length > MAX_PARAGRAPH) fail(`${start} is ${rendered.length} characters as rendered: over ${MAX_PARAGRAPH}, about four lines`);
  for (const sentence of unit.split(/(?<=[.:;?!])\s+/)) {
    const count = sentence.match(/`[^`\n]+`/g)?.length ?? 0;
    if (count > MAX_SPANS) fail(`${start} has a sentence with ${count} code spans, more than ${MAX_SPANS}`);
  }
}

// ── Links ─────────────────────────────────────────────────────────
for (const link of links) {
  if (link.startsWith("#")) {
    if (!slugs.has(link.slice(1))) fail(`${link} names no heading of ${FILE}`);
  } else if (!/^https?:\/\//.test(link) && !existsSync(join(root, link.split("#")[0]))) {
    fail(`${link} names no file of the repository`);
  }
}

// ── The install line ──────────────────────────────────────────────
// While material 3 is a pre-release it installs from the `next` tag; once
// package.json's peer range no longer names a pre-release, the tag goes.
const peer = manifest.peerDependencies.material;
const install = /-/.test(peer) ? "npm install material-addons material@next" : "npm install material-addons material";
const installed = text.split("<!-- install -->")[1]?.split("<!-- /install -->")[0]?.split("\n").filter((line) => line.startsWith("npm install"));
if (!installed || installed.length !== 1 || installed[0] !== install) {
  fail(`the install line is ${JSON.stringify(installed)}; the peer range is ${peer}, so it is "${install}"`);
}

// ── The packed package ────────────────────────────────────────────
const fixture = mkdtempSync(join(tmpdir(), "material-addons-readme-"));
let browser;
let server;
try {
  const packed = releasePack({ root, destination: fixture, log: false });
  const modules = join(fixture, "node_modules");
  const addon = join(modules, manifest.name);
  mkdirSync(addon, { recursive: true });
  const untar = spawnSync("tar", ["-xzf", packed.tarball, "--strip-components=1", "-C", addon]);
  assert.equal(untar.status, 0, String(untar.stderr));
  symlinkSync(resolve(root, "node_modules/material"), join(modules, "material"), "junction");
  writeFileSync(join(fixture, "package.json"), '{"type":"module"}');

  // Specifiers and names, resolved by Node from the fixture.
  const NAMES = `(?:${manifest.name}|material)`;
  const specifiers = new Set();
  for (const span of spans) if (new RegExp(`^${NAMES}(?:/[\\w./-]+)?$`).test(span)) specifiers.add(span);
  for (const block of blocks) {
    for (const match of block.code.matchAll(new RegExp(`(?:from|import)\\s*['"](${NAMES}(?:/[\\w./-]+)?)['"]`, "g"))) specifiers.add(match[1]);
  }
  const probe = spawnSync(process.execPath, ["--input-type=module", "-e", `
    import { existsSync } from 'node:fs';
    import { fileURLToPath } from 'node:url';
    const resolved = {};
    for (const specifier of ${JSON.stringify([...specifiers])}) {
      try { resolved[specifier] = existsSync(fileURLToPath(import.meta.resolve(specifier))) ? 'ok' : 'resolves to a missing file'; }
      catch (error) { resolved[specifier] = error.code ?? String(error); }
    }
    const names = new Set();
    for (const entry of ['${manifest.name}', '${manifest.name}/layout', '${manifest.name}/gestures']) {
      for (const name of Object.keys(await import(entry))) names.add(name);
    }
    console.log(JSON.stringify({ resolved, names: [...names] }));
  `], { cwd: fixture, encoding: "utf8" });
  assert.equal(probe.status, 0, probe.stderr);
  const report = JSON.parse(probe.stdout);
  for (const [specifier, result] of Object.entries(report.resolved)) if (result !== "ok") fail(`\`${specifier}\`: ${result}`);
  for (const span of spans) {
    if (/^(?:create|detect)[A-Z]\w*$/.test(span) && !report.names.includes(span)) fail(`\`${span}\` is not an export of ${manifest.name}`);
  }

  // The examples, in Chromium. An unresolved specifier is reported above, by its
  // name; the bundler would only fail on it less clearly.
  if (failures.length) throw new Error("not built: see the failures");
  const input = {};
  for (const [index, example] of examples.entries()) {
    writeFileSync(join(fixture, `readme-${index}.js`), example.code);
    writeFileSync(join(fixture, `readme-${index}.html`),
      `<!doctype html><html><head><meta charset="utf-8"><title>README example</title></head><body><script type="module" src="./readme-${index}.js"></script></body></html>`);
    input[`readme-${index}`] = join(fixture, `readme-${index}.html`);
  }
  const outDir = join(fixture, "site");
  await build({ root: fixture, configFile: false, envFile: false, logLevel: "error",
    build: { outDir, target: "esnext", rolldownOptions: { input } } });
  server = await preview({ root: fixture, configFile: false, envFile: false, logLevel: "error",
    build: { outDir }, preview: { host: "127.0.0.1", port: 0, open: false } });
  const { port } = server.httpServer.address();
  browser = await chromium.launch();
  for (const [index, example] of examples.entries()) {
    const where = `${FILE}:${example.line}`;
    const page = await browser.newPage();
    const reported = [];
    page.on("pageerror", (error) => reported.push(String(error)));
    page.on("console", (message) => { if (["error", "warning"].includes(message.type())) reported.push(`${message.type()}: ${message.text()}`); });
    try {
      await page.goto(`http://127.0.0.1:${port}/readme-${index}.html`, { waitUntil: "load" });
      await page.getByText(example.shows, { exact: true }).first().waitFor({ state: "visible", timeout: 10_000 });
      const state = await page.evaluate(() => ({
        drawn: [...document.querySelectorAll('[class*="mtrl-"]')].filter((element) => {
          const rect = element.getBoundingClientRect();
          return rect.width > 0 && rect.height > 0;
        }).length,
        theme: getComputedStyle(document.documentElement).getPropertyValue("--mtrl-sys-color-primary").trim(),
      }));
      if (/['"]material(?:-addons)?\/styles/.test(example.code)) {
        if (!state.theme) fail(`${where}: the example imports a stylesheet and the page has no theme`);
        if (!state.drawn) fail(`${where}: the example imports a stylesheet and nothing of the library has a box`);
      }
      if (reported.length) fail(`${where}: the page reported:\n  ${reported.join("\n  ")}`);
      console.log(`${where}: "${example.shows}" visible, ${state.drawn} drawn${state.theme ? `, primary ${state.theme}` : ""}`);
    } catch (error) {
      fail(`${where}: ${String(error).split("\n")[0]}${reported.length ? `\n  ${reported.join("\n  ")}` : ""}`);
    } finally {
      await page.close();
    }
  }
} catch (error) {
  if (!failures.length) throw error;
} finally {
  await browser?.close();
  await new Promise((done) => (server ? server.httpServer.close(() => done()) : done()));
  // Only the temporary directory this script made.
  rmSync(fixture, { recursive: true, force: true });
}

if (failures.length) {
  console.error(`\n${failures.length} README ${failures.length === 1 ? "failure" : "failures"}:\n`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log(`${FILE}: ${examples.length} examples run as written in Chromium, ${links.length} links, ${units.length} paragraphs and list items within the readability rule`);
