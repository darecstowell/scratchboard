import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { parse, claims } from "../src/parse/yaml-frontmatter.mjs";

const dir = new URL("./fixtures/yaml-frontmatter/", import.meta.url);

function fixture(name) {
  return {
    path: `test/fixtures/yaml-frontmatter/${name}`,
    text: readFileSync(new URL(name, dir), "utf8"),
  };
}

function block(...lines) {
  return `---\n${lines.join("\n")}\n---\n\nBody.\n`;
}

// --- delimiters ---------------------------------------------------------

test("a document-end marker closes the block just like three dashes", () => {
  const t = parse("a.md", "---\ntitle: Closed by dots\nstatus: open\n...\n\nBody.\n");
  assert.equal(t.title, "Closed by dots");
  assert.deepEqual(t.fields, { status: "open" });
  assert.equal(t.body, "Body.");
});

test("a block that is never closed is not front matter and the opener stays in the body", () => {
  const text = "---\ntitle: Never closed\npriority: p1\n\nSome prose.\n";
  const t = parse("some-file.md", text);
  assert.deepEqual(t.fields, {});
  assert.equal(t.body, text.replace(/\n+$/, ""));
  assert.ok(t.body.startsWith("---\n"));
});

test("the opener must be exactly three dashes after trimming", () => {
  assert.deepEqual(parse("a.md", "----\ntitle: X\n----\n\nBody.\n").fields, {});
  assert.deepEqual(parse("a.md", "--- \ntitle: X\n---\n\nBody.\n").fields, { });
  assert.equal(parse("a.md", "--- \ntitle: X\n---\n\nBody.\n").title, "X");
});

test("blank lines before the opener are skipped", () => {
  const t = parse("a.md", "\n\n   \n---\ntitle: Found anyway\n---\n\nBody.\n");
  assert.equal(t.title, "Found anyway");
  assert.equal(t.body, "Body.");
});

test("prose before the opener means there is no front matter at all", () => {
  const text = "Intro line.\n\n---\ntitle: X\n---\n";
  const t = parse("a.md", text);
  assert.deepEqual(t.fields, {});
  assert.ok(t.body.startsWith("Intro line."));
});

test("a leading byte order mark does not hide the opener", () => {
  const t = parse("a.md", "﻿---\ntitle: With a BOM\nstatus: open\n---\n\nBody.\n");
  assert.equal(t.title, "With a BOM");
  assert.deepEqual(t.fields, { status: "open" });
});

test("a byte order mark on a file with no front matter is dropped from the body", () => {
  const t = parse("a.md", "﻿# Heading\n\nBody.\n");
  assert.equal(t.body, "# Heading\n\nBody.");
  assert.equal(t.title, "Heading");
});

// --- the block loop -----------------------------------------------------

test("whole-line hashes inside the block are comments and are skipped", () => {
  const t = parse("a.md", block("# a comment", "   # an indented comment", "status: open"));
  assert.deepEqual(t.fields, { status: "open" });
});

test("a hash after a value is part of the value, not a comment", () => {
  const t = parse("a.md", block("source: found while triaging #197, on iPhone"));
  assert.equal(t.fields.source, "found while triaging #197, on iPhone");
});

test("blank lines inside the block are skipped without breaking it", () => {
  const t = parse("a.md", block("status: open", "", "   ", "priority: p0"));
  assert.deepEqual(t.fields, { status: "open", priority: "p0" });
});

test("a duplicate key keeps the first position and the last value", () => {
  const t = parse("a.md", block("status: first", "priority: p0", "status: last"));
  assert.deepEqual(Object.keys(t.fields), ["status", "priority"]);
  assert.equal(t.fields.status, "last");
});

test("a key may not start with a digit or contain a space", () => {
  const t = parse("a.md", block("status: open", "1key: no", "two words: no"));
  assert.deepEqual(Object.keys(t.fields), ["status"]);
});

// --- continuation lines -------------------------------------------------

test("a wrapped line glues onto the previous string value with one space", () => {
  const t = parse("a.md", block("source: found while triaging", "   the ledger issue", "priority: p0"));
  assert.equal(t.fields.source, "found while triaging the ledger issue");
  assert.equal(t.fields.priority, "p0");
});

