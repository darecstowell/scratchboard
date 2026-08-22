#!/usr/bin/env node
// House rules that generic tooling will not check. Zero dependencies, node: builtins only.
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { walk } from "../src/walk.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const CODE_DIRS = ["src", "bin", "test", "tools"];
const PROSE = ["README.md", "AGENTS.md", "docs/", "skills/", ".scratch/"];
const TEXT = new Set([
  ".mjs", ".js", ".json", ".md", ".css", ".html", ".svg", ".yml", ".yaml", ".txt", ".sh", ".py",
]);
const TEXT_NAMES = new Set(["LICENSE", ".gitignore"]);

const LOCAL_PATHS = [/\/Users\//, /\/home\/[a-z]/i, /[A-Z]:\\Users\\/];
const EM_DASH = /—/;
const EMOJI = /\p{Emoji_Presentation}|️/u;
// An exclamation that ends a sentence. `!==`, `!ok`, `<!--` and `[ ! ]` are code, not copy.
const SHOUT = /[\p{L}\p{N})"']!(?=$|[\s"'.,)])/u;

const failures = [];
const fail = (check, where, detail) => failures.push({ check, where, detail });

function isText(path) {
  const dot = path.lastIndexOf(".");
  const name = path.slice(path.lastIndexOf("/") + 1);
  return TEXT_NAMES.has(name) || (dot !== -1 && TEXT.has(path.slice(dot)));
}

const read = (path) => readFileSync(join(ROOT, path), "utf8");
const lineOf = (source, at) => source.slice(0, at).split("\n").length;

/**
 * Every string literal in a JS source, with comments and regular expressions left out. A regular
 * expression here can hold a quote and a comment can hold anything, so both have to be skipped.
 */
function stringLiterals(source) {
  const REGEX_AFTER = new Set([..."(,=:[!&|?{};+-*%~^<>\n", ""]);
  const KEYWORDS = new Set([
    "return", "typeof", "instanceof", "in", "of", "new", "delete", "void", "case", "do", "else",
    "yield", "await",
  ]);

  const found = [];
  const depths = [];
  let index = 0;
  let word = "";
  let previous = "";

  // Reads from the opening quote, or from the `}` that closes a template substitution.
  const readQuoted = (quote) => {
    const start = index;
    index += 1;
    let value = "";
    while (index < source.length) {
      const char = source[index];
      if (char === "\\") {
        value += source.slice(index, index + 2);
        index += 2;
        continue;
      }
      if (char === quote) {
        index += 1;
        break;
      }
      if (quote === "`" && char === "$" && source[index + 1] === "{") {
        depths.push(0);
        index += 2;
        found.push({ at: start, value });
        return;
      }
      value += char;
      index += 1;
    }
    found.push({ at: start, value });
  };

  while (index < source.length) {
    const char = source[index];
    const next = source[index + 1];

    if (char === "/" && next === "/") {
      const end = source.indexOf("\n", index);
      index = end === -1 ? source.length : end;
      continue;
    }
    if (char === "/" && next === "*") {
      const end = source.indexOf("*/", index + 2);
      index = end === -1 ? source.length : end + 2;
      continue;
    }
    if (char === '"' || char === "'" || char === "`") {
      readQuoted(char);
      previous = char;
      word = "";
      continue;
    }
    if (char === "{" && depths.length) depths[depths.length - 1] += 1;
    if (char === "}" && depths.length) {
      if (depths[depths.length - 1] === 0) {
        depths.pop();
        readQuoted("`");
        previous = "`";
        word = "";
        continue;
      }
      depths[depths.length - 1] -= 1;
    }
    if (char === "/" && (REGEX_AFTER.has(previous) || KEYWORDS.has(word))) {
      index += 1;
      let inClass = false;
      while (index < source.length) {
        const inner = source[index];
        if (inner === "\\") index += 2;
        else if (inner === "[") (inClass = true), (index += 1);
        else if (inner === "]") (inClass = false), (index += 1);
        else if (inner === "/" && !inClass) break;
        else index += 1;
      }
      index += 1;
      previous = "x";
      word = "";
      continue;
    }
    if (char === "\n") {
      previous = "\n";
      word = "";
      index += 1;
      continue;
    }
    if (/\s/.test(char)) {
      index += 1;
      continue;
    }
    word = /[A-Za-z_$]/.test(char) ? word + char : "";
    previous = char;
    index += 1;
  }

  return found;
}

/** Markdown minus fenced blocks, inline code, image syntax and link targets, which are not prose. */
function proseOf(markdown) {
  return markdown
    .replace(/^ {0,3}(`{3,}|~{3,})[\s\S]*?^ {0,3}\1[^\n]*$/gm, "")
    .replace(/`[^`\n]*`/g, "")
    .replace(/!\[/g, "[")
    .replace(/\]\([^)\s]*\)/g, "]");
}

const files = await walk(ROOT);
const textFiles = files.filter(isText);
const codeFiles = files.filter(
  (path) => CODE_DIRS.some((dir) => path.startsWith(`${dir}/`)) && /\.m?js$/.test(path)
);
const proseFiles = textFiles.filter((path) =>
  PROSE.some((entry) => (entry.endsWith("/") ? path.startsWith(entry) : path === entry))
);

// ---------------------------------------------------------------- dependencies

const pkg = JSON.parse(read("package.json"));
for (const field of ["dependencies", "devDependencies", "peerDependencies", "optionalDependencies"]) {
  const names = Object.keys(pkg[field] || {});
  if (names.length) fail("dependencies", "package.json", `${field}: ${names.join(", ")}`);
}

// ---------------------------------------------------------------- imports

const SPECIFIER =
  /(?:^|[\s;{}(])(?:import|export)\s+(?:[\s\S]*?\sfrom\s+)?["']([^"']+)["']|\bimport\(\s*["']([^"']+)["']/g;

for (const path of codeFiles) {
  const source = read(path);
  for (const match of source.matchAll(SPECIFIER)) {
    const specifier = match[1] || match[2];
    if (specifier.startsWith("node:") || specifier.startsWith(".")) continue;
    fail("imports", `${path}:${lineOf(source, match.index)}`, `imports ${specifier}`);
  }
}

// ---------------------------------------------------------------- absolute local paths

for (const path of textFiles) {
  const source = read(path);
  for (const pattern of LOCAL_PATHS) {
    const hit = pattern.exec(source);
    if (hit) fail("local-paths", `${path}:${lineOf(source, hit.index)}`, `absolute local path ${hit[0]}`);
  }
}

// ---------------------------------------------------------------- shipped copy

for (const path of proseFiles) {
  const prose = proseOf(read(path));
  if (EM_DASH.test(prose)) fail("shipped-copy", path, "em dash");
  if (SHOUT.test(prose)) fail("shipped-copy", path, "exclamation mark");
  if (EMOJI.test(prose)) fail("shipped-copy", path, "emoji");
}

for (const path of codeFiles.filter((entry) => entry.startsWith("src/"))) {
  const source = read(path);
  for (const literal of stringLiterals(source)) {
    const where = `${path}:${lineOf(source, literal.at)}`;
    if (EM_DASH.test(literal.value)) fail("shipped-copy", where, "em dash in a string");
    if (SHOUT.test(literal.value)) fail("shipped-copy", where, "exclamation mark in a string");
    if (EMOJI.test(literal.value)) fail("shipped-copy", where, "emoji in a string");
  }
}

// ---------------------------------------------------------------- the published tarball

const SHIPPED_DIRS = ["src/", "bin/", "licenses/"];
const NEVER_SHIP = ["test/", "tools/", ".scratch/", ".github/", "skills/", "assets/directions/"];
const MUST_SHIP = ["assets/favicon.svg", "LICENSE", "README.md"];
// The runtime never reads these, so they are the one carve-out in "everything under src ships".
const SHIPPED_NEVER = [/^src\/ui\/prototype-[^/]*\.html$/];

try {
  const out = execFileSync("npm", ["pack", "--dry-run", "--json"], { cwd: ROOT, encoding: "utf8" });
  const packed = JSON.parse(out.slice(out.indexOf("[")));
  const shipped = new Set(packed[0].files.map((entry) => entry.path));

  const carved = (path) => SHIPPED_NEVER.some((pattern) => pattern.test(path));
  const required = [
    ...MUST_SHIP,
    ...files.filter((path) => SHIPPED_DIRS.some((dir) => path.startsWith(dir)) && !carved(path)),
  ];
  for (const path of required) {
    if (!shipped.has(path)) fail("pack", path, "the runtime reads it and the tarball omits it");
  }
  for (const path of [...shipped].filter(carved)) {
    fail("pack", path, "the runtime never reads it and the tarball ships it");
  }
  for (const dir of NEVER_SHIP) {
    const stray = [...shipped].filter((path) => path.startsWith(dir));
    if (stray.length) fail("pack", dir, `${stray.length} files that do not belong in the tarball`);
  }
} catch (error) {
  fail("pack", "package.json", `npm pack --dry-run failed: ${error.message}`);
}

// ---------------------------------------------------------------- syntax

for (const path of files.filter((entry) => entry.endsWith(".mjs"))) {
  try {
    execFileSync(process.execPath, ["--check", join(ROOT, path)], { stdio: "pipe" });
  } catch (error) {
    const said = String(error.stderr || error.message).split("\n").find((line) => /Error/.test(line));
    fail("syntax", path, said || "node --check failed");
  }
}

// ---------------------------------------------------------------- workflows

const PINNED = /^[^\s@]+@[0-9a-f]{40}$/;
// An unquoted delimiter expands the body, so third party text in a run step becomes script.
const HEREDOC = /<<-?\s*(["']?)([A-Za-z_][A-Za-z0-9_]*)\1/;

for (const path of files.filter((entry) => entry.startsWith(".github/workflows/"))) {
  const source = read(path);
  const lines = source.split("\n");
  if (!/^permissions:/m.test(source)) fail("workflows", path, "no top-level permissions block");

  lines.forEach((line, index) => {
    const heredoc = HEREDOC.exec(line);
    if (heredoc && !heredoc[1]) {
      fail("workflows", `${path}:${index + 1}`, `heredoc ${heredoc[2]} expands the body it holds`);
    }

    const uses = /^\s*-?\s*uses:\s*(\S+)/.exec(line);
    if (!uses || uses[1].startsWith("./")) return;
    if (!PINNED.test(uses[1])) {
      fail("workflows", `${path}:${index + 1}`, `${uses[1]} is not pinned to a commit sha`);
    }
    if (!uses[1].startsWith("actions/checkout@")) return;

    const indent = line.search(/\S/);
    const step = [];
    for (let at = index + 1; at < lines.length; at += 1) {
      if (lines[at].trim() && lines[at].search(/\S/) <= indent) break;
      step.push(lines[at]);
    }
    if (!step.some((entry) => /^\s*persist-credentials:\s*false\s*$/.test(entry))) {
      fail("workflows", `${path}:${index + 1}`, "checkout keeps the repository token in .git/config");
    }
  });
}

// ---------------------------------------------------------------- report

if (!failures.length) {
  process.stdout.write(`guard: ${files.length} files, every house rule holds\n`);
  process.exit(0);
}

const width = Math.max(...failures.map((entry) => entry.check.length));
for (const entry of failures) {
  process.stderr.write(`${entry.check.padEnd(width)}  ${entry.where}  ${entry.detail}\n`);
}
process.stderr.write(`\nguard: ${failures.length} house rules broken\n`);
process.exit(1);
