import { readFileSync } from "node:fs";
import { isAbsolute } from "node:path";

const KNOWN_KEYS = new Set([
  "title",
  "tickets",
  "format",
  "idPattern",
  "parser",
  "lanes",
  "facets",
  "groups",
  "documents",
  "invocations",
]);
const KNOWN_LANE_KEYS = new Set(["name", "match", "collapsed"]);
const KNOWN_FACET_KEYS = new Set(["field", "colors", "order", "icon"]);
const KNOWN_GROUP_KEYS = new Set(["path", "kind"]);
const KNOWN_DOCUMENT_KEYS = new Set(["context"]);
const KNOWN_INVOCATION_KEYS = new Set(["name", "template"]);
/** `none` opts a folder out of being a group. The other three are the kinds a group carries. */
export const GROUP_KINDS = new Set(["effort", "feature", "context", "none"]);
export const PATH_TOKEN = "{path}";
/** The Octicons the board inlines. `test/icons.test.mjs` holds this to what the UI actually has. */
export const ICON_NAMES = new Set([
  "alert",
  "blocked",
  "book",
  "calendar",
  "check",
  "circle-slash",
  "columns",
  "copy",
  "cross-reference",
  "file",
  "issue-opened",
  "link",
  "milestone",
  "note",
  "package",
  "person",
  "question",
  "tag",
  "workflow",
]);
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

  if (raw.groups !== undefined) {
    if (!Array.isArray(raw.groups)) warn("groups must be an array, ignored");
    else config.groups = raw.groups.map((g, i) => cleanGroup(g, i, warn)).filter(Boolean);
  }

  if (raw.documents !== undefined) {
    const documents = cleanDocuments(raw.documents, warn);
    if (documents) config.documents = documents;
  }

  if (raw.invocations !== undefined) {
    if (!Array.isArray(raw.invocations)) warn("invocations must be an array, ignored");
    else {
      config.invocations = raw.invocations
        .map((one, i) => cleanInvocation(one, i, warn))
        .filter(Boolean);
    }
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
  if (shape.icon !== undefined) {
    if (ICON_NAMES.has(shape.icon)) out.icon = shape.icon;
    else warn(`unknown icon "${shape.icon}" in ${where}, ignored`);
  }
  if (shape.colors && typeof shape.colors === "object") out.colors = { ...shape.colors };
  if (shape.order !== undefined) {
    if (Array.isArray(shape.order)) out.order = shape.order.map(String);
    else warn(`order in ${where} must be an array, ignored`);
  }
  return out;
}

function cleanGroup(group, index, warn) {
  const where = `groups[${index}]`;
  if (!group || typeof group !== "object") {
    warn(`${where} is not an object, ignored`);
    return null;
  }
  for (const key of Object.keys(group)) {
    if (!KNOWN_GROUP_KEYS.has(key)) warn(`unknown key "${key}" in ${where}, ignored`);
  }
  if (typeof group.path !== "string" || !group.path.trim()) {
    warn(`${where} names no path, ignored`);
    return null;
  }
  const path = group.path.trim().replace(/\/+$/, "");
  if (!isInsideRepo(path)) {
    warn(`${where} path must be relative to the repository root, ignored`);
    return null;
  }
  if (!GROUP_KINDS.has(group.kind)) {
    warn(`unknown kind "${group.kind}" in ${where}, ignored`);
    return null;
  }
  return { path, kind: group.kind };
}

function isInsideRepo(path) {
  if (isAbsolute(path) || /^[A-Za-z]:/.test(path)) return false;
  return !path.split(/[\\/]/).includes("..");
}

function cleanDocuments(documents, warn) {
  if (!documents || typeof documents !== "object" || Array.isArray(documents)) {
    warn("documents must be an object, ignored");
    return null;
  }
  for (const key of Object.keys(documents)) {
    if (!KNOWN_DOCUMENT_KEYS.has(key)) warn(`unknown key "${key}" in documents, ignored`);
  }
  const out = {};
  if (documents.context !== undefined) {
    if (typeof documents.context === "boolean") out.context = documents.context;
    else warn("context in documents must be true or false, ignored");
  }
  return out;
}

/** A null template opts an entry out by name, so config is additive rather than all or nothing. */
function cleanInvocation(invocation, index, warn) {
  const where = `invocations[${index}]`;
  if (!invocation || typeof invocation !== "object") {
    warn(`${where} is not an object, ignored`);
    return null;
  }
  for (const key of Object.keys(invocation)) {
    if (!KNOWN_INVOCATION_KEYS.has(key)) warn(`unknown key "${key}" in ${where}, ignored`);
  }
  if (typeof invocation.name !== "string" || !invocation.name.trim()) {
    warn(`${where} has no name, ignored`);
    return null;
  }
  const name = invocation.name.trim();
  if (invocation.template === null) return { name, template: null };
  if (typeof invocation.template !== "string" || !invocation.template.trim()) {
    warn(`${where} has no template, ignored`);
    return null;
  }
  const unsupported = unsupportedTokens(invocation.template);
  if (unsupported.length) {
    warn(`${where} uses ${unsupported.join(", ")}, and only ${PATH_TOKEN} is substituted, ignored`);
    return null;
  }
  return { name, template: invocation.template };
}

function unsupportedTokens(template) {
  const found = new Set();
  for (const match of template.matchAll(/\{[^{}]*\}/g)) {
    if (match[0] !== PATH_TOKEN) found.add(match[0]);
  }
  return [...found];
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
  out.groups = rejoin(raw.groups, out.groups, KNOWN_GROUP_KEYS, "path");
  out.invocations = rejoin(raw.invocations, out.invocations, KNOWN_INVOCATION_KEYS, "name");
  out.documents = rejoinOne(raw.documents, out.documents, KNOWN_DOCUMENT_KEYS);
  if (!out.lanes) delete out.lanes;
  if (!out.facets) delete out.facets;
  if (!out.groups) delete out.groups;
  if (!out.invocations) delete out.invocations;
  if (!out.documents) delete out.documents;
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

function rejoinOne(rawValue, clean, known) {
  if (!clean || !rawValue || typeof rawValue !== "object" || Array.isArray(rawValue)) return clean;
  const extra = {};
  for (const [name, value] of Object.entries(rawValue)) {
    if (!known.has(name)) extra[name] = value;
  }
  return { ...clean, ...extra };
}

/** A field that places lanes is not also a filter chip, or one control fights the other. */
export function laneFields(lanes) {
  const fields = new Set();
  for (const lane of lanes || []) {
    if (lane.match && lane.match.field) fields.add(lane.match.field);
  }
  return fields;
}
