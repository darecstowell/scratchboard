export const EXCERPT_LEN = 240;

const IMAGE = /!\[[^\]]*\]\([^)]*\)/g;
const LINK = /\[([^\]]*)\]\([^)]*\)/g;
const REF_LINK = /\[([^\]]*)\]\[[^\]]*\]/g;
const AUTOLINK = /<(https?:\/\/[^>]*)>/g;
const HTML_TAG = /<[^>]+>/g;
const EMPHASIS = /(\*\*|__|\*|_|`|~~)/g;
const LIST_MARK = /^\s*([-*+]|\d+[.)])\s+/;
const SPACES = /\s+/g;
const FENCE = /^\s*(```|~~~)/;
const REF_TOKEN = /#(\d+)/g;
const PULL_LINK = /\[[^\]\n]*\]\([^)\n]*\/pull\/[^)\n]*\)/g;

const SEPARATOR_CHARS = new Set(["-", "=", "|", ":", "*", " "]);
const QUOTE_CHARS = new Set([">", " "]);
const TRAILING_CHARS = new Set([" ", ",", ";", ":"]);
const BACKOFF = EXCERPT_LEN * 0.6;

/** Order is load-bearing: images before links, emphasis before backslash drop. */
export function stripMarkdown(line) {
  let out = line;
  out = out.replace(IMAGE, "");
  out = out.replace(LINK, "$1");
  out = out.replace(REF_LINK, "$1");
  out = out.replace(AUTOLINK, "$1");
  out = out.replace(HTML_TAG, "");
  out = out.replace(EMPHASIS, "");
  out = out.replace(LIST_MARK, "");
  out = out.split("\\").join("");
  return out.replace(SPACES, " ").trim();
}

function isSeparator(text) {
  for (const char of text) {
    if (!SEPARATOR_CHARS.has(char)) return false;
  }
  return true;
}

function stripQuoteMarks(text) {
  let start = 0;
  while (start < text.length && QUOTE_CHARS.has(text[start])) start += 1;
  return text.slice(start);
}

function stripTrailing(text) {
  let end = text.length;
  while (end > 0 && TRAILING_CHARS.has(text[end - 1])) end -= 1;
  return text.slice(0, end);
}

export function makeExcerpt(body) {
  const out = [];
  let inFence = false;
  let total = 0;

  for (const line of body.split("\n")) {
    let stripped = line.trim();
    if (FENCE.test(line)) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;
    if (stripped === "") {
      if (total >= 80) break;
      continue;
    }
    if (stripped.startsWith("#") || stripped.startsWith("|")) continue;
    if (isSeparator(stripped) && stripped.length > 2) continue;
    if (stripped.startsWith(">")) stripped = stripQuoteMarks(stripped);
    const text = stripMarkdown(stripped);
    if (!text) continue;
    out.push(text);
    total += text.length + 1;
    if (total >= EXCERPT_LEN) break;
  }

  const joined = out.join(" ");
  if (joined.length <= EXCERPT_LEN) return joined;
  let cut = joined.slice(0, EXCERPT_LEN);
  const space = cut.lastIndexOf(" ");
  if (space > BACKOFF) cut = cut.slice(0, space);
  return stripTrailing(cut) + "...";
}

/** Ids are strings here, so compare on the digits with leading zeros removed. */
function normalise(digits) {
  return digits.replace(/^0+/, "") || "0";
}

export function findRefs(text, knownIds, ownId) {
  const known = new Map();
  for (const id of knownIds) {
    const key = normalise(String(id));
    if (!known.has(key)) known.set(key, id);
  }
  const own = ownId == null ? null : normalise(String(ownId));

  const blanked = text.replace(PULL_LINK, " ");
  const found = [];
  const seen = new Set();
  REF_TOKEN.lastIndex = 0;
  let match = REF_TOKEN.exec(blanked);
  while (match !== null) {
    const number = normalise(match[1]);
    if (number !== own && !seen.has(number) && known.has(number)) {
      const start = match.index;
      const before = blanked.slice(Math.max(0, start - 14), start).toLowerCase();
      if (!before.endsWith("pr ") && !before.endsWith("pull request ")) {
        seen.add(number);
        found.push(known.get(number));
      }
    }
    match = REF_TOKEN.exec(blanked);
  }
  return found;
}
