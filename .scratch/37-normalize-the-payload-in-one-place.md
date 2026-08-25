---
title: Normalize the payload in one place
status: ready-for-agent
priority: p1
labels: [ui, payload, testing, architecture]
---

# Normalize the payload in one place

The payload is the contract. It is written down once, carefully, in the `CONTRACT` comment at
`src/ui/index.html:158-190`. It is then read back in four independent places in `board.js`, each
with its own defensive checks:

- `readGroups` at `src/ui/board.js:702-717` filters entries and defaults `kind`, `title`,
  `sections`, and `files`.
- `readInvocations` at `src/ui/board.js:719-728` filters on the type of `entry.template`.
- `readFacets` at `src/ui/board.js:1870-1893` builds the order, colour, and icon maps from
  `data.facetConfig`.
- `load` at `src/ui/board.js:1895-1972` normalizes each ticket inline.

Nothing holds the four together. A change to the contract has to be found and repeated at each
site by hand. The tests that are supposed to hold the document and the code together execute
neither side: `test/ui.test.mjs:117-130` pulls `STATE_KEYS` out of the source with a regular
expression and checks that the comment in `index.html` contains the matching quoted strings, and
line 320 checks that `index.html` contains one exact substring. No test builds a payload object
and hands it to `load` or `readGroups`.

This is the newest code in the file. The groups and invocations machinery arrived whole in the
skills-pivot commits, so it has had the least time to settle.

## The seam

One function, `normalizePayload(data)`, returning the tickets, lanes, facets, groups,
invocations, warnings, and title. Given any value that `JSON.parse` can return, it gives back a
fully defaulted payload and never throws. It is the one place the `PAYLOAD` contract has to
match.

It lands in a plain ESM file that `node:test` imports and `bake.mjs` splices, the same way
[ticket 36](./36-attack-the-markdown-renderer.md) does it. Ticket 36 goes first and sets the
pattern.

## Done when

- One exported `normalizePayload` owns every default and every type check the four sites do now.
- A test gives it a malformed payload, a missing `groups` key, a file with no `path`, and a null
  `template`, then asserts on the returned object.
- The group and invocation tests at `test/ui.test.mjs:96-105` and `239-324` are re-derived against
  the function. They are not deleted.
- Unknown keys still pass through untouched, and a test proves it.
- `node tools/guard.mjs` passes, and `package.json` gains no dependency.
