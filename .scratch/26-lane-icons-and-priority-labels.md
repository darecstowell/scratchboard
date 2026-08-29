---
title: Cut the toolbar down: lane icons and shorter priority labels
status: needs-triage
priority: p3
labels: [ui, toolbar, polish]
---

# Cut the toolbar down: lane icons and shorter priority labels

This started as a request to give lanes an icon and to shorten the priority labels to one word.
The migration to status lanes has since changed what the toolbar looks like, so the request can
now be judged against a real board rather than a guess.

What is on screen after
[the migration](./skills-pivot/issues/09-migrate-this-repo-to-status-lanes.md):

- seven lane rails plus `Unmapped`
- two facet groups, `priority` at 4 chips and `labels` at 29
- most of those labels sit on one ticket each

The label tail and the rail count are what any cleanup is actually looking at. A label on one
ticket does filter, to that one ticket, and it costs a permanent chip to do it. Whether that trade
is worth the toolbar width is the question. Seven rails is also a lot of horizontal budget for a
board whose interesting lanes are three or four of them.

[Fit the toolbar chips by measurement](./24-fit-the-toolbar-by-measurement.md) owns how many chips
fit. This ticket owns whether there should be fewer things to fit.

## Done when

- A decision is recorded on lane icons: which icons, from the curated set, or none.
- A decision is recorded on the priority labels: one word each, or unchanged.
- The single-ticket label tail is either accepted with a reason, or reduced.
- No lane name or label string moves into the source. Config names every lane and every field.

## Comments

The counts above were taken again after the skills pivot landed. The `Unmapped` rail is gone, so
the board is seven rails rather than eight, and `labels` grew from 28 to 29.

There is now a second row to consider. A group gets a tab, and this repo has two, so a tab row sits
above the toolbar. That is a rail count of its own and it changes what any cleanup is looking at.

**2026-08-28, the lane icon half is answered, in PR 34 and PR 35.**

A lane names its own `icon` in config, validated against `ICON_NAMES` and warned on when unknown,
the same way a facet already did. No lane name or icon string moved into the source. A lane that
names no icon carries no glyph: a default put the same glyph on every lane, which reads as
decoration rather than information, and it made a stranger's board look broken on first run.
This repo's own `scratchboard.json` names seven, all from the curated set.

The priority labels and the single-ticket label tail are untouched, so this ticket stays open on
those two.
