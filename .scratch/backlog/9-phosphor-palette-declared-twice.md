---
title: The phosphor palette is declared twice in board.css
status: ready-for-agent
priority: p2
labels: [ui, css, maintenance]
---

# The phosphor palette is declared twice in board.css

Every phosphor token appears in two blocks: `html[data-theme="phosphor"]` and the
`prefers-color-scheme: dark` fallback that covers the moment before the head script stamps
the theme attribute.

The second block exists for a good reason. Without it the board flashes light on a dark
machine, and it is also what a reader with JavaScript off gets. The problem is that the two
copies are byte-for-byte the same seventeen custom properties, and nothing keeps them in
step. Change one accent and the board looks correct until the first paint of the next load.

Options worth weighing: declare the palette once in a named block and reference it from both
selectors, or generate the fallback block at bake time from the theme block.

## Done when

A phosphor token is written in one place, the pre-paint fallback still applies it with
JavaScript off, and a test or a build check fails if the two ever diverge again.
