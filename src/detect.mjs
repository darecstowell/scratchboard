import { execFile } from "node:child_process";
import { readFile, rename, writeFile } from "node:fs/promises";
import { createInterface } from "node:readline";
import { join } from "node:path";
import { matchGlob, walk } from "./walk.mjs";
import { PRESETS } from "./scan.mjs";
import { LEAD_DOCUMENTS } from "./dialect.mjs";
import { CONFIG_NAME, resolveRoot } from "./root.mjs";
import { readConfig, withUnknown } from "./config.mjs";

/** Heuristic for every user, not a special case for any one repo. */
const PREFERRED_DIRS = [".scratch", ".tickets", "docs/issues", "issues", "tasks"];
const DOC_NAMES = new Set([
  "readme.md",
  "contributing.md",
  "changelog.md",
  "license.md",
  "code_of_conduct.md",
  "agents.md",
  "claude.md",
]);
const MIN_BOARD_FILES = 3;
const MAX_LANES = 6;
const TAG_LIKE_RATIO = 0.5;
const STATE_FIELD_NAMES = ["status", "state", "stage", "workflow", "column", "lane"];
const DONE_LIKE = /^(done|closed|complete|completed|archived?|shipped|resolved|wontfix|superseded)/i;
const STAGE_RANK = [
  /^(backlog|icebox|new|triage|needs-triage|todo|to-do|open)/i,
  /^(ready|selected|next|planned)/i,
  /^(in-progress|in_progress|inprogress|doing|active|wip|started)/i,
  /^(review|in-review|testing|qa|blocked|waiting)/i,
];

/** Two conventional vocabularies, ranked most urgent first. Insertion order is the rank. */
const PRIORITY_SCALE = new Map([
  ["p0", "red"],
  ["blocker", "red"],
  ["critical", "red"],
  ["urgent", "red"],
  ["p1", "amber"],
  ["high", "amber"],
  ["major", "amber"],
  ["p2", "cyan"],
  ["medium", "cyan"],
  ["moderate", "cyan"],
  ["normal", "cyan"],
  ["p3", "neutral"],
  ["low", "neutral"],
  ["minor", "neutral"],
  ["p4", "neutral"],
  ["trivial", "neutral"],
  ["none", "neutral"],
]);
const PRIORITY_ORDER = [...PRIORITY_SCALE.keys()];

function rank(value) {
  if (DONE_LIKE.test(value)) return STAGE_RANK.length + 1;
  const found = STAGE_RANK.findIndex((re) => re.test(value));
  return found === -1 ? STAGE_RANK.length : found;
}

function orderStages(a, b) {
  return rank(a) - rank(b) || (a < b ? -1 : a > b ? 1 : 0);
}

function stageLike(value) {
  return DONE_LIKE.test(value) || STAGE_RANK.some((re) => re.test(value));
}

function priorityRank(value) {
  const at = PRIORITY_ORDER.indexOf(value.toLowerCase());
  return at === -1 ? PRIORITY_ORDER.length : at;
}

function orderPriorities(a, b) {
  return priorityRank(a) - priorityRank(b) || (a < b ? -1 : a > b ? 1 : 0);
}

/** One odd value among conventional ones is still a conventional facet. Two named values is the
 *  floor, because a single match is a coincidence. */
function mostly(known, values) {
  return known.length >= 2 && known.length * 2 > values.length;
}

/**
 * A facet whose values are mostly one of the two vocabularies is ordered by it, and a priority
 * scale also carries an accent per tier. Anything unrecognised is left neutral and sorts last,
 * so a stranger's own vocabulary is never guessed at.
 */
function conventions(field, values) {
  const facet = { field };

  const scaled = values.filter((value) => PRIORITY_SCALE.has(value.toLowerCase()));
  if (mostly(scaled, values)) {
    facet.order = [...values].sort(orderPriorities);
    facet.colors = {};
    for (const value of facet.order) {
      const accent = PRIORITY_SCALE.get(value.toLowerCase());
      if (accent) facet.colors[value] = accent;
    }
    return facet;
  }

  if (mostly(values.filter(stageLike), values)) facet.order = [...values].sort(orderStages);
  return facet;
}

