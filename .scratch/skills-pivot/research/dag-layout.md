# Laying out a dependency graph with zero dependencies

A hand-written layered (Sugiyama-style) DAG layout is achievable at 10 to 50 nodes for roughly
350 to 550 lines of plain JS, well inside scratchboard's own precedent (`board.js` is already
1,315 lines). CSS alone cannot carry it: grid or flexbox can place nodes once row and column are
known, but it cannot compute those positions, cannot draw edges that cross layers or converge on
a node with two parents, and cannot avoid crossings. Nobody has shipped a truly general,
hand-rolled DAG layout in a single-file zero-dependency tool; the closest real examples either
depend on a library (dagre, d3-dag, D3), restrict the graph shape until layout becomes trivial
(commit graphs, trees), or give up on 2D placement altogether (a DFS-flattened list of divs). The
strongest zero-dependency option is often not to draw a graph at all: an adjacency matrix, an
indented outline, or a frontier ("what's unblocked now") list each solve a real question at this
node count without ever computing an edge's path.

## 1. The Sugiyama framework, phase by phase

The framework is Kozo Sugiyama, Shojiro Tagawa, and Mitsuhiko Toda, "Methods for Visual
Understanding of Hierarchical System Structures," *IEEE Transactions on Systems, Man, and
Cybernetics* 11(2), 1981, pages 109-125 ([Semantic Scholar
record](https://www.semanticscholar.org/paper/Methods-for-Visual-Understanding-of-Hierarchical-Sugiyama-Tagawa/34c4e6af91b25f426fde84d1c4556256f07e6e81),
paper itself is paywalled IEEE). It splits layout into four phases. The table gives the simplest
workable algorithm for each, at the 10-to-50-node scale, with a rough line count in plain
JavaScript (no types, no compound-graph support, no multi-edge support).

| Phase | Job | Simplest workable algorithm | Primary source | Rough size |
| --- | --- | --- | --- | --- |
| 1. Cycle removal | Break cycles so ranking can proceed | Greedy feedback arc set: repeatedly strip sinks to the right, sources to the left, then break ties by max out-degree minus in-degree | Peter Eades, Xuemin Lin, William F. Smyth, "A Fast and Effective Heuristic for the Feedback Arc Set Problem," *Information Processing Letters* 47(6), 1993, pages 319-323 ([ScienceDirect](https://www.sciencedirect.com/science/article/abs/pii/002001909390079O), paywalled) | 30-50 lines |
| 2. Layer assignment (ranking) | Assign each node a layer (rank) | Longest path from sources, O(V+E) via one topological pass | Folklore / Sugiyama et al. 1981; the width-bounded alternative is Coffman-Graham, below | 20-30 lines |
| 2b. Layer assignment, width-bounded | Same, but cap nodes per layer | Coffman-Graham: order nodes by a priority derived from a topological label, then pack them into layers up to width `W` | E. G. Coffman Jr. and R. L. Graham, "Optimal Scheduling for Two-Processor Systems," *Acta Informatica* 1, 1972, pages 200-213 (no open PDF found; [Wikipedia summary](https://en.wikipedia.org/wiki/Coffman%E2%80%93Graham_algorithm) confirms the 1972 scheduling origin and its reuse for graph drawing) | 60-80 lines |
| 3. Crossing reduction | Order nodes within each layer to reduce edge crossings | Barycenter heuristic: order each layer by the mean position of its neighbors in the adjacent, already-ordered layer; alternate top-down and bottom-up sweeps a fixed number of times (4-8 is enough at this scale) and keep the best-scoring pass, counting crossings by brute-force pairwise comparison (fine under ~50 nodes; no need for the O(n log n) Barth-Jünger-Mutzel accumulator) | Sugiyama, Tagawa, Toda 1981 (above) for barycenter; refinement with median instead of mean, plus a local-swap "transpose" step, is Emden R. Gansner, Eleftherios Koutsofios, Stephen C. North, Kiem-Phong Vo, "A Technique for Drawing Directed Graphs," *IEEE Transactions on Software Engineering* 19(3), 1993, pages 214-230 ([free PDF from graphviz.org](https://www.graphviz.org/documentation/TSE93.pdf)) | 80-120 lines |
| 4. Coordinate assignment | Turn (layer, order) into x/y pixels, straightening edges where possible | Iterative neighbor-averaging ("priority method"): repeatedly set each node's x to the median (or weighted mean) of its neighbors' x in the adjacent layer, alternating direction, then sweep left to right within each layer to enforce minimum spacing | Sugiyama et al. 1981 describes the priority method; the well-known stronger version is Ulrik Brandes and Boris Köpf, "Fast and Simple Horizontal Coordinate Assignment," *Graph Drawing 2001*, LNCS 2265, 2002 ([PDF via CiteSeerX](https://citeseerx.ist.psu.edu/viewdoc/download?doi=10.1.1.64.4457&rep=rep1&type=pdf); note a documented erratum fixing two bugs in the original algorithm: [arXiv:2008.01252](https://arxiv.org/abs/2008.01252)) | 80-150 lines naive; dagre's full Brandes-Köpf implementation (`position/bk.ts`) is about 700-800 lines including the erratum fix |
| — | Dummy-node chains for edges that span more than one layer | Insert one placeholder node per intermediate layer for every edge that skips a layer; treat it like a real node for ordering and coordinates, then reconnect for drawing | Sugiyama et al. 1981 (this is the mechanism that makes phases 3 and 4 work at all for non-adjacent edges) | 20-30 lines |

**Verifying the size estimate against a real implementation.** dagre (`github.com/dagrejs/dagre`)
implements this exact framework in production, at full generality (compound/nested graphs,
multi-edges, self-loops, configurable node sizes, network simplex for both ranking and ordering).
Pulling its file sizes directly from GitHub:

- `lib/layout.ts`: 31,889 bytes (orchestration plus compound-graph nesting, most of which
  scratchboard would not need)
- `lib/rank/network-simplex.ts`: 9,178 bytes (optimal-rank alternative to longest-path)
- `lib/order/*` (barycenter, cross-count, sort, conflict resolution, subgraph constraints):
  about 27,000 bytes combined
- `lib/position/bk.ts`: 20,852 bytes (full Brandes-Köpf, four-alignment average)
- `lib/greedy-fas.ts`: 4,567 bytes (the Eades-Lin-Smyth heuristic)

Total across `lib/`: roughly 141 KB of TypeScript, which is on the order of 4,700-5,600 lines.
That is the cost of full generality (compound graphs, multi-edges, optimal-not-heuristic ranking,
best-in-class coordinate assignment). erikbrinkman/d3-dag confirms the same phase names and
confirms that a minimal coordinate-assignment operator is genuinely small: its `coord/center.ts`
(simple centering, the least sophisticated option it ships) is 1,943 bytes, versus 12,585 bytes
for its simplex-based coordinate operator and 20,852 for dagre's Brandes-Köpf. Dropping compound
graphs, multi-edges, and the optimal (simplex) variants of ranking and coordinates, and accepting
heuristic quality throughout, is what gets the estimate for scratchboard's use case down to
350-550 lines total across all four phases plus dummy-node handling. Sources:
[dagrejs/dagre](https://github.com/dagrejs/dagre),
[erikbrinkman/d3-dag](https://github.com/erikbrinkman/d3-dag) (file sizes pulled via the GitHub
API tree listing on 2026-08-17, not independently re-verified line-by-line).

## 2. Can CSS alone carry a layered DAG

Partially, and only the placement half. Once layer and within-layer order are known (from phases
2 and 3 above, which are graph algorithms, not layout algorithms, and cannot be expressed in
CSS), CSS Grid places nodes trivially: `grid-row` is the layer, `grid-column` is the order. This
is exactly how the well-documented "recreate the GitHub contribution graph in CSS Grid" pattern
works ([bitsofco.de](https://bitsofco.de/github-contribution-graph-css-grid/),
[CSS-Tricks](https://css-tricks.com/recreating-github-contribution-graph-css-grid-layout/)), and
that pattern is cited as needing under 30 lines of layout-relevant CSS. But that example has no
edges: it is a fixed calendar grid, not a graph.

For edges, there is real prior art for pure-CSS **trees**: nested `<ol>`/`<li>` markup with
`::before`/`::after` pseudo-elements drawing partial borders, no SVG and no JavaScript
([CodePen example](https://codepen.io/philippkuehn/pen/QbrOaN),
[CSS Script roundup](https://www.cssscript.com/clean-tree-diagram/)). This works because a tree
guarantees exactly one parent per node, so every edge is a short, straight, single-direction line
from a node to its one parent, and the DOM nesting itself encodes the hierarchy, so there is
nothing to compute.

That guarantee is exactly what a general DAG does not have, and that is where the CSS-only
approach breaks down, concretely:

- **A node with two or more parents** needs two or more lines converging on it from different
  positions. Borders and pseudo-elements are attached to one box and can draw at most a fixed,
  small number of line segments from that box; they cannot fork or merge arbitrarily many lines
  the way an SVG path with multiple `M`/`L` commands can.
- **An edge spanning more than one layer** (skipping a layer) needs a dummy-node chain (Sugiyama
  1981, above) so the edge can bend around whatever else occupies the intermediate layer.
  Computing where that chain bends is graph layout, not CSS; CSS can span a grid item across
  multiple rows (`grid-row: 2 / 5`) for a straight vertical run, but as soon as the start and end
  columns differ, that is a diagonal, and CSS has no diagonal-line primitive without either a
  manually computed `rotate()` transform (which requires knowing pixel positions, i.e. doing the
  math in JS anyway) or an SVG line.
- **Crossings** are precisely what phase 3 (crossing reduction) exists to minimize, and that
  minimization is a graph-ordering decision with no CSS equivalent; CSS can only stack whatever
  crossings exist with `z-index`.
- **Back edges** (an edge that points against the established top-to-bottom rank order, which
  happens whenever the "blocked by" relationship in the ticket data does not agree with the
  drawn direction) need to route around intervening nodes as a bulging arc. That is a curved SVG
  path problem, not a border problem.

I could not find a real, shipped example of a general (non-tree) DAG drawn with borders or
pseudo-elements alone; every general DAG renderer I found (dagre-d3, React Flow, Svelte Flow)
places nodes as HTML/CSS boxes but draws edges as an absolutely-positioned SVG (or canvas)
overlay sized to the container, using the same computed coordinates as the node placement. That
split (CSS or grid for boxes, SVG overlay for lines, one shared coordinate system) is the
practical answer to this question, not "CSS alone."

## 3. Prior art in single-file or zero-dependency tools

I found no example of a shipped, general-purpose DAG layout that is both hand-written (no
library) and self-contained in one file. The closest real projects fall into three groups, each
giving something up:

- **Depend on a real library, and it shows in the payload.** Mermaid.js renders flowcharts (a
  general DAG) with `dagre-d3` (a wrapper around dagre plus D3 for rendering), later migrated to
  the ESM fork `dagre-d3-es`
  ([mermaid-js/mermaid#3809](https://github.com/mermaid-js/mermaid/pull/3809)) specifically to
  cut bundle size; that migration alone removed roughly 180-216 KB
  ([sidharth.dev writeup](https://www.sidharth.dev/posts/shrinking-mermaid/)). For a graph that
  needs more than what dagre offers, Mermaid offers an alternate ELK (Eclipse Layout Kernel)
  renderer, split into a separate package specifically because of its size. This is direct
  evidence that even a project willing to accept a dependency still treats general DAG layout as
  a real size cost, in the hundreds of KB, not something a small hand-rolled pass replaces
  casually if you want dagre's quality bar.
- **Restrict the graph shape until layout is nearly free.** DoltHub's commit graph renderer
  computes row from topological/commit order directly (no ranking algorithm needed, the row is
  already given by history) and only solves for column, processing children before parents
  ([DoltHub blog, "Drawing a commit graph"](https://www.dolthub.com/blog/2024-08-07-drawing-a-commit-graph/)).
  This works because a commit graph has a very restricted shape: every node has at most a
  handful of parents and children, and the "layer" axis is free (chronological order), so only
  one axis of the two-phase Sugiyama problem remains. A general ticket-dependency DAG does not
  get that for free; "layer" has to be computed, not read off a timestamp.
- **Give up on 2D placement and flatten to a list.** `matthewhammer/dep-tools` transforms a
  dependency graph into a tree via depth-first search and renders the DFS traversal as nested
  `div`s, explicitly trading layout fidelity for browser rendering speed: a node visited more
  than once is drawn as an empty placeholder dot instead of being re-expanded, and the DFS order
  (not the graph structure) determines where things land
  ([matthewhammer/dep-tools](https://github.com/matthewhammer/dep-tools)). This is closer in
  spirit to the "avoid edge routing" options in section 4 than to a real layered layout.

One general-purpose zero-dependency library worth naming is `html-graph`
([html-graph/html-graph](https://github.com/html-graph/html-graph)), which advertises "zero
dependencies" and "built-in layouts" for rendering graphs with HTML/CSS. I could not confirm from
its README whether its built-in layout includes a Sugiyama-style layered pass or only
force-directed/manual placement, and did not have time to read its source tree in full; flagging
this as unverified rather than claiming it either way.

## 4. Layouts that avoid edge routing entirely

Each of these sidesteps phases 3 and 4 (crossing reduction, coordinate assignment) by choosing a
representation where "where does this line go" is never a question.

- **Adjacency matrix.** Rows and columns are nodes; a filled cell means an edge. No line is ever
  drawn, so crossings and routing do not exist. The controlled experiment on this is Mohammad
  Ghoniem, Jean-Daniel Fekete, Philippe Castagliola, "On the Readability of Graphs Using
  Node-Link and Matrix-Based Representations: A Controlled Experiment and Statistical Analysis,"
  *Information Visualization* 4(2), 2005
  ([SAGE](https://journals.sagepub.com/doi/10.1057/palgrave.ivs.9500092)). Its headline finding:
  past roughly 20 nodes, the matrix wins on most tasks, and node-link wins consistently only on
  path-following ("does A eventually depend on B"). Scratchboard's 10-to-50-node target straddles
  that threshold directly: at the low end (10-20 nodes) node-link's path-following advantage
  probably matters more; at the high end (30-50) the matrix is the better-evidenced choice, if
  the dominant question is "what connects to what" rather than "trace this chain." What it gives
  up: at n=50, a 50x50 matrix has 2,500 cells, mostly empty for a sparse dependency graph, and
  path-tracing (the thing wayfinder most wants) is exactly its documented weak point.
- **Indented / nested outline.** Standard `tree`-command or `make -p` style: each node listed
  under its (one) parent, indentation encodes depth. Trivial to implement, no coordinates at all,
  reads well for strict trees. What it gives up: a node with two or more parents/blockers has to
  either be duplicated (appearing once per parent, which misrepresents cardinality) or listed
  once under a chosen "primary" parent with the rest as cross-references, which is a real loss
  for dependency graphs where a ticket commonly blocks on two others.
- **Frontier-first ("what's unblocked right now") list.** Show only nodes with no remaining
  unresolved dependency, i.e. nodes with in-degree zero in the subgraph of unresolved
  dependencies, computed with Kahn's algorithm (A. B. Kahn, "Topological Sorting of Large
  Networks," *Communications of the ACM* 5(11), 1962, pages 558-562,
  [ACM DL](https://dl.acm.org/doi/10.1145/368996.369025)). This is the cheapest option in the
  whole report: no layering, no ordering, no coordinates, just an in-degree count over the
  "blocked by" edges, recomputed as tickets resolve. What it gives up: the graph structure beyond
  the frontier is invisible; you cannot see two steps ahead, only what is actionable now. For a
  read-only board whose stated job is "the agent moves the card," this is arguably closer to what
  wayfinder actually needs than a drawn graph is: it answers "what can I start," not "what does
  the whole dependency tree look like."
- **Sunburst (radial nested layout).** Concentric rings, each ring one layer, arc angle
  proportional to subtree size. Traces to John Stasko and Ed Zhang, "Focus+Context Display and
  Navigation Techniques for Enhancing Radial, Space-Filling Hierarchy Visualizations," *IEEE
  InfoVis 2000*; I found this citation via search but did not fetch and read the primary PDF, so
  flagging it as not independently verified. Like the indented outline, sunburst is fundamentally
  a tree layout (each arc has one parent slice), so it inherits the same multi-parent problem;
  it also reads angle and radius rather than a straight axis, which is a worse fit for a small
  screen and a small node count than either of the two options above.
- **Column ("swimlane") layout.** Nodes placed in columns by layer, no attempt to draw edges at
  all, relying on click-to-highlight or hover to reveal a node's dependencies instead of a
  permanent line. This is layer assignment (phase 2) without crossing reduction or coordinate
  assignment, so it is a strict subset of the full Sugiyama cost, maybe 50-80 lines
  (longest-path ranking only). It gives up the "see the whole shape at a glance" property a drawn
  graph has, in exchange for guaranteeing no crossing ever needs resolving, because there is
  nothing drawn to cross.

## 5. Recommendation

A minimal Sugiyama-style layout is genuinely buildable inside the zero-dependency constraint:
greedy cycle removal, longest-path (or Coffman-Graham if layer width turns out to matter)
ranking, barycenter-with-a-few-sweeps crossing reduction, and iterative-averaging coordinate
assignment, plus dummy-node chains for multi-layer edges, comes to roughly 350-550 lines of plain
JavaScript, drawing nodes as positioned boxes and edges as an absolutely-positioned SVG overlay
(never CSS-only, per section 2). That is a meaningful but not unreasonable addition next to
`board.js`'s existing 1,315 lines. It would not match dagre's quality (no network simplex, no
Brandes-Köpf, no compound graphs) but at 10-50 nodes the heuristic phases converge well and the
gap is unlikely to be visible.

One constraint reframe worth stating plainly: scratchboard's "zero dependencies" rule is about
npm packages, not about where code runs. `scan.mjs`/`bake.mjs` already run hand-written Node code
at build time with zero deps; there is nothing stopping the layout algorithm from running there
instead of in the browser, computing final layer/order/coordinates once per bake and shipping
them as static payload data, the same way the rest of the payload contract already works. That
would keep `board.js` smaller (just placement and SVG line-drawing, no algorithm) at the cost of
the layout not responding live to search/sort/facet filtering the way the existing kanban lanes
do, since a card leaving the board would leave a gap rather than triggering a re-layout. Whether
that tradeoff is acceptable is a product decision for the wayfinder prototype, not a technical
one; the algorithm cost is roughly the same wherever it runs.

Given that, my honest recommendation is to not draw a general graph first. Build the
frontier-first list (Kahn's algorithm, in-degree zero over unresolved "blocked by" edges) since
it costs almost nothing, matches scratchboard's read-only, agent-moves-the-card posture better
than a static diagram does, and directly answers the question a wayfinder view exists to answer:
what can be started now. If a full shape-of-the-dependency-tree view turns out to be genuinely
wanted on top of that, the layered layout above is buildable at the estimated size, and the
adjacency matrix is worth prototyping side by side with it: Ghoniem, Fekete, and Castagliola's
result puts scratchboard's 10-to-50-node range right at the point where a matrix stops losing to
a node-link diagram and starts winning on everything except tracing a single chain.
