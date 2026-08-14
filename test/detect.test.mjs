import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { test } from "./context.mjs";
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

test("a whole tree with more claims still loses to the ticket file it holds", async (t) => {
  const root = await tree(t, {
    "tasks/todo/1-a/issue.md": TICKET("A", "todo"),
    "tasks/todo/2-b/issue.md": TICKET("B", "todo"),
    "tasks/doing/3-c/issue.md": TICKET("C", "doing"),
    "tasks/done/4-d/issue.md": TICKET("D", "done"),
    "tasks/done/5-e/issue.md": TICKET("E", "done"),
    // The tree claims six of eleven. The ticket file claims five of five.
    "tasks/todo/1-a/plan.md": TICKET("Plan", "todo"),
    "tasks/todo/2-b/plan.md": "loose note\n",
    "tasks/doing/3-c/plan.md": "loose note\n",
    "tasks/done/4-d/plan.md": "loose note\n",
    "tasks/done/5-e/plan.md": "loose note\n",
    "tasks/README.md": "# How we file\n",
  });

  const report = await detect(root);
  assert.equal(report.tickets, "tasks/**/issue.md");
  assert.equal(report.fileCount, 5);
});

test("a clean handful never shrinks a board the whole tree almost reads", async (t) => {
  const files = { "tasks/notes-1.md": "loose note\n", "tasks/notes-2.md": "loose note\n" };
  for (const n of [1, 2, 3, 4, 5, 6, 7, 8]) files[`tasks/${n}-t.md`] = TICKET(`T${n}`, "todo");
  for (const dir of ["a", "b", "c"]) files[`tasks/${dir}/card.md`] = TICKET(dir, "todo");

  const report = await detect(await tree(t, files));
  assert.equal(report.tickets, "tasks/**/*.md", "three pure cards do not outrank eleven");
  assert.equal(report.fileCount, 13);
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

const facetFor = (report, field) => report.facets.find((facet) => facet.field === field);

/** Twelve tickets across two lane folders, so the folders place the lanes and the field stays a
 *  facet. Twelve also keeps four distinct values under the tag-like ratio. */
function graded(values, field = "priority") {
  const files = {};
  values.forEach((value, i) => {
    const lane = i % 2 ? "done" : "todo";
    files[`tasks/${lane}/${i + 1}-t.md`] = `---\ntitle: T${i + 1}\n${field}: ${value}\n---\n\nBody.\n`;
  });
  return files;
}

const CYCLE = (scale) => Array.from({ length: 12 }, (_, i) => scale[i % scale.length]);

test("a p0-to-p3 facet is ranked and accented without any config", async (t) => {
  const report = await detect(await tree(t, graded(CYCLE(["p2", "p0", "p3", "p1"]))));
  const facet = facetFor(report, "priority");

  assert.deepEqual(facet.order, ["p0", "p1", "p2", "p3"]);
  assert.deepEqual(facet.colors, { p0: "red", p1: "amber", p2: "cyan", p3: "neutral" });
});

test("a critical-to-low facet reads the same ranking as p0-to-p3", async (t) => {
  const values = ["medium", "critical", "low", "high"];
  const report = await detect(await tree(t, graded(CYCLE(values))));
  const facet = facetFor(report, "priority");

  assert.deepEqual(facet.order, ["critical", "high", "medium", "low"]);
  assert.deepEqual(facet.colors, {
    critical: "red",
    high: "amber",
    medium: "cyan",
    low: "neutral",
  });
});

test("the value as written is the key, so case survives the round trip", async (t) => {
  const report = await detect(await tree(t, graded(CYCLE(["P2", "P0", "P3", "P1"]))));
  const facet = facetFor(report, "priority");

  assert.deepEqual(facet.order, ["P0", "P1", "P2", "P3"]);
  assert.deepEqual(facet.colors, { P0: "red", P1: "amber", P2: "cyan", P3: "neutral" });
});

test("a vocabulary detection does not know is left unordered and uncoloured", async (t) => {
  const report = await detect(await tree(t, graded(CYCLE(["spicy", "mild", "zesty", "tangy"]))));
  const facet = facetFor(report, "priority");

  assert.equal(facet.order, undefined);
  assert.equal(facet.colors, undefined);
});

test("half the values matching is not a majority, so the field keeps its own order", async (t) => {
  const report = await detect(await tree(t, graded(CYCLE(["p0", "p1", "spicy", "mild"]))));
  const facet = facetFor(report, "priority");

  assert.equal(facet.order, undefined);
  assert.equal(facet.colors, undefined);
});

test("an odd value among conventional ones sorts last and takes no accent", async (t) => {
  const report = await detect(await tree(t, graded(CYCLE(["p0", "p1", "p2", "spicy"]))));
  const facet = facetFor(report, "priority");

  assert.deepEqual(facet.order, ["p0", "p1", "p2", "spicy"]);
  assert.deepEqual(facet.colors, { p0: "red", p1: "amber", p2: "cyan" });
});

test("one match is a coincidence, and two is the floor for a convention", async (t) => {
  const report = await detect(await tree(t, graded(CYCLE(["p0", "spicy", "mild", "zesty"]))));
  const facet = facetFor(report, "priority");

  assert.equal(facet.order, undefined);
  assert.equal(facet.colors, undefined);
});

test("a stage-like facet is ordered by workflow, and never accented", async (t) => {
  const values = ["done", "triage", "doing", "ready"];
  const report = await detect(await tree(t, graded(CYCLE(values), "state")));
  const facet = facetFor(report, "state");

  assert.deepEqual(facet.order, ["triage", "ready", "doing", "done"]);
  assert.equal(facet.colors, undefined, "green is the board's own on-state, so stages stay plain");
});

test("a tag vocabulary is neither ranked nor accented", async () => {
  const report = await detect(fixture("detect-folders"));
  const facet = facetFor(report, "labels");

  assert.equal(facet.order, undefined);
  assert.equal(facet.colors, undefined);
});
