# 13 — Research: what mermaid rendering costs, and whether bake time avoids it

Type: research
Blocked by: none

## Question

Rendering mermaid diagrams inside ticket markdown is wanted. A baked board is one self-contained
file that fetches nothing, so a runtime renderer would ship in every board a user produces.

Find out:

- What mermaid actually costs when bundled, current version, minified and gzipped, and how much
  of that is reachable if only a few diagram types are supported.
- Whether mermaid can render to static SVG at bake time, in Node, without a browser or a
  headless browser, and what that requires.
- Whether smaller renderers exist that cover flowchart and sequence diagrams alone, and what they
  give up.
- Whether the `npx`-fetch-at-a-pinned-version pattern this repo already uses for lint and type
  tooling can run a renderer at bake time without declaring a dependency.
- What happens to a diagram that fails to parse, given the rule that a file the parser cannot
  read lands in `warnings` with its path and its reason.
- The security position. Ticket markdown is untrusted, and a diagram renderer is a new parser
  fed by a stranger's repo. What is the attack surface of rendering mermaid from untrusted input,
  at bake time and at runtime.

Report with citations to primary sources. Findings gate the decision on the dependency rule.
