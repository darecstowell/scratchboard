import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const css = readFileSync(new URL("../src/ui/board.css", import.meta.url), "utf8");

/** WCAG 2.x relative luminance and contrast, so the bar is checked and not asserted by eye. */
function luminance(hex) {
  const channels = hex.replace("#", "").match(/../g).map((pair) => parseInt(pair, 16) / 255);
  const [r, g, b] = channels.map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a, b) {
  const one = luminance(a);
  const two = luminance(b);
  return (Math.max(one, two) + 0.05) / (Math.min(one, two) + 0.05);
}

function tokens(selector) {
  const at = css.indexOf(selector);
  assert.notEqual(at, -1, `${selector} is no longer in the stylesheet`);
  const block = css.slice(at, css.indexOf("}", at));
  const found = {};
  for (const [, name, value] of block.matchAll(/--([\w-]+):\s*(#[0-9a-f]{6})/g)) found[name] = value;
  return found;
}

const THEMES = [
  ["latte", tokens('html[data-theme="latte"]')],
  ["phosphor", tokens('html[data-theme="phosphor"]')],
];

const TEXT = 4.5;
/* every one of these carries text somewhere: bg-deep under the two search boxes,
   bg-overlay under every hover. One named background checks none of the others. */
const SURFACES = ["bg-deep", "bg-root", "bg-surface", "bg-raised", "bg-overlay"];

for (const [name, theme] of THEMES) {
  test(`${name} carries every text tone at ${TEXT} to 1 or better on every surface`, () => {
    for (const tone of ["fg-1", "fg-2", "fg-3", "fg-4"]) {
      for (const surface of SURFACES) {
        const got = contrast(theme[tone], theme[surface]);
        assert.ok(got >= TEXT, `${tone} ${theme[tone]} is ${got.toFixed(2)} on ${surface}`);
      }
    }
  });

  test(`${name} keeps four foreground tones a reader can tell apart`, () => {
    const steps = ["fg-1", "fg-2", "fg-3", "fg-4"].map((tone) => luminance(theme[tone]));
    const lstar = steps.map((y) => (y > 0.008856 ? 116 * Math.cbrt(y) - 16 : y * 903.3));
    for (let i = 1; i < lstar.length; i += 1) {
      const gap = Math.abs(lstar[i] - lstar[i - 1]);
      assert.ok(gap >= 5, `steps ${i} and ${i + 1} are ${gap.toFixed(1)} apart in lightness`);
    }
  });

  test(`${name} badge text clears ${TEXT} to 1 on its own tint`, () => {
    for (const accent of ["green", "amber", "red", "cyan"]) {
      const got = contrast(theme[accent], theme[`${accent}-tint`]);
      assert.ok(got >= TEXT, `${accent} ${theme[accent]} is ${got.toFixed(2)} on its tint`);
    }
  });

  test(`${name} draws a control boundary a reader can see`, () => {
    const got = contrast(theme["line-2"], theme["bg-surface"]);
    assert.ok(got >= 3, `line-2 ${theme["line-2"]} is ${got.toFixed(2)} on bg-surface`);
    assert.ok(
      contrast(theme["line-1"], theme["line-2"]) >= 1.6,
      "the two line tones stay visibly different"
    );
  });
}

test("the default tokens match the latte theme block", () => {
  const root = tokens(":root {");
  const latte = tokens('html[data-theme="latte"]');
  for (const [name, value] of Object.entries(latte)) {
    assert.equal(root[name], value, `--${name} differs between :root and the latte block`);
  }
});

test("a long token in the detail body wraps rather than scrolling the drawer", () => {
  const at = css.indexOf(".detail-body {");
  const block = css.slice(at, css.indexOf("}", at));
  assert.match(block, /overflow-wrap:\s*anywhere/);
  assert.match(block, /overflow-x:\s*hidden/);
});

test("the clear-filters button lives in the toolbar and ships hidden", () => {
  const html = readFileSync(new URL("../src/ui/index.html", import.meta.url), "utf8");
  const bar = html.slice(html.indexOf('<div class="bar">'), html.indexOf("</div>", html.indexOf('<div class="bar">')));
  assert.match(bar, /id="clear-filters"[^>]*hidden/);
  assert.equal(html.split('id="clear-filters"').length - 1, 1, "one button, one id");
  assert.match(css, /\.btn-clear\[hidden\] \{ display: none; \}/);
});

test("the card keeps a focus ring on an engine with no :has()", () => {
  assert.equal(css.split(".tkt-open:focus-visible").length - 1, 2, "one reset, one card rule");
  assert.match(
    css,
    /@supports selector\(:has\(\*\)\) \{\s*\.tkt-open:focus-visible \{ outline: none; \}\s*\}/,
    "the outline reset sits outside a :has() feature query"
  );
  assert.match(css, /\.tkt:has\(\.tkt-open:focus-visible\)\s*\{[^}]*outline:\s*var\(--focus-outline\)/);
});

test("the notice announces itself to a screen reader", () => {
  const html = readFileSync(new URL("../src/ui/index.html", import.meta.url), "utf8");
  /* one whole tag, never a window over its neighbours: `[^>]` cannot cross a tag boundary */
  const notice = html.match(/<[^>]*\sid="notice"(?=[\s/>])[^>]*>/)?.[0] ?? "";
  assert.ok(notice, "the notice element is no longer in the template");
  assert.match(notice, /role="status"/);
  assert.match(notice, /aria-live="polite"/);
});

const board = readFileSync(new URL("../src/ui/board.js", import.meta.url), "utf8");

test("every lane count reads the payload total, not the rendered record count", () => {
  const lines = board.split("\n").filter((text) => text.includes("lane.count.textContent"));
  assert.ok(lines.length, "the lane count assignment is no longer in board.js");
  for (const line of lines) {
    assert.match(line, /lane\.total/);
    assert.equal(line.includes("lane.records.length"), false, "the count must not re-derive the total");
  }
});

test("a repaint carries the search text that is still inside the debounce", () => {
  const start = board.indexOf("function capture()");
  const snapshot = board.slice(start, board.indexOf("function restore(", start));
  assert.match(snapshot, /value:\s*el\.search\.value/, "capture() drops the typed value");

  const restore = board.slice(board.indexOf("function restore("), board.indexOf("function render("));
  assert.match(restore, /el\.search\.value\s*=\s*memory\.search\.value/, "restore() never puts it back");
});