test("a wrapped line is dropped when the previous value is a list", () => {
  const t = parse("a.md", block("labels: [bug]", "  and more"));
  assert.deepEqual(t.fields.labels, ["bug"]);
});

test("a wrapped line is dropped when the previous value is empty", () => {
  const t = parse("a.md", block("labels:", "  and more"));
  assert.equal(t.fields.labels, "");
});

test("a line before any key is dropped with no trace", () => {
  const t = parse("a.md", block("orphan line", "status: open"));
  assert.deepEqual(t.fields, { status: "open" });
});

test("a block-style dash list is not an array, it is glued or dropped", () => {
  const dropped = parse("a.md", block("labels:", "  - bug", "  - ios"));
  assert.equal(dropped.fields.labels, "");

  const glued = parse("a.md", block("labels: seed", "  - bug", "  - ios"));
  assert.equal(glued.fields.labels, "seed - bug - ios");
});

// --- scalar values ------------------------------------------------------

test("nothing is coerced, so numbers, booleans, and null stay strings", () => {
  const t = parse("a.md", block("count: 12", "done: true", "empty: null", "when: 2026-08-12"));
  assert.deepEqual(t.fields, { count: "12", done: "true", empty: "null", when: "2026-08-12" });
});

test("a value is trimmed on both sides", () => {
  const t = parse("a.md", block("status:     open   "));
  assert.equal(t.fields.status, "open");
});

test("a quoted value loses its quotes and keeps its inner spaces", () => {
  const t = parse("a.md", block('note: "  padded  "'));
  assert.equal(t.fields.note, "  padded  ");
});

test("real text after the closing quote falls back to the whole raw string", () => {
  const t = parse("a.md", block('note: "quoted" and then some'));
  assert.equal(t.fields.note, '"quoted" and then some');
});

test("only whitespace after the closing quote still yields the unquoted value", () => {
  const t = parse("a.md", block('note: "quoted"    '));
  assert.equal(t.fields.note, "quoted");
});

test("an unterminated quoted string returns what it collected", () => {
  const t = parse("a.md", block('note: "runs off the end'));
  assert.equal(t.fields.note, "runs off the end");
});

// --- escapes ------------------------------------------------------------

test("double quotes honour the escape table", () => {
  const t = parse("a.md", block('note: "a\\nb\\tc\\\\d\\/e\\"f"'));
  assert.equal(t.fields.note, 'a\nb\tc\\d/e"f');
});

test("an unknown escape drops the backslash and keeps the bare character", () => {
  const t = parse("a.md", block('note: "a\\qb"'));
  assert.equal(t.fields.note, "aqb");
});

test("a backslash inside single quotes is literal", () => {
  const t = parse("a.md", block("note: 'a\\nb'"));
  assert.equal(t.fields.note, "a\\nb");
});

test("a doubled single quote inside single quotes is one apostrophe", () => {
  const t = parse("a.md", block("note: 'it''s here'"));
  assert.equal(t.fields.note, "it's here");
});

// --- inline arrays ------------------------------------------------------

test("an inline array of quoted items becomes a list of strings", () => {
  const t = parse("a.md", block('labels: ["bug", "ios", "macos"]'));
  assert.deepEqual(t.fields.labels, ["bug", "ios", "macos"]);
});

test("an inline array of bare items is split on commas and trimmed", () => {
  const t = parse("a.md", block("labels: [bug, ios , macos]"));
  assert.deepEqual(t.fields.labels, ["bug", "ios", "macos"]);
});

test("a bare item keeps its inner spaces and loses only its outer ones", () => {
  const t = parse("a.md", block("labels: [ needs a decision , ios ]"));
  assert.deepEqual(t.fields.labels, ["needs a decision", "ios"]);
});

test("empty items vanish from anywhere in the list", () => {
  const t = parse("a.md", block("labels: [a,,b,]"));
  assert.deepEqual(t.fields.labels, ["a", "b"]);
});

test("an empty array yields an empty list", () => {
  const t = parse("a.md", block("labels: []"));
  assert.deepEqual(t.fields.labels, []);
});

