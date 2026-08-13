---
title: Retire the stacked pull requests left open after the first merge
status: shipped
priority: p3
labels: [ci, maintenance]
---

# Retire the stacked pull requests left open after the first merge

Three branches shipped as a stack: the scanner, the board, then the skill and the demo.
Merging the first pull request carried every commit in the stack to `main` at once, and left
the two child pull requests open with nothing left to merge.

They read as stuck work. Their checks were green the whole time, and the blocked state came
from the stack preview rather than from CI or from any rule.

## Shipped

Both were closed with a comment naming the head commit and showing it is an ancestor of
`main`. The five merged branches are deleted, local and remote, so the repository is down to
`main` alone.
