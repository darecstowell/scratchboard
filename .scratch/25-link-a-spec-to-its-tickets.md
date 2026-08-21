---
title: Decide whether a spec points at its tickets, or only sits beside them
status: needs-triage
priority: p3
labels: [docs, config, detection]
---

# Decide whether a spec points at its tickets, or only sits beside them

Local markdown stores no parent pointer in either direction. A `to-tickets` feature is a
`spec.md` next to an `issues/` folder, and the only thing that ties the two together is that they
share a directory.

[How the board recognizes an effort folder](./skills-pivot/issues/03-recognize-an-effort-folder.md)
made that colocation enough for the board: a lead document beside an `issues/` folder is a group,
and every file under the group root belongs to it. So nothing is broken today.

What is open is whether a field should exist anyway. A pointer would survive a file moving out of
the folder, and it would let one spec own tickets that live somewhere else.
[The reader spec ticket](./skills-pivot/issues/01-own-the-local-tracker-spec.md) settled that
upstream wins every name it defines, so inventing a field here means inventing it in this repo's
dialect and then living with the drift if upstream later picks a different name.

## Done when

- Either a field is defined in the dialect and the reader spec documents it, or the answer is
  recorded as "colocation is the link" and this ticket closes as `wontfix`.
- If a field lands, a ticket with no pointer still reads exactly as it does today.
