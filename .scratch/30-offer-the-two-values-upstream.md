---
title: Decide whether to offer done and out-of-scope upstream
status: needs-triage
priority: p3
labels: [docs, non-goal]
---

# Decide whether to offer done and out-of-scope upstream

Scratchboard invented two values that upstream is silent about.
[The sixth state ticket](./skills-pivot/issues/02-name-the-sixth-state.md) added `done`, because
the five triage roles are a queue and not a lifecycle. Wayfinder's dialect gained `out-of-scope`
beside `claimed` and `resolved`, for a ticket ruled past the destination.

[The reader spec ticket](./skills-pivot/issues/01-own-the-local-tracker-spec.md) settled that the
board follows upstream additively and that upstream wins every name it defines. It said nothing
about pushing back the other way.

Two ways to hold this:

- Contribute them. If upstream adopts the names, the drift risk goes away and the reader spec gets
  shorter. It also means a third party's release cadence now decides when this repo's vocabulary
  can change.
- Hold them as this project's dialect. No coordination cost, and the reader spec keeps carrying the
  difference. This is the status quo and it works.

There is no code in this ticket either way. It is a decision about the relationship.

## Done when

- A decision is recorded, and it says which of the two values it covers. They are not one question:
  `done` fills a gap upstream has, and `out-of-scope` belongs to a skill upstream owns.
- If it is contribute, the issue or pull request exists and is linked from here.
- If it is hold, the reader spec says these two are scratchboard's own and why.
