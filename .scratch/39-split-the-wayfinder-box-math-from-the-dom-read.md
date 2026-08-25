---
title: Split the wayfinder box math from the DOM read
status: needs-triage
priority: p3
labels: [ui, wayfinder, testing, architecture]
---

# Split the wayfinder box math from the DOM read

`boxesOf` at `src/ui/board.js:1042-1065` calls `getBoundingClientRect` on the section and on each
node, inline with the row-slicing math for a folded column. The measurement and the arithmetic
are one function, so neither can be tested alone.

`edgeShape` at `src/ui/board.js:1068-1080` is already pure. Two box records in, an SVG path
string out, including the bulge case for two nodes in one column. It needs no change to be
testable. It is simply untested, and `test/ui.test.mjs:167-178` matches its body as text instead.

The split is small: a pure `layoutBoxes(rects, files, folded)` that takes rects already measured,
and a thin wrapper that does the measuring.

## Why this is not ready for an agent

The effort view is flagged experimental in the README, and it is the newest code in the file. The
argument for waiting is that a test surface hardens the shape it is written against, and this
shape is not settled. The argument for doing it is that `edgeShape` is free to test today.

The architecture review that raised this recommended holding it. It is on the board so the
question is not lost, not because the answer is known.

[Ticket 38](./38-an-executable-seam-for-the-render-helpers.md) builds the module this would land
in, so nothing here is blocked on design once the view settles.

## Done when

- Someone decides whether the effort view is settled enough to pin.
- If it is: `layoutBoxes` is pure and tested, `edgeShape` has input and output tests including the
  same-column bulge, and the source-text tests are deleted.
- If it is not: this ticket carries `deferred` and says what would change the answer.
