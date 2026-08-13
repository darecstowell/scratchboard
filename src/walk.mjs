import { readdir } from "node:fs/promises";
import { join } from "node:path";

const SKIP_DIRS = new Set([".git", "node_modules"]);
const REGEX_SPECIALS = /[.+^${}()|[\]\\]/g;

function segmentToRegExp(segment) {
  let out = "";
  for (const char of segment) {
    if (char === "*") out += "[^/]*";
    else if (char === "?") out += "[^/]";
    else out += char.replace(REGEX_SPECIALS, "\\$&");
  }
  return out;
}

/** Three tokens only: `*` within a segment, `**` across segments, `?` one character. */
export function globToRegExp(glob) {
  const segments = glob.split("/");
  let source = "^";
  let needsSeparator = false;

  segments.forEach((segment, index) => {
    const last = index === segments.length - 1;
    if (segment === "**") {
      if (last) source += needsSeparator ? "(?:/.*)?" : ".*";
      else source += needsSeparator ? "(?:/[^/]+)*/" : "(?:[^/]+/)*";
      needsSeparator = false;
      return;
    }
    if (needsSeparator) source += "/";
    source += segmentToRegExp(segment);
    needsSeparator = true;
  });

  return new RegExp(`${source}$`);
}

const cache = new Map();

export function matchGlob(path, glob) {
  let re = cache.get(glob);
  if (!re) {
    re = globToRegExp(glob);
    cache.set(glob, re);
  }
  return re.test(path);
}

/** The deepest directory a glob cannot escape upward from, for watching and for walking. */
export function globRoot(glob) {
  const segments = glob.split("/");
  const fixed = [];
  for (const segment of segments.slice(0, -1)) {
    if (/[*?]/.test(segment)) break;
    fixed.push(segment);
  }
  return fixed.join("/");
}

export async function walk(root, options = {}) {
  const skip = options.skip || (() => false);
  const found = [];

  async function descend(relative) {
    const absolute = relative ? join(root, relative) : root;
    let entries;
    try {
      entries = await readdir(absolute, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (entry.isSymbolicLink()) continue;
      const path = relative ? `${relative}/${entry.name}` : entry.name;
      if (entry.isDirectory()) {
        if (SKIP_DIRS.has(entry.name)) continue;
        if (skip(path, true)) continue;
        await descend(path);
      } else if (entry.isFile()) {
        if (skip(path, false)) continue;
        found.push(path);
      }
    }
  }

  await descend("");
  return found.sort();
}
