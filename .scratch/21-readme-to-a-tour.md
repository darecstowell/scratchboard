---
title: Cut the README to a tour and move reference into docs
status: done
priority: p2
labels: [docs]
---

# Cut the README to a tour and move reference into docs

The README had grown into a manual. Every config key, every payload field, and the whole
detection heuristic sat above the fold, so a reader deciding whether to run one command had
to scroll past material written for someone already committed.

## Shipped

The README is a tour: what it does, one command, and the reason it is read-only. Every
reference table moved to `docs/reference.md`, which now carries the config keys, the lane and
facet rules, the detection heuristic, and the payload contract.

Nothing was deleted. The split is by reader, not by value.