function gitIgnored(root, paths) {
  return new Promise((resolve) => {
    if (!paths.length) {
      resolve(new Set());
      return;
    }
    const child = execFile(
      "git",
      ["-C", root, "check-ignore", "--stdin"],
      { maxBuffer: 32 * 1024 * 1024 },
      (error, stdout) => {
        if (error && error.code !== 1) {
          resolve(new Set());
          return;
        }
        resolve(new Set(stdout.split("\n").filter(Boolean)));
      }
    );
    child.stdin.on("error", () => {});
    child.stdin.end(`${paths.join("\n")}\n`);
  });
}

function dirOf(path) {
  const cut = path.lastIndexOf("/");
  return cut === -1 ? "" : path.slice(0, cut);
}

/** The directory that holds the lane folders, or the ticket folder on a flat board. */
function commonRoot(paths) {
  if (!paths.length) return "";
  const split = paths.map((path) => path.split("/").slice(0, -1));
  const first = split[0];
  const shared = [];
  for (let i = 0; i < first.length; i += 1) {
    if (split.every((parts) => parts[i] === first[i])) shared.push(first[i]);
    else break;
  }
  return shared.join("/");
}

/** Neither a repo doc nor a lead document is a ticket, so neither carries a directory into
 * the running. Detection is otherwise untouched and keeps guessing at any repo. */
export function looksLikeTicket(path) {
  const name = baseName(path);
  return !DOC_NAMES.has(name.toLowerCase()) && !LEAD_DOCUMENTS.has(name);
}

async function parsingCount(root, files, enough) {
  let count = 0;
  for (const path of files) {
    let text;
    try {
      text = await readFile(join(root, path), "utf8");
    } catch {
      continue;
    }
    if (Object.values(PRESETS).some((preset) => preset.claims(text))) count += 1;
    if (count >= enough) return count;
  }
  return count;
}

async function findCandidates(root) {
  const all = await walk(root);
  const markdown = all.filter((path) => path.toLowerCase().endsWith(".md"));
  const ignored = await gitIgnored(root, markdown);
  const kept = markdown.filter((path) => !ignored.has(path));

  for (const dir of PREFERRED_DIRS) {
    const under = kept.filter((path) => path === dir || path.startsWith(`${dir}/`));
    if (under.some(looksLikeTicket)) return { files: under, base: dir };
  }

  const byDir = new Map();
  for (const path of kept) {
    const dir = dirOf(path);
    if (!byDir.has(dir)) byDir.set(dir, []);
    byDir.get(dir).push(path);
  }
  const sized = [...byDir.entries()].filter(([, files]) => files.length >= MIN_BOARD_FILES);
  if (!sized.length) return { files: [], base: "" };

  const parsing = [];
  for (const entry of sized) {
    if ((await parsingCount(root, entry[1], MIN_BOARD_FILES)) >= MIN_BOARD_FILES) {
      parsing.push(entry);
    }
  }
  // Loose notes never outvote a real ticket directory. With no directory parsing at all,
  // the largest one still carries the "no preset read this" report.
  const boards = parsing.length ? parsing : sized;

  boards.sort((a, b) => b[1].length - a[1].length || (a[0] < b[0] ? -1 : 1));
  const best = boards[0][0];
  const parent = dirOf(best);
  const siblings = boards.filter(([dir]) => dirOf(dir) === parent);
  if (parent && siblings.length > 1) {
    return { files: siblings.flatMap(([, files]) => files), base: parent };
  }
  return { files: boards[0][1], base: best };
}

function baseName(path) {
  return path.slice(path.lastIndexOf("/") + 1);
}

/** The whole tree, or the one repeated file name inside it that carries the tickets. */
function candidateSets(files) {
  const sets = [{ name: null, files }];
  const byName = new Map();
  for (const path of files) {
    const name = baseName(path);
    if (!byName.has(name)) byName.set(name, []);
    byName.get(name).push(path);
  }
  for (const [name, group] of [...byName].sort((a, b) => (a[0] < b[0] ? -1 : 1))) {
    if (group.length >= MIN_BOARD_FILES && group.length < files.length) {
      sets.push({ name, files: group });
    }
  }
  return sets;
}

async function readTexts(root, files) {
  const texts = new Map();
  for (const path of files) {
    try {
      texts.set(path, await readFile(join(root, path), "utf8"));
    } catch {
      /* unreadable files are the scanner's problem, not detection's */
    }
  }
  return texts;
}

/**
 * Preset and candidate set are one choice. A tree of loose notes around a repeated ticket file
 * never reaches a majority as a whole, so the narrower set is tried beside the whole tree, and
 * the winner reads the most files net of the ones it cannot.
 */
