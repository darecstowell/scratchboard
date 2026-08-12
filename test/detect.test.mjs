import { test } from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { detect, failure, looksLikeTicket } from "../src/detect.mjs";

const fixture = (name) => fileURLToPath(new URL(`./fixtures/${name}`, import.meta.url));
const laneNames = (report) => report.lanes.map((lane) => lane.name);
const facetFields = (report) => report.facets.map((facet) => facet.field);

test("two to six ticket folders become path lanes, with done-like names last and collapsed", async () => {
  const report = await detect(fixture("detect-folders"));

  assert.equal(report.laneSource, "folders");
  assert.deepEqual(laneNames(report), ["Todo", "Doing", "Done"]);
  assert.deepEqual(report.lanes[0].match, { path: "tasks/todo/**" });
  assert.equal(report.lanes[0].collapsed, undefined);
  assert.equal(report.lanes[1].collapsed, undefined);
  assert.equal(report.lanes[2].collapsed, true);
});

test("the ticket file name is found among the notes beside it", async () => {
  const report = await detect(fixture("detect-folders"));
  assert.equal(report.tickets, "tasks/**/issue.md");
  assert.equal(report.fileCount, 5);
  assert.equal(report.format, "yaml-frontmatter");
});

test("one ticket directory gives one lane named All", async () => {
  const report = await detect(fixture("detect-one-dir"));
  assert.deepEqual(laneNames(report), ["All"]);
  assert.deepEqual(report.lanes[0].match, { path: "**" });
});

test("more than six ticket directories gives one lane named All", async () => {
  const report = await detect(fixture("detect-many-dirs"));
  assert.equal(report.fileCount, 7);
  assert.deepEqual(laneNames(report), ["All"]);
});

test("a flat board takes its lanes from a field instead", async () => {
  const report = await detect(fixture("detect-field"));

  assert.equal(report.laneSource, "field");
  assert.deepEqual(laneNames(report), ["Todo", "Doing", "Done"]);
  for (const lane of report.lanes) assert.equal(lane.match.field, "status");
  assert.deepEqual(report.lanes[2].match.in, ["done"]);
  assert.equal(report.lanes[2].collapsed, true);
});

test("the lane field is not also a facet", async () => {
  const report = await detect(fixture("detect-field"));
  assert.deepEqual(facetFields(report), ["labels"]);
});

test("a field is tag-like when its values repeat, and free text is not", async () => {
  const report = await detect(fixture("detect-folders"));
  assert.deepEqual(facetFields(report), ["labels", "status"]);
  assert.equal(facetFields(report).includes("source"), false);
});

test("the tag-like denominator is value occurrences, not ticket count", async () => {
  const report = await detect(fixture("detect-folders"));

  // The same numbers the rule sees: four distinct labels over eleven label occurrences.
  const tickets = report.fileCount;
  const distinct = 4;
  const occurrences = 11;
  assert.ok(distinct / tickets >= 0.5, "a ticket-count denominator would reject labels");
  assert.ok(distinct / occurrences < 0.5, "an occurrence denominator keeps labels");
  assert.ok(facetFields(report).includes("labels"));
});

test("the preset with the majority of claims wins", async () => {
  const yaml = await detect(fixture("detect-field"));
  assert.equal(yaml.format, "yaml-frontmatter");

  const kv = await detect(fixture("detect-kv"));
  assert.equal(kv.format, "key-value-block");
  assert.deepEqual(kv.tried, ["yaml-frontmatter", "key-value-block"]);
});

test("detection fails when no preset claims a majority", async () => {
  const report = await detect(fixture("detect-none"));

  assert.equal(report.format, null);
  assert.equal(report.lanes, undefined);
  assert.deepEqual(report.tried, ["yaml-frontmatter", "key-value-block"]);
  assert.ok(report.sample.endsWith(".md"));

  const message = failure(report);
  assert.match(message, /Could not read ticket metadata in tasks/);
  assert.match(message, /Tried: yaml-frontmatter, key-value-block/);
  assert.match(message, /scratchboard/);
});

test("an explicit ticket glob skips the candidate search", async () => {
  const report = await detect(fixture("detect-folders"), { tickets: "tasks/**/plan.md" });
  assert.equal(report.tickets, "tasks/**/plan.md");
  assert.equal(report.fileCount, 5);
  assert.equal(report.format, null);
});

const TICKET = (title, status) =>
  `---\ntitle: ${title}\nstatus: ${status}\nlabels: [alpha, beta]\n---\n\nBody.\n`;

async function tree(t, files) {
  const root = await mkdtemp(join(tmpdir(), "sb-detect-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  for (const [path, text] of Object.entries(files)) {
    await mkdir(join(root, dirname(path)), { recursive: true });
    await writeFile(join(root, path), text);
  }
  return root;
}

test("a repo with no tickets reads differently from one whose format no preset knows", async (t) => {
  const root = await tree(t, { "notes.txt": "not markdown\n" });
  const report = await detect(root);

  assert.equal(report.fileCount, 0);
  assert.equal(report.format, null);

  const message = failure(report);
  assert.match(message, /No markdown tickets found/);
  assert.ok(message.includes(root), "the message names the root it searched");
  assert.ok(message.includes(".scratch, .tickets, docs/issues, issues, tasks"));
  assert.equal(
    message.includes("An agent can write a reader"),
    false,
    "a repo with no tickets is never told to write a parser"
  );
});

test("an explicit glob that matches nothing names the glob and the slash rule", async (t) => {
  const root = await tree(t, { "tasks/1-a.md": TICKET("A", "todo") });
  const report = await detect(root, { tickets: "tasks\\**\\*.md" });

  assert.equal(report.fileCount, 0);
  const message = failure(report);
  assert.ok(message.includes("tasks\\**\\*.md"));
  assert.match(message, /forward slashes/);
  assert.equal(message.includes("An agent can write a reader"), false);
});

test("the fallback takes the directory whose markdown parses, not the larger pile of notes", async (t) => {
  const loose = { "notes/a.md": "# A\n", "notes/b.md": "# B\n", "notes/c.md": "# C\n", "notes/d.md": "# D\n" };
  const root = await tree(t, {
    ...loose,
    "work/1-a.md": TICKET("A", "todo"),
    "work/2-b.md": TICKET("B", "todo"),
    "work/3-c.md": TICKET("C", "done"),
  });

  const report = await detect(root);
  assert.equal(report.tickets, "work/**/*.md");
  assert.equal(report.format, "yaml-frontmatter");
});

test("a directory nothing parses still reports the files and the presets it tried", async (t) => {
  const root = await tree(t, {
    "notes/a.md": "# A\n",
    "notes/b.md": "# B\n",
    "notes/c.md": "# C\n",
  });

  const report = await detect(root);
  assert.equal(report.fileCount, 3);
  assert.equal(report.format, null);
  assert.match(failure(report), /Could not read ticket metadata in notes/);
});

test("a preferred directory holding only a repo doc does not outrank a real board", async (t) => {
  const root = await tree(t, {
    "issues/README.md": "# How we file issues\n",
    "tasks/1-a.md": TICKET("A", "todo"),
    "tasks/2-b.md": TICKET("B", "todo"),
    "tasks/3-c.md": TICKET("C", "done"),
  });

  const report = await detect(root);
  assert.equal(report.tickets, "tasks/**/*.md");
  assert.equal(report.format, "yaml-frontmatter");
  assert.equal(looksLikeTicket("issues/README.md"), false);
  assert.equal(looksLikeTicket("tasks/1-a.md"), true);
});
