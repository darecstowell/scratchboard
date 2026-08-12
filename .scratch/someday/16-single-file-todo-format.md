---
title: Reading a single-file TODO.md stays out of scope
status: deferred
priority: p3
labels: [non-goal, parser]
---

# Reading a single-file TODO.md stays out of scope

One ticket is one file. That assumption runs through everything: the path is the identity, a
lane matches on it, the warnings panel names it, and `c` copies it.

A single-file board breaks all of that at once. A heading inside `TODO.md` has no path, so
lanes cannot match on one, git dates cannot key on one, and a warning cannot point at one.
Supporting both shapes means two identity models in one scanner.

`md-kanban` handles that shape and handles it well. The README points at it.

This ticket exists so the answer is on the board the next time the question is asked, and so
that the answer is a decision with a reason rather than a shrug.

Reopen only if the identity question has an answer. A stable anchor derived from the heading
text is the obvious candidate and it changes every time someone edits a title, which is why
it is not obviously right.

## Done when

Nothing. This is a recorded non-goal.
