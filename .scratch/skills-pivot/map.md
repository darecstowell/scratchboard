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
file formats, argument shapes, or what a board can see. One correction since: the survey says
there is no version to pin to, and `mattpocock/skills` does ship semver through changesets, tags,
and GitHub releases, at v1.2.3 on 2026-08-06. What holds is that a `find-skills` install records
no version on disk, only a folder hash. See
[Does scratchboard publish the local-markdown tracker spec](./issues/01-own-the-local-tracker-spec.md).

Standing constraints already settled with the user:

- Zero dependencies is now itself under question. See
  [Should the zero-dependency rule be lifted?](./issues/12-lift-the-zero-dependency-rule.md).
  Assume it holds until that resolves.
- Read-only holds.
- Lanes become triage roles. The folder stops being the lane.
- A sixth terminal state, scratchboard's own, completes the lifecycle his five roles lack.
  Settled as `done`. See
  [Name the sixth lifecycle state, and decide what writes it](./issues/02-name-the-sixth-state.md).
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
- [Does scratchboard publish the local-markdown tracker spec, or read whatever a repo declares?](./issues/01-own-the-local-tracker-spec.md):
  publish a reader spec, the dialect the board reads, and never the layout other tools write.
  Authority stops at reading, upstream wins every name it defines, and a drift test holds the
  doc and the dialect module together. A `supports mattpocock/skills v1.2.x` badge is defended
  by fixtures. Tolerance runs in three tiers, and the new middle one, recognized but half-read,
  raises a diagnostic that names the fix.

- [Name the sixth lifecycle state, and decide what writes it](./issues/02-name-the-sixth-state.md):
  the state is `done`, a sixth value in the existing `status` field rather than a second axis,
  because a value costs less to invent than a field name. An agent writes it, taught by
  `skills/scratchboard/SKILL.md`, which now owns the vocabulary upstream is silent about. `done`
  and `wontfix` each get their own collapsed lane. `shipped` becomes `done`, `deferred` stays a
  local value outside the spec, and the wayfinder dialect gains `out-of-scope` beside `claimed`
  and `resolved`. The two enums must never share a value, so a recognized value is readable as
  its dialect on its own. An unrecognized or missing value falls back to the group the file sits
  in. A ticket with no `status` stays in `Unmapped`, because a default would be the board
  inventing state.

- [How does the board recognize an effort folder and tell one shape from another?](./issues/03-recognize-an-effort-folder.md):
  a live heuristic in the dialect module reads directory shape, and a lead document beside an
  `issues/` folder marks a group, with `map.md` and `spec.md` naming the kind, and a folder
  holding both is ambiguous rather than a group. One mechanism serves both shapes and carries a
  `kind`. A recognized group leaves the ticket list for a collection of its own, holding every
  file the glob discovered under the root with a role of `map`, `issue`, or `other`. The cross-repo id collision fixes itself, and the uniqueness check scopes to the
  group. A new kind-neutral `groups` key corrects a wrong guess, with `kind: "none"` as the
  opt-out. It reclassifies and never extends the walk, `init` never writes it, and groups sit
  outside `counts.total`, which takes this repo from 41 to 23. A half-recognized folder raises
  the tier-2 diagnostic and falls back to ordinary tickets.

- [Research: what mermaid rendering costs, and whether bake time avoids it](./issues/13-research-mermaid-rendering-cost.md):
  keep the incumbent escaped `<pre><code>`. Mermaid is 3.57 MB minified against a 438 KB board, so
  it adds 8.2 boards of payload and takes the board to 9.2 times its size, and no supported subset
  exists. Bake-time SVG genuinely works browser-free through `svgdom`, but every path there
  declares Node 22 and the floor is 18. The harder blocker is security, as a record rather than a
  live exposure: `11.17.0` is outside every affected range, and what the sixteen advisories show
  is rate and reach, nine in 2026 and four fixed inside two weeks. Two properties are structural,
  no render timeout as a guarantee, so the warnings rule would need a subprocess and a wall clock,
  and an unsanitized flowchart `img:` sink that a future renderer would let beacon from the bake
  machine and from every published board. The `npx` pin does not reach transitive `mermaid`, so
  reproducibility needs a committed lockfile.

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
  effort. Recognition now carries a `kind` that says which is which, so the question is purely
  visual and waits on the view tickets.
- Whether `groups` is the right name for the config key. It is kind-neutral, which recognition
  required, and it is a generic word this codebase has not used before. Cheaper to change before
  [Documents in the payload](./issues/06-documents-in-the-payload.md) encodes it.
- Whether the board reads the installed version of the skills. A plugin install puts that
  version on disk, where a bake could read it. A `find-skills` install does not.
  [Should the bake read the machine's installed skills](./issues/08-bake-reads-the-machine.md)
  decides whether the bake reads it at all, so this waits on that ticket.
- How a baked board handles an effort with forty tickets.
- Whether mermaid rendering, if it lands at all, applies to ticket bodies only or to every
  document the board renders. Now unlikely to arise, since the research recommends keeping the
  escaped fence.
- What the `npx` fetch-at-a-pinned-version pattern actually guarantees. The mermaid research
  measured that the pin does not reach transitive dependencies and that npx is not offline with a
  warm cache, which touches the lint and type tooling this repo already fetches that way.
- What else a dependency budget would buy, if the rule is lifted. The question has only been
  asked of mermaid and of graph layout so far.
- Whether the two values scratchboard names, `done` and `out-of-scope`, are offered upstream as a
  contribution rather than held as this project's dialect. Ticket 01 settled that the board
  follows upstream additively, and said nothing about pushing back the other way.

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
