import { readFileSync } from "node:fs";

const KNOWN_KEYS = new Set([
  "title",
  "tickets",
  "format",
  "idPattern",
  "parser",
  "lanes",
  "facets",
]);
const KNOWN_LANE_KEYS = new Set(["name", "match", "collapsed"]);
const KNOWN_FACET_KEYS = new Set(["field", "colors", "order"]);
export const FORMATS = new Set(["yaml-frontmatter", "key-value-block"]);
export const CATCH_ALL = "Unmapped";

/** An unknown key warns and is ignored, so a newer config still renders on an older build. */
export function validate(raw, warnings) {
  const warn = (reason) => warnings.push({ path: "scratchboard.json", reason });
  const config = {};

  for (const key of Object.keys(raw)) {
    if (!KNOWN_KEYS.has(key)) warn(`unknown key "${key}", ignored`);
  }

  if (typeof raw.title === "string") config.title = raw.title;
  if (typeof raw.tickets === "string") config.tickets = raw.tickets;
  if (typeof raw.parser === "string") config.parser = raw.parser;

  if (raw.format !== undefined) {
    if (FORMATS.has(raw.format)) config.format = raw.format;
    else warn(`unknown format "${raw.format}", detecting instead`);
  }

  if (raw.idPattern !== undefined) {
    try {
      new RegExp(raw.idPattern);
      config.idPattern = raw.idPattern;
    } catch (error) {
      warn(`idPattern is not a valid regular expression (${error.message})`);
    }
  }

  if (raw.lanes !== undefined) {
    if (!Array.isArray(raw.lanes)) warn("lanes must be an array, ignored");
    else config.lanes = raw.lanes.map((lane, i) => cleanLane(lane, i, warn)).filter(Boolean);
  }

  if (raw.facets !== undefined) {
    if (!Array.isArray(raw.facets)) warn("facets must be an array, ignored");
    else config.facets = raw.facets.map((f, i) => cleanFacet(f, i, warn)).filter(Boolean);
  }

  return config;
}

function cleanLane(lane, index, warn) {
  const where = `lanes[${index}]`;
  if (!lane || typeof lane !== "object") {
    warn(`${where} is not an object, ignored`);
    return null;
  }
  for (const key of Object.keys(lane)) {
    if (!KNOWN_LANE_KEYS.has(key)) warn(`unknown key "${key}" in ${where}, ignored`);
  }
  if (typeof lane.name !== "string" || !lane.name.trim()) {
    warn(`${where} has no name, ignored`);
    return null;
  }
  const out = { name: lane.name, collapsed: lane.collapsed === true };

  const match = lane.match;
  if (!match || typeof match !== "object") {
    warn(`${where} has no match, ignored`);
    return null;
  }
  const hasPath = typeof match.path === "string";
  const hasField = typeof match.field === "string";
  if (hasPath && hasField) {
    warn(`${where} matches on both path and field, ignored`);
    return null;
  }
  if (hasPath) {
    out.match = { path: match.path };
    return out;
  }
  if (!hasField) {
    warn(`${where} matches on neither path nor field, ignored`);
    return null;
  }
  if (Array.isArray(match.in)) {
    out.match = { field: match.field, in: match.in.map(String) };
    return out;
  }
  if (match.equals !== undefined) {
    out.match = { field: match.field, in: [String(match.equals)] };
    return out;
  }
  warn(`${where} matches field "${match.field}" against no values, ignored`);
  return null;
}

function cleanFacet(facet, index, warn) {
  const where = `facets[${index}]`;
  const shape = typeof facet === "string" ? { field: facet } : facet;
  if (!shape || typeof shape !== "object") {
    warn(`${where} is not an object, ignored`);
    return null;
  }
  for (const key of Object.keys(shape)) {
    if (!KNOWN_FACET_KEYS.has(key)) warn(`unknown key "${key}" in ${where}, ignored`);
  }
  if (typeof shape.field !== "string" || !shape.field.trim()) {
    warn(`${where} names no field, ignored`);
    return null;
  }
  const out = { field: shape.field };
  if (shape.colors && typeof shape.colors === "object") out.colors = { ...shape.colors };
  if (shape.order !== undefined) {
    if (Array.isArray(shape.order)) out.order = shape.order.map(String);
    else warn(`order in ${where} must be an array, ignored`);
  }
  return out;
}

/** `raw` is the file as written. Only a caller that rewrites the file needs it. */
export function readConfig(configPath, warnings) {
  const none = { raw: {}, config: {}, readable: true };
  if (!configPath) return none;
  let text;
  try {
    text = readFileSync(configPath, "utf8");
  } catch (error) {
    warnings.push({ path: "scratchboard.json", reason: `cannot read (${error.message})` });
    return { ...none, readable: false };
  }
  let raw;
  try {
    raw = JSON.parse(text);
  } catch (error) {
    warnings.push({ path: "scratchboard.json", reason: `is not valid JSON (${error.message})` });
    return { ...none, readable: false };
  }
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    warnings.push({ path: "scratchboard.json", reason: "must hold a JSON object" });
    return { ...none, readable: false };
  }
  return { raw, config: validate(raw, warnings), readable: true };
}

export function loadConfig(configPath, warnings) {
  return readConfig(configPath, warnings).config;
}

/** Validation drops what it cannot judge. Rewriting the file puts it back, so a config written
 * against a newer version survives a round trip through an older one. */
export function withUnknown(raw, config) {
  const out = { ...config };
  for (const [key, value] of Object.entries(raw)) {
    if (!KNOWN_KEYS.has(key)) out[key] = value;
  }
  out.lanes = rejoin(raw.lanes, out.lanes, KNOWN_LANE_KEYS, "name");
  out.facets = rejoin(raw.facets, out.facets, KNOWN_FACET_KEYS, "field");
  if (!out.lanes) delete out.lanes;
  if (!out.facets) delete out.facets;
  return out;
}

function rejoin(rawList, cleanList, known, key) {
  if (!Array.isArray(cleanList)) return cleanList;
  if (!Array.isArray(rawList)) return cleanList;
  return cleanList.map((clean) => {
    const source = rawList.find((one) => one && one[key] === clean[key]);
    if (!source) return clean;
    const extra = {};
    for (const [name, value] of Object.entries(source)) {
      if (!known.has(name)) extra[name] = value;
    }
    return { ...clean, ...extra };
  });
}

/** A field that places lanes is not also a filter chip, or one control fights the other. */
export function laneFields(lanes) {
  const fields = new Set();
  for (const lane of lanes || []) {
    if (lane.match && lane.match.field) fields.add(lane.match.field);
  }
  return fields;
}
