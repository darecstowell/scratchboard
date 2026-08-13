const FRONTMATTER_KEY = /^([A-Za-z_][A-Za-z0-9_-]*)\s*:\s*(.*)$/;
const ESCAPES = { n: "\n", t: "\t", r: "\r", 0: "\0", '"': '"', "'": "'", "\\": "\\", "/": "/" };
const CLOSERS = new Set(["---", "..."]);
const COMMENT = /^\s*#/;
const HEADING = /^\s*#{1,6}\s+(.*?)\s*$/;
const FENCE = /^\s*(```|~~~)/;

function splitFrontmatter(text) {
  const source = text.startsWith("﻿") ? text.slice(1) : text;
  const lines = source.split("\n");
  let i = 0;
  while (i < lines.length && lines[i].trim() === "") i += 1;
  if (i >= lines.length || lines[i].trim() !== "---") return { block: null, body: source };
  const start = i + 1;
  for (let j = start; j < lines.length; j += 1) {
    if (CLOSERS.has(lines[j].trim())) {
      return { block: lines.slice(start, j), body: lines.slice(j + 1).join("\n") };
    }
  }
  return { block: null, body: source };
}

function readQuoted(text, i) {
  const quote = text[i];
  i += 1;
  const out = [];
  while (i < text.length) {
    const c = text[i];
    if (c === "\\" && quote === '"' && i + 1 < text.length) {
      const next = text[i + 1];
      out.push(Object.hasOwn(ESCAPES, next) ? ESCAPES[next] : next);
      i += 2;
      continue;
    }
    if (c === "'" && quote === "'" && i + 1 < text.length && text[i + 1] === "'") {
      out.push("'");
      i += 2;
      continue;
    }
    if (c === quote) return { value: out.join(""), end: i + 1 };
    out.push(c);
    i += 1;
  }
  return { value: out.join(""), end: i };
}

/** One quoted fragment alone in whitespace keeps its inner spaces. Anything else is glued and trimmed. */
function flushItem(parts) {
  const quoted = parts.filter((part) => part.kind === "q");
  const raw = parts.filter((part) => part.kind === "r").map((part) => part.value).join("");
  if (quoted.length === 1 && raw.trim() === "") return quoted[0].value;
  return parts.map((part) => part.value).join("").trim();
}

/** One bracket level. The first `]` ends it, so nested arrays yield garbage rather than an error. */
function readArray(text, i) {
  i += 1;
  const items = [];
  let parts = [];
  while (i < text.length) {
    const c = text[i];
    if (c === '"' || c === "'") {
      const quoted = readQuoted(text, i);
      parts.push({ kind: "q", value: quoted.value });
      i = quoted.end;
      continue;
    }
    if (c === "]") {
      i += 1;
      break;
    }
    if (c === ",") {
      items.push(flushItem(parts));
      parts = [];
      i += 1;
      continue;
    }
    parts.push({ kind: "r", value: c });
    i += 1;
  }
  const tail = flushItem(parts);
  if (tail !== "") items.push(tail);
  return { items: items.filter((value) => value !== ""), end: i };
}

function parseValue(raw) {
  const s = raw.trim();
  if (s === "") return null;
  if (s[0] === "[") return readArray(s, 0).items;
  if (s[0] === '"' || s[0] === "'") {
    const { value, end } = readQuoted(s, 0);
    if (s.slice(end).trim() === "") return value;
    return s;
  }
  return s;
}

function parseFrontmatter(text) {
  const { block, body } = splitFrontmatter(text);
  if (block === null) return { fields: {}, body, had: false };
  const fields = {};
  let last = null;
  for (const line of block) {
    if (line.trim() === "" || COMMENT.test(line)) continue;
    const match = FRONTMATTER_KEY.exec(line);
    if (match) {
      fields[match[1]] = parseValue(match[2]);
      last = match[1];
    } else if (last !== null && typeof fields[last] === "string") {
      fields[last] = `${fields[last]} ${line.trim()}`.trim();
    }
  }
  return { fields, body, had: true };
}

/** Only newlines. Trailing spaces, tabs, and CR belong to the body. */
function stripNewlines(text) {
  return text.replace(/^\n+/, "").replace(/\n+$/, "");
}

function firstHeading(body) {
  let fenced = false;
  for (const line of body.split("\n")) {
    if (FENCE.test(line)) {
      fenced = !fenced;
      continue;
    }
    if (fenced) continue;
    const match = HEADING.exec(line);
    if (match && match[1]) return match[1];
  }
  return null;
}

function basename(path) {
  const file = path.split("/").pop() || path;
  return file.replace(/\.[^.]+$/, "") || file;
}

export function parse(path, text) {
  const { fields, body: rest } = parseFrontmatter(text);
  const body = stripNewlines(rest);

  const declared = fields.title;
  const title =
    (typeof declared === "string" && declared.trim() !== "" && declared) ||
    firstHeading(body) ||
    basename(path);

  const out = {};
  for (const [key, value] of Object.entries(fields)) {
    if (key === "title") continue;
    out[key] = value === null ? "" : value;
  }

  return { id: null, title, body, fields: out };
}

/** Does this file open with a block that yielded a key? Drives preset detection. */
export function claims(text) {
  const { fields, had } = parseFrontmatter(text);
  return had && Object.keys(fields).length > 0;
}
