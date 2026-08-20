# 17. What does the wayfinder surface show, and what does the payload carry for it?

Type: grilling
Blocked by: none

## Question

Merged from two tickets: what non-ticket documents enter the payload, and whether a map gets one
view or several. The payload question is unanswerable without knowing what the view needs, so they
were always one decision.

### Documents in the payload

The payload is the contract: `scan.mjs` emits it, the browser renders it, `src/ui/` reads nothing
else, and adding a field changes both sides. Today it carries tickets, lanes, facets, and
warnings, and it has no concept of a document.

[How does the board recognize an effort folder](./03-recognize-an-effort-folder.md) settled that a
recognized group holds every file the glob discovered under its root, each with a role of `map`,
`issue`, or `other`. This decides what a `role: other` file becomes.

Candidates, by how reliably they sit in the working tree:

- `CONTEXT.md` and `docs/adr/NNNN-slug.md`, fixed templates at fixed paths, read and written by
  several unrelated skills. The most stable artifacts in the ecosystem.
- `spec.md` inside a feature folder.
- `map.md` inside an effort folder, which needs more than plain rendering.

Open:

- One document type with a kind field, or several distinct types?
- Does a document get an excerpt, dates, and refs the way a ticket does, or is it opaque body
  text?
- `CONTEXT.md` and ADRs live outside `.scratch/` entirely. Does the scanner grow a second glob,
  and does that break the promise that one glob defines the board?
- Ticket markdown is untrusted and documents are too. The `SAFE_HREF` allowlist and the bake
  escaping cover tickets today. Whatever lands here ships with a test that attacks it.

### One view or several

[Prototype the wayfinder view](./04-prototype-the-wayfinder-view.md) settled the shape: three
columns by state, live edges only, hover showing what a ticket unblocks. This decides how many
such surfaces exist and whether the shape changes with size.

The research gives this real edges rather than taste:

- Ghoniem, Fekete and Castagliola found adjacency matrices beat node-link diagrams past roughly 20
  nodes on every task except tracing a path. An effort at 10 to 50 tickets sits across that
  threshold, so no single view is right at both ends.
- A frontier-first list needs no layout and matches the read-only posture.
- The chosen columns-by-state design needs no layout either, which removes the cost argument that
  used to separate the options.

Open:

- Does switching automatically at a node count help a reader or disorient them? A view that
  changes under you is a real cost, not a clever feature.
- If several views ship, is the choice remembered, and where, given a baked file that fetches
  nothing?
- Every icon is bytes in every board, which is why the icon set is curated. The same argument
  applies to a second and third view. What is the budget?
- Is the frontier-first list a view at all, or is it what the board does by default with the graph
  as the thing you opt into?
- The chosen design carries a known gap: both ends of an edge can share a column. Does that change
  at forty tickets, where `behind us` grows without bound?
