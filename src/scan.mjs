import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { join } from "node:path";
import { matchGlob, globRoot, walk } from "./walk.mjs";
import { datesFor } from "./dates.mjs";
import { makeExcerpt, findRefs } from "./parse/markdown.mjs";
import { CATCH_ALL, laneFields } from "./config.mjs";
import * as yamlFrontmatter from "./parse/yaml-frontmatter.mjs";
import * as keyValueBlock from "./parse/key-value-block.mjs";

export const PRESETS = {
  "yaml-frontmatter": yamlFrontmatter,
  "key-value-block": keyValueBlock,
};

const GENERIC_NAMES = new Set(["issue", "index", "readme", "ticket", "task"]);

/** The deepest segment that names the ticket, skipping container file names like `issue.md`. */
export function ticketName(path) {
  const segments = path.split("/");
  const file = segments[segments.length - 1].replace(/\.[^.]+$/, "");
  if (GENERIC_NAMES.has(file.toLowerCase()) && segments.length > 1) {
    return segments[segments.length - 2];
  }
  return file;
}

export function identify(path, idPattern) {
  const name = ticketName(path);
  if (!idPattern) return { id: null, slug: name };
  let re;
  try {
    re = new RegExp(idPattern);
  } catch {
    return { id: null, slug: name };
  }
  const match = re.exec(name);
  if (!match) return { id: null, slug: name };
  const id = match[1] !== undefined ? String(match[1]) : match[0];
  const slug = name.slice(match.index + match[0].length).replace(/^[-_\s]+/, "");
  return { id, slug: slug || name };
}

function values(field) {
  if (field === undefined || field === null) return [];
  return Array.isArray(field) ? field.map(String) : [String(field)];
}

export function placeLane(ticket, lanes) {
  for (const lane of lanes) {
    if (lane.match.path) {
      if (matchGlob(ticket.path, lane.match.path)) return lane.name;
      continue;
    }
    const held = values(ticket.fields[lane.match.field]);
    if (held.some((value) => lane.match.in.includes(value))) return lane.name;
  }
  return null;
}

/** A named parser never degrades to a preset. A preset that misreads every ticket is worse
 * than a run that stops and says why. */
async function loadParser(root, config) {
  if (config.parser) {
    let module;
    try {
      module = await import(pathToFileURL(join(root, config.parser)).href);
    } catch (error) {
      throw new Error(`custom parser ${config.parser} did not load: ${error.message}`, {
        cause: error,
      });
    }
    if (typeof module.parse !== "function") {
      throw new Error(`custom parser ${config.parser} exports no parse function`);
    }
    return { parse: module.parse, format: `parser:${config.parser}` };
  }
  const preset = PRESETS[config.format];
  if (!preset) {
    throw new Error(`no parser: "${config.format}" is not a preset and no parser is named`);
  }
  return { parse: preset.parse, format: config.format };
}

/** A declared value keeps its declared place. Everything else falls in behind it by count. */
function facetOrder(order) {
  const declared = order || [];
  const rank = new Map(declared.map((value, index) => [value, index]));
  // The list length, not the map size: a name written twice keeps the higher index.
  const behind = declared.length;
  return (a, b) => {
    const left = rank.has(a[0]) ? rank.get(a[0]) : behind;
    const right = rank.has(b[0]) ? rank.get(b[0]) : behind;
    if (left !== right) return left - right;
    return b[1] - a[1] || (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0);
  };
}

function buildFacets(tickets, config) {
  const skip = laneFields(config.lanes);
  const out = {};
  for (const facet of config.facets || []) {
    if (skip.has(facet.field)) continue;
    const tally = new Map();
    for (const ticket of tickets) {
      for (const value of values(ticket.fields[facet.field])) {
        if (!value) continue;
        tally.set(value, (tally.get(value) || 0) + 1);
      }
    }
    out[facet.field] = [...tally]
      .sort(facetOrder(facet.order))
      .map(([value, count]) => ({ value, count }));
  }
  return out;
}

export const BACKSLASH_REASON =
  "a glob holds a backslash; globs use forward slashes on every platform, Windows included";

/** A Windows-shaped glob matches nothing, so name it rather than render an empty board. */
export function backslashGlobs(config) {
  const globs = [config.tickets];
  for (const lane of config.lanes || []) {
    if (lane.match && lane.match.path) globs.push(lane.match.path);
  }
  return globs.filter((glob) => typeof glob === "string" && glob.includes("\\"));
}