function pickFormat(sets, texts) {
  const tried = Object.keys(PRESETS);
  let best = null;
  for (const set of sets) {
    const held = set.files.map((path) => texts.get(path)).filter((text) => text !== undefined);
    if (!held.length) continue;
    for (const name of tried) {
      const hits = held.filter((text) => PRESETS[name].claims(text)).length;
      const net = hits * 2 - held.length;
      if (net <= 0) continue;
      if (!best || net > best.net) best = { format: name, net, set };
    }
  }
  if (!best) return { format: null, tried, set: sets[0], sample: sets[0].files[0] || null };
  return { format: best.format, tried, set: best.set, sample: best.set.files[0] || null };
}

function readFields(texts, format) {
  const preset = PRESETS[format];
  return texts.map(({ path, text }) => {
    try {
      return { path, fields: preset.parse(path, text).fields || {} };
    } catch {
      return { path, fields: {} };
    }
  });
}

function pathLanes(files, base) {
  const dirs = new Set();
  for (const path of files) {
    const rest = base ? path.slice(base.length + 1) : path;
    const cut = rest.indexOf("/");
    if (cut === -1) continue;
    dirs.add(rest.slice(0, cut));
  }
  const names = [...dirs].sort(orderStages);
  if (names.length < 2 || names.length > MAX_LANES) return null;
  return names.map((name) => ({
    name: title(name),
    match: { path: base ? `${base}/${name}/**` : `${name}/**` },
    ...(DONE_LIKE.test(name) ? { collapsed: true } : {}),
  }));
}

function fieldLanes(parsed) {
  let best = null;
  for (const field of distinctFields(parsed)) {
    const seen = new Map();
    let covered = 0;
    let listy = false;
    for (const { fields } of parsed) {
      const value = fields[field];
      if (value === undefined || value === null || value === "") continue;
      if (Array.isArray(value)) listy = true;
      covered += 1;
      for (const one of Array.isArray(value) ? value : [value]) {
        seen.set(String(one), (seen.get(String(one)) || 0) + 1);
      }
    }
    if (listy || seen.size < 2 || seen.size > MAX_LANES) continue;
    const coverage = covered / parsed.length;
    if (coverage < 0.5) continue;
    const named = STATE_FIELD_NAMES.indexOf(field);
    const score = coverage + (named === -1 ? 0 : 1) - named * 0.01;
    if (!best || score > best.score) best = { field, values: [...seen.keys()], score };
  }
  if (!best) return null;
  return best.values.sort(orderStages).map((value) => ({
    name: title(value),
    match: { field: best.field, in: [value] },
    ...(DONE_LIKE.test(value) ? { collapsed: true } : {}),
  }));
}

function distinctFields(parsed) {
  const fields = new Set();
  for (const { fields: held } of parsed) for (const key of Object.keys(held)) fields.add(key);
  return [...fields];
}

/** Tag-like means values repeat. The denominator is occurrences, never ticket count. */
function pickFacets(parsed, laneField) {
  const facets = [];
  for (const field of distinctFields(parsed).sort()) {
    if (field === laneField) continue;
    const seen = new Set();
    let occurrences = 0;
    for (const { fields } of parsed) {
      const value = fields[field];
      if (value === undefined || value === null || value === "") continue;
      for (const one of Array.isArray(value) ? value : [value]) {
        seen.add(String(one));
        occurrences += 1;
      }
    }
    if (!occurrences || seen.size < 2) continue;
    if (seen.size / occurrences < TAG_LIKE_RATIO) facets.push(conventions(field, [...seen]));
  }
  return facets;
}

