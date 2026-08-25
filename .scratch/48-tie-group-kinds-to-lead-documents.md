---
title: Tie GROUP_KINDS to LEAD_DOCUMENTS
status: needs-triage
priority: p3
labels: [config, dialect, testing]
---

# Tie GROUP_KINDS to LEAD_DOCUMENTS

`src/dialect.mjs:10-14` names the three kinds through `LEAD_DOCUMENTS`: effort, feature, and
context. `src/config.mjs:22` names them again, as `GROUP_KINDS`, plus `none`, to validate the
`groups` config key at line 194.

This is not a break of the rule that config names no vocabulary. AGENTS.md is explicit that
`groups` declares structure, so `config.mjs` holding the kind strings is inside the rule.

The gap is that nothing ties the two lists together. `test/dialect.test.mjs:103-104` checks
`LEAD_DOCUMENTS` against the spec, and line 179 checks `GROUP_KINDS` against the spec, each on its
own. They agree today only because both happen to match the same prose.

Add a fourth kind to the dialect and to the spec, forget `config.mjs`, and both tests still pass.
The break surfaces later, as a spurious "unsupported kind" warning from `config.mjs:194` when
somebody writes the new kind into `scratchboard.json`.

## Why this is not ready for an agent

The failure needs a fourth kind to exist, and there is no plan for one. Two safety nets that agree
by accident is a real smell, and the fix is one derived constant or one test, so the cost is near
zero. Whether that earns a change to a file the whole config read depends on is the open question.

The architecture review rated this speculative. It is on the board so the observation survives.

## Done when

- Someone decides whether a fourth kind is ever likely.
- If it is: `GROUP_KINDS` is derived from `LEAD_DOCUMENTS` plus `none`, or one test asserts the
  two stay in step.
- If it is not: this ticket carries `wontfix` and says the two lists agree by inspection.
