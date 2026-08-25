---
title: Stop exporting four detect internals nothing calls
status: done
priority: p3
labels: [scanner, architecture]
---

# Stop exporting four detect internals nothing calls

`src/detect.mjs` exports four functions that only `detect()` calls: `findCandidates` at line 171,
`candidateSets` at line 216, `readTexts` at line 232, and `pickFormat` at line 249. Each has one
call site, inside `detect()` at lines 360 and 372-374.

Nothing else imports them. `test/detect.test.mjs` imports `detect`, `failure`, and
`looksLikeTicket` only.

An export states a seam: swap how candidates are found, swap how the preset is scored. Nothing
varies across either one. One adapter and no second caller is a hypothetical seam, and it makes
the module's stated interface ten things to hold stable instead of six.

## Done when

- `findCandidates`, `candidateSets`, `readTexts`, and `pickFormat` lose their `export`.
- `detect`, `configFrom`, `failure`, `looksLikeTicket`, `interactive`, and `init` keep theirs.
  Those are what `board.mjs`, `bake.mjs`, and the tests use.
- No test changes, because none of the four is imported anywhere.
- `npx eslint` finds no unused symbol, and the type check passes.