export async function scan(context) {
  const { root, config, version } = context;
  const warnings = [...(context.warnings || [])];
  const glob = config.tickets;
  const scope = globRoot(glob);

  const parser = await loadParser(root, config);
  // A glob cannot escape upward from its own root, so nothing above it is worth walking.
  const under = await walk(scope ? join(root, scope) : root);
  const files = under
    .map((path) => (scope ? `${scope}/${path}` : path))
    .filter((path) => matchGlob(path, glob));

  for (const wrong of backslashGlobs(config)) {
    warnings.push({ path: wrong, reason: BACKSLASH_REASON });
  }
  if (!files.length) {
    warnings.push({ path: glob, reason: `no file under ${root} matches this ticket glob` });
  }

  const read = [];
  for (const path of files) {
    let text;
    try {
      text = await readFile(join(root, path), "utf8");
    } catch (error) {
      warnings.push({ path, reason: `cannot read (${error.message})` });
      continue;
    }
    let parsed;
    try {
      parsed = parser.parse(path, text);
    } catch (error) {
      warnings.push({ path, reason: `parser threw (${error.message})` });
      continue;
    }
    if (!parsed || typeof parsed.title !== "string" || !parsed.title.trim()) {
      warnings.push({ path, reason: "no title found" });
      continue;
    }
    read.push({ path, text, parsed });
  }

  const { dates, warning: dateWarning } = await datesFor(
    root,
    read.map((entry) => entry.path),
    scope
  );
  if (dateWarning) warnings.push({ path: null, reason: dateWarning });

  const tickets = read.map(({ path, text, parsed }) => {
    const named = identify(path, config.idPattern);
    const id = parsed.id !== null && parsed.id !== undefined ? String(parsed.id) : named.id;
    const stamps = dates.get(path);
    return {
      id,
      slug: named.slug,
      title: parsed.title,
      path,
      lane: null,
      fields: parsed.fields || {},
      excerpt: makeExcerpt(parsed.body || ""),
      body: parsed.body || "",
      refs: [],
      created: stamps.created,
      updated: stamps.updated,
      date_source: stamps.date_source,
      _text: text,
    };
  });

  const byId = new Map();
  for (const ticket of tickets) {
    if (!ticket.id) continue;
    if (!byId.has(ticket.id)) byId.set(ticket.id, []);
    byId.get(ticket.id).push(ticket.path);
  }
  for (const [id, paths] of byId) {
    if (paths.length < 2) continue;
    warnings.push({
      path: null,
      reason: `id ${id} is on ${paths.length} tickets: ${paths.join(", ")}`,
    });
  }

  const knownIds = new Set(byId.keys());
  for (const ticket of tickets) {
    ticket.refs = findRefs(ticket._text, knownIds, ticket.id);
    delete ticket._text;
  }

  tickets.sort(
    (a, b) =>
      (a.updated < b.updated ? 1 : a.updated > b.updated ? -1 : 0) ||
      compareIds(b.id, a.id) ||
      (a.path < b.path ? -1 : 1)
  );

  const lanes = (config.lanes || []).map((lane) => ({
    name: lane.name,
    collapsed: lane.collapsed === true,
    ticketIds: [],
  }));
  const byName = new Map(lanes.map((lane) => [lane.name, lane]));
  const unmappedValues = new Set();
  let catchAll = null;

  for (const ticket of tickets) {
    const name = placeLane(ticket, config.lanes || []);
    if (name && byName.has(name)) {
      ticket.lane = name;
      byName.get(name).ticketIds.push(ticket.id ?? ticket.path);
      continue;
    }
    if (!catchAll) {
      catchAll = { name: CATCH_ALL, collapsed: false, ticketIds: [] };
      lanes.push(catchAll);
      byName.set(CATCH_ALL, catchAll);
    }
    ticket.lane = CATCH_ALL;
    catchAll.ticketIds.push(ticket.id ?? ticket.path);
    for (const lane of config.lanes || []) {
      if (lane.match.field) {
        for (const value of values(ticket.fields[lane.match.field])) unmappedValues.add(value);
      }
    }
  }

  if (catchAll) {
    const named = unmappedValues.size
      ? ` (${[...unmappedValues].sort().join(", ")})`
      : "";
    const count = catchAll.ticketIds.length;
    warnings.push({
      path: null,
      reason: `${count} ticket${count === 1 ? " matches" : "s match"} no lane${named}`,
    });
  }

  const byLane = {};
  for (const lane of lanes) byLane[lane.name] = lane.ticketIds.length;

  return {
    version,
    generated_at: new Date().toISOString().replace(/\.\d{3}Z$/, "Z"),
    root,
    title: config.title,
    format: parser.format,
    counts: { total: tickets.length, byLane },
    lanes,
    facets: buildFacets(tickets, config),
    facetConfig: (config.facets || []).filter((facet) => !laneFields(config.lanes).has(facet.field)),
    tickets,
    warnings,
  };
}

function compareIds(a, b) {
  if (a === b) return 0;
  if (a === null) return -1;
  if (b === null) return 1;
  const na = Number(a);
  const nb = Number(b);
  if (Number.isFinite(na) && Number.isFinite(nb) && na !== nb) return na < nb ? -1 : 1;
  return a < b ? -1 : a > b ? 1 : 0;
}
