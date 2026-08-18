# 04 — Prototype the wayfinder view

Type: prototype
Blocked by: none

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
