---
title: Decide whether a third format preset earns its place
status: needs-info
priority: p2
labels: [parser, research]
---

# Decide whether a third format preset earns its place

Two presets ship: `yaml-frontmatter`, and `key-value-block` for the three variants of a
`Key: value` run. Both were chosen from the ticket sets found on one machine. That is a
sample of one developer's habits, not of the field.

The custom parser hook covers anything else, but every format that needs a hand-written
module is a format that failed the ten-second demo, and the ten-second demo is the whole
distribution mechanism.

Collect real ticket trees from repos nobody here wrote. Candidates worth checking first:
tickets in TOML front matter, tickets with a metadata table under the heading, and tickets
whose only state is the file name. Count how often each shape appears before writing anything.

A preset earns its place when it reads a shape that shows up in more than one stranger's
repo. Two presets are easier to explain and easier to test than four, so the bar stays high.

## Done when

There is a written count of formats found in the wild, and either a third preset with
fixtures or a recorded decision that the hook is the right answer for the tail.
