import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { BACKSLASH_REASON, mergeInvocations, scan } from "../src/scan.mjs";
import { CATCH_ALL } from "../src/config.mjs";

const LANES = fileURLToPath(new URL("./fixtures/lanes", import.meta.url));

const board = (lanes, extra = {}) => ({
  tickets: "tickets/**/issue.md",
  format: "yaml-frontmatter",
  idPattern: "^(\\d+)-",
  facets: [],
  lanes,
  ...extra,
});

const run = (config, root = LANES) => scan({ root, config, version: "0.1.0" });
const titlesIn = (payload, lane) =>
  payload.tickets
    .filter((ticket) => ticket.lane === lane)
    .map((ticket) => ticket.title)
    .sort();

test("lanes are tried in order and the first match wins", async () => {
  const payload = await run(
    board([
      { name: "Everything", match: { path: "tickets/**" } },
      { name: "Todo", match: { path: "tickets/todo/**" } },
    ])
  );
  assert.equal(payload.counts.byLane.Everything, 5);
  assert.equal(payload.counts.byLane.Todo, 0);
  assert.deepEqual(
    payload.lanes.map((lane) => lane.name),
    ["Everything", "Todo"]
  );
});

test("a ticket matching no lane lands in a trailing Unmapped lane and warns by value", async () => {
  const payload = await run(board([{ name: "Ready", match: { field: "status", in: ["ready"] } }]));

  const last = payload.lanes[payload.lanes.length - 1];
  assert.equal(last.name, CATCH_ALL);
  assert.equal(last.ticketIds.length, 3);
  assert.deepEqual(titlesIn(payload, CATCH_ALL), ["Beta", "Delta", "Gamma"]);

  const warning = payload.warnings.find((one) => one.reason.includes("match no lane"));
  assert.ok(warning, "the catch-all lane raises a warning");
  assert.equal(warning.reason, "3 tickets match no lane (Ready, doing, done)");
});

test("no Unmapped lane appears when every ticket is placed", async () => {
  const payload = await run(board([{ name: "All", match: { path: "tickets/**" } }]));
  assert.deepEqual(
    payload.lanes.map((lane) => lane.name),
    ["All"]
  );
  assert.deepEqual(
    payload.warnings.filter((one) => one.reason.includes("match no lane")),
    []
  );
});

test("a list-valued field matches a lane when any element matches", async () => {
  const payload = await run(
    board([
      { name: "Apple", match: { field: "labels", in: ["ios"] } },
      { name: "Rest", match: { path: "tickets/**" } },
    ])
  );
  assert.deepEqual(titlesIn(payload, "Apple"), ["Alpha", "Gamma"]);
});

test("matching is case-sensitive and exact", async () => {
  const sensitive = await run(
    board([
      { name: "Ready", match: { field: "status", in: ["ready"] } },
      { name: "Rest", match: { path: "tickets/**" } },
    ])
  );
  assert.deepEqual(titlesIn(sensitive, "Ready"), ["Alpha", "Loose"]);
  assert.ok(titlesIn(sensitive, "Rest").includes("Beta"));

  const prefix = await run(
    board([
      { name: "Partial", match: { field: "status", in: ["read"] } },
      { name: "Rest", match: { path: "tickets/**" } },
    ])
  );
  assert.equal(prefix.counts.byLane.Partial, 0);

  const substring = await run(
    board([
      { name: "Wide", match: { field: "labels", in: ["io"] } },
      { name: "Rest", match: { path: "tickets/**" } },
    ])
  );
  assert.equal(substring.counts.byLane.Wide, 0);
});

test("ids are strings everywhere, including in lanes[].ticketIds", async () => {
  const payload = await run(board([{ name: "All", match: { path: "tickets/**" } }]));
  for (const ticket of payload.tickets) {
    assert.ok(ticket.id === null || typeof ticket.id === "string", `${ticket.title} id`);
  }
  for (const lane of payload.lanes) {
    for (const id of lane.ticketIds) assert.equal(typeof id, "string");
  }
  const alpha = payload.tickets.find((one) => one.title === "Alpha");
  assert.equal(alpha.id, "1");
  assert.equal(alpha.slug, "alpha");
});

