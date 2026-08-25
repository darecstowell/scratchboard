---
title: Split the render path
priority: p1
status: confirmed
labels: [ui, performance]
---

# Split the render path

One function builds the card and paints it. Split the two, so the paint can be skipped.
