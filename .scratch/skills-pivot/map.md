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
  [What scratchboard promises](./issues/18-what-scratchboard-promises.md).
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
- [Prototype the wayfinder view](./issues/04-prototype-the-wayfinder-view.md): three columns by
  state, `behind us`, `takeable now`, `still blocked`, not by dependency depth. Only live edges
  are drawn, since an edge from a resolved blocker is history and drawing it is what made every
  layered pass unreadable, 12 edges down to 4 on this map. Hover shows what a ticket unblocks,
  and restores that ticket's satisfied edges in green so history is hidden rather than deleted.
  Click pins it, which is what survives a screenshot. The reach: columns by state need no
  layering, no dummy nodes, and no crossing reduction, so the dag-layout estimate does not apply
  to this design. The cost is that both ends of an edge can share a column, so an intra-column
  edge leaves and re-enters on the right rather than running backwards across the cards.
  Prototypes on branch `prototype/wayfinder-view`.

- [Migrate this repo's own board to triage-role lanes](./issues/09-migrate-this-repo-to-status-lanes.md):
  done, and the folders are gone. Upstream turned out to have no backlog folder at all, only
  `.scratch/<feature>/spec.md` beside `issues/`, and taking that literally would have emptied the
  board, because ticket 03 already made a spec-led folder a group that leaves the ticket list. So
  the rule was taken and not the shape: every folder under `.scratch/` is a piece of work and
  never a state, so a ticket belonging to no feature sits flat at the root. Seven lanes match on
  `status`, one per value, with `done` and `wontfix` collapsed and `wontfix` empty. All 23 tickets
  place and none fall to `Unmapped`. No source changed, because `match.field` already worked. The
  toolbar drops to two facet groups, `priority` at 4 chips and `labels` at 28, and the `status`
  facet dropped itself, verified rather than assumed. The migration lost "in progress", which
  lived only in the folder name.

- [What does the board do with skills?](./issues/16-what-the-board-does-with-skills.md): the
  board ships no skill catalogue, only one copy affordance, and a repo declares what goes in it. A
  skill does not act on a ticket, so this is a copy affordance rather than a launcher and an entry
  is a prepared invocation: a skill name plus the path of the thing on screen. The existing
  `copy path` button is the whole mechanism, and it grows a caret only when config declares
  entries, so a stock board is unchanged. Config is additive with override-by-name and an opt-out,
  the affordance keys on the open detail view's path, a template substitutes `{path}` alone, and
  the browser substitutes on click so the payload carries the list once rather than a string per
  ticket. Machine reading is refused as a rule: the board describes the repo, never the machine, no
  flag and no serve-only carve-out, so the board can never know whether a skill is installed. The
  tier-2 diagnostic rides the existing warnings surface rather than the copy menu, names the shape
  it half read, and hands over the `/scratchboard` invocation plus one plain sentence, never `init`
  directly. It stays in a published board unconditionally. `skills/scratchboard/SKILL.md` stays one
  skill with a widened description. The only skill name in board source is scratchboard's own.

- [What does the wayfinder surface show, and what does the payload carry for it?](./issues/17-what-the-wayfinder-surface-shows.md):
  an effort gets a tab beside the board and the payload gains one key, `groups`. The board itself
  does not change, and a repo with no group and no `CONTEXT.md` gets no tab bar at all. One view
  per kind at every size, since columns by state cannot tangle and the node-link degradation
  research does not apply. `behind us` is always collapsed with its count, the same rule the
  terminal lanes already use, which closes the forty-ticket question. The map body is the header
  with Destination open and the rest folded, and Decisions-so-far is discarded because the column
  is that list. A claimed ticket greys inside `takeable now` and an out-of-scope ticket renders in
  the header, never in a column. `blockedBy` exists only on an effort's issues, read only from the
  structured line, forward only. State and the section split are computed at bake time so the UI
  never learns upstream vocabulary. `CONTEXT.md` and the ADRs do enter the payload, as a third
  `kind: "context"` group: discovery is three fixed reads rather than a second glob, so the walk is
  untouched, and `CONTEXT-MAP.md` is followed with every resolved path fenced to the repo root.
  Ticket 03's lead role is renamed from `map` to `lead`. Type shows as a word, not an icon, so the
  icon budget stays closed. Relative links that match a payload path become in-board navigation.

## Not yet specified

- Spec-to-ticket linkage. Local markdown stores no parent pointer in either direction, only
  directory colocation. Whether to invent a field is downstream of who owns the spec.
- Lane icons and single-word priority labels, from the original toolbar request. The toolbar is
  now visible: two facet groups, `priority` at 4 chips and `labels` at 28, of which 17 sit on one
  ticket each. Seven lane rails plus `Unmapped`. The label tail and the rail count are what any
  cleanup is looking at.
- Whether the triage roles need a way to say a ticket is started. The migration deleted
  `in-progress/`, and the six values cannot express it, because they say what a ticket needs
  rather than whether anyone picked it up. Wayfinder's dialect has `claimed` for exactly this.
  Adding a seventh value, or a second field, cuts against ticket 02's one-field decision, so this
  is a spec question rather than a config one.
- Whether `groups` is the right name for the config key. It is kind-neutral, which recognition
  required, and it is a generic word this codebase has not used before. Cheaper to change before
  [What the wayfinder surface shows](./issues/17-what-the-wayfinder-surface-shows.md) encodes it.
  `invocations`, the key that declares prepared invocations, arrived with the same problem and is
  the same decision.
- Whether mermaid rendering, if it lands at all, applies to ticket bodies only or to every
  document the board renders. Now unlikely to arise, since the research recommends keeping the
  escaped fence, but the board now renders glossaries and ADRs as well as tickets, so the surface
  it would cover is wider than it was.
- What the `npx` fetch-at-a-pinned-version pattern actually guarantees. The mermaid research
  measured that the pin does not reach transitive dependencies and that npx is not offline with a
  warm cache, which touches the lint and type tooling this repo already fetches that way.
- What else a dependency budget would buy, if the rule is lifted. The question has only been
  asked of mermaid and of graph layout so far.
- Whether this repo's tickets should move from YAML frontmatter to upstream's `Status:` body line.
  Upstream records triage state as a line near the top of the body, and this repo deliberately
  chose frontmatter. The same "organize the way upstream does" rule that settled the folders
  points here too, and ticket 01 settled that the repo owns the layout after setup, so the two
  are in tension.
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
