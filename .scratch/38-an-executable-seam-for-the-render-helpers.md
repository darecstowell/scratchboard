---
title: Give the render helpers an executable seam
status: done
priority: p1
labels: [ui, testing, architecture]
---

# Give the render helpers an executable seam

`src/ui/board.js` is 2044 lines behind zero exports. Nothing in this repo runs a DOM, and a DOM
library would break the rule that pays for everything else, so `test/ui.test.mjs` tests the file
by reading it.

Every one of its 25 tests works the same way. It finds a function with
`board.indexOf("function columnHtml(")`, cuts forward to the next `"\n  }"`, and matches a
literal fragment of the implementation. Line 138 matches the exact statement
`const folded = key === "behind-us";`. Line 192 matches an exact ternary. The cut assumes
two-space indentation and no earlier closing brace at that depth.

The interface a test author has to learn is not "what happens when a card is clicked". It is the
internal names, the internal structure, and the indentation of the file. That is the interface
being as complex as the implementation, because it is the implementation. A rename with no
change in behaviour turns the suite red. A logic error that leaves the matched substring in place
keeps it green.

## The seam

Move the pure, data-in and string-out functions into `src/ui/board-render.mjs`, which touches no
`document` and no `window`. `downstreamOf`, `inBoardTarget`, `columnHtml`, `cardHtmlFor`, and
`headHtml` are the first set. `board.js` keeps the event wiring and calls into it.

`downstreamOf` at `src/ui/board.js:1103-1116` needs one change to move: it reads `wf` from the
closure above it, so it cannot be called until a real DOM has built that object. It takes the
edge list as a parameter instead.

`bake.mjs` already splices several files into one HTML output. It splices this one too. Text
concatenation, no bundler, no dependency.

[Ticket 36](./36-attack-the-markdown-renderer.md) sets the extract-and-splice pattern and goes
first. [Ticket 37](./37-normalize-the-payload-in-one-place.md) uses the same pattern. Do this one
after both, function by function, with the bake tests green at each step.

## Done when

- `src/ui/board-render.mjs` exports the pure helpers, and `board.js` imports nothing else from
  them.
- `downstreamOf` takes its edges as a parameter, and a test walks a small edge list and asserts
  on the returned set.
- Each moved function has a test that calls it and asserts on the returned string.
- Every source-text test these replace is deleted.
- The baked board is still one file, and `test/bake.test.mjs` proves it.
- `node tools/guard.mjs` passes, and `package.json` gains no dependency.
