---
title: Give compare-detection a corpus it can run against in CI
status: ready-for-agent
priority: p2
labels: [ci, scanner, testing]
---

# Give compare-detection a corpus it can run against in CI

AGENTS.md calls the two comparison tools the acceptance test, and says they are stronger than the
unit suite. It tells a contributor to run both for any change to `scan.mjs`, `parse/`,
`detect.mjs`, or `config.mjs`. Neither appears anywhere in `.github/workflows/`.

For `compare-python.mjs` the gap is structural. It needs a second repo, checked out at one
commit, which is a design decision of its own.

For `compare-detection.mjs` the first answer looks easy and is wrong. The tool takes a corpus
path, so `node tools/compare-detection.mjs .` looks like it would work. It does not. Run it on
this repo today and it reports FAIL in all four categories and exits 1.

The reason is `SPEC_CONFIG` in `tools/corpus.mjs:12-30`. It is the OffMain example from the spec,
verbatim, and `compare-detection.mjs:82` writes it over the corpus for the config run. Its
`tickets` glob is `.scratch/**/issue.md` and its lanes match on path: `.scratch/todo/**`,
`.scratch/in-progress/**`, `.scratch/done/**`.

This repo has no file called `issue.md` and no such folders. The backlog is flat, `status` is the
lane, and the glob is `.scratch/**/*.md`. So the config run finds 0 tickets, detection finds 39,
and every category differs. The tool is not broken. It needs a corpus in the OffMain layout, and
this repo is not one.

Pointing it at this repo's own `scratchboard.json` instead does not rescue it. Detection cannot
guess a lane that reads a `status` field, so a status-lane repo and a detection run legitimately
disagree. That divergence is correct behaviour and would make the check a permanent red.

## What would close it

Commit a small corpus in the OffMain layout, and run the tool against that. A dozen ticket files
under `.scratch/todo/`, `.scratch/in-progress/`, and `.scratch/done/`, each an `issue.md`, is
enough to exercise path lanes, `idPattern`, and all three facet fields. It lives beside the
tooling, not in `.scratch/`, so the demo board never scans it.

The cost is a second corpus to keep honest. The gain is that the deepest available check for a
detection or config regression runs on every push instead of waiting for a contributor to
remember AGENTS.md.

This is not [ticket 28](./28-lockfile-for-the-npx-tooling.md). That one pins the versions `npx`
fetches. This one is about a tool that never runs.

## Done when

- A fixture corpus in the OffMain layout is committed outside `.scratch/`, and the demo scan still
  reports no warnings and does not count it.
- `node tools/compare-detection.mjs <fixture>` passes.
- `checks.yml` runs it. The step installs nothing, in keeping with the guard job beside it.
- A deliberate break in `detect.mjs` turns the step red. Verify this before merging.
- `compare-python.mjs` is left out on purpose, and this ticket says why.
