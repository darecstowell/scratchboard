import { readFile, readdir, realpath } from "node:fs/promises";
import { dirname, isAbsolute, join, resolve, sep } from "node:path";
import { nameFile } from "./naming.mjs";

/**
 * The one place scratchboard names the upstream layout. Recognition, the assembly of a group,
 * the lead document's sections, an issue's structured lines, and the state derived from them all
 * live here, so the rest of the codebase learns no upstream vocabulary.
 */

export const LEAD_DOCUMENTS = new Map([
  ["map.md", "effort"],
  ["spec.md", "feature"],
  ["CONTEXT.md", "context"],
]);
export const ISSUES_DIR = "issues";
export const CONTEXT_LEAD = "CONTEXT.md";
export const CONTEXT_MAP = "CONTEXT-MAP.md";
export const DECISIONS_DIR = "docs/adr";
export const CONTEXTS_HEADING = "Contexts";

export const TICKET_TYPES = new Set(["research", "prototype", "grilling", "task"]);
export const CLAIMED = "claimed";
export const RESOLVED = "resolved";
export const OUT_OF_SCOPE = "out-of-scope";
export const ISSUE_STATUSES = new Set([CLAIMED, RESOLVED, OUT_OF_SCOPE]);
export const NO_BLOCKERS = "none";

export const BEHIND_US = "behind-us";
export const TAKEABLE_NOW = "takeable-now";
export const STILL_BLOCKED = "still-blocked";
export const STATES = new Set([BEHIND_US, TAKEABLE_NOW, STILL_BLOCKED, OUT_OF_SCOPE]);

/** A key of `null` is a section the dialect reads and drops. The columns are that list. */
export const SECTIONS = new Map([
  ["Destination", "destination"],
  ["Notes", "notes"],
  ["Decisions so far", null],
  ["Not yet specified", "fog"],
  ["Out of scope", "outOfScope"],
]);
export const SECTION_KEYS = ["destination", "notes", "fog", "outOfScope"];

export const ROLES = new Set(["lead", "issue", "other"]);
export const DECISION_STATUS = "Status";
const FRONTMATTER = "---";
export const SKILL = "/scratchboard";

