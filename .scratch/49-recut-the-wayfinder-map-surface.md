---
title: Recut the wayfinder map surface
status: done
priority: p2
labels: [ui, wayfinder, design, css]
---

# Recut the wayfinder map surface

A wayfinder map is the newest surface on the board, and it is the one a person reads while they
decide what to do next. Today it does not help them. The header band holds nine tallies that
belong to a different tab. The destination text and four fold rows push the diagram below the
fold, so the map is off screen when the page loads. The columns hold their width, so half of a
wide screen is empty. Every edge is drawn at all times, so the diagram reads as a knot. Resolved
work sits in a collapsed rail called `behind us`, which no reader has asked to open.

This ticket recuts that surface. Each decision below was made against a working prototype, not
against a description.

## The decisions

**The header tallies leave the map.** The counts in `.hd-counts` report the whole board. They are
correct on the board tab and wrong on every other tab, because a reader on a map is not looking
at the backlog. They also repeat what the lane headers already say. Remove the strip. The header
keeps the product name, the scan notes button, and the theme control.

**The destination and the folds move to a left rail.** Title, destination text, and the four fold
rows (`Notes`, `Not yet specified`, `Out of scope`, `Documents`) go into a fixed column on the
left. The diagram takes the width that is left and scrolls inside it. This frees the height and
fills the empty half at the same time.

**`behind-us` becomes `Done` on screen, and stays `behind-us` in the data.** The lane label comes
from `columnName` at `src/ui/board-render.mjs:14`, which derives it from the key. Add a label
map beside that function for this one key. Do not rename the dialect value. Two reasons. The
string `done` already carries a different meaning in this repo, as a triage `status` on a backlog
ticket, and reusing it for a derived `state` would make one word mean two things. And the key is
published in `docs/local-markdown-spec.md:210` and held to `src/dialect.mjs` by
`test/dialect.test.mjs:176`, so renaming it is a spec change for a display problem.
`test/ui-board-render.test.mjs:45` asserts the pure derivation today and must be rewritten.

**The Done lane opens, and it reads first.** The lane is no longer folded. Column order is
`Done`, `Takeable now`, `Still blocked`. That is dependency order and it is time order: settled
ground, then the edge of the known, then the fog. Every edge then runs left to right. The kanban
habit of putting Done last was considered and rejected, because these columns are not workflow
stages. Done is what the rest stands on.

**A Done card shows its answer.** `docs/agents/issue-tracker.md:73` already tells an agent to
append the answer under an `## Answer` heading when it resolves an issue. `src/dialect.mjs:333`
already puts the whole file text on `file.body`, and `src/ui/payload.mjs` already passes it
through. So the text is in the payload today, and nothing reads it.

Add a pure helper in `src/ui/board-render.mjs` that takes a body string and returns the
`## Answer` section. `cardHtmlFor` renders it under the title for a card in the `behind-us`
state. No parser change, no payload change, no spec change. The scanner keeps its contract.

This is a deliberate call to read structure in the renderer rather than in the parser. A field in
the payload is the stronger shape, and it is a follow-up ticket, not this one.

**Edges hide until they are asked for.** No edge is drawn at rest. Hovering a card draws its
edges, both the ones into it and the ones out of it. Each line draws from source to target over
220ms on `cubic-bezier(0.23, 1, 0.32, 1)`, staggered 40ms apart, with the arrowhead appearing
when its line lands. While the pointer stays on the card, a slow dash travels along the drawn
lines to show direction.

The existing focus behaviour stays. `focusCard` at `src/ui/board.js:693-718` already dims the
cards that are not downstream, and `downstreamOf` already walks the graph. This ticket changes
what the edges do, not what the cards do.

Motion is CSS, never `requestAnimationFrame`. `src/ui/board.css:1660` already disables every
transition and animation under `prefers-reduced-motion`, so a CSS implementation is covered and a
JavaScript one is not.

**The edge layer paints above the lanes and below the cards.** Nothing sets `z-index` today. The
cards win by accident: `.wf-card` is `position: relative`, and `.wf-cols` comes after `.wf-edges`
in the markup. Once a lane has an opaque background, an unlayered edge disappears behind it. Set
an explicit `z-index` on `.wf-edges` above the lane panel and on `.wf-card` above the edge, so
the order is stated rather than inherited from source order.

**The page fills the screen, and the lanes share it.** Remove `max-width: 1720px` from `.frame`
at `src/ui/board.css:308`. Give the wayfinder lane a `flex-grow` and a `max-width` near 520px:
`.wf-col` is `flex: 0 1 264px` today, so it does not stretch. Give the kanban lane the same cap:
`.col` at `src/ui/board.css:649` already stretches and has no cap, so on a wide screen a lane
grows without limit. The cap holds the text to a readable measure.

