import { test } from "node:test";
import assert from "node:assert/strict";
import { makeExcerpt, findRefs, EXCERPT_LEN } from "../src/text.mjs";

test("an image leaves nothing behind, because it is stripped before links", () => {
  assert.equal(makeExcerpt("![alt](http://x/y.png)"), "");
  assert.equal(makeExcerpt("before ![alt](u) after"), "before after");
});

test("an inline link keeps its text and drops its url", () => {
  assert.equal(makeExcerpt("see [the doc](http://x) now"), "see the doc now");
});

test("a reference link keeps its text and drops its label", () => {
  assert.equal(makeExcerpt("see [the doc][ref] now"), "see the doc now");
});

test("an autolink keeps the bare url", () => {
  assert.equal(makeExcerpt("go <https://x.dev/a> now"), "go https://x.dev/a now");
});

test("a remaining html tag is removed whole", () => {
  assert.equal(makeExcerpt("a <br/> b <span class='x'>c</span>"), "a b c");
});

test("every emphasis marker is removed", () => {
  assert.equal(makeExcerpt("**bold** __b__ *i* _i_ `code` ~~cut~~"), "bold b i i code cut");
});

test("a list marker is removed only at the start of the line", () => {
  assert.equal(makeExcerpt("- one - two"), "one - two");
  assert.equal(makeExcerpt("  + one"), "one");
  assert.equal(makeExcerpt("3. one"), "one");
  assert.equal(makeExcerpt("3) one"), "one");
  assert.equal(makeExcerpt("step 1. one"), "step 1. one");
});

test("an escaped asterisk loses both the backslash and the asterisk", () => {
  assert.equal(makeExcerpt("a \\* b"), "a b");
  assert.equal(makeExcerpt("\\_x\\_"), "x");
  assert.equal(makeExcerpt("C:\\\\path"), "C:path");
});

test("a backslash goes after emphasis, so a split tilde pair survives", () => {
  assert.equal(makeExcerpt("a ~\\~ b"), "a ~~ b");
});

test("whitespace runs collapse to one space", () => {
  assert.equal(makeExcerpt("  a\t\tb   c  "), "a b c");
});

test("a blank line ends the excerpt once 80 characters are held", () => {
  const first = "a".repeat(90);
  assert.equal(makeExcerpt(`${first}\n\nsecond paragraph`), first);
});

test("a blank line is skipped while under 80 characters", () => {
  const first = "a".repeat(50);
  assert.equal(makeExcerpt(`${first}\n\nsecond paragraph`), `${first} second paragraph`);
});

test("fenced code contributes nothing, fence lines included", () => {
  assert.equal(makeExcerpt("intro\n```js\nconst x = 1;\n```\ntail"), "intro tail");
  assert.equal(makeExcerpt("intro\n  ~~~\nhidden\n~~~\ntail"), "intro tail");
});

test("headings and table rows are skipped", () => {
  assert.equal(makeExcerpt("# Title\n| a | b |\nreal text"), "real text");
  assert.equal(makeExcerpt("###### Deep\nreal text"), "real text");
  assert.equal(makeExcerpt("#\nreal text"), "real text");
});

test("a hash that starts a ticket reference is body text, not a heading", () => {
  assert.equal(makeExcerpt("#123 needs review"), "#123 needs review");
  assert.equal(makeExcerpt("`#123` needs review"), "#123 needs review");
  assert.equal(makeExcerpt("####### seven hashes"), "####### seven hashes");
});

test("a separator line is skipped but a two-character line is kept", () => {
  assert.equal(makeExcerpt("---\nreal text"), "real text");
  assert.equal(makeExcerpt("|:--|--:|\nreal text"), "real text");
  assert.equal(makeExcerpt("* * *\nreal text"), "real text");
  assert.equal(makeExcerpt("--\nreal text"), "-- real text");
});

test("a blockquote loses every leading angle bracket and space", () => {
  assert.equal(makeExcerpt(">>> deep quote"), "deep quote");
  assert.equal(makeExcerpt(">tight quote"), "tight quote");
  assert.equal(makeExcerpt("> > spaced quote"), "spaced quote");
});

test("an excerpt of exactly the limit is returned whole", () => {
  const body = "z".repeat(EXCERPT_LEN);
  assert.equal(makeExcerpt(body), body);
  assert.equal(makeExcerpt(body).length, 240);
});

test("a long excerpt backs off to the last space when that space is past 144", () => {
  const cut = makeExcerpt("word ".repeat(60));
  assert.equal(cut, `${"word ".repeat(47)}word...`);
});

test("a long excerpt keeps the hard cut when the last space sits at or before 144", () => {
  const body = `${"x".repeat(100)} ${"y".repeat(200)}`;
  assert.equal(makeExcerpt(body), `${"x".repeat(100)} ${"y".repeat(139)}...`);
  assert.equal(makeExcerpt(body).length, EXCERPT_LEN + 3);
});

test("trailing punctuation is stripped before the ellipsis is added", () => {
  const cut = makeExcerpt("alpha, ".repeat(40));
  assert.equal(cut, `${"alpha, ".repeat(33)}alpha...`);
  assert.ok(!cut.includes(",..."));
});

test("a link whose url holds /pull/ is blanked before refs are read", () => {
  const text = "[PR #106](https://github.com/x/y/pull/106) landed";
  assert.deepEqual(findRefs(text, new Set(["106"]), null), []);
  assert.deepEqual(findRefs(`${text} closes #106`, new Set(["106"]), null), ["106"]);
});

test("a number introduced as a PR is not a ticket reference", () => {
  assert.deepEqual(findRefs("shipped in PR #12", new Set(["12"]), null), []);
  assert.deepEqual(findRefs("shipped in pr #12", new Set(["12"]), null), []);
  assert.deepEqual(findRefs("see pull request #12", new Set(["12"]), null), []);
  assert.deepEqual(findRefs("see Pull Request #12", new Set(["12"]), null), []);
  assert.deepEqual(findRefs("blocks #12", new Set(["12"]), null), ["12"]);
});

test("a ticket never references itself", () => {
  assert.deepEqual(findRefs("see #7 and #9", new Set(["7", "9"]), "7"), ["9"]);
});

test("a number that is not a known id is dropped", () => {
  assert.deepEqual(findRefs("see #99", new Set(["7"]), null), []);
});

test("refs are deduped and keep first-occurrence order", () => {
  assert.deepEqual(findRefs("#9 then #7 then #9", new Set(["7", "9"]), null), ["9", "7"]);
});

test("leading zeros do not make a separate id", () => {
  assert.deepEqual(findRefs("see #007", new Set(["7"]), null), ["7"]);
  assert.deepEqual(findRefs("see #7", new Set(["007"]), null), ["007"]);
  assert.deepEqual(findRefs("see #007", new Set(["7"]), "7"), []);
  assert.deepEqual(findRefs("#07 and #7", new Set(["7"]), null), ["7"]);
});
