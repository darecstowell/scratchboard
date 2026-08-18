# Specialize scratchboard around the Matt Pocock skill ecosystem

## Destination

A locked decision on whether scratchboard specializes around `mattpocock/skills`, and exactly
where the coupling line sits. Done when someone can start planning and building without
reopening the question.

## Notes

Domain: scratchboard is a zero-dependency CLI that bakes the markdown tickets in a repo into one
self-contained HTML kanban board. Read-only by choice, because tickets are agent-driven, so the
agent moves the card. `AGENTS.md` holds the rules that bite.

Skills every session should consult: `/grilling` and `/domain-modeling`.

Survey of the skill ecosystem, gathered while charting:
[Skill ecosystem survey](./research/skills-survey.md). Read it before any ticket that touches
file formats, argument shapes, or what a board can see.

Standing constraints already settled with the user:

- Zero dependencies is now itself under question. See
  [Should the zero-dependency rule be lifted?](./issues/12-lift-the-zero-dependency-rule.md).
  Assume it holds until that resolves.
- Read-only holds.
- Lanes become triage roles. The folder stops being the lane.
- A sixth terminal state, scratchboard's own, completes the lifecycle his five roles lack.
- Efforts stay at `.scratch/<effort>/`, his stock convention, so this repo feels the
  out-of-the-box experience.
- Both a first-class wayfinder view and document rendering are wanted. The effort folder is the
  primitive; the map view is an enrichment of it.

## Decisions so far

<!-- one line per resolved ticket: gist, then the link for the detail -->

- [Research: laying out a dependency graph in a self-contained HTML file with no dependencies](./issues/05-research-dag-layout-zero-deps.md):
  a hand-written layered layout costs 350 to 550 lines, CSS alone cannot do it, and layout can
  run at bake time rather than in the browser, so the zero-dependency rule is looser than
  assumed. Build the frontier-first list first.

## Not yet specified

- Dependency edges. Two incompatible `Blocked by:` formats exist, structured in wayfinder and
  freeform in `to-tickets`. Whether the board reads either, and whether edges render outside the
  map view, waits on the payload decision.
- Spec-to-ticket linkage. Local markdown stores no parent pointer in either direction, only
  directory colocation. Whether to invent a field is downstream of who owns the spec.
- Where `CONTEXT.md` and ADRs sit in the interface. They are the most stable artifacts in the
  ecosystem, but no view exists for a document that is not a ticket.
- Lane icons and single-word priority labels, from the original toolbar request. Blocked on
  seeing the toolbar after the lane change lands.
- Whether a `to-tickets` feature folder earns a view of its own, distinct from a wayfinder
  effort.
- What happens when his conventions change. There is no version to pin to, so the response has
  to be something other than a version matrix.
- How a baked board handles an effort with forty tickets.
- Whether mermaid rendering, if it lands at all, applies to ticket bodies only or to every
  document the board renders.
- What else a dependency budget would buy, if the rule is lifted. The question has only been
  asked of mermaid and of graph layout so far.

## Out of scope

- A skills browser showing usage and enabled state. Neither exists on disk: `stats-cache.json`
  never records a skill name, and enable state is per-plugin only. Two of the three columns
  cannot be built.
- Integrating `/improve-codebase-architecture`. It writes an HTML report to the OS temp dir,
  deliberately outside the repo, and never reads or references a ticket.
- Rendering prototype and research assets. Both live on throwaway branches by design, and
  prototypes take a second shape as UI variants inside a live route, which is not a file.
- A read-write board. Moving a card from the interface contradicts the reason this is read-only.
- Talking to the GitHub, GitLab, or Jira APIs to read tracker-native state.
