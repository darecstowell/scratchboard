---
title: Read closed and dated status lines on map issues
status: ready-for-agent
priority: p1
labels: [wayfinder, dialect, bug]
---

# Read closed and dated status lines on map issues

The map dialect reads a child issue's `Status:` line and accepts three values, `claimed`,
`resolved`, and `out-of-scope`, by exact match on the whole lowercased value
(`src/dialect.mjs`, `readIssue` and `deriveStates`). The wayfinder skill that writes these
issues never uses the word `resolved`. It says "close the issue" and "closed ticket", so every
map written by the skill's defaults says `Status: closed`. The board reads that as nothing, the
ticket never leaves `still blocked`, and everything downstream of it stays blocked too. A
board with seven finished sessions shows zero behind us.

Observed on the OffMain board, `.scratch/263-apple-ui-recut-map/issues/`: five resolved
tickets said `Status: closed`, one claimed ticket said `Status: in-progress`, and the map
rendered as three takeable and twelve still blocked. Six older maps on the same board carry
the dated form, which fails the same way:

```
Status: closed
Status: closed (resolved 2026-07-12)
Status: closed (2026-07-19)
Status: **closed — out of scope (2026-08-05)**
Status: in-progress
Status: resolved 2026-07-14
```

## The fix

Read the first word of the status value, case-insensitive, after stripping bold markers, and
map it:

- `resolved`, `closed`, `done` → resolved
- `claimed`, `in-progress` → claimed
- `out-of-scope`, `wontfix` → out of scope
- `open`, or anything else → open, as today

Anything after the first word stays on the line and is ignored by the reader, so a date or a
parenthetical costs nothing. `closed — out of scope` is the one ambiguous case: the first word
says resolved. Accept that; a map that wants the out-of-scope lane writes the value the spec
names.

Update `docs/local-markdown-spec.md` to list the accepted synonyms, and add a test in the
dialect suite with the six lines above.

## Acceptance

- [ ] The six status lines above derive resolved, resolved, resolved, resolved, claimed, resolved.
- [ ] `npx scratchboard --scan` on a map whose finished tickets say `Status: closed` puts them
      behind us and unblocks their dependents.
- [ ] The spec names the synonyms.
