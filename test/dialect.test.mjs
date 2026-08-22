import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { test } from "./context.mjs";
import { detect, configFrom } from "../src/detect.mjs";
import { scan } from "../src/scan.mjs";
import { GROUP_KINDS, PATH_TOKEN } from "../src/config.mjs";
import {
  CONTEXTS_HEADING,
  CONTEXT_LEAD,
  CONTEXT_MAP,
  DECISIONS_DIR,
  DECISION_STATUS,
  ISSUES_DIR,
  ISSUE_STATUSES,
  LEAD_DOCUMENTS,
  NO_BLOCKERS,
  ROLES,
  SECTIONS,
  SECTION_KEYS,
  SKILL,
  STATES,
  TICKET_TYPES,
  contextLinks,
  readIssueFields,
  splitSections,
  statusOf,
} from "../src/dialect.mjs";

const at = (path) => fileURLToPath(new URL(path, import.meta.url));
const read = (path) => readFileSync(at(path), "utf8");

const SPEC = read("../docs/local-markdown-spec.md");
const README = read("../README.md");
const TRIAGE = read("../docs/agents/triage-labels.md");

const HEADING = /^(#{1,6})\s+(.*?)\s*$/;
const plain = (text) => text.replace(/`/g, "").trim();

/** The document is the spec, so it is read as text. The module is read through its exports.
 *  Nothing here trusts one to describe the other. */
function section(source, name) {
  const lines = source.split("\n");
  let depth = 0;
  const held = [];
  for (const line of lines) {
    const heading = HEADING.exec(line);
    if (heading && depth) {
      if (heading[1].length <= depth) break;
      held.push(line);
      continue;
    }
    if (heading && plain(heading[2]).toLowerCase() === name.toLowerCase()) {
      depth = heading[1].length;
      continue;
    }
    if (depth) held.push(line);
  }
  assert.ok(depth, `the spec carries a "${name}" heading`);
  return held.join("\n");
}

function tables(source) {
  const found = [];
  let rows = null;
  for (const line of source.split("\n")) {
    if (!line.trim().startsWith("|")) {
      if (rows) found.push(rows);
      rows = null;
      continue;
    }
    const cells = line.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map((cell) => cell.trim());
    if (cells.every((cell) => /^:?-{3,}:?$/.test(cell))) continue;
    if (!rows) {
      rows = [];
      continue;
    }
    rows.push(cells);
  }
  if (rows) found.push(rows);
  return found;
}

function rowsUnder(name) {
  const found = tables(section(SPEC, name));
  assert.equal(found.length, 1, `"${name}" carries exactly one table`);
  return found[0];
}

const codes = (cell) => [...cell.matchAll(/`([^`]+)`/g)].map((hit) => hit[1]);

function column(name, index) {
  return rowsUnder(name).map((row) => {
    const held = codes(row[index]);
    assert.equal(held.length, 1, `${name} row "${row[0]}" names one value in column ${index}`);
    return held[0];
  });
}

const sorted = (values) => [...values].sort();

test("every lead document and every kind the module knows is in the spec", () => {
  assert.deepEqual(sorted(column("Lead documents", 0)), sorted(LEAD_DOCUMENTS.keys()));
  assert.deepEqual(sorted(column("Lead documents", 1)), sorted(LEAD_DOCUMENTS.values()));
});

test("every fixed name the module reads by is in the spec", () => {
  const named = column("Fixed names", 0).map((name) => name.replace(/\/$/, ""));
  assert.deepEqual(sorted(named), sorted([ISSUES_DIR, CONTEXT_LEAD, CONTEXT_MAP, DECISIONS_DIR]));
});

test("the map's headings and their payload keys are the ones the module splits on", () => {
  const headings = column("The map's sections", 0);
  assert.deepEqual(headings, [...SECTIONS.keys()]);

  const keys = rowsUnder("The map's sections").flatMap((row) => codes(row[1]));
  assert.deepEqual(keys, SECTION_KEYS);

  const document = headings.map((heading) => `## ${heading}\n\n${heading} body\n`).join("\n");
  const split = splitSections(document);
  for (const key of SECTION_KEYS) assert.match(split[key], /body/, `${key} is filled`);
  const dropped = headings.filter((heading) => !SECTIONS.get(heading));
  for (const heading of dropped) {
    assert.equal(
      Object.values(split).some((held) => held.includes(heading)),
      false,
      `${heading} is read and dropped`
    );
  }
});

test("the structured lines the spec names are the lines the module reads", () => {
  const labels = column("An issue's structured lines", 0);
  assert.equal(
    Object.keys(readIssueFields("")).length,
    labels.length,
    "the module reads exactly the lines the table holds"
  );

  const body = [
    "# 01. A ticket",
    "",
    ...labels.map((label) => `${label} ${label === "Blocked by:" ? "07, 08" : "task"}`),
    "",
    "## Question",
  ].join("\n");
  const fields = readIssueFields(body.replace("Status: task", "Status: claimed"));
  assert.equal(fields.type, "task");
  assert.equal(fields.status, "claimed");
  assert.deepEqual(fields.blockedBy, ["07", "08"]);
});

test("the decision record field the spec names is the field the module reads", () => {
  assert.deepEqual(column("A decision record's status", 0), [DECISION_STATUS]);
  assert.deepEqual(
    rowsUnder("A decision record's status").flatMap((row) => codes(row[1])),
    ["status"]
  );

  assert.equal(statusOf(`---\n${DECISION_STATUS}: accepted\n---\n\n# A record\n`), "accepted");
  assert.equal(statusOf("# A record\n\nNo frontmatter at all.\n"), null);
});

test("the context map heading the spec names is the one the module follows", () => {
  assert.deepEqual(column("The context map", 0), [CONTEXTS_HEADING]);

  const map = `# Context Map\n\n## ${CONTEXTS_HEADING}\n\n- [Ordering](./src/ordering/${CONTEXT_LEAD})\n`;
  assert.deepEqual(contextLinks(map), [
    { title: "Ordering", target: `./src/ordering/${CONTEXT_LEAD}` },
  ]);
});

test("every value vocabulary in the module is documented, and the spec invents none", () => {
  assert.deepEqual(sorted(column("Ticket types", 0)), sorted(TICKET_TYPES));
  assert.deepEqual(sorted(column("Issue statuses", 0)), sorted(ISSUE_STATUSES));
  assert.deepEqual(sorted(column("Derived states", 0)), sorted(STATES));
  assert.deepEqual(sorted(column("Roles", 0)), sorted(ROLES));
  assert.deepEqual(column("Blocked by", 0), [NO_BLOCKERS]);
  assert.deepEqual(sorted(column("groups", 0)), sorted(GROUP_KINDS));
});

test("nothing under the recognized values slot is a value the code does not know", () => {
  const known = new Set([
    ...TICKET_TYPES,
    ...ISSUE_STATUSES,
    ...STATES,
    ...triageRoles(),
    NO_BLOCKERS,
  ]);
  const slot = section(SPEC, "3. Which values are recognized");
  for (const rows of tables(slot)) {
    for (const row of rows) {
      for (const value of codes(row[0])) {
        assert.ok(known.has(value), `the spec names ${value}, which nothing recognizes`);
      }
    }
  }
});

function triageRoles() {
  const rows = tables(TRIAGE)[0];
  return rows.map((row) => codes(row[1])[0]).filter(Boolean);
}

test("the triage roles the spec lists are the strings the label document holds", () => {
  assert.deepEqual(sorted(column("Triage statuses", 0)), sorted(triageRoles()));
  assert.equal(
    column("Triage statuses", 0).includes("deferred"),
    false,
    "deferred is this repo's own value and outside the published spec"
  );
});

test("exactly two values are marked as scratchboard's own rather than upstream's", () => {
  const own = [];
  for (const rows of tables(SPEC)) {
    for (const row of rows) {
      if (row[row.length - 1] === "scratchboard") own.push(codes(row[0])[0]);
    }
  }
  assert.deepEqual(sorted(own), ["done", "out-of-scope"]);
});

test("the spec names the skill and the invocation token the code hands out", () => {
  assert.ok(SPEC.includes(SKILL), `the spec names ${SKILL}`);
  assert.ok(SPEC.includes(PATH_TOKEN), `the spec names ${PATH_TOKEN}`);
});

test("the badge and the spec name one version, read from one place", () => {
  const declared = section(SPEC, "The version this reads").match(/```\n([^\n]+)\n```/);
  assert.ok(declared, "the spec declares the badge string in one fenced line");
  const badge = declared[1];
  assert.match(badge, /^supports mattpocock\/skills v\d+\.\d+\.x$/);

  const [label, ...rest] = badge.split(" ");
  const message = rest.join(" ").replace(/\//g, "%2F").replace(/ /g, "%20");
  assert.ok(README.includes(`alt="${badge}"`), `the README badge reads ${badge}`);
  assert.ok(README.includes(`badge/${label}-${message}-`), "the badge image names that version");
});

test("a blocker outside the group stays blocked with no edge, which the spec names as a hole", async () => {
  const root = at("./fixtures/dialect/blocker-outside");
  const config = {
    tickets: ".scratch/**/*.md",
    format: "key-value-block",
    idPattern: "^(\\d+)-",
    facets: [],
    lanes: [{ name: "All", match: { path: ".scratch/**" } }],
  };
  const payload = await scan({ root, config, version: "0.0.0" });

  const [group] = payload.groups;
  const issue = group.files.find((one) => one.role === "issue");
  assert.equal(issue.state, "still-blocked");
  assert.deepEqual(issue.blockedBy, ["99"]);
  assert.equal(
    group.files.some((one) => one.id === "99"),
    false,
    "the blocker is no card in any column, so no edge can reach it"
  );
  assert.ok(
    payload.warnings.some((one) => one.reason.includes("names blocker 99")),
    "the warning is the only place the reason appears"
  );

  assert.match(section(SPEC, "What this spec does not decide"), /outside the group/);
});

test("the spec keeps its four slots, in order", () => {
  const slots = [...SPEC.matchAll(/^## (\d)\. (.*)$/gm)].map((hit) => `${hit[1]}. ${hit[2]}`);
  assert.deepEqual(slots, [
    "1. Where files live",
    "2. Which fields are read",
    "3. Which values are recognized",
    "4. What happens to input that is not recognized",
  ]);
});

/** The badge claims every upstream file shape renders with no config, so the fixtures run the
 *  zero-config path: detection proposes the whole config and nothing is hand written. */
async function zeroConfig(name) {
  const root = at(`./fixtures/upstream/${name}`);
  const report = await detect(root);
  const config = configFrom(report);
  config.title = name;
  if (!config.facets) config.facets = [];
  return scan({ root, config, version: "0.0.0" });
}

const fileAt = (group, path) => group.files.find((one) => one.path.endsWith(path));

test("a wayfinder effort renders with no config", async () => {
  const payload = await zeroConfig("wayfinder-effort");

  assert.deepEqual(payload.warnings, []);
  assert.equal(payload.counts.total, 3, "the backlog stays on the lanes");
  assert.equal(payload.groups.length, 1);
  const [group] = payload.groups;
  assert.equal(group.kind, "effort");
  assert.equal(group.path, ".scratch/chart-the-route");
  assert.equal(group.title, "Chart the route to a shared exporter");
  assert.deepEqual(
    group.files.map((one) => one.role),
    ["lead", "issue", "issue", "issue", "issue"]
  );
  assert.deepEqual(
    group.files.filter((one) => one.role === "issue").map((one) => one.type),
    ["grilling", "research", "prototype", "task"]
  );
  assert.deepEqual(
    group.files.filter((one) => one.role === "issue").map((one) => one.state),
    ["behind-us", "takeable-now", "still-blocked", "out-of-scope"]
  );
  for (const file of group.files) {
    assert.equal("status" in file, false, `${file.path} carries no status`);
  }
  assert.equal(fileAt(group, "02-read-the-api.md").claimed, true);
  assert.deepEqual(fileAt(group, "03-sketch-the-view.md").blockedBy, ["01", "02"]);
  assert.deepEqual(fileAt(group, "01-name-the-destination.md").blockedBy, []);
  for (const key of SECTION_KEYS) assert.ok(group.sections[key], `${key} is read from the map`);
});

test("a to-tickets feature renders with no config", async () => {
  const payload = await zeroConfig("to-tickets-feature");

  assert.deepEqual(payload.warnings, []);
  assert.equal(payload.counts.total, 3);
  assert.equal(payload.groups.length, 1);
  const [group] = payload.groups;
  assert.equal(group.kind, "feature");
  assert.equal(group.title, "CSV exporter");
  assert.equal(group.files.length, 4);
  for (const file of group.files) {
    for (const key of ["type", "state", "claimed", "blockedBy", "status"]) {
      assert.equal(key in file, false, `${file.path} carries no ${key}`);
    }
    assert.ok(file.title.trim(), `${file.path} has a title`);
  }
  for (const key of SECTION_KEYS) assert.equal(group.sections[key], "", `${key} is empty`);
});

test("a single context repo renders with no config", async () => {
  const payload = await zeroConfig("domain-single");

  assert.deepEqual(payload.warnings, []);
  assert.equal(payload.counts.total, 3);
  assert.equal(payload.groups.length, 1);
  const [group] = payload.groups;
  assert.equal(group.kind, "context");
  assert.equal(group.path, ".");
  assert.equal(group.title, "Ordering");
  assert.deepEqual(
    group.files.map((one) => one.path),
    [
      CONTEXT_LEAD,
      `${DECISIONS_DIR}/0002-baskets-expire-after-a-day.md`,
      `${DECISIONS_DIR}/0001-orders-are-event-sourced.md`,
    ]
  );
  assert.deepEqual(
    group.files.map((one) => one.status),
    [null, "accepted", null],
    "the badge reads a real record's own frontmatter"
  );
});

test("a multi context repo renders with no config", async () => {
  const payload = await zeroConfig("domain-multi");

  assert.deepEqual(payload.warnings, []);
  assert.equal(payload.counts.total, 3);
  assert.deepEqual(
    payload.groups.map((group) => [group.kind, group.path, group.title]),
    [
      ["context", "src/billing", "Billing"],
      ["context", "src/ordering", "Ordering"],
    ]
  );
  for (const group of payload.groups) {
    assert.equal(group.files.length, 2, `${group.path} carries its lead and one decision`);
    assert.equal(group.files[0].path, `${group.path}/${CONTEXT_LEAD}`);
  }
});

test("a plain triage backlog renders with no config and no group", async () => {
  const payload = await zeroConfig("triage-backlog");

  assert.deepEqual(payload.warnings, []);
  assert.deepEqual(payload.groups, []);
  assert.equal(payload.counts.total, 6);
  assert.deepEqual(
    sorted(payload.tickets.map((one) => one.fields.status)),
    sorted(triageRoles()),
    "every triage role the spec lists reaches a lane"
  );
  assert.equal(payload.counts.byLane.Unmapped, undefined, "detection places every role");
});
