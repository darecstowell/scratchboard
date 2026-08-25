---
title: Give the dialect one entry point for assembling a group
status: ready-for-agent
priority: p1
labels: [scanner, dialect, architecture]
---

# Give the dialect one entry point for assembling a group

`src/dialect.mjs` says of itself that it is "the one place scratchboard names the upstream layout,
so the rest of the codebase learns no upstream vocabulary" (lines 4-8). It is not. It exports 36
thin pieces, and `scan.mjs` does the assembly, so upstream vocabulary is on both sides of the
seam.

Look at where the branches live:

- `groupFiles` at `src/scan.mjs:153-180` calls `dialect.roleOf` for the role, falls back through
  three sources for the title at lines 160-163, and attaches `file.status` only when
  `plan.kind === "context"` at line 171. That is a branch on the dialect's own vocabulary,
  written in `scan.mjs`.
- `addEffortState` at `src/scan.mjs:199-221` is gated by `plan.kind === "effort"` at its call
  site on line 292, zips `dialect.readIssueFields` against `dialect.deriveStates` at lines
  201-202, and reaches for `dialect.CLAIMED` at line 212.
- The ordinary ticket path at `src/scan.mjs:335-354` repeats the id fallback from `groupFiles`
  line 168 word for word.

The two paths also enforce different rules, and only one of them is deliberate. A top-level
ticket with no title is dropped into `warnings` at `src/scan.mjs:321-324`, and
`test/scan.test.mjs:181-201` guards that. A group file with no title and no heading falls silently
back to its slug. No warning, and no test covers it.

## The seam

One entry point on the dialect that takes the plan, the held files, and the config, and returns
the assembled group: its title, its sections, and its files. Every branch on kind, every title and
id fallback, and the state and status wiring move inside it. `scan.mjs` calls it once per group
instead of importing ten symbols and re-deriving the branches.

The dialect keeps its text-reading pieces, which earn their keep: `splitSections`,
`readIssueFields`, `contextLinks`, and the path fence in `inRoot`.

This does not reopen ADR-0003. Derived state stays at scan time. It moves where inside scan time
the derivation happens.

## Done when

- One exported function assembles a group, and `scan.mjs` imports one dialect symbol for that job
  instead of ten.
- The id and title fallback is written once, not twice.
- A group file with no title and no heading raises a warning with its path and its reason, and a
  test proves it.
- `test/dialect.test.mjs` still fails when `docs/local-markdown-spec.md` and `src/dialect.mjs`
  disagree.
- `node tools/compare-python.mjs` and `node tools/compare-detection.mjs` both agree against a real
  repo, because AGENTS.md requires it for any change to `scan.mjs` or the dialect.