test("a ticket with no id is still placed and still renders", async () => {
  const payload = await run(board([{ name: "All", match: { path: "tickets/**" } }]));
  const loose = payload.tickets.find((one) => one.title === "Loose");

  assert.equal(loose.id, null);
  assert.equal(loose.lane, "All");
  assert.equal(loose.slug, "loose");
  assert.ok(loose.excerpt.length > 0);
  assert.ok(payload.lanes[0].ticketIds.includes(loose.path));
  assert.equal(payload.counts.byLane.All, 5);
});

test("refs resolve to known ids and drop the rest", async () => {
  const payload = await run(board([{ name: "All", match: { path: "tickets/**" } }]));
  const by = (title) => payload.tickets.find((one) => one.title === title);
  assert.deepEqual(by("Alpha").refs, ["3"]);
  assert.deepEqual(by("Delta").refs, ["1"]);
  assert.deepEqual(by("Gamma").refs, []);
});

test("refs are empty when no ticket has an id", async () => {
  const payload = await run(
    board([{ name: "All", match: { path: "tickets/**" } }], { idPattern: undefined })
  );
  for (const ticket of payload.tickets) {
    assert.equal(ticket.id, null);
    assert.deepEqual(ticket.refs, []);
  }
});

function parserTree(source) {
  const root = mkdtempSync(join(tmpdir(), "scratchboard-parser-"));
  mkdirSync(join(root, "tickets", "1-good"), { recursive: true });
  mkdirSync(join(root, "tickets", "2-bad"), { recursive: true });
  writeFileSync(join(root, "tickets", "1-good", "issue.md"), "Good ticket body.\n");
  writeFileSync(join(root, "tickets", "2-bad", "issue.md"), "Bad ticket body.\n");
  writeFileSync(join(root, "reader.mjs"), source);
  return root;
}

test("a parser that throws puts the file in warnings with its path and reason", async () => {
  const root = parserTree(`
    export function parse(path, text) {
      if (path.includes("2-bad")) throw new Error("boom");
      return { id: null, title: "Good", body: text, fields: {} };
    }
  `);
  const payload = await run(
    {
      tickets: "tickets/**/issue.md",
      parser: "reader.mjs",
      lanes: [{ name: "All", match: { path: "tickets/**" } }],
      facets: [],
    },
    root
  );

  assert.equal(payload.counts.total, 1);
  const warning = payload.warnings.find((one) => one.path === "tickets/2-bad/issue.md");
  assert.ok(warning, "the unreadable file is named in warnings");
  assert.match(warning.reason, /boom/);
});

test("a parser returning no title puts the file in warnings rather than dropping it", async () => {
  const root = parserTree(`
    export function parse(path, text) {
      return { id: null, title: "  ", body: text, fields: {} };
    }
  `);
  const payload = await run(
    {
      tickets: "tickets/**/issue.md",
      parser: "reader.mjs",
      lanes: [{ name: "All", match: { path: "tickets/**" } }],
      facets: [],
    },
    root
  );
  assert.equal(payload.counts.total, 0);
  assert.deepEqual(
    payload.warnings.map((one) => one.reason),
    ["no title found", "no title found"]
  );
});

test("a named parser that will not load stops the run rather than falling back to a preset", async () => {
  const root = parserTree("export function parse() { return null; }");
  await assert.rejects(
    run(
      {
        tickets: "tickets/**/issue.md",
        format: "yaml-frontmatter",
        parser: "missing.mjs",
        lanes: [{ name: "All", match: { path: "tickets/**" } }],
        facets: [],
      },
      root
    ),
    /custom parser missing\.mjs did not load/
  );
});

test("a parser module exporting no parse function stops the run", async () => {
  const root = parserTree("export const nothing = true;\n");
  await assert.rejects(
    run(
      {
        tickets: "tickets/**/issue.md",
        parser: "reader.mjs",
        lanes: [{ name: "All", match: { path: "tickets/**" } }],
        facets: [],
      },
      root
    ),
    /exports no parse function/
  );
});

test("the payload names the parser rather than a preset when one is in use", async () => {
  const root = parserTree(`
    export function parse(path, text) {
      return { id: null, title: "Read", body: text, fields: {} };
    }
  `);
  const payload = await run(
    {
      tickets: "tickets/**/issue.md",
      parser: "reader.mjs",
      lanes: [{ name: "All", match: { path: "tickets/**" } }],
      facets: [],
    },
    root
  );
  assert.equal(payload.format, "parser:reader.mjs");
});

