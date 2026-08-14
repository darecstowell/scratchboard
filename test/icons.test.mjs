import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { test } from "./context.mjs";
import { ICON_NAMES, validate } from "../src/config.mjs";

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
