---
title: Warn on duplicate ids once, not twice
status: ready-for-agent
priority: p2
labels: [scanner, warnings, architecture]
---

# Warn on duplicate ids once, not twice

`scan()` builds the same map of id to paths twice, and pushes the same shape of warning from both.

`scopeIds` at `src/scan.mjs:182-196` does it for the files in one group. The block at
`src/scan.mjs:356-368` does it again, inline, for the whole board. The only real difference is
the noun in the message: "files in" the group against "tickets".

Nothing keeps the two in step. `scopeIds` buys no leverage, because the second site did not use
it. A change to what counts as a collision, treating ids without case for example, is two edits
with no help from the compiler or the suite if one is missed.

Both arrived in the same commit, `a5cc146`, which recognized groups. Neither has grown a third
caller yet, so this is the cheapest moment to fold them.

## The seam

One function that takes the warnings array, a list of id and path pairs, and the describing
label. Both passes call it. The label carries the wording difference, so the rule for what counts
as a collision lives in one place.

## Done when

- One function owns the collision rule and the message wording, and both passes call it.
- The exact `reason` strings do not change. `test/scan.test.mjs` asserts on them near lines 292
  and 495, so those tests pass untouched.
- The function has a direct test, not only coverage through two full `scan()` runs.
- `node tools/compare-python.mjs` and `node tools/compare-detection.mjs` both agree against a real
  repo, because AGENTS.md requires it for any change to `scan.mjs`.