test("a glob that matches nothing warns and names the glob it tried", async () => {
  const payload = await run(
    board([{ name: "All", match: { path: "tickets/**" } }], {
      tickets: "does-not-exist/**/*.md",
    })
  );

  assert.equal(payload.counts.total, 0);
  const warning = payload.warnings.find((one) => one.path === "does-not-exist/**/*.md");
  assert.ok(warning, "an empty board says so");
  assert.equal(warning.reason, `no file under ${LANES} matches this ticket glob`);
});

test("a backslash glob is named rather than left to match nothing", async () => {
  const payload = await run(
    board([{ name: "All", match: { path: "tickets\\**" } }], {
      tickets: "tickets\\**\\issue.md",
    })
  );

  const named = payload.warnings
    .filter((one) => one.reason === BACKSLASH_REASON)
    .map((one) => one.path)
    .sort();
  assert.deepEqual(named, ["tickets\\**", "tickets\\**\\issue.md"]);
  assert.match(BACKSLASH_REASON, /forward slashes/);
});

test("a glob that matches files raises neither warning", async () => {
  const payload = await run(board([{ name: "All", match: { path: "tickets/**" } }]));
  assert.equal(payload.counts.total, 5);
  assert.deepEqual(
    payload.warnings.filter((one) => one.reason.includes("ticket glob")),
    []
  );
  assert.deepEqual(payload.warnings.filter((one) => one.reason === BACKSLASH_REASON), []);
});

test("two tickets carrying one id raise a warning naming both paths", async () => {
  const root = mkdtempSync(join(tmpdir(), "scratchboard-dup-"));
  mkdirSync(join(root, "tickets", "todo"), { recursive: true });
  mkdirSync(join(root, "tickets", "done"), { recursive: true });
  const ticket = (title) => `---\ntitle: ${title}\n---\n\nBody.\n`;
  writeFileSync(join(root, "tickets", "todo", "3-ok.md"), ticket("Ok"));
  writeFileSync(join(root, "tickets", "done", "3-stray.md"), ticket("Stray"));
  writeFileSync(join(root, "tickets", "todo", "4-only.md"), ticket("Only"));

  const payload = await run(
    board([{ name: "All", match: { path: "tickets/**" } }], { tickets: "tickets/**/*.md" }),
    root
  );

  const dup = payload.warnings.filter((one) => one.reason.startsWith("id 3 is on"));
  assert.equal(dup.length, 1, "one warning per colliding id");
  assert.match(dup[0].reason, /tickets\/done\/3-stray\.md/);
  assert.match(dup[0].reason, /tickets\/todo\/3-ok\.md/);
  assert.equal(
    payload.warnings.some((one) => one.reason.startsWith("id 4")),
    false,
    "a unique id says nothing"
  );
});

test("the catch-all warning counts in the right number", async () => {
  const one = await run(board([{ name: "Todo", match: { path: "tickets/todo/**" } }]));
  const warning = one.warnings.find((note) => note.reason.includes("no lane"));
  assert.match(warning.reason, /^2 tickets match no lane/);

  const single = await run(
    board([
      { name: "Todo", match: { path: "tickets/todo/**" } },
      { name: "Wip", match: { path: "tickets/wip/**" } },
    ])
  );
  const only = single.warnings.find((note) => note.reason.includes("no lane"));
  assert.match(only.reason, /^1 ticket matches no lane/);
});

const DIALECT = (name) => fileURLToPath(new URL(`./fixtures/dialect/${name}`, import.meta.url));

const dialectBoard = (extra = {}) => ({
  tickets: ".scratch/**/*.md",
  format: "yaml-frontmatter",
  idPattern: "^(\\d+)-",
  facets: [],
  lanes: [{ name: "All", match: { path: ".scratch/**" } }],
  ...extra,
});

const onFixture = (name, extra) =>
  scan({ root: DIALECT(name), config: dialectBoard(extra), version: "0.1.0" });

const fileAt = (group, path) => group.files.find((one) => one.path.endsWith(path));
const reasons = (payload) => payload.warnings.map((one) => one.reason);

