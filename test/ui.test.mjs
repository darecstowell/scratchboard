import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { test } from "./context.mjs";
import { normalizePayload } from "../src/ui/payload.mjs";

const source = (name) => readFileSync(fileURLToPath(new URL(`../src/ui/${name}`, import.meta.url)), "utf8");

/** The toolbar holds controls the page declares and controls the script builds. The script
 *  rebuilds its own on every render, so what it clears has to miss everything in the markup. */
function toolbarMarkup() {
  const html = source("index.html");
  const open = html.indexOf('<div class="bar">');
  assert.notEqual(open, -1, "index.html declares the toolbar");
  const close = html.indexOf("\n  </div>", open);
  assert.notEqual(close, -1, "the toolbar closes");
  return html.slice(open, close);
}

function declared(markup, attribute) {
  const found = new Set();
  for (const hit of markup.matchAll(new RegExp(`${attribute}="([^"]+)"`, "g"))) {
    for (const one of hit[1].trim().split(/\s+/)) found.add(one);
  }
  return found;
}

test("rebuilding the facet controls cannot delete a control the page declares", () => {
  const board = source("board.js");
  const clears = board.match(/el\.bar\.querySelectorAll\("([^"]+)"\)\.forEach\(\(node\) => node\.remove\(\)\)/);
  assert.ok(clears, "the rebuild clears the toolbar with one selector");

  const markup = toolbarMarkup();
  const classes = declared(markup, "class");
  const ids = declared(markup, "id");

  for (const token of clears[1].split(",").map((one) => one.trim()).filter(Boolean)) {
    assert.match(token, /^[.#][\w-]+$/, `${token} is a plain class or id selector`);
    const name = token.slice(1);
    const held = token[0] === "." ? classes : ids;
    assert.equal(held.has(name), false, `clearing "${token}" would delete a control the page declares`);
  }
});

test("the sort control the script drives is the one the page declares", () => {
  const markup = toolbarMarkup();
  const board = source("board.js");

  assert.match(markup, /id="sort-dd"/, "the page declares the sort dropdown");
  assert.match(markup, /id="sort-val"/, "the page declares the label it reads");
  assert.match(markup, /name="sort"[^>]*value="updated"/, "updated is an option");
  assert.equal(markup.indexOf("<select"), -1, "sort is not a native select");

  for (const id of ["sort-dd", "sort-val", "sort-by-id"]) {
    assert.ok(board.indexOf(`getElementById("${id}")`) !== -1, `board.js holds #${id}`);
  }
});

test("every sort key the page offers is one the script can sort by", () => {
  const markup = toolbarMarkup();
  const board = source("board.js");
  const offered = [...markup.matchAll(/name="sort" value="([^"]+)"/g)].map((hit) => hit[1]);
  assert.ok(offered.length >= 2, "the page offers more than one key");

  const at = board.indexOf("const SORTS = {");
  assert.notEqual(at, -1, "board.js declares the sort table");
  const table = board.slice(at, board.indexOf("\n  };", at));

  for (const key of offered) {
    assert.ok(table.indexOf(`${key}:`) !== -1, `SORTS holds ${key}`);
  }
});

/** The tab row and the group view are new markup, and nothing here runs a DOM, so the rules
 *  they must keep are held by reading the two files that own them. */
function tabsMarkup() {
  const html = source("index.html");
  const found = /<nav class="tabs" id="tabs"[^>]*>([\s\S]*?)<\/nav>/.exec(html);
  assert.ok(found, "index.html declares the tab row");
  return found;
}

test("the page declares the tab row empty, so the rebuild can delete nothing it did not build", () => {
  const [, inside] = tabsMarkup();
  assert.equal(inside.trim(), "", "the page declares a control inside the tab row");

  const board = source("board.js");
  assert.ok(board.indexOf('getElementById("tabs")') !== -1, "board.js holds #tabs");
  assert.ok(board.indexOf('el.tabs.innerHTML = ""') !== -1, "the rebuild clears the whole row");
  assert.equal(
    /el\.tabs\.querySelectorAll\([^)]*\)\.forEach\(\(node\) => node\.remove\(\)\)/.test(board),
    false,
    "the row is rebuilt whole, so it needs no selector that could reach a declared control"
  );
});

test("a payload with no group leaves the page with no tab row at all", () => {
  assert.deepEqual(normalizePayload({ tickets: [] }).groups, [], "a payload with no groups key has no group");

  const board = source("board.js");
  const at = board.indexOf("function buildTabs()");
  assert.notEqual(at, -1, "board.js builds the tab row");
  const body = board.slice(at, board.indexOf("\n  }", at));

  assert.match(body, /if \(!groups\.length\) \{\s*\n\s*el\.tabs\.remove\(\);/, "the row survives an empty payload");
  assert.ok(body.indexOf('tabHtml("board", "board")') !== -1, "the board tab is pinned first");
  assert.match(source("board.css"), /\.tabs:empty \{ display: none; \}/, "an empty row still paints a band");
});

test("the tab row scrolls sideways and never wraps", () => {
  const css = source("board.css");
  const at = css.indexOf("\n.tabs {");
  assert.notEqual(at, -1, "the stylesheet holds the tab row");
  const block = css.slice(at, css.indexOf("}", at));
  assert.match(block, /overflow-x: auto/);
  assert.equal(/flex-wrap: wrap/.test(block), false, "the row must never wrap");
  assert.match(css.slice(css.indexOf("\n.tab {")), /white-space: nowrap/);
});

test("the columns key on the payload's own state values and out of scope is never one", () => {
  const board = source("board.js");
  const keys = /const STATE_KEYS = \[([^\]]+)\]/.exec(board);
  assert.ok(keys, "board.js names the three columns");
  const named = keys[1].split(",").map((one) => one.trim().replace(/"/g, "")).filter(Boolean);
  assert.deepEqual(named, ["behind-us", "takeable-now", "still-blocked"]);
  assert.match(board, /const OUT_OF_SCOPE = "out-of-scope"/);

  const contract = source("index.html");
  for (const state of named.concat("out-of-scope")) {
    assert.ok(contract.indexOf(`"${state}"`) !== -1, `the contract block names ${state}`);
  }
  assert.match(board, /file\.state === OUT_OF_SCOPE/, "an out of scope ticket renders in the header");
});

test("behind us renders folded with its count, with no threshold", () => {
  const board = source("board.js");
  const at = board.indexOf("function columnHtml(");
  assert.notEqual(at, -1, "board.js builds a column");
  const body = board.slice(at, board.indexOf("\n  }", at));

  assert.match(body, /const folded = key === "behind-us";/, "the fold is the state, not a size");
  assert.equal(/length >|length <|\.length >=/.test(body), false, "a threshold decided the fold");
  assert.ok(body.indexOf('"wf-col-count"') !== -1, "the folded column still reports its count");
});

test("a claimed ticket greys and is not counted by its column", () => {
  const board = source("board.js");
  const at = board.indexOf("function columnHtml(");
  const body = board.slice(at, board.indexOf("\n  }", at));
  assert.match(body, /files\.length - claimed/, "a claimed ticket counts toward the column number");

  const css = source("board.css");
  const grey = css.indexOf('.wf-card[data-claimed="true"] .wf-card-open');
  assert.notEqual(grey, -1, "the stylesheet greys a claimed card");
  assert.match(css.slice(grey, css.indexOf("}", grey)), /var\(--fg-4\)/);
  assert.equal(
    /\.wf-card\[data-claimed="true"\][^}]*--accent-amber/.test(css),
    false,
    "the prototype's amber tint is not the shipped treatment"
  );
});

function rule(selector) {
  const css = source("board.css");
  const at = css.indexOf(`\n${selector} {`);
  assert.notEqual(at, -1, `the stylesheet no longer holds ${selector}`);
  return css.slice(at + selector.length + 3, css.indexOf("}", at)).trim();
}

test("the view draws only live edges at rest and reveals satisfied ones on hover", () => {
  assert.equal(rule(".wf-edge.is-live"), "opacity: 1;");
  assert.equal(rule(".wf-edge.is-satisfied"), "opacity: 0;");
  assert.equal(rule(".wf-view.is-focused .wf-edge.is-live"), "opacity: 0.12;");
  assert.equal(rule(".wf-view.is-focused .wf-edge.is-live.is-on"), "opacity: 1;");
  assert.equal(rule(".wf-view.is-focused .wf-edge.is-satisfied.is-on"), "opacity: 0.85;");
  assert.equal(rule(".wf-view.is-focused .wf-card.is-dim"), "opacity: 0.22;");

  const board = source("board.js");
  assert.match(board, /live: blocker\.state !== "behind-us"/, "an edge is live while its blocker is not resolved");
});

test("the hover walk is downstream only, with no mode left over from the prototype", () => {
  const board = source("board.js");
  const at = board.indexOf("function downstreamOf(");
  assert.notEqual(at, -1, "board.js walks the edges forward");
  const body = board.slice(at, board.indexOf("\n  }", at));

  assert.ok(body.indexOf("keep.has(edge.from) && !keep.has(edge.to)") !== -1, "the walk follows from to to");
  assert.equal(body.indexOf("keep.has(edge.to) && !keep.has(edge.from)"), -1, "the upstream branch still ships");
  assert.equal(/\bmode\b/.test(board), false, "the prototype's mode switch still ships");
});

test("a pin clears on a second click, on the background, and on escape", () => {
  const board = source("board.js");
  assert.match(board, /wf\.pinned = wf\.pinned === card\.dataset\.path \? null : card\.dataset\.path/);
  assert.match(board, /if \(!card\) \{\s*\n\s*clearPin\(\);/, "a click on the background clears the pin");
  const escape = board.indexOf('if (event.key !== "Escape") return;');
  assert.notEqual(escape, -1);
  assert.match(board.slice(escape, escape + 200), /if \(wf && wf\.pinned\) \{\s*\n\s*clearPin\(\);/);
});

test("a card carries its type as a word and reaches for no icon", () => {
  const board = source("board.js");
  const at = board.indexOf("function cardHtmlFor(");
  assert.notEqual(at, -1, "board.js builds a card");
  const body = board.slice(at, board.indexOf("\n  }", at));

  assert.match(body, /wf-card-type[^]*esc\(file\.type\)/, "the type is plain text above the title");
  for (const reach of ["glyphSvg", "ICONS[", "iconFor("]) {
    assert.equal(body.indexOf(reach), -1, `the card reaches for ${reach}`);
  }
  assert.equal(/…|slice\(0, ?\d+\)/.test(body), false, "a real title wraps rather than clipping");
  assert.match(body, /wf-card-open" aria-haspopup="dialog"/, "a card opens the detail dialog the board already has");
});

test("the token the browser substitutes is the one config validates", async () => {
  const { PATH_TOKEN } = await import("../src/config.mjs");
  const board = source("board.js");
  const found = /const PATH_TOKEN = "([^"]+)"/.exec(board);

  assert.ok(found, "board.js names the token it substitutes");
  assert.equal(found[1], PATH_TOKEN, "the browser and the validator disagree about the token");
  assert.match(board, /entry\.template\.split\(PATH_TOKEN\)\.join\(path\)/, "a replacement string reads $& in a template");
});

test("the copy caret is built only when the payload declares an invocation", () => {
  const board = source("board.js");
  const at = board.indexOf("function buildCopyMenu()");
  assert.notEqual(at, -1, "board.js builds the caret");
  const body = board.slice(at, board.indexOf("\n  }", at));

  assert.match(body, /if \(!invocations\.length[^)]*\) return;/, "a board that declares none still grows a caret");
  assert.equal(
    source("index.html").indexOf('class="copy-more'),
    -1,
    "the page declares the caret, so a stock board would carry it"
  );

  const menu = normalizePayload({
    invocations: [{ name: "opted out", template: null }, { name: "kept", template: "/skill $&" }],
  }).invocations;
  assert.deepEqual(menu, [{ name: "kept", template: "/skill $&" }], "a null template must never reach a menu");
});

test("a group view opens the one detail dialog the board already has", () => {
  const board = source("board.js");
  assert.equal(board.split("showModal()").length - 1, 3, "a second detail surface was added");
  assert.match(board, /const entry = fileByPath\.get\(path\);/, "a group file is keyed on its path");
  const html = source("index.html");
  assert.equal(html.split("<dialog ").length - 1, 1, "the page declares a second dialog");
  assert.match(html, /<dialog class="detail" id="detail"/);
});

test("a lead document is openable from its group header, through the one open path", () => {
  const board = source("board.js");
  const at = board.indexOf("function headHtml(");
  assert.notEqual(at, -1, "board.js builds the group header");
  const body = board.slice(at, board.indexOf("\n  }", at));

  assert.match(body, /'<header class="wf-head"' \+ \(lead \? ' data-path="' \+ esc\(lead\.path\)/, "the header carries the lead path");
  const title = board.slice(board.indexOf("function leadTitle("), at);
  assert.match(title, /class="wf-card-open"/, "the header title is the same control a card uses");
  assert.match(title, /if \(!lead\) return esc\(group\.title\)/, "a group with no lead stays plain text");

  const click = board.indexOf('el.views.addEventListener("click"');
  const handler = board.slice(click, board.indexOf("\n  });", click));
  assert.match(handler, /closest\("\.wf-card-open"\)[^]*closest\("\[data-path\]"\)/, "one route opens every group file");
});

test("the notes panel renders a warning's fix and is unchanged without one", () => {
  const board = source("board.js");
  const at = board.indexOf("function showNotes()");
  assert.notEqual(at, -1, "board.js fills the notes panel");
  const body = board.slice(at, board.indexOf("\n  }", at));

  assert.match(body, /note && note\.fix \? '<span class="note-fix">' \+ esc\(note\.fix\)/, "a fix is escaped like every other note");
  assert.match(body, /const fix = note && note\.fix \?[^]*: "";/, "a two-key warning must render as it does today");
  assert.ok(body.indexOf("<li>\" + where + why + fix + \"</li>") !== -1, "the fix sits under the reason it repairs");
  assert.notEqual(source("board.css").indexOf(".note-fix {"), -1, "the stylesheet holds the fix line");
  assert.ok(source("index.html").indexOf("{ path, reason, fix }") !== -1, "the contract names the third key");
});

test("an empty groups or invocations array reads as nothing, never as one of something", () => {
  const empty = normalizePayload({ groups: [], invocations: [] });
  assert.deepEqual(empty.groups, []);
  assert.deepEqual(empty.invocations, []);
  assert.deepEqual(normalizePayload({}).groups, empty.groups, "a missing key reads as the empty array");
  assert.deepEqual(normalizePayload({}).invocations, empty.invocations, "a missing key reads as the empty array");

  const board = source("board.js");
  assert.match(board, /if \(!groups\.length\)/, "the tab row branches on the key rather than the count");
  assert.match(board, /if \(!invocations\.length/, "the caret branches on the key rather than the count");
  assert.equal(/groups !== undefined|invocations !== undefined/.test(board), false, "a present empty array is not nothing");
});

test("a context lists its decision records in payload order", () => {
  const files = [
    { role: "lead", path: "CONTEXT.md", title: "Glossary" },
    { role: "other", path: "docs/adr/0003.md", title: "Third", status: "accepted" },
    { role: "other", path: "docs/adr/0001.md", title: "First", status: null },
  ];
  const group = normalizePayload({ groups: [{ kind: "context", path: ".", files }] }).groups[0];
  assert.deepEqual(group.files, files, "the reader reorders what the scan already sorted");

  const board = source("board.js");
  const at = board.indexOf("function contextHtml(");
  assert.notEqual(at, -1, "board.js builds the context view");
  const body = board.slice(at, board.indexOf("\n  }", at));
  assert.equal(/records\.sort\(/.test(body), false, "payload order wins, and the scan already sorts");
  assert.match(body, /file\.role !== "lead"/, "the lead document is the glossary, never a record in the list");

  const badge = board.slice(board.indexOf("function adrHtml("), at);
  assert.match(badge, /typeof file\.status === "string"/, "the badge reads the payload field the scan writes");
  assert.ok(
    source("index.html").indexOf("blockedBy, status } ] } ]") !== -1,
    "the payload contract names the field the badge reads"
  );
});
