---
title: Run compare-detection in CI, on this repo's own corpus
status: ready-for-agent
priority: p2
labels: [ci, scanner, testing]
---

# Run compare-detection in CI, on this repo's own corpus

AGENTS.md calls the two comparison tools the acceptance test, and says they are stronger than the
unit suite. It tells a contributor to run both for any change to `scan.mjs`, `parse/`,
`detect.mjs`, or `config.mjs`. Neither appears anywhere in `.github/workflows/`.

For `compare-python.mjs` that gap is structural. It needs a second repo, checked out at one
commit, which is a design decision of its own.

For `compare-detection.mjs` it is not. That tool needs this repo and nothing else. It runs
`--scan` twice, once against the committed config and once with detection alone, and diffs the
two. AGENTS.md already treats this repo's own `.scratch/` as a maintained fixture: the demo scans
with no warnings, 26 tickets on the lanes, and no `Unmapped` lane.

So the deepest available check for a detection or config regression has no way into CI, while the
corpus it needs is already in the tree. `scan.mjs` and `dialect.mjs` are both under active change,
so this is a live gap.

This is not [ticket 28](./28-lockfile-for-the-npx-tooling.md). That one pins the versions `npx`
fetches. This one is about a tool that never runs.

## Done when

- `checks.yml` runs `node tools/compare-detection.mjs .` against the working tree.
- The step installs nothing, in keeping with the guard job beside it.
- The check compares two live runs, so it stays true as `.scratch/` grows. It does not assert a
  fixed ticket count.
- A deliberate break in `detect.mjs` turns the step red. Verify this before merging.
- `compare-python.mjs` is left out on purpose, and this ticket says why.
