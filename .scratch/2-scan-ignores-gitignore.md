---
title: The scanner reads gitignored files that detection skips
status: ready-for-agent
priority: p1
labels: [bug, scanner, detection]
---

# The scanner reads gitignored files that detection skips

`findCandidates()` in `detect.mjs` passes every markdown file through `git check-ignore` and
drops what git rejects. `scan()` does no such thing. It walks the root, skips `.git` and
`node_modules`, and takes whatever the glob matches.

So a repo with a gitignored copy of its tickets, a vendored example board, or a build
directory full of markdown gets two different answers from one run: detection proposes lanes
from the tracked files, and the board renders the ignored ones beside them.

The divergence is invisible. Neither side warns.

Pick one rule and apply it in both places. The likely answer is that `scan()` should share the
ignore filter, because a file git will not track is not a ticket the user is keeping.

## Done when

A fixture tree with a gitignored ticket directory produces the same file set from detection
and from `--scan`, and a test covers the case with git present and with git absent.
