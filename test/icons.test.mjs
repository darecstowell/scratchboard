import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { test } from "./context.mjs";
import { ICON_NAMES, validate } from "../src/config.mjs";
import { columnIcon, foldIcon } from "../src/ui/board-render.mjs";

const source = (name) => readFileSync(fileURLToPath(new URL(`../src/ui/${name}`, import.meta.url)), "utf8");

/** The names config validates against live in node, the paths live in the browser bundle. This
 *  reads the bundle so the two can never drift apart in a release. */
function bundledIcons() {
  const board = source("board.js");
  const at = board.indexOf("const ICONS = {");
  assert.notEqual(at, -1, "board.js declares an ICONS map");
  const close = board.indexOf("\n  };", at);
  const block = board.slice(at, close);
  return new Set([...block.matchAll(/^\s*"([a-z-]+)":/gm)].map((hit) => hit[1]));
}

test("every icon config accepts is one the board actually inlines", () => {
  const bundled = bundledIcons();

  assert.deepEqual([...ICON_NAMES].sort(), [...bundled].sort());
  assert.ok(bundled.size >= 1, "the board inlines at least one icon");
});

test("every inlined icon carries drawable path data", () => {
  const board = source("board.js");
  const at = board.indexOf("const ICONS = {");
  const block = board.slice(at, board.indexOf("\n  };", at));

  for (const name of ICON_NAMES) {
    const row = block.split("\n").filter((line) => line.indexOf(`"${name}":`) !== -1)[0];
    assert.ok(row, `${name} has a row`);
    assert.match(row, /<path d="[^"]+"\/>/, `${name} holds a path`);
  }
});

/** Retyping a name here would let the board rename its own and stay green, so the furniture
 *  glyphs are read out of the board the way the path data is. */
function furnitureIcons() {
  const board = source("board.js");
  const named = (declaration) => {
    const found = new RegExp(`const ${declaration}\\s*=\\s*([^;]+);`).exec(board);
    assert.ok(found, `board.js declares ${declaration}`);
    return [...found[1].matchAll(/"([a-z-]+)"/g)].map((hit) => hit[1]);
  };
  const all = [...named("LANE_ICON"), ...named("TAB_ICONS"), ...named("NOTES_ICON")];
  assert.ok(all.length >= 6, "the board names a glyph for its lanes, its tabs, and its notes");
  return all;
}

/** The renderer asks for a glyph by name and the board draws it, so a rename in one file is
 *  silent in the other. These are the names the board builds for itself. */
test("every glyph the renderer names is one the board inlines", () => {
  const asked = [
    ...["behind-us", "takeable-now", "still-blocked"].map(columnIcon),
    ...["notes", "not yet specified", "out of scope", "documents"].map(foldIcon),
    ...furnitureIcons(),
  ];

  const bundled = bundledIcons();
  for (const name of asked) {
    assert.ok(name, "the renderer asked for an empty glyph name");
    assert.ok(bundled.has(name), `the board draws nothing for "${name}"`);
    assert.ok(ICON_NAMES.has(name), `config rejects "${name}"`);
  }
});

test("a lane names its own glyph, and an unknown one warns and leaves the lane standing", () => {
  const warnings = [];
  const config = validate(
    {
      lanes: [
        { name: "Done", icon: "check", match: { field: "status", equals: "done" } },
        { name: "Todo", icon: "not-an-octicon", match: { field: "status", equals: "todo" } },
      ],
    },
    warnings
  );

  assert.equal(config.lanes[0].icon, "check");
  assert.equal(config.lanes[1].icon, undefined, "the lane survives, only the icon is dropped");
  assert.equal(config.lanes[1].name, "Todo");
  assert.equal(warnings.length, 1);
  assert.match(warnings[0].reason, /unknown icon "not-an-octicon" in lanes\[1\]/);
});

test("this repository's own lanes each carry a glyph the board can draw", () => {
  const config = JSON.parse(
    readFileSync(fileURLToPath(new URL("../scratchboard.json", import.meta.url)), "utf8")
  );
  const named = config.lanes.map((lane) => lane.icon);

  assert.equal(new Set(named).size, named.length, "two lanes share a glyph, so the board repeats");
  for (const name of named) assert.ok(ICON_NAMES.has(name), `config rejects "${name}"`);
});

test("a named icon survives config validation, and an unknown one warns", () => {
  const warnings = [];
  const config = validate(
    { facets: [{ field: "priority", icon: "alert" }, { field: "status", icon: "not-an-octicon" }] },
    warnings
  );

  assert.equal(config.facets[0].icon, "alert");
  assert.equal(config.facets[1].icon, undefined, "the field survives, only the icon is dropped");
  assert.equal(config.facets[1].field, "status");
  assert.equal(warnings.length, 1);
  assert.match(warnings[0].reason, /unknown icon "not-an-octicon"/);
});
