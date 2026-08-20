# 04. Prototype the wayfinder view

Type: prototype
Blocked by: none
Status: resolved

## Question

What should a map actually look like on screen? This is the exciting part of the effort and the
part nobody can specify from prose.

A map carries a destination, decisions already made, open tickets with blocking edges, fog that
is deliberately unspecified, and work ruled out of scope. Those are five different kinds of
thing and a kanban column expresses none of them.

Make something rough and concrete to react to. Two or three structurally different takes, not
one polished one. Candidates worth drawing: a layered dependency graph, a frontier-first list
with everything else collapsed, a route or timeline reading left to right from destination back
to what is takeable now.

Hard constraint: zero dependencies. No graph library, no layout engine. Whatever this becomes
has to be hand-drawn in the baked HTML, which should shape the design rather than be discovered
after it.

The result feeds the payload decision, so this deliberately runs before it.

## Answer

Prototypes: branch `prototype/wayfinder-view`, four passes, in `src/ui/`.

The view is three columns by state, with only live edges drawn, and a hover that shows what a
ticket unblocks.

### The layout

Columns are `behind us`, `takeable now`, and `still blocked`. They are not dependency depth.
Depth answers a question nobody asks, and state answers the one every session opens with.

Rows inside a column are ticket order. Nothing else.

### Only live edges

An edge whose blocker is already resolved is satisfied. It is history, not structure, and drawing
it at the same weight as a live blocker is what made every earlier pass unreadable. On this map
it takes 12 edges down to 4.

The first three passes all tried to fix the tangle with better layout, through dummy nodes for
layer-skipping edges and barycenter crossing reduction. Those worked and the result was still
chaotic, because the problem was never the routing. It was drawing the past.

### Hover shows what a ticket unblocks

Three hover meanings were built and compared: the whole chain both ways, downstream only, and
upstream only. Downstream wins. "What does resolving this free up" is the question a map exists
to answer, and the other two read as trivia beside it.

Hovering also restores that ticket's satisfied edges in green, so the history is hidden rather
than deleted. Click pins the selection, which is what keeps the view legible in a screenshot or a
printed board.

The other two hover modes were prototype scaffolding for the comparison. They are not a toolbar.

### The layout algorithm is not needed

This is the finding with the longest reach. Columns by state need no layering, no dummy nodes,
and no crossing reduction, so the 350 to 550 line estimate in
[Laying out a dependency graph with zero dependencies](../research/dag-layout.md) does not apply
to this design at all. Position is a column index and a row index.

For the record, the layered engine was built anyway and measured: layering, dummy nodes, and
barycenter ordering together cost about 60 lines, so the cheap two thirds of Sugiyama is cheaper
than the headline number. The estimate itself stands, since it also covers cycle removal, back
edges, and coordinate refinement, none of which was written.

### What was rejected

- A layered node-link graph, in three variants. Correct layout, still chaotic. The diagnosis
  above is why.
- An adjacency matrix, which the dag-layout research recommended on Ghoniem, Fekete, and
  Castagliola. No layout, no crossings, cannot get messy at any size, and worst at the one thing
  a map needs, which is following a chain.
- An indented outline. Zero crossings by construction, but a ticket with two blockers appears
  twice because an outline gives each row one parent and this is a graph.
- Orthogonal channel routing. Calmer than curves, and it fixes the wrong problem.
- A spine drawing the longest chain heavy. The only take that answers how far is left, and it
  distorts, because a short chain is not less important.
- Hover reveal over a full layered graph. Calm at rest and it does not exist in a screenshot.
  The mechanic survived; the layout under it did not.

### The gap this design carries

Columns are state, so both ends of an edge can land in the same column. Two do today, `01` to
`02` and `01` to `03`, all three being resolved. A straight left-to-right path would run backwards
across the cards, so an intra-column edge leaves and re-enters on the right instead. The same case
will arise in `still blocked` as soon as one blocked ticket blocks another.

This is the price of choosing state over depth. A layered graph cannot produce the case, because
a blocker is always in an earlier layer. It is worth stating plainly rather than discovering it
in the implementation.

### What this does not decide

Forty tickets. The three columns hold, but `behind us` grows without bound and nothing here has
been tried at that size. That stays fog.

Whether this is one view or several is
[What the wayfinder surface shows](./17-what-the-wayfinder-surface-shows.md). What the payload has to
carry for it is [What the wayfinder surface shows](./17-what-the-wayfinder-surface-shows.md). Both are unblocked
by this.
