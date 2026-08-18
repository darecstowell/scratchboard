# 14 — One wayfinder view or several, and does it change shape as the map grows?

Type: grilling
Blocked by: 04

## Question

A map could get one carefully chosen view, or several the reader switches between, or a view
that changes shape on its own as the map grows.

The research gives this real edges rather than taste:

- Ghoniem, Fekete and Castagliola found adjacency matrices beat node-link diagrams past roughly
  20 nodes on every task except tracing a path. An effort at 10 to 50 tickets sits across that
  threshold, so no single view is right at both ends.
- A frontier-first list needs no layout at all and matches the read-only posture, where the board
  shows what is takeable and the agent takes it.
- A drawn layered graph costs 350 to 550 hand-written lines, affordable but not free, and it wins
  at exactly one task, tracing a blocking chain.

Open:

- Does switching automatically at a node count help a reader or disorient them? A view that
  changes under you is a real cost, not just a clever feature.
- If several views ship, is the choice remembered, and where, given a baked file that fetches
  nothing?
- Every icon is bytes in every board, and the icon set is curated for that reason. The same
  argument applies to a second and third view. What is the budget?
- Is the frontier-first list a view at all, or is it just what the board does by default, with
  the graph as the thing you opt into?
