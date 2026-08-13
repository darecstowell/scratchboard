import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { BACKSLASH_REASON, scan } from "../src/scan.mjs";
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
