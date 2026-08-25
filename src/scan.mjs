import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { join } from "node:path";
import { matchGlob, globRoot, walk } from "./walk.mjs";
import { datesFor } from "./dates.mjs";
import { makeExcerpt, findRefs } from "./parse/markdown.mjs";
import { CATCH_ALL, laneFields } from "./config.mjs";
import * as dialect from "./dialect.mjs";
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

/** Nothing ships declared, so a repo that declares nothing carries an empty list. */
export const BASE_INVOCATIONS = [];

/** Additive, overriding by name, and a null template opts an entry out. */
export function mergeInvocations(declared) {
  const merged = new Map(BASE_INVOCATIONS.map((one) => [one.name, { ...one }]));
  for (const one of declared || []) {
    if (one.template === null) {
      merged.delete(one.name);
      continue;
    }
    merged.set(one.name, { name: one.name, template: one.template });
  }
  return [...merged.values()];
}

const ROLE_ORDER = { lead: 0, issue: 1, other: 2 };

function baseNameOf(path) {
  return path.slice(path.lastIndexOf("/") + 1);
}

function groupFiles(plan, held, config) {
  const files = plan.files
    .filter((path) => held.has(path))
    .map((path) => {
      const source = held.get(path);
      const parsed = source.parsed || {};
      const named = identify(path, config.idPattern);
      const title =
        (typeof parsed.title === "string" && parsed.title.trim() && parsed.title) ||
        dialect.headingOf(source.text) ||
        named.slug;
      const file = {
        role: dialect.roleOf(path, plan.path, plan.lead),
        path,
        title,
        id: parsed.id !== null && parsed.id !== undefined ? String(parsed.id) : named.id,
        body: parsed.body || source.text,
      };
      if (plan.kind === "context") file.status = dialect.statusOf(source.text);
      return file;
    });
  files.sort(
    (a, b) =>
      ROLE_ORDER[a.role] - ROLE_ORDER[b.role] ||
      plan.files.indexOf(a.path) - plan.files.indexOf(b.path)
  );
  return files;
}

/** One id on two paths is one warning, and `named` is the noun the message counts. */
export function warnDuplicateIds(warnings, entries, named) {
  const byId = new Map();
  for (const entry of entries) {
    if (!entry.id) continue;
    if (!byId.has(entry.id)) byId.set(entry.id, []);
    byId.get(entry.id).push(entry.path);
  }
  for (const [id, paths] of byId) {
    if (paths.length < 2) continue;
    warnings.push({
      path: null,
      reason: `id ${id} is on ${paths.length} ${named}: ${paths.join(", ")}`,
    });
  }
}

/** Only an effort carries edges and states, because only its issues write the structured line. */
function addEffortState(files, held, where, warnings) {
  const issues = files.filter((file) => file.role === "issue");
  const fields = issues.map((file) => dialect.readIssueFields(held.get(file.path).text));
  const states = dialect.deriveStates(
    issues.map((file, at) => ({
      id: file.id,
      status: fields[at].status,
      blockedBy: fields[at].blockedBy,
    }))
  );
  issues.forEach((file, at) => {
    file.type = fields[at].type;
    file.state = states[at].state;
    file.claimed = fields[at].status === dialect.CLAIMED;
    file.blockedBy = fields[at].blockedBy;
    for (const name of states[at].unknown) {
      warnings.push({
        path: file.path,
        reason: `names blocker ${name}, which is no file in ${where}`,
      });
    }
  });
}

/** The one read and parse. A file that cannot be read gets a warning and nothing back. A parser
 * that throws gets a warning and a null parse, so the caller decides what to do with the text. */
export async function readAndParse(root, path, parser, warnings) {
  let text;
  try {
    text = await readFile(join(root, path), "utf8");
  } catch (error) {
    warnings.push({ path, reason: `cannot read (${error.message})` });
    return null;
  }
  let parsed = null;
  let threw = false;
  try {
    parsed = parser.parse(path, text);
  } catch (error) {
    warnings.push({ path, reason: `parser threw (${error.message})` });
    threw = true;
  }
  return { text, parsed, threw };
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

  const overrides = new Map();
  for (const one of config.groups || []) {
    if (!files.some((path) => path === one.path || path.startsWith(`${one.path}/`))) {
      warnings.push({ path: one.path, reason: "the ticket glob reaches no file under this path" });
      continue;
    }
    overrides.set(one.path, one.kind);
  }
  const recognized = dialect.recognize(files, { base: scope, overrides });
  warnings.push(...recognized.diagnostics);

  const plans = recognized.groups.map((group) => ({
    ...group,
    title: null,
    files: files.filter((path) => path === group.path || path.startsWith(`${group.path}/`)),
  }));
  if (!config.documents || config.documents.context !== false) {
    const found = await dialect.discoverContexts(root);
    warnings.push(...found.warnings);
    for (const held of found.contexts) plans.push({ kind: "context", ...held });
  }
  plans.sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));

  const held = new Map();
  const taken = new Set();
  for (const plan of plans) {
    for (const path of plan.files) {
      taken.add(path);
      if (held.has(path)) continue;
      const source = await readAndParse(root, path, parser, warnings);
      if (source) held.set(path, source);
    }
  }

  const groups = plans.map((plan) => {
    const inside = groupFiles(plan, held, config);
    warnDuplicateIds(warnings, inside, `files in ${plan.path}`);
    if (plan.kind === "effort") addEffortState(inside, held, plan.path, warnings);
    const lead = plan.lead && held.has(plan.lead) ? held.get(plan.lead) : null;
    const named = inside.find((file) => file.role === "lead");
    return {
      kind: plan.kind,
      path: plan.path,
      title: (named && named.title) || plan.title || baseNameOf(plan.path),
      sections: lead ? dialect.splitSections(lead.text) : dialect.emptySections(),
      files: inside,
    };
  });

  const read = [];
  for (const path of files) {
    if (taken.has(path)) continue;
    const source = await readAndParse(root, path, parser, warnings);
    if (!source || source.threw) continue;
    const { text, parsed } = source;
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

  warnDuplicateIds(warnings, tickets, "tickets");

  const knownIds = new Set(tickets.map((ticket) => ticket.id).filter(Boolean));
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
    groups,
    invocations: mergeInvocations(config.invocations),
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
