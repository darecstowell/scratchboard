import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { test } from "./context.mjs";
import { normalizePayload } from "../src/ui/payload.mjs";
import { OUT_OF_SCOPE } from "../src/ui/board-render.mjs";

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
  assert.ok(
    body.indexOf('tabHtml("board", "board", TAB_ICONS.board)') !== -1,
    "the board tab is pinned first"
  );
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
  assert.equal(OUT_OF_SCOPE, "out-of-scope");

  const contract = source("index.html");
  for (const state of named.concat(OUT_OF_SCOPE)) {
    assert.ok(contract.indexOf(`"${state}"`) !== -1, `the contract block names ${state}`);
  }
});

test("a claimed ticket greys rather than taking the prototype's tint", () => {
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

test("no edge is drawn at rest, and a hover reveals the ones a card touches", () => {
  assert.match(rule(".wf-edge,\n.wf-dash"), /opacity: 0;/, "the diagram is a knot when every edge is drawn");
  assert.equal(rule(".wf-view.is-focused .wf-edge.is-live.is-on"), "opacity: 1;");
  assert.equal(rule(".wf-view.is-focused .wf-edge.is-satisfied.is-on"), "opacity: 0.7;");
  assert.equal(rule(".wf-view.is-focused .wf-card.is-dim"), "opacity: 0.22;");

  const board = source("board.js");
  assert.match(board, /live: blocker\.state !== "behind-us"/, "an edge is live while its blocker is not resolved");
  assert.match(board, /node\.classList\.toggle\("is-on", rank !== EDGE_HIDDEN\)/, "the reveal keys on the rank");
});

/** No edge is drawn at rest, so a reader who never touches a pointer would see none at all. */
test("a card reveals its edges to a keyboard as well as to a pointer", () => {
  const board = source("board.js");

  for (const event of ["mouseover", "mouseout", "focusin", "focusout"]) {
    assert.ok(
      board.indexOf(`el.views.addEventListener("${event}"`) !== -1,
      `the diagram never hears ${event}`
    );
  }
  assert.match(board, /function showCard\(\) \{/, "one place decides which card is shown");
  assert.match(board, /const card = wf\.focused \|\| wf\.hovered \|\| null;/, "focus and hover fight");
  assert.equal(
    (board.match(/showCard\(\);/g) || []).length >= 5,
    true,
    "every hover and focus edge routes through the one decision"
  );
  assert.ok(
    board.indexOf('class="wf-card-open"') !== -1 || source("board-render.mjs").indexOf("wf-card-open") !== -1,
    "the card holds a focusable control for focusin to land on"
  );
});

/** Reduced motion turns off every transition and animation, so a hand rolled frame loop would
 *  drive right through it. The reveal is CSS, and this holds it that way. */
test("a revealed edge draws itself in CSS, and its arrowhead waits for the line to land", () => {
  const css = source("board.css");
  const draw = rule(".wf-view.is-focused .wf-edge.is-on");

  assert.match(draw, /animation:\s*\n?\s*wf-draw var\(--wf-draw\) var\(--wf-land\) var\(--wf-delay, 0ms\) backwards/);
  assert.match(draw, /wf-tip var\(--wf-draw\) steps\(1, end\) var\(--wf-delay, 0ms\) backwards/);
  assert.match(draw, /marker-end: var\(--wf-marker\)/, "the arrowhead is CSS, so an animation can hold it back");
  assert.match(rule(".wf-edge,\n.wf-dash"), /--wf-draw: 220ms;/);
  assert.match(rule(".wf-edge,\n.wf-dash"), /--wf-land: cubic-bezier\(0\.23, 1, 0\.32, 1\);/);
  assert.match(css, /@keyframes wf-draw \{ from \{ stroke-dashoffset: var\(--wf-len, 0px\); \} \}/);
  assert.match(css, /@keyframes wf-tip \{ from \{ marker-end: none; \} \}/);
  assert.match(
    rule(".wf-view.is-focused .wf-dash.is-on"),
    /animation: wf-flow 2\.4s linear calc\(var\(--wf-delay, 0ms\) \+ var\(--wf-draw\)\) infinite;/,
    "the travelling dash starts when the line it rides on lands"
  );
  assert.equal(css.indexOf(".wf-edge { marker-end:"), -1, "the base rule must not paint an arrowhead");
  assert.match(rule(".wf-edge"), /marker-end: none;/, "an undrawn edge carries no arrowhead");

  const board = source("board.js");
  assert.equal(/requestAnimationFrame|cancelAnimationFrame/.test(board), false, "the motion is CSS, never a frame loop");
  assert.match(board, /const EDGE_STAGGER = 40;/, "each line waits its turn");
  assert.match(board, /setProperty\("--wf-delay", rank \* EDGE_STAGGER \+ "ms"\)/);
  assert.match(board, /setProperty\("--wf-len", length\)/, "CSS cannot measure a curve, so the board hands it over");
  assert.match(board, /style="--wf-marker:url\(#/, "the markup names the marker the CSS reveals");
});

/** The board scrolls inside itself now, so an origin off the visible box is right only until
 *  the first scroll. */
test("an edge is placed against the board's content, never against the part of it on screen", () => {
  const board = source("board.js");
  const at = board.indexOf("function boxesOf(board)");
  assert.notEqual(at, -1, "board.js reads the endpoints back off the layout");
  const boxes = board.slice(at, board.indexOf("\n  }", at));

  assert.match(boxes, /const left = base\.left - board\.scrollLeft;/);
  assert.match(boxes, /const top = base\.top - board\.scrollTop;/);
  assert.equal(/- base\.left|- base\.top/.test(boxes.slice(boxes.indexOf("found.set"))), false,
    "a box read after a scroll is offset by exactly the scroll");

  const draw = board.slice(board.indexOf("function drawEdges()"));
  assert.match(draw.slice(0, 600), /board\.scrollWidth/, "the layer covers the whole diagram");
  assert.match(draw.slice(0, 600), /board\.scrollHeight/);
  assert.equal(/clientWidth|clientHeight/.test(draw.slice(0, 600)), false, "the visible box is not the drawing");
  assert.equal(/inset: 0/.test(rule(".wf-edges")), false, "a stretched layer would squash the viewBox");
});

test("a pin clears on a second click, on the background, and on escape", () => {
  const board = source("board.js");
  assert.match(board, /wf\.pinned = wf\.pinned === card\.dataset\.path \? null : card\.dataset\.path/);
  assert.match(board, /if \(!card\) \{\s*\n\s*clearPin\(\);/, "a click on the background clears the pin");
  const escape = board.indexOf('if (event.key !== "Escape") return;');
  assert.notEqual(escape, -1);
  assert.match(board.slice(escape, escape + 200), /if \(wf && wf\.pinned\) \{\s*\n\s*clearPin\(\);/);
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

test("one click route opens every group file the views hold", () => {
  const board = source("board.js");
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