test("a quoted item alone in whitespace keeps its padding verbatim", () => {
  const t = parse("a.md", block('labels: [  "  padded  "  , b]'));
  assert.deepEqual(t.fields.labels, ["  padded  ", "b"]);
});

test("a quoted item mixed with raw text is concatenated and trimmed once", () => {
  const t = parse("a.md", block('labels: [ "a"b , c]'));
  assert.deepEqual(t.fields.labels, ["ab", "c"]);
});

test("text after the closing bracket is ignored", () => {
  const t = parse("a.md", block("labels: [a, b] trailing junk"));
  assert.deepEqual(t.fields.labels, ["a", "b"]);
});

test("a nested inline array produces garbage rather than an error", () => {
  const t = parse("a.md", block("labels: [a, [b, c]]"));
  assert.deepEqual(t.fields.labels, ["a", "[b", "c"]);
});

test("an unterminated inline array still yields the items it collected", () => {
  const t = parse("a.md", block("labels: [a, b"));
  assert.deepEqual(t.fields.labels, ["a", "b"]);
});

// --- the fields contract ------------------------------------------------

test("an empty value becomes an empty string, never null", () => {
  const t = parse("a.md", block("status:", "priority:   ", "labels: [x]"));
  assert.deepEqual(t.fields, { status: "", priority: "", labels: ["x"] });
});

test("every value is a string or an array of strings", () => {
  const t = parse("a.md", block("status:", "priority: p0", "labels: [a, b]"));
  for (const value of Object.values(t.fields)) {
    const ok = typeof value === "string" || (Array.isArray(value) && value.every((v) => typeof v === "string"));
    assert.equal(ok, true);
  }
});

test("no field name is privileged, so an unknown key lands beside the known ones", () => {
  const t = parse("a.md", block("priority: p0", "status: open", "labels: [bug]", "source: triage", "severity: high", "owner: dstowell"));
  assert.deepEqual(t.fields, {
    priority: "p0",
    status: "open",
    labels: ["bug"],
    source: "triage",
    severity: "high",
    owner: "dstowell",
  });
});

test("fields keep their order of appearance", () => {
  const t = parse("a.md", block("zebra: 1", "title: T", "alpha: 2", "middle: 3"));
  assert.deepEqual(Object.keys(t.fields), ["zebra", "alpha", "middle"]);
});

test("title is lifted out of fields whatever shape it had", () => {
  assert.equal("title" in parse("a.md", block("title: T", "status: open")).fields, false);
  assert.equal("title" in parse("a.md", block("title: [a, b]", "status: open")).fields, false);
  assert.equal("title" in parse("a.md", block("title:", "status: open")).fields, false);
});

test("the parser never invents an id", () => {
  assert.equal(parse("a.md", block("status: open")).id, null);
  assert.equal(parse(".scratch/todo/199-thing/issue.md", block("status: open")).id, null);
});

// --- the title chain ----------------------------------------------------

test("a title field beats the first heading", () => {
  const t = parse("a.md", "---\ntitle: From the field\n---\n\n# From the heading\n");
  assert.equal(t.title, "From the field");
});

test("a blank or whitespace title field falls through to the heading", () => {
  assert.equal(parse("a.md", "---\ntitle:\n---\n\n# From the heading\n").title, "From the heading");
  assert.equal(parse("a.md", '---\ntitle: "   "\n---\n\n# From the heading\n').title, "From the heading");
});

test("a list-valued title field falls through to the heading", () => {
  const t = parse("a.md", "---\ntitle: [a, b]\n---\n\n# From the heading\n");
  assert.equal(t.title, "From the heading");
});

test("with no title field and no heading the title is the basename without its extension", () => {
  const t = parse(".scratch/todo/199-ledger-drifts/issue.md", "---\nstatus: open\n---\n\nJust prose.\n");
  assert.equal(t.title, "issue");
});

test("a heading inside a fence is not the title", () => {
  const t = parse("a.md", "---\nstatus: open\n---\n\n```sh\n# not a heading\n```\n\n# The real one\n");
  assert.equal(t.title, "The real one");
});

