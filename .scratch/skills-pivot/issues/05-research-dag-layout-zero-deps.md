# 05 — Research: laying out a dependency graph in a self-contained HTML file with no dependencies

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