The breakpoints at `src/ui/board.css:1245-1255` key off the viewport, not off `.frame`, so
uncapping does not disturb them.

**A lane becomes a panel, and the scanlines come up.** The lane gets an opaque `--bg-surface`
background and its cards get a faint inset highlight on the top edge, so the surface reads as
three levels instead of one. `.wf-col-head` already carries its bottom rule.

Raise `--scanlines` at `src/ui/board.css:145` from 3 percent to 6 percent, and give the lane
panel its own scanline at 2 percent. No scanline goes behind card text: a card paints an opaque
`--surface-card`, so the texture stops at the card edge. This matters because
`test/theme.test.mjs` reads colour tokens out of three theme blocks and computes contrast from
the hex pairs alone. It cannot see a gradient, so a gradient behind text would pass a test that
proves nothing.

**Icons name the lanes, the folds, and the map tabs.** A lane header, each of the four fold rows,
and each wayfinder map tab get a glyph. The scan notes button gets an alert glyph in amber, so
the one control that reports a problem does not look like the theme switch beside it. Both
buttons take the same height.

Every glyph is Octicons path data, copied from the `@primer/octicons` source. The zero dependency
rule means the package is never installed, so each glyph is a literal in `src/ui/board.js`. Each
new name also goes in `ICON_NAMES` at `src/config.mjs:25` and in the reference table, because
`test/icons.test.mjs` holds the two lists together.

## Slices

`src/ui/board.css` and `src/ui/board.js` are each touched by more than one decision, so the work
is ordered by the file it owns rather than by the feature it serves. Two slices that share a file
never run at the same time.

1. **Render helpers.** `src/ui/board-render.mjs`, `test/ui-board-render.test.mjs`. The label map,
   the answer extractor, `cardHtmlFor`, column order, and the left rail markup.
2. **Edge behaviour.** `src/ui/board.js`, plus the geometry move into `board-render.mjs`. Depends
   on slice 1 landing first, because both write `board-render.mjs`.
3. **Icons.** `src/ui/board.js`, `src/config.mjs`, `test/icons.test.mjs`, the reference table.
   Depends on slice 2, same file.
4. **Stylesheet.** `src/ui/board.css` alone. Width, lane panels, scanlines, layering, the rail,
   and the notes button.
5. **Header strip removal.** `src/ui/index.html`, `src/ui/board.js`. `test/ui.test.mjs` reads
   only the `.bar` block, and `.hd-counts` sits outside it, so the toolbar assertions do not move.

## Checks

`npm test` on Node 18 and on current, and `node tools/compare-detection.mjs tools/fixtures/offmain`.

The comparison runs ARE required. This ticket was written before the lane icon key existed, and
that work changed `src/config.mjs` validation and the lane records `src/scan.mjs` emits, which is
exactly what those runs guard. `compare-detection` passes locally and in CI. `compare-python`
stays a local step, because it needs a second repository at one commit.

Bake the demo board and read it. The scan must stay at zero warnings and the lanes must hold the
same ticket count as before.

## Out of scope

A density pass. The word overwhelming covered both hierarchy and spacing, and only hierarchy is
answered here.

An `answer` field in the payload, owned by the parser and published in the spec. That is the
stronger shape and it is a separate ticket.

[Ticket 39](./39-split-the-wayfinder-box-math-from-the-dom-read.md) holds the split of `boxesOf`
from `edgeShape`. It was parked because the shape was not settled. Slice 2 settles the edge
shape, so the `edgeShape` half moves here and the `layoutBoxes` half stays on 39.

## Comments

**2026-08-28, shipped as PR 34 (`1f76484`) and PR 35 (`80476da`), released in 0.4.0.**

Every decision above shipped. Three claims in the body were wrong and the work proved it. The
answer text was already in the payload on `file.body`, so no parser change was needed and the
renderer reads the `## Answer` section itself. The same-column bulge already existed in
`edgeShape`. Four `z-index` values already existed elsewhere in the stylesheet, though none in the
map.

Two things arrived that the ticket did not name. A lane now names its own `icon` in config,
because a single hardcoded glyph on every lane carries no information and put lane vocabulary in
the source. A keyboard user had lost the graph entirely once edges became hover-only, so `focusin`
draws the same edges a hover does.

Left undone on purpose: the density pass, and an `answer` field owned by the parser and published
in the spec. Ticket 51 owns the second.
