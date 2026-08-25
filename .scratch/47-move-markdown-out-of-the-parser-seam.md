---
title: Move parse/markdown.mjs out of the parser seam
status: ready-for-agent
priority: p3
labels: [scanner, architecture]
---

# Move parse/markdown.mjs out of the parser seam

`src/parse/` looks like three adapters at one seam. It is two, plus one file filed by topic.

`yaml-frontmatter.mjs` and `key-value-block.mjs` are real adapters. Both satisfy the same
interface, a `parse` and a `claims`. Both are registered in `PRESETS` at `src/scan.mjs:12-15`.
Both are consumed the same way by `scan.mjs` (`loadParser`, line 79) and by `detect.mjs`
(`parsingCount` line 165, `pickFormat` lines 249-264, `readFields` lines 266-275). Two adapters
behind one interface is a real seam.

`markdown.mjs` is in none of it. It exports no `parse` and no `claims`, it is not in `PRESETS`,
and `scan.mjs:6` imports it by name whatever preset is chosen. A reader looking for "the parser
interface" has to open all three files to learn that only two of them plug in.

Delete `markdown.mjs` and the seam is untouched. Its excerpting and ref-finding would move
straight into `scan.mjs`, with nothing to do with format detection. That confirms it is not a
third adapter.

Move it to `src/text.mjs` or `src/excerpt.mjs`, and `parse/` becomes an honest map of the seam.

## Done when

- `markdown.mjs` sits outside `src/parse/`, and the import in `src/scan.mjs:6` follows it.
- `test/markdown.test.mjs` follows too, and every test still passes.
- No behaviour changes at all. This is a move.
- `src/parse/` holds only files that satisfy the `parse` and `claims` interface.
- `node tools/guard.mjs` passes.
