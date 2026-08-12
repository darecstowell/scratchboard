---
title: Measure what a scan costs on a large repository
status: needs-triage
priority: p2
labels: [performance, serve]
---

# Measure what a scan costs on a large repository

Every scan walks the whole root. `walk()` skips `.git` and `node_modules` and then reads
every remaining directory entry, and only after that does the glob filter run. In `--serve`
that walk repeats behind a 100 ms debounce on each file change.

On the boards tested so far this is fast enough to ignore. On a monorepo with a deep
`packages/` tree and tickets in one corner of it, the walk does far more work than the glob
needs, on every keystroke an agent makes.

`globRoot()` already computes the deepest fixed prefix a glob cannot escape upward from, and
the watcher uses it. The scan does not. Starting the walk at that prefix would cut most of
the cost with no change to the result.

Measure before changing anything. A rewrite of the walker to save four milliseconds is a
rewrite of the walker.

## Done when

There is a recorded scan time for a small board, a 200-ticket board, and a large monorepo,
and either a change that is justified by those numbers or a note saying it is not.
