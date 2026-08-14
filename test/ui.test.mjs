import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { test } from "./context.mjs";

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
