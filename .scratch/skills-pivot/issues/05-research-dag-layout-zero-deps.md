# 05. Research: laying out a dependency graph in a self-contained HTML file with no dependencies

Type: research
Blocked by: none

## Question

Scratchboard ships zero dependencies and bakes one self-contained HTML file that fetches nothing.
A wayfinder view wants to show tickets and the edges between them, and every usual answer is a
library.

Find out what is actually achievable inside that constraint:

- Which layered-graph layout algorithms are small enough to hand-write, and what they cost in
  source size for a graph of ten to fifty nodes.
- Whether CSS grid or flexbox can carry a layered DAG on its own, with edges drawn as inline SVG
  or borders, and where that approach breaks.
- How other zero-dependency or single-file tools solve this, and what they gave up.
- Whether edge routing can be avoided entirely by choosing a layout that does not need it.

Report with citations to primary sources. Findings feed the wayfinder view prototype.

## Answer

Findings: [Laying out a dependency graph with zero dependencies](../research/dag-layout.md).

A hand-written layered layout is affordable. Greedy cycle removal, longest-path ranking,
barycenter crossing reduction, iterative-averaging coordinates, and dummy-node chains come to
roughly 350 to 550 lines of plain JavaScript at 10 to 50 nodes. Measured against dagre, which is
4,700 to 5,600 lines for the fully general case with compound graphs and network simplex, most of
which this does not need.

CSS alone cannot do it. Grid can place nodes once layers and order are known, but it cannot
compute them and cannot draw multi-parent convergence, cross-layer edges, or back edges. The
pure-CSS tree examples only work because a tree gives every node one parent. Every real tool
pairs HTML boxes with an SVG overlay on shared coordinates.

No prior art combines hand-written, general DAG, and one file. Real projects either take the
library and pay for it, Mermaid's dagre-d3 move cost 180 to 216 KB, or restrict the graph shape
until layout is nearly free, or drop 2D layout for a flattened list.

Node-link is not automatically right at this size. Ghoniem, Fekete, and Castagliola found
adjacency matrices beat node-link diagrams past roughly 20 nodes on every task except tracing a
path. A wayfinder effort at 10 to 50 tickets sits across that threshold, and tracing a path is
close to what reading a blocking chain is.

The constraint is looser than assumed. Zero dependencies bars npm packages, not where code runs.
Layout can run once at bake time in `scan.mjs` or `bake.mjs`, shipping computed coordinates in
the payload, leaving `board.js` to draw. That moves the cost out of the browser and out of the
bundle every board carries.

Recommended order: build the frontier-first list first, which is near free, needs no layout, and
matches the read-only posture. Treat the layered view as a second, affordable step, with the
adjacency matrix as a real alternative rather than a fallback.

Two claims are flagged unverified in the file: the full text of the Stasko and Zhang sunburst
paper, and the internal layout algorithm of `html-graph`.

Status: resolved
