---
title: Decide whether the triage roles need a way to say a ticket is started
status: needs-triage
priority: p2
labels: [docs, config]
---

# Decide whether the triage roles need a way to say a ticket is started

The migration to status lanes deleted `in-progress/`, and nothing replaced it. "In progress" lived
only in the folder name, so it is now unsayable.

The six values cannot express it, and that is by design: they say what a ticket needs, not whether
anyone picked it up. `ready-for-agent` still reads `ready-for-agent` while an agent is halfway
through it.

Wayfinder's dialect already solved the same problem with `claimed`, which is a different axis from
readiness and lives beside `resolved` and `out-of-scope`.

Three shapes, and they are not equal:

- A seventh `status` value. Cheapest, and it cuts straight against
  [the one-field decision](./skills-pivot/issues/02-name-the-sixth-state.md), which chose a value
  over a field because a value costs less to invent than a field name.
- A second field, `claimed` or an assignee. Honest about being a second axis, and it is a new field
  name in the published dialect.
- Nothing. The board is read-only and a card that is being worked usually has an agent attached to
  it in some other window.

## Done when

- One of the three is chosen, with the reason recorded.
- If anything lands, `docs/agents/triage-labels.md` and the reader spec both say it.
- A ticket written before the change still places in the same lane after it.
