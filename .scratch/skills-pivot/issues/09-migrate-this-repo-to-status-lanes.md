# 09. Migrate this repo's own board to triage-role lanes

Type: task
Blocked by: 02
Status: resolved

## Question

Nothing to decide once the sixth state is named. This is the manual work that unblocks judging
the result.

Twenty-three tickets currently live in `todo/`, `in-progress/`, and `done/`, with lanes matched
by path in `scratchboard.json`. Move to lanes matched on the `status` field, and let the folder
stop carrying meaning.

The work:

- Give every ticket a `status` that reflects where it actually is today.
- Switch the lane config from `match.path` to `match.field`, and confirm the status facet
  disappears from the toolbar on its own, which the scanner already does for any field a lane
  matches on.
- Decide what happens to the folders themselves, and update `AGENTS.md` and
  `docs/agents/issue-tracker.md`, both of which currently state that the folder is the lane.

Record what the toolbar looks like afterwards, because the remaining interface cleanup waits on
seeing it.

## Answer

Done. Seven lanes match on `status`, the three lane folders are gone, and the backlog sits flat
at `.scratch/<n>-<slug>.md`. 280 tests pass on Node 18 and Node 22, and `tools/guard.mjs` reports
173 files with every house rule holding.

### The folders: upstream has none

The question was where the 23 backlog tickets live once the folder stops being the lane. The
answer came from `setup-matt-pocock-skills/issue-tracker-local.md`, and it is that upstream has
no backlog folder at all. Its only unit is `.scratch/<feature-slug>/` holding `spec.md` beside
`issues/NN-<slug>.md`. Not `todo/`, not `tickets/`, not a flat root. There is no shape at all for
a standalone maintenance ticket, because upstream assumes work arrives as a spec that gets sliced.

Taking that literally would have emptied this board. Ticket 03 already settled that a lead
document beside an `issues/` folder is a group, that a group leaves the ticket list for a
collection of its own, and that groups sit outside `counts.total`. Reorganize 23 maintenance
tickets into `<feature>/spec.md` plus `issues/` and every one of them leaves the board, into a
collection no view renders yet. It would also mean inventing 23 specs that never existed.

So the rule was taken and the shape was not. Upstream's real rule is that **every folder under
`.scratch/` is a piece of work, never a state**, and no folder in it carries lane or status
meaning. A ticket belonging to no feature therefore belongs to no folder, and sits flat at the
root. That is the only layout where no folder means a state. `.scratch/tickets/` was rejected on
the same rule: it is a folder that means "ticket", which is a folder carrying meaning again.

The root now holds 23 files and one folder, `skills-pivot/`, which is correctly a group.
`.scratch/` itself has no `issues/` child and no lead document, so ticket 03's heuristic will not
mistake the root for a group.

### The lanes

One lane per value, in triage order, with both terminal lanes collapsed:

| Lane | `status` | Cards |
| --- | --- | --- |
| Needs triage | `needs-triage` | 3 |
| Needs info | `needs-info` | 2 |
| Ready for agent | `ready-for-agent` | 9 |
| Ready for human | `ready-for-human` | 2 |
| Deferred | `deferred` | 3 |
| Done (collapsed) | `done` | 4 |
| Wontfix (collapsed) | `wontfix` | 0 |

Every one of the 23 backlog tickets places. Nothing from the backlog fell to `Unmapped`.

`match.field` with `equals` was already supported by `config.mjs`, so no source changed. The only
edits outside `.scratch/` are `scratchboard.json`, `AGENTS.md`, `docs/agents/issue-tracker.md`,
and `docs/agents/triage-labels.md`.

The four `shipped` tickets became `done`. The three `deferred` stayed, and the demo is now live
proof of the tier-3 tolerance ticket 01 promised: an unrecognized value passes through untouched
and takes its lane from local config.

`Wontfix` ships empty, as ticket 02 predicted. It is the one narrow rail nothing here fills.

### The toolbar

Two facet groups where there were three:

- `priority`: 4 chips, `p0`(1) `p1`(5) `p2`(9) `p3`(8)
- `labels`: 28 chips, from `parser`(7) down to a long tail of 17 singletons

The `status` facet disappeared on its own, as the ticket predicted. This was verified rather than
assumed: declaring the facet in `scratchboard.json` alongside the status lanes still produces a
payload carrying only `priority` and `labels`, because `laneFields()` in `config.mjs` drops any
field a lane matches on. Removing it from the config is therefore cosmetic, and it was removed so
the file states what it means.

What the remaining interface cleanup is looking at: the 28-chip `labels` group is now the whole
weight of the toolbar, and 17 of those chips sit on exactly one ticket each. Seven lane rails plus
`Unmapped` is also two more rails than before.

### What the migration lost

"In progress" is gone as a concept, and nothing replaces it. Ticket 4 was the sole card in
`in-progress/` and is `ready-for-human`, which is where it now sits. The fact that someone had
started it lived only in the folder, and the six values have no way to say it: the triage roles
describe what a ticket needs, not whether anyone picked it up. Wayfinder's dialect has `claimed`
for exactly this and the triage dialect has no equivalent. Recorded as fog rather than decided
here, because it is a spec question and this is a task ticket.

### Out of scope, deliberately

`skills/scratchboard/SKILL.md` still does not teach `done`. Ticket 02 gave it that job and this
ticket's brief named only `AGENTS.md` and `docs/agents/issue-tracker.md`, so the teaching is left
for the work that builds the spec. `docs/agents/triage-labels.md` gained `done` as a sixth row,
and the wayfinder `Status:` line in `docs/agents/issue-tracker.md` gained `out-of-scope`, both of
which ticket 02 had already settled.

`README.md`, `docs/reference.md`, and `tools/corpus.mjs` keep their `.scratch/todo/**` path-match
examples untouched. Path matching is still a first-class feature; this repo simply stopped using
it for its own board.
