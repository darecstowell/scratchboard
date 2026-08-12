const KEY_LINE = /^\s*(\*\*)?([A-Za-z][A-Za-z0-9 _-]*?)(\*\*)?:\s*(.*)$/;
/** Metadata keys are short. Prose ending in a colon is a lead-in, not a field. */
const MAX_KEY_WORDS = 3;
const FENCE = /^\s*(```|~~~)/;
const HEADING = /^\s*#{1,6}\s+(.*?)\s*$/;

function scanLines(text) {
  const lines = text.split("\n");
  let fenced = false;
  return lines.map((line) => {
    if (FENCE.test(line)) {
      fenced = !fenced;
      return { line, fenced: true };
    }
    return { line, fenced };
  });
}

function readBlock(lines, start) {
  const consumed = [];
  const fields = {};
  for (let i = start; i < lines.length; i += 1) {
    const { line, fenced } = lines[i];
    if (fenced) break;
    if (!line.trim()) break;
    const match = KEY_LINE.exec(line);
    if (!match) break;
    const words = match[2].trim().split(/ +/);
    if (words.length > MAX_KEY_WORDS) break;
    const key = words.join("-").toLowerCase();
    const raw = match[4].replace(/\*\*/g, "").trim();
    fields[key] = raw.includes(",")
      ? raw
          .split(",")
          .map((part) => part.trim())
          .filter(Boolean)
      : raw;
    consumed.push(i);
  }
  const keys = Object.keys(fields);
  if (keys.length === 1 && fields[keys[0]] === "") return { fields: {}, consumed: [] };
  return { fields, consumed };
}

function firstHeading(lines) {
  for (let i = 0; i < lines.length; i += 1) {
    const { line, fenced } = lines[i];
    if (fenced) continue;
    const match = HEADING.exec(line);
    if (match) return { index: i, text: match[1] };
  }
  return null;
}

function basename(path) {
  const file = path.split("/").pop() || path;
  return file.replace(/\.[^.]+$/, "");
}

/** At most two blocks: one before the first heading, one under it. */
function readBlocks(lines) {
  const heading = firstHeading(lines);
  const fields = {};
  const consumed = new Set();

  let cursor = 0;
  while (cursor < lines.length && !lines[cursor].line.trim()) cursor += 1;
  if (!heading || cursor < heading.index) {
    const before = readBlock(lines, cursor);
    Object.assign(fields, before.fields);
    before.consumed.forEach((i) => consumed.add(i));
  }

  if (heading) {
    let after = heading.index + 1;
    while (after < lines.length && !lines[after].line.trim()) after += 1;
    const block = readBlock(lines, after);
    Object.assign(fields, block.fields);
    block.consumed.forEach((i) => consumed.add(i));
  }

  return { fields, consumed, heading };
}

export function parse(path, text) {
  const lines = scanLines(text);
  const { fields, consumed, heading } = readBlocks(lines);

  const body = lines
    .filter((_, i) => !consumed.has(i))
    .map((entry) => entry.line)
    .join("\n")
    .replace(/^\n+/, "")
    .replace(/\n{3,}/g, "\n\n");

  const title =
    (typeof fields.title === "string" && fields.title) ||
    (heading && heading.text) ||
    basename(path);
  delete fields.title;

  return { id: null, title, body, fields };
}

/** Does this file carry a block the preset can read? Drives preset detection. */
export function claims(text) {
  return Object.keys(readBlocks(scanLines(text)).fields).length > 0;
}