test("an effort folder becomes a group and its files leave the ticket lanes", async () => {
  const payload = await onFixture("effort-basic");

  assert.equal(payload.counts.total, 1, "only the backlog ticket is a ticket");
  assert.equal(payload.groups.length, 1);
  const [group] = payload.groups;
  assert.equal(group.kind, "effort");
  assert.equal(group.path, ".scratch/an-effort");
  assert.equal(group.title, "Make the thing legible");
  assert.equal(group.files.length, 6, "the group reports its own count");
  assert.deepEqual(
    payload.tickets.map((one) => one.path),
    [".scratch/1-backlog.md"]
  );
  assert.deepEqual(
    payload.warnings.filter((one) => one.reason.includes("as a group")),
    []
  );
});

test("a role comes from where a file sits, and the lead comes first", async () => {
  const [group] = (await onFixture("effort-basic")).groups;

  assert.deepEqual(
    group.files.map((one) => one.role),
    ["lead", "issue", "issue", "issue", "issue", "other"]
  );
  assert.equal(fileAt(group, "map.md").role, "lead");
  assert.equal(fileAt(group, "issues/01-own-the-spec.md").role, "issue");
  assert.equal(fileAt(group, "research/dag-layout.md").role, "other");
  for (const file of group.files) {
    assert.ok(file.id === null || typeof file.id === "string", `${file.path} id`);
    assert.equal(typeof file.body, "string");
  }
  assert.equal(fileAt(group, "issues/03-draw-the-view.md").id, "03", "the local id survives");
});

test("the lead document splits on its own headings and the index is dropped", async () => {
  const [group] = (await onFixture("effort-basic")).groups;

  assert.deepEqual(Object.keys(group.sections).sort(), [
    "destination",
    "fog",
    "notes",
    "outOfScope",
  ]);
  assert.match(group.sections.destination, /route in one screen/);
  assert.match(group.sections.notes, /read only/);
  assert.match(group.sections.fog, /tab row needs measurement/);
  assert.match(group.sections.outOfScope, /read write board/);
  for (const held of Object.values(group.sections)) {
    assert.doesNotMatch(held, /tracker spec is ours to publish/, "decisions so far is discarded");
  }
});

test("state is derived during the scan and claimed is a flag beside it", async () => {
  const [group] = (await onFixture("effort-basic")).groups;
  const state = (path) => fileAt(group, path).state;

  assert.equal(state("01-own-the-spec.md"), "behind-us");
  assert.equal(state("02-name-the-state.md"), "takeable-now");
  assert.equal(state("03-draw-the-view.md"), "still-blocked");
  assert.equal(state("04-rename-everything.md"), "out-of-scope");

  assert.equal(fileAt(group, "02-name-the-state.md").claimed, true);
  assert.equal(fileAt(group, "01-own-the-spec.md").claimed, false);
  assert.deepEqual(
    group.files.filter((one) => one.role === "issue").map((one) => one.type),
    ["grilling", "research", "prototype", "task"]
  );
});

test("blocking edges are read from the structured line, and none is a real value", async () => {
  const [group] = (await onFixture("effort-basic")).groups;

  assert.deepEqual(fileAt(group, "01-own-the-spec.md").blockedBy, []);
  assert.deepEqual(fileAt(group, "02-name-the-state.md").blockedBy, ["01"]);
  assert.deepEqual(fileAt(group, "03-draw-the-view.md").blockedBy, ["01", "02"]);
  assert.equal("blockedBy" in fileAt(group, "map.md"), false, "a lead carries no edges");
  assert.equal("blockedBy" in fileAt(group, "dag-layout.md"), false, "no edges outside issues");
});

test("a feature group carries a plain ticket list and no wayfinder fields", async () => {
  const payload = await onFixture("feature-basic");
  const [group] = payload.groups;

  assert.equal(group.kind, "feature");
  assert.equal(group.title, "Ship the exporter");
  assert.equal(payload.counts.total, 1);
  for (const file of group.files) {
    for (const key of ["type", "state", "claimed", "blockedBy"]) {
      assert.equal(key in file, false, `${file.path} carries no ${key}`);
    }
  }
  assert.match(fileAt(group, "01-read-the-file.md").title, /Read the file/);
  for (const held of Object.values(group.sections)) assert.equal(held, "");
});

test("a folder holding two lead documents is ambiguous and names both markers", async () => {
  const payload = await onFixture("ambiguous");

  assert.deepEqual(payload.groups, []);
  assert.equal(payload.counts.total, 4, "the files stay ordinary tickets");
  const named = payload.warnings.find((one) => one.path === ".scratch/both");
  assert.ok(named, "the shape it half read is named");
  assert.match(named.reason, /read \.scratch\/both\/ as a group but found 2 lead documents/);
  assert.match(named.reason, /map\.md and spec\.md/);
  assert.match(named.fix, /\/scratchboard/);
});

