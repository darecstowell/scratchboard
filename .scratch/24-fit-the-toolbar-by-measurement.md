---
title: Fit the toolbar chips by measurement, not by a character budget
status: ready-for-agent
priority: p3
labels: [ui, toolbar, polish]
---

# Fit the toolbar chips by measurement, not by a character budget

The toolbar decides how many facet values show as chips before the rest fold into a `+N`
dropdown. That decision used to be a fixed count of six, which broke as soon as the values were
long: six of `ready-for-agent` and `ready-for-human` are far wider than six of `done` and
`closed`, so the group wrapped and pushed the sort control onto a row of its own.

It is now a width budget of 56 characters, capped at six. The board is monospace, so a character
count is a faithful width, and that alone fixed the reported case.

It is still a guess about the viewport. A narrow window wraps sooner than the budget expects,
and a wide one leaves room the budget will not spend. The number is tuned for a laptop.

## What would settle it

Fit against the real width. Render the chips, ask the browser what wrapped, and move the
overflow into the dropdown until the toolbar is one row again. Re-fit on resize.

The cost is a `ResizeObserver` and a re-fit loop in a file that is otherwise static, and a
layout read after every facet render. That was judged too heavy for the payoff at the time the
budget landed. It is worth revisiting if anyone reports the toolbar wrapping at a width the
budget should have handled.

## Done when

- The chip count follows the width the toolbar actually has, at any viewport.
- Resizing the window re-fits without a reload.
- No layout thrash: one read per fit, not one per chip.
- `CHIP_BUDGET` is gone, or is reduced to a ceiling rather than the deciding rule.

## Comments

The tab row now owes the same answer.
[What the wayfinder surface shows](./skills-pivot/issues/17-what-the-wayfinder-surface-shows.md)
handed the question here deliberately, on the reasoning that solving it twice, differently, is how
two toolbars end up disagreeing.

The row ships with `overflow-x: auto` and no wrap, so it scrolls sideways rather than pushing
anything onto a second line. That is a holding answer, not a fitted one, and it is the same shape
of guess the chip budget is.

Whatever measurement lands here should cover both rows.