function title(name) {
  const spaced = name.replace(/[-_]+/g, " ").trim();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

export async function detect(root, options = {}) {
  const report = { root };
  const found = options.tickets
    ? { files: (await walk(root)).filter((p) => matchGlob(p, options.tickets)), base: "" }
    : await findCandidates(root);

  const base = options.tickets ? commonRoot(found.files) : found.base;
  report.base = options.tickets ? "" : found.base;
  report.fileCount = found.files.length;

  if (!found.files.length) {
    report.tickets = options.tickets || null;
    report.format = null;
    return report;
  }

  const texts = await readTexts(root, found.files);
  const sets = options.tickets ? [{ name: null, files: found.files }] : candidateSets(found.files);
  const picked = pickFormat(sets, texts);

  const files = picked.set.files;
  report.fileCount = files.length;
  report.tickets =
    options.tickets ||
    `${base ? `${base}/` : ""}**/${picked.set.name || "*.md"}`;
  report.format = picked.format;
  report.tried = picked.tried;
  report.sample = picked.sample;
  if (!picked.format) return report;

  const parsed = readFields(
    files.map((path) => ({ path, text: texts.get(path) })).filter((one) => one.text !== undefined),
    picked.format
  );

  const fromFolders = pathLanes(files, base);
  const lanes = fromFolders || fieldLanes(parsed);
  report.lanes = lanes || [{ name: "All", match: { path: "**" } }];
  report.laneSource = fromFolders ? "folders" : lanes ? "field" : "none";

  const laneField = lanes && lanes[0] && lanes[0].match.field;
  report.facets = pickFacets(parsed, laneField);
  report.idPattern = parsed.some(({ path }) => /(^|\/)(\d+)[-_]/.test(path))
    ? "^(\\d+)[-_]"
    : undefined;

  return report;
}

export function configFrom(report) {
  const config = {};
  if (report.tickets) config.tickets = report.tickets;
  if (report.format) config.format = report.format;
  if (report.idPattern) config.idPattern = report.idPattern;
  if (report.lanes) config.lanes = report.lanes;
  if (report.facets && report.facets.length) config.facets = report.facets;
  return config;
}

function ask(question, fallback) {
  return new Promise((resolve) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    rl.question(`${question} `, (answer) => {
      rl.close();
      resolve(answer.trim() || fallback);
    });
  });
}

export const interactive = () => process.stdin.isTTY && process.stdout.isTTY;

export async function init(options) {
  const { root, configPath } = resolveRoot(options);
  const warnings = [];
  const { raw, config: existing, readable } = readConfig(configPath, warnings);

  if (!readable) {
    for (const warning of warnings) process.stderr.write(`✗ ${warning.path}: ${warning.reason}\n`);
    process.stderr.write("  Repair it or move it aside, then run init again.\n");
    process.exitCode = 1;
    return;
  }

  const report = await detect(root, options);

  if (!report.format) {
    process.stderr.write(failure(report));
    process.exitCode = 1;
    return;
  }

  const config = withUnknown(raw, { ...configFrom(report), ...existing });
  const prompt = !options.yes && interactive();

  if (prompt) {
    config.tickets = await ask(`Ticket path glob [${config.tickets}]:`, config.tickets);
    config.format = await ask(`Format [${config.format}]:`, config.format);
    const laneNames = (config.lanes || []).map((lane) => lane.name).join(", ");
    process.stdout.write(`  lanes: ${laneNames}\n`);
    const facetNames = (config.facets || []).map((f) => f.field).join(", ") || "none";
    process.stdout.write(`  facets: ${facetNames}\n`);
    const keepFacets = await ask("Keep these facets? [Y/n]:", "y");
    if (/^n/i.test(keepFacets)) config.facets = [];
  }

  // A failed write must not truncate a config holding keys this version cannot rewrite.
  const target = configPath || join(root, CONFIG_NAME);
  const staging = `${target}.writing`;
  await writeFile(staging, `${JSON.stringify(config, null, 2)}\n`, "utf8");
  await rename(staging, target);
  process.stdout.write(`✓ wrote ${CONFIG_NAME}\n`);
}

/** Tickets nobody can read and no tickets at all are two repos, so they read two messages. */
export function failure(report) {
  if (!report.fileCount) return nothing(report);
  return [
    `✗ Could not read ticket metadata in ${report.tickets || "this repo"}`,
    report.sample ? `  Sample: ${report.sample}` : null,
    report.tried ? `  Tried: ${report.tried.join(", ")}` : null,
    "",
    "  An agent can write a reader for this. Run the scratchboard skill,",
    "  or see https://github.com/darecstowell/scratchboard#custom-parsers",
    "",
  ]
    .filter((line) => line !== null)
    .join("\n");
}

function nothing(report) {
  if (report.tickets) {
    return [
      `✗ No file matches ${report.tickets} in ${report.root}`,
      "  A ticket glob is relative to the repo root and uses forward slashes",
      "  on every platform, Windows included.",
      "",
    ].join("\n");
  }
  return [
    `✗ No markdown tickets found in ${report.root}`,
    `  Looked in ${PREFERRED_DIRS.join(", ")}, then in any other directory`,
    `  holding ${MIN_BOARD_FILES} or more markdown files that parse.`,
    "",
    "  Run scratchboard from the repo that holds your tickets, or name them:",
    "    scratchboard init --tickets '<glob>'",
    "",
  ].join("\n");
}