test("a lead document with no issues folder is half a group", async () => {
  const payload = await onFixture("effort-half-map-only");

  assert.deepEqual(payload.groups, []);
  assert.equal(payload.counts.total, 2);
  const named = payload.warnings.find((one) => one.path === ".scratch/lonely");
  assert.equal(
    named.reason,
    "read .scratch/lonely/ as an effort but found no issues/ folder beside map.md"
  );
  assert.match(named.fix, /issues folder/);
});

test("an issues folder with no lead document is half a group", async () => {
  const payload = await onFixture("effort-half-issues-only");

  assert.deepEqual(payload.groups, []);
  assert.equal(payload.counts.total, 3, "a board never quietly loses a file");
  const named = payload.warnings.find((one) => one.path === ".scratch/a-feature");
  assert.match(named.reason, /found no lead document beside issues\//);
  assert.match(named.fix, /map\.md for an effort or spec\.md for a feature/);
});

test("every diagnostic hands over a plain sentence and never the config writing command", async () => {
  for (const name of ["ambiguous", "effort-half-map-only", "effort-half-issues-only"]) {
    const payload = await onFixture(name);
    const held = payload.warnings.filter((one) => one.fix);
    assert.ok(held.length, `${name} raises a diagnostic`);
    for (const one of held) {
      assert.match(one.fix, /scratchboard\.json|context map/, `${name} names the fix`);
      assert.doesNotMatch(one.fix, /init/, `${name} never hands over init`);
      assert.ok(one.path, `${name} names the path`);
    }
  }
});

test("ids scope to the group, so a collision inside one warns and one across does not", async () => {
  const payload = await onFixture("duplicate-ids");

  assert.equal(payload.counts.total, 1);
  const inside = payload.warnings.filter((one) => one.reason.startsWith("id 03 is on"));
  assert.equal(inside.length, 1);
  assert.match(inside[0].reason, /2 files in \.scratch\/an-effort/);
  assert.match(inside[0].reason, /issues\/03-one\.md/);
  assert.match(inside[0].reason, /issues\/03-two\.md/);
  assert.equal(
    payload.warnings.some((one) => one.reason.includes("03-backlog.md")),
    false,
    "the backlog ticket numbered 03 no longer collides"
  );
});

test("a repo with none of this carries an empty groups list and no diagnostic", async () => {
  const payload = await onFixture("root-clean");

  assert.deepEqual(payload.groups, []);
  assert.deepEqual(payload.invocations, []);
  assert.equal(payload.counts.total, 3);
  assert.deepEqual(payload.warnings.filter((one) => one.fix), []);
  assert.deepEqual(reasons(payload), []);
});

test("a glossary and its decision log are found by fixed path, newest first", async () => {
  const payload = await onFixture("context-single");

  assert.equal(payload.counts.total, 1, "the ticket glob is untouched");
  assert.equal(payload.groups.length, 1);
  const [group] = payload.groups;
  assert.equal(group.kind, "context");
  assert.equal(group.path, ".");
  assert.equal(group.title, "Ordering");
  assert.deepEqual(
    group.files.map((one) => one.path),
    ["CONTEXT.md", "docs/adr/0002-one-database.md", "docs/adr/0001-use-events.md"]
  );
  assert.deepEqual(
    group.files.map((one) => one.role),
    ["lead", "other", "other"]
  );
});

test("the context read is switched off by config", async () => {
  const payload = await onFixture("context-single", { documents: { context: false } });
  assert.deepEqual(payload.groups, []);
});

test("a context map gives each context a group of its own", async () => {
  const payload = await onFixture("context-multi");

  assert.deepEqual(
    payload.groups.map((one) => [one.kind, one.path, one.title]),
    [
      ["context", "src/billing", "Billing"],
      ["context", "src/ordering", "Ordering"],
    ]
  );
  for (const group of payload.groups) assert.equal(group.files.length, 2);
  assert.equal(payload.counts.total, 1);
});

test("a context link that leaves the repository root is refused and named", async () => {
  const payload = await onFixture("context-escape");

  assert.deepEqual(
    payload.groups.map((one) => one.path),
    ["src/ok"],
    "the one link that resolves inside the root still renders"
  );
  const refused = payload.warnings
    .filter((one) => one.reason.includes("is refused"))
    .map((one) => one.reason);
  for (const attack of [
    "../CONTEXT.md",
    "../../../../etc/CONTEXT.md",
    "/etc/CONTEXT.md",
    "%2e%2e%2f%2e%2e%2fCONTEXT.md",
    "https://example.invalid/CONTEXT.md",
    "./src/ok/secrets.md",
  ]) {
    assert.ok(
      refused.some((one) => one.includes(attack)),
      `${attack} is refused and named`
    );
  }
  const gone = payload.warnings.find((one) => one.reason.includes("resolves to nothing"));
  assert.match(gone.reason, /src\/gone\/CONTEXT\.md/);
  assert.match(gone.fix, /CONTEXT\.md that exists/);
});

test("a context link through a symbolic link out of the root is refused", async () => {
  const parent = mkdtempSync(join(tmpdir(), "scratchboard-escape-"));
  const root = join(parent, "repo");
  const outside = join(parent, "outside");
  mkdirSync(join(root, ".scratch"), { recursive: true });
  mkdirSync(outside, { recursive: true });
  writeFileSync(join(outside, "CONTEXT.md"), "# Somebody else\n\nSecrets.\n");
  writeFileSync(join(root, ".scratch", "1-a.md"), "---\ntitle: A\n---\n\nBody.\n");
  writeFileSync(
    join(root, "CONTEXT-MAP.md"),
    "# Context Map\n\n## Contexts\n\n- [Away](./away/CONTEXT.md): out of the repo\n"
  );
  symlinkSync(outside, join(root, "away"), "dir");

  const payload = await scan({ root, config: dialectBoard(), version: "0.1.0" });

  assert.deepEqual(payload.groups, [], "nothing outside the root enters the payload");
  const refused = payload.warnings.find((one) => one.reason.includes("is refused"));
  assert.match(refused.reason, /away\/CONTEXT\.md/);
  assert.equal(refused.path, "CONTEXT-MAP.md");
});

/** Every attack below is built here rather than committed, because a symbolic link that
 *  escapes the repository has no business inside it. */
function escapeRepo(name) {
  const parent = mkdtempSync(join(tmpdir(), `scratchboard-${name}-`));
  const root = join(parent, "repo");
  const outside = join(parent, "outside");
  mkdirSync(join(root, ".scratch"), { recursive: true });
  mkdirSync(outside, { recursive: true });
  writeFileSync(join(root, ".scratch", "1-a.md"), "---\ntitle: A\n---\n\nBody.\n");
  return { root, outside };
}

const bodies = (payload) =>
  payload.groups.flatMap((group) => group.files.map((file) => file.body)).join("\n");

test("a decision directory that is a symbolic link out of the root is refused", async () => {
  const { root, outside } = escapeRepo("adr-escape");
  mkdirSync(join(outside, "adr"), { recursive: true });
  writeFileSync(
    join(outside, "adr", "0001-secret.md"),
    "# Secret note\n\nprivate content outside the repo\n"
  );
  writeFileSync(join(root, "CONTEXT.md"), "# Ours\n\nOur words.\n");
  mkdirSync(join(root, "docs"), { recursive: true });
  symlinkSync(join(outside, "adr"), join(root, "docs", "adr"), "dir");

  const payload = await scan({ root, config: dialectBoard(), version: "0.1.0" });

  assert.deepEqual(
    payload.groups.map((one) => one.files.map((file) => file.path)),
    [["CONTEXT.md"]],
    "the glossary still renders and the decision log does not"
  );
  assert.equal(bodies(payload).includes("private content"), false);
  const refused = payload.warnings.find((one) => one.reason.includes("is refused"));
  assert.equal(refused.path, "docs/adr");
  assert.match(refused.reason, /docs\/adr resolves outside the repository root/);
});

test("a glossary that is a symbolic link out of the root is refused", async () => {
  const { root, outside } = escapeRepo("lead-escape");
  writeFileSync(join(outside, "CONTEXT.md"), "# Somebody else\n\nprivate content outside the repo\n");
  symlinkSync(join(outside, "CONTEXT.md"), join(root, "CONTEXT.md"), "file");

  const payload = await scan({ root, config: dialectBoard(), version: "0.1.0" });

  assert.deepEqual(payload.groups, [], "nothing outside the root enters the payload");
  const refused = payload.warnings.find((one) => one.reason.includes("is refused"));
  assert.equal(refused.path, "CONTEXT.md");
});

test("a context map that is a symbolic link out of the root is refused", async () => {
  const { root, outside } = escapeRepo("map-escape");
  mkdirSync(join(outside, "src"), { recursive: true });
  writeFileSync(
    join(outside, "CONTEXT-MAP.md"),
    "# Context Map\n\n## Contexts\n\n- [Away](./src/CONTEXT.md): theirs\n"
  );
  writeFileSync(join(outside, "src", "CONTEXT.md"), "# Theirs\n\nprivate content outside the repo\n");
  symlinkSync(join(outside, "CONTEXT-MAP.md"), join(root, "CONTEXT-MAP.md"), "file");

  const payload = await scan({ root, config: dialectBoard(), version: "0.1.0" });

  assert.deepEqual(payload.groups, [], "no context is read through the refused map");
  assert.equal(bodies(payload).includes("private content"), false);
  const refused = payload.warnings.find((one) => one.reason.includes("is refused"));
  assert.equal(refused.path, "CONTEXT-MAP.md");
});

test("groups reclassifies a folder the heuristic missed and opts one out", async () => {
  const payload = await onFixture("groups-override", {
    groups: [
      { path: ".scratch/plain", kind: "effort" },
      { path: ".scratch/real", kind: "none" },
    ],
  });

  assert.deepEqual(
    payload.groups.map((one) => [one.kind, one.path]),
    [["effort", ".scratch/plain"]]
  );
  assert.deepEqual(
    payload.groups[0].files.map((one) => one.role),
    ["other", "other"]
  );
  for (const held of Object.values(payload.groups[0].sections)) assert.equal(held, "");
  assert.equal(payload.counts.total, 3, "the folder opted out keeps its files as tickets");
  assert.deepEqual(payload.warnings.filter((one) => one.fix), []);
});

test("a groups path the ticket glob never reaches warns rather than extending the walk", async () => {
  const payload = await onFixture("root-clean", {
    groups: [{ path: ".scratch/nowhere", kind: "effort" }],
  });

  assert.deepEqual(payload.groups, []);
  assert.deepEqual(payload.warnings, [
    { path: ".scratch/nowhere", reason: "the ticket glob reaches no file under this path" },
  ]);
});

test("declared invocations are additive, override by name, and carry an opt-out", async () => {
  const payload = await onFixture("root-clean", {
    invocations: [
      { name: "grilling", template: "/grilling {path}" },
      { name: "wayfinder", template: "/wayfinder {path}" },
      { name: "grilling", template: "/grill {path}" },
      { name: "wayfinder", template: null },
    ],
  });

  assert.deepEqual(payload.invocations, [{ name: "grilling", template: "/grill {path}" }]);
});

test("the merge keeps declaration order and drops nothing it was not asked to", () => {
  assert.deepEqual(mergeInvocations(undefined), []);
  assert.deepEqual(mergeInvocations([{ name: "a", template: null }]), []);
  assert.deepEqual(
    mergeInvocations([
      { name: "a", template: "/a {path}" },
      { name: "b", template: "/b {path}" },
    ]),
    [
      { name: "a", template: "/a {path}" },
      { name: "b", template: "/b {path}" },
    ]
  );
});

test("an issues folder that is the board itself is not half a group", async () => {
  const root = mkdtempSync(join(tmpdir(), "scratchboard-issues-"));
  mkdirSync(join(root, "docs", "issues"), { recursive: true });
  mkdirSync(join(root, "issues"), { recursive: true });
  const ticket = (title) => `---\ntitle: ${title}\n---\n\nBody.\n`;
  writeFileSync(join(root, "docs", "issues", "1-a.md"), ticket("A"));
  writeFileSync(join(root, "docs", "issues", "2-b.md"), ticket("B"));
  writeFileSync(join(root, "issues", "1-c.md"), ticket("C"));

  for (const glob of ["docs/issues/*.md", "issues/*.md"]) {
    const payload = await scan({
      root,
      config: dialectBoard({ tickets: glob, lanes: [{ name: "All", match: { path: "**" } }] }),
      version: "0.1.0",
    });
    assert.deepEqual(payload.groups, [], `${glob} names no group`);
    assert.deepEqual(reasons(payload), [], `${glob} raises no diagnostic`);
  }
});
