---
title: Stop exporting stripMarkdown, and test it through makeExcerpt
status: done
priority: p3
labels: [scanner, testing, architecture]
---

# Stop exporting stripMarkdown, and test it through makeExcerpt

`stripMarkdown` at `src/text.mjs:21-33` has one caller anywhere: `makeExcerpt`, on line
73 of the same file. It is exported anyway, it carries a doc comment about its own ordering
("images before links, emphasis before backslash drop"), and `test/text.test.mjs:5-46` pins
that ordering with eight tests of its own.

What `scan.mjs` actually depends on is `makeExcerpt` and `findRefs` (`src/scan.mjs:6`, used at
lines 346 and 372). `stripMarkdown` is how the per-line loop inside `makeExcerpt` works, at lines
59-78. The export makes an internal detail look like something a caller should reach for.

This is the pure function extracted for testability, with the test then written against the
extraction instead of the behaviour. Eight tests are pinned to a regular expression order that
`makeExcerpt` is free to change.

Fold `stripMarkdown` in, or keep it as a helper in the same file with no `export`. Cover the
ordering through `makeExcerpt`, which most of the file's excerpt tests already do at lines 58-91.

If line-level stripping turns out to need isolated coverage, that says `makeExcerpt` is doing two
jobs and should split along that line instead. Say so rather than restoring the export.

## Done when

- `stripMarkdown` is no longer exported.
- Its eight tests are re-derived against `makeExcerpt` output, or deleted where `makeExcerpt`
  already covers the case.
- No behaviour changes. Excerpt output is byte for byte what it is today.
- The type check passes and `npx eslint` finds no unused symbol.