test("an empty heading is skipped rather than used as a blank title", () => {
  const t = parse("notes.md", "---\nstatus: open\n---\n\n#\n\n## A real one\n");
  assert.equal(t.title, "A real one");
});

test("the title is never blank", () => {
  for (const text of ["", "---\n---\n", "---\ntitle:\n---\n", "no block at all\n"]) {
    assert.notEqual(parse("dir/thing.md", text).title, "");
  }
});

// --- the body -----------------------------------------------------------

test("the body strips newlines from both ends and nothing else", () => {
  const t = parse("a.md", "---\nstatus: open\n---\n\n\n  indented  \n\n");
  assert.equal(t.body, "  indented  ");
});

test("a trailing carriage return survives at the end of the body", () => {
  const t = parse("a.md", "---\nstatus: open\n---\n\nline\r\n");
  assert.equal(t.body, "line\r");
});

test("a leading tab survives at the start of the body", () => {
  const t = parse("a.md", "---\nstatus: open\n---\n\n\tindented\n");
  assert.equal(t.body, "\tindented");
});

test("blank lines inside the body are untouched", () => {
  const t = parse("a.md", "---\nstatus: open\n---\n\nfirst\n\n\nsecond\n");
  assert.equal(t.body, "first\n\n\nsecond");
});

test("a file with no body yields an empty body", () => {
  assert.equal(parse("a.md", "---\nstatus: open\n---\n").body, "");
});

// --- claims -------------------------------------------------------------

test("claims accepts a closed block that yielded a key", () => {
  assert.equal(claims("---\ntitle: X\n---\n\nBody.\n"), true);
  assert.equal(claims("---\nstatus: open\n...\n\nBody.\n"), true);
  assert.equal(claims("﻿---\nstatus: open\n---\n"), true);
});

test("claims rejects an unterminated block", () => {
  assert.equal(claims("---\ntitle: X\npriority: p1\n\nBody.\n"), false);
});

test("claims rejects a block with no keys in it", () => {
  assert.equal(claims("---\n---\n\nBody.\n"), false);
  assert.equal(claims("---\n# only a comment\n\n---\n\nBody.\n"), false);
  assert.equal(claims("---\nnot a key line\n---\n\nBody.\n"), false);
});

test("claims rejects a file with no block", () => {
  assert.equal(claims("# Heading\n\nStatus: open\n"), false);
  assert.equal(claims(""), false);
});

// --- golden fixtures ----------------------------------------------------

test("a clean OffMain ticket parses to its expected shape", () => {
  const { path, text } = fixture("clean-ticket.md");
  assert.deepEqual(parse(path, text), {
    id: null,
    title: "The ledger never refreshes itself on either client",
    fields: {
      priority: "p0",
      source: "found while triaging #197, minutes not landing on iPhone or Mac",
      status: "ready-for-agent",
      labels: ["bug", "ios", "macos", "apple"],
    },
    body: [
      "## Problem",
      "",
      "`LedgerModel.refresh()` has five call sites and every one of them needs the user to act.",
      "",
      "Nothing subscribes the ledger to the silent push path.",
      "",
      "## Done means",
      "",
      "The ledger refreshes itself.",
    ].join("\n"),
  });
  assert.equal(claims(text), true);
});

test("a file with no front matter keeps all of its text as body", () => {
  const { path, text } = fixture("no-frontmatter.md");
  assert.deepEqual(parse(path, text), {
    id: null,
    title: "Just a document",
    fields: {},
    body: [
      "# Just a document",
      "",
      "There is no metadata block here.",
      "",
      "The word title: appears mid-prose, which is not a block opener.",
    ].join("\n"),
  });
  assert.equal(claims(text), false);
});

test("a malformed block degrades to no front matter and keeps the opener in the body", () => {
  const { path, text } = fixture("malformed.md");
  assert.deepEqual(parse(path, text), {
    id: null,
    title: "Notes",
    fields: {},
    body: [
      "---",
      'title: "Never closed"',
      "priority: p1",
      "",
      "## Notes",
      "",
      "The block above has no closing marker, so the whole file is body.",
    ].join("\n"),
  });
  assert.equal(claims(text), false);
});