const HEADING = /^(#{1,6})\s+(.*?)\s*#*\s*$/;
const FENCE = /^\s*(?:```|~~~)/;
const FIELD = /^\s*(?:\*\*)?([A-Za-z][A-Za-z0-9 _-]*?)(?:\*\*)?\s*:\s*(.*?)\s*$/;
const LINK = /^\s*[-*+]\s+\[([^\]]*)\]\(([^)]*)\)/;
const SCHEME = /^[A-Za-z][A-Za-z0-9+.-]*:/;

export function leadFor(kind) {
  for (const [name, held] of LEAD_DOCUMENTS) if (held === kind) return name;
  return null;
}

function emptySections() {
  const out = {};
  for (const key of SECTION_KEYS) out[key] = "";
  return out;
}

function headingOf(text) {
  let fenced = false;
  for (const line of String(text || "").split("\n")) {
    if (FENCE.test(line)) {
      fenced = !fenced;
      continue;
    }
    if (fenced) continue;
    const heading = HEADING.exec(line);
    if (heading && heading[2]) return heading[2];
  }
  return null;
}

function roleOf(path, root, lead) {
  if (lead && path === lead) return "lead";
  const rest = root && root !== "." ? path.slice(root.length + 1) : path;
  return rest.startsWith(`${ISSUES_DIR}/`) ? "issue" : "other";
}

function insideBase(dir, base) {
  if (!dir) return false;
  return base ? dir.startsWith(`${base}/`) : true;
}

function fix(sentence) {
  return `${sentence} An agent can do that for you with ${SKILL}.`;
}

const NAME_IT = "name this path in the groups key of scratchboard.json";
const FIX_ONE_LEAD = fix(
  `A group takes exactly one lead document, so remove the one that does not belong, or ${NAME_IT} with the kind it should take.`
);
const FIX_NO_ISSUES = fix(
  `Move the tickets into an issues folder beside the lead document, or ${NAME_IT} with the kind none.`
);
const FIX_NO_LEAD = fix(
  `Add the lead document the folder is missing, map.md for an effort or spec.md for a feature, or ${NAME_IT} with the kind none.`
);
const FIX_CONTEXT_LINK = fix(
  "Point the link at a CONTEXT.md that exists, or remove the bullet from the context map."
);

/**
 * A group is exactly one lead document beside an `issues/` folder, inside the board the ticket
 * glob describes. Everything half read raises a diagnostic and stays an ordinary ticket.
 */
export function recognize(paths, options = {}) {
  const base = options.base || "";
  const overrides = options.overrides || new Map();
  const seen = new Map();
  const mark = (dir) => {
    if (!seen.has(dir)) seen.set(dir, { leads: new Map(), issues: false });
    return seen.get(dir);
  };

  for (const path of paths) {
    const segments = path.split("/");
    const file = segments[segments.length - 1];
    const dir = segments.slice(0, -1).join("/");
    if (LEAD_DOCUMENTS.has(file) && insideBase(dir, base)) mark(dir).leads.set(file, path);
    const at = segments.indexOf(ISSUES_DIR);
    if (at > 0 && at < segments.length - 1) {
      const holder = segments.slice(0, at).join("/");
      if (insideBase(holder, base)) mark(holder).issues = true;
    }
  }

  const groups = [];
  const diagnostics = [];
  const candidates = new Set([...seen.keys(), ...overrides.keys()]);

  for (const dir of [...candidates].sort()) {
    const forced = overrides.get(dir);
    if (forced === "none") continue;
    const shape = seen.get(dir) || { leads: new Map(), issues: false };
    if (forced) {
      groups.push({ path: dir, kind: forced, lead: shape.leads.get(leadFor(forced)) || null });
      continue;
    }
    const leads = [...shape.leads.keys()].sort();
    if (leads.length > 1) {
      diagnostics.push({
        path: dir,
        reason:
          `read ${dir}/ as a group but found ${leads.length} lead documents, ` +
          leads.join(" and "),
        fix: FIX_ONE_LEAD,
      });
      continue;
    }
    if (leads.length === 1) {
      const kind = LEAD_DOCUMENTS.get(leads[0]);
      if (shape.issues) {
        groups.push({ path: dir, kind, lead: shape.leads.get(leads[0]) });
        continue;
      }
      diagnostics.push({
        path: dir,
        reason:
          `read ${dir}/ as ${article(kind)} ${kind} but found no ` +
          `${ISSUES_DIR}/ folder beside ${leads[0]}`,
        fix: FIX_NO_ISSUES,
      });
      continue;
    }
    if (shape.issues) {
      diagnostics.push({
        path: dir,
        reason:
          `read ${dir}/ as a group but found no lead document beside ` +
          `${ISSUES_DIR}/, so it names no kind`,
        fix: FIX_NO_LEAD,
      });
    }
  }

  const inside = (path) => groups.some((group) => path.startsWith(`${group.path}/`));
  return { groups, diagnostics: diagnostics.filter((one) => !inside(one.path)) };
}

function article(word) {
  return /^[aeiou]/i.test(word) ? "an" : "a";
}

/** Each `##` heading runs to the next heading of the same depth or shallower. */
export function splitSections(text) {
  const out = emptySections();
  let fenced = false;
  let key = null;
  let held = [];
  const flush = () => {
    if (key) out[key] = held.join("\n").trim();
    key = null;
    held = [];
  };

  for (const line of String(text || "").split("\n")) {
    if (FENCE.test(line)) {
      fenced = !fenced;
      if (key) held.push(line);
      continue;
    }
    const heading = fenced ? null : HEADING.exec(line);
    if (heading && heading[1].length <= 2) {
      flush();
      if (heading[1].length === 2 && SECTIONS.has(heading[2])) key = SECTIONS.get(heading[2]);
      continue;
    }
    if (key) held.push(line);
  }
  flush();
  return out;
}

/** The structured lines an effort issue opens with, read as an unordered run of key and value. */
export function readIssueFields(text) {
  const out = { type: null, status: null, blockedBy: [] };
  let fenced = false;
  let readBlockers = false;

  for (const line of String(text || "").split("\n")) {
    if (FENCE.test(line)) {
      fenced = !fenced;
      continue;
    }
    if (fenced) continue;
    const heading = HEADING.exec(line);
    if (heading && heading[1].length >= 2) break;
    const field = FIELD.exec(line);
    if (!field) continue;
    const name = field[1].trim().replace(/\s+/g, " ").toLowerCase();
    const value = field[2].replace(/\*\*/g, "").trim();
    if (name === "type" && out.type === null) out.type = value || null;
    else if (name === "status" && out.status === null) out.status = value.toLowerCase() || null;
    else if (name === "blocked by" && !readBlockers) {
      out.blockedBy = readBlockedBy(value);
      readBlockers = true;
    }
  }
  return out;
}

function readBlockedBy(value) {
  const raw = value.trim();
  if (!raw || raw.toLowerCase().startsWith(NO_BLOCKERS)) return [];
  return raw
    .split(",")
    .map((one) => one.trim().replace(/^#/, ""))
    .filter(Boolean);
}

function idKeys(id) {
  if (id === null || id === undefined || id === "") return [];
  const raw = String(id);
  const number = Number(raw);
  return Number.isFinite(number) ? [raw, String(number)] : [raw];
}

/** A ticket is takeable when every ticket it names as a blocker is resolved. */
function deriveStates(issues) {
  const byId = new Map();
  for (const issue of issues) {
    for (const key of idKeys(issue.id)) if (!byId.has(key)) byId.set(key, issue);
  }
  const find = (name) => {
    const held = byId.get(name);
    if (held) return held;
    const number = Number(name);
    return Number.isFinite(number) ? byId.get(String(number)) : undefined;
  };

  return issues.map((issue) => {
    if (issue.status === OUT_OF_SCOPE) return { state: OUT_OF_SCOPE, unknown: [] };
    if (issue.status === RESOLVED) return { state: BEHIND_US, unknown: [] };
    const unknown = [];
    let blocked = false;
    for (const name of issue.blockedBy || []) {
      const held = find(name);
      if (!held) {
        unknown.push(name);
        blocked = true;
        continue;
      }
      if (held.status !== RESOLVED) blocked = true;
    }
    return { state: blocked ? STILL_BLOCKED : TAKEABLE_NOW, unknown };
  });
}

/**
 * A decision record's status is optional frontmatter, and the dialect reads it from the file
 * rather than through the ticket parser, which a repository picks for its own tickets.
 */
export function statusOf(text) {
  const lines = String(text || "").split("\n");
  let at = 0;
  while (at < lines.length && !lines[at].trim()) at += 1;
  if (at >= lines.length || lines[at].trim() !== FRONTMATTER) return null;
  const wanted = DECISION_STATUS.toLowerCase();
  for (let i = at + 1; i < lines.length; i += 1) {
    const line = lines[i].trim();
    if (line === FRONTMATTER || line === "...") break;
    const field = FIELD.exec(line);
    if (!field || field[1].trim().toLowerCase() !== wanted) continue;
    const value = field[2].replace(/\*\*/g, "").replace(/^["']|["']$/g, "").trim();
    return value || null;
  }
  return null;
}

const ROLE_ORDER = { lead: 0, issue: 1, other: 2 };
const NO_TITLE = "no title found, so the file name is used";

function baseNameOf(path) {
  return path.slice(path.lastIndexOf("/") + 1);
}

function assembleFile(plan, path, source, idPattern, warnings) {
  const named = nameFile(path, source.parsed, idPattern);
  const title = named.title || headingOf(source.text);
  if (!title) warnings.push({ path, reason: NO_TITLE });
  const file = {
    role: roleOf(path, plan.path, plan.lead),
    path,
    title: title || named.slug,
    id: named.id,
    body: (source.parsed && source.parsed.body) || source.text,
  };
  if (plan.kind === "context") file.status = statusOf(source.text);
  return file;
}

/** Only an effort carries edges and states, because only its issues write the structured line. */
function addEffortState(files, held, where, warnings) {
  const issues = files.filter((file) => file.role === "issue");
  const fields = issues.map((file) => readIssueFields(held.get(file.path).text));
  const states = deriveStates(
    issues.map((file, at) => ({
      id: file.id,
      status: fields[at].status,
      blockedBy: fields[at].blockedBy,
    }))
  );
  issues.forEach((file, at) => {
    file.type = fields[at].type;
    file.state = states[at].state;
    file.claimed = fields[at].status === CLAIMED;
    file.blockedBy = fields[at].blockedBy;
    for (const name of states[at].unknown) {
      warnings.push({
        path: file.path,
        reason: `names blocker ${name}, which is no file in ${where}`,
      });
    }
  });
}

/**
 * The one entry point for assembling a group: its title, its sections, and its files. Every
 * branch on the kind sits here, so the caller reads no upstream vocabulary to build one.
 * The warnings come back rather than being pushed, so the caller keeps its own order.
 */
export function assembleGroup(plan, held, config) {
  const warnings = [];
  const files = plan.files
    .filter((path) => held.has(path))
    .map((path) => assembleFile(plan, path, held.get(path), config.idPattern, warnings));
  files.sort(
    (a, b) =>
      ROLE_ORDER[a.role] - ROLE_ORDER[b.role] ||
      plan.files.indexOf(a.path) - plan.files.indexOf(b.path)
  );
  if (plan.kind === "effort") addEffortState(files, held, plan.path, warnings);

  const lead = plan.lead && held.has(plan.lead) ? held.get(plan.lead) : null;
  const named = files.find((file) => file.role === "lead");
  return {
    group: {
      kind: plan.kind,
      path: plan.path,
      title: (named && named.title) || plan.title || baseNameOf(plan.path),
      sections: lead ? splitSections(lead.text) : emptySections(),
      files,
    },
    warnings,
  };
}

export function contextLinks(text) {
  const links = [];
  let fenced = false;
  let inside = false;

  for (const line of String(text || "").split("\n")) {
    if (FENCE.test(line)) {
      fenced = !fenced;
      continue;
    }
    if (fenced) continue;
    const heading = HEADING.exec(line);
    if (heading) {
      inside = heading[1].length === 2 && heading[2] === CONTEXTS_HEADING;
      continue;
    }
    if (!inside) continue;
    const link = LINK.exec(line);
    if (link) links.push({ title: link[1].trim(), target: link[2].trim() });
  }
  return links;
}

/** A bare target names the directory holding the lead. Nothing else than a lead is ever opened. */
export function leadTarget(target) {
  const bare = target.split(/\s+/)[0].replace(/^<|>$/g, "").split("#")[0].split("?")[0];
  if (!bare) return null;
  if (bare.endsWith("/")) return `${bare}${CONTEXT_LEAD}`;
  if (!/\.[^/]+$/.test(bare)) return `${bare}/${CONTEXT_LEAD}`;
  return bare.endsWith(`/${CONTEXT_LEAD}`) || bare === CONTEXT_LEAD ? bare : null;
}

export const ESCAPE_REASON = "resolves outside the repository root and is refused";
export const NOT_A_LEAD = `names no ${CONTEXT_LEAD} and is refused`;

/**
 * The whole defence for every path the scanner opens outside the walk, the fixed names and the
 * untrusted link targets alike. A path that escapes by string, by scheme, by percent escape, or
 * by symbolic link is refused.
 */
export async function inRoot(root, target) {
  if (typeof target !== "string" || !target) return null;
  let wanted = target;
  try {
    wanted = decodeURIComponent(target);
  } catch {
    /* a malformed escape is read as the literal it is */
  }
  if (SCHEME.test(wanted) || wanted.startsWith("//") || wanted.includes("\0")) return null;
  if (isAbsolute(wanted) || /^[A-Za-z]:/.test(wanted)) return null;

  const base = await realpath(root).catch(() => resolve(root));
  const full = resolve(base, wanted);
  if (!under(base, full)) return null;
  const real =
    (await realpath(full).catch(() => null)) ??
    (await realpath(dirname(full)).catch(() => null));
  if (real !== null && !under(base, real)) return null;
  return full.slice(base.length + 1).split(sep).join("/");
}

function under(base, path) {
  return path === base || path.startsWith(base + sep);
}

/** A fixed name is fenced like a link target: the directory is realpathed before it is read. */
async function listDecisions(root, dir) {
  const wanted = [dir, DECISIONS_DIR].filter(Boolean).join("/");
  const at = await inRoot(root, wanted);
  if (at === null) return { files: [], refused: wanted };
  let entries;
  try {
    entries = await readdir(join(root, at), { withFileTypes: true });
  } catch {
    return { files: [], refused: null };
  }
  // isFile() reads the entry itself, so a symbolic link is listed by neither this nor the walk.
  const files = entries
    .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith(".md"))
    .map((entry) => entry.name)
    .sort()
    .reverse()
    .map((name) => `${at}/${name}`);
  return { files, refused: null };
}

async function readContextAt(root, lead, title) {
  const at = await inRoot(root, lead);
  if (at === null) return { context: null, refused: lead };
  let text;
  try {
    text = await readFile(join(root, at), "utf8");
  } catch {
    return { context: null, refused: null };
  }
  const dir = at.includes("/") ? at.slice(0, at.lastIndexOf("/")) : "";
  const decisions = await listDecisions(root, dir);
  return {
    context: {
      path: dir || ".",
      lead: at,
      title: title || headingOf(text),
      files: [at, ...decisions.files],
    },
    refused: decisions.refused,
  };
}

/** Three fixed reads and never a second glob: two named files and one shallow directory. */
export async function discoverContexts(root) {
  const contexts = [];
  const warnings = [];
  const refuse = (path) => warnings.push({ path, reason: `${path} ${ESCAPE_REASON}` });
  const take = (held) => {
    if (held.refused) refuse(held.refused);
    return held.context;
  };

  const mapAt = await inRoot(root, CONTEXT_MAP);
  if (mapAt === null) refuse(CONTEXT_MAP);
  const mapText =
    mapAt === null ? null : await readFile(join(root, mapAt), "utf8").catch(() => null);

  if (mapText !== null) {
    const links = contextLinks(mapText);
    if (!links.length) {
      warnings.push({
        path: CONTEXT_MAP,
        reason:
          `read ${CONTEXT_MAP} as a context map but found no links under ` +
          `a ${CONTEXTS_HEADING} heading`,
        fix: FIX_CONTEXT_LINK,
      });
    }
    for (const link of links) {
      const wanted = leadTarget(link.target);
      if (wanted === null) {
        warnings.push({ path: CONTEXT_MAP, reason: `the link to ${link.target} ${NOT_A_LEAD}` });
        continue;
      }
      const target = await inRoot(root, wanted);
      if (target === null) {
        warnings.push({ path: CONTEXT_MAP, reason: `the link to ${link.target} ${ESCAPE_REASON}` });
        continue;
      }
      const held = take(await readContextAt(root, target, link.title));
      if (!held) {
        warnings.push({
          path: CONTEXT_MAP,
          reason:
            `read ${CONTEXT_MAP} as a context map but the link to ` +
            `${link.target} resolves to nothing`,
          fix: FIX_CONTEXT_LINK,
        });
        continue;
      }
      contexts.push(held);
    }
  }

  const own = take(await readContextAt(root, CONTEXT_LEAD, null));
  if (own && !contexts.some((one) => one.lead === own.lead)) contexts.unshift(own);
  return { contexts, warnings };
}
