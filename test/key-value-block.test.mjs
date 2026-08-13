import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { parse, claims } from "../src/parse/key-value-block.mjs";

const dir = new URL("./fixtures/key-value-block/", import.meta.url);

function fixture(name) {
  const path = `test/fixtures/key-value-block/${name}`;
  return parse(path, readFileSync(new URL(name, dir), "utf8"));
}

test("reads a block before the first heading", () => {
  const t = fixture("before-heading.md");
  assert.deepEqual(t.fields, { status: "ready-for-agent" });
  assert.equal(t.title, "Average place results");
  assert.equal(t.body.startsWith("# Average place results"), true);
  assert.ok(!t.body.includes("Status:"));
});

test("reads a block after the first heading and hyphenates its keys", () => {
  const t = fixture("after-heading.md");
  assert.deepEqual(t.fields, {
    type: "research",
    status: "closed",
    assignee: "dstowell",
    "blocked-by": "none",
    blocks: ["02", "03", "04"],
  });
  assert.equal(t.title, "Research: digest the marketing skills");
});

test("strips bold markers from key and value", () => {
  const t = fixture("bold-markers.md");
  assert.deepEqual(t.fields, {
    status: "ready-for-agent",
    priority: "p1",
    labels: ["ios", "shield"],
  });
  assert.equal(t.title, "Add the shield toggle");
  assert.ok(!t.body.includes("**Status:**"));
  assert.ok(t.body.includes("The toggle lives in the menu bar."));
});

test("a file with no block still yields a title and a whole body", () => {
  const t = fixture("no-block.md");
  assert.deepEqual(t.fields, {});
  assert.equal(t.title, "Just a document");
  assert.ok(t.body.includes("Status is a word here"));
});

test("a block inside a fence is a code sample, not metadata", () => {
  const t = fixture("fenced-only.md");
  assert.deepEqual(t.fields, {});
  assert.equal(t.title, "Parser notes");
  assert.ok(t.body.includes("Status: ready-for-agent"));
});

test("a Title key beats the first heading", () => {
  const t = parse("a.md", "Title: From the key\n\n# From the heading\n");
  assert.equal(t.title, "From the key");
});

test("with no key and no heading the title falls back to the filename", () => {
  const t = parse("docs/issues/the-ledger-drifts.md", "Status: open\n\nBody.\n");
  assert.equal(t.title, "the-ledger-drifts");
});

test("a heading inside a fence is not the first heading", () => {
  const t = parse("a.md", "```\n# Not a heading\n```\n\n# The real one\n");
  assert.equal(t.title, "The real one");
});

test("a blank line ends a block and a second block is not read", () => {
  const t = parse("a.md", "Status: open\n\nPriority: p0\n\n# Title\n");
  assert.deepEqual(t.fields, { status: "open" });
  assert.ok(t.body.includes("Priority: p0"));
});

test("a non-matching line ends a block", () => {
  const t = parse("a.md", "Status: open\nnot a key line\nPriority: p0\n");
  assert.deepEqual(t.fields, { status: "open" });
});

test("a value with a comma becomes a list and one without stays a string", () => {
  const t = parse("a.md", "Labels: bug, ios\nStatus: open\n");
  assert.deepEqual(t.fields.labels, ["bug", "ios"]);
  assert.equal(t.fields.status, "open");
});

test("an empty value stays an empty string", () => {
  const t = parse("a.md", "Status:\nPriority: p0\n");
  assert.equal(t.fields.status, "");
});

test("claims reports whether a file carries a readable block", () => {
  assert.equal(claims("Status: open\n\n# Title\n"), true);
  assert.equal(claims("# Title\n\nNo metadata.\n"), false);
  assert.equal(claims("```\nStatus: open\n```\n"), false);
});

test("the parser returns no id of its own", () => {
  assert.equal(parse("a.md", "Status: open\n").id, null);
});
