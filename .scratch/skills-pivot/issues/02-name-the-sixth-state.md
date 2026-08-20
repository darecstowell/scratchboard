# 02. Name the sixth lifecycle state, and decide what writes it

Type: grilling
Blocked by: 01
Status: resolved

## Question

Settled: lanes become triage roles, and his five roles need a sixth terminal state because they
are a triage queue, not a lifecycle. On a real tracker "done" is the issue being closed. Local
markdown defines no equivalent.

This repo already improvised, replacing `wontfix` with `deferred` and `shipped` in
`scratchboard.json`. That improvisation is evidence of the gap, not a decision.

Open:

- What is the state called, and does it replace `wontfix` or sit beside it?
- What writes it? No skill of his sets a terminal state on a local file, so either a skill has to
  change, a human sets it by hand, or the board derives it.
- Does `wontfix` deserve a lane at all, or is a rejected ticket better hidden than columned?
- What happens to a ticket that is closed as out of scope, which wayfinder treats as distinct
  from resolved?

## Answer

The sixth state is `done`, it is a value in the existing `status` field, and an agent writes it,
taught by `skills/scratchboard/SKILL.md`.

### One field, not two axes

On GitHub the five roles are labels and open or closed is separate tracker state, so `wontfix` is
a label on a closed issue. Local markdown collapsed those two axes into one field. Porting the
two axes faithfully would mean inventing a field name where upstream is silent, and every repo
his skills write would then read as having nothing closed at all.

So the field stays one. `status` holds six values: `needs-triage`, `needs-info`,
`ready-for-agent`, `ready-for-human`, `wontfix`, `done`. Ticket 01 settled that a field name is
never invented in competition with one his skills write. A value inside a field he already
writes is a much smaller act, and his repos already carry `wontfix`, so the board understands one
terminal state at zero config today.

The scanner already agrees. `DONE_LIKE` in `detect.mjs` treats `done`, `closed`, `complete`,
`shipped`, `resolved`, `wontfix`, and `superseded` as terminal, ranks them last, and collapses
their lane. The gap was never a missing axis. It was that the only terminal value his roles
supply is the negative one.

### Why `done` and not the alternatives

`resolved` collides with wayfinder's `Status: resolved` on effort tickets, which deepens the
two-enums-one-field-name problem the survey lists as gap 3. `closed` reads as the parent of both
`done` and `wontfix` on a real tracker, so it is wrong as their sibling. `shipped` is loaded,
because a docs ticket or a decision is not shipped.

`done` collides with nothing, it is the word the lane already carries, and it stays neutral
across code, docs, and decisions.

### What writes it

The agent, and `skills/scratchboard/SKILL.md` teaches it. That skill already ships and already
publishes through `skills.sh`, so it takes a second job beside the repair it does now: it owns
the vocabulary upstream is silent about. A human can edit the line like any other field, but the
documented path is the agent, which is what "tickets are agent-driven, so the agent moves the
card" already says.

The board never writes it. Read-only holds, and deriving the state was dead anyway once the
folder stops being the lane, because no signal is left to derive from.

The interface that points a stuck user at the skill is not decided here. It is the same surface
[What the board does with skills](./16-what-the-board-does-with-skills.md)
owns, sharing the copyable-string machinery with
[What the board does with skills](./16-what-the-board-does-with-skills.md).

### `wontfix` keeps its own lane

One lane per value, and both terminal lanes are collapsed. A shared `Closed` lane would erase the
difference between work that landed and work that was refused, and there is no facet left to
recover it: `laneFields()` in `config.mjs` drops a lane's own field from the toolbar. One value
per lane also needs no special case in the spec.

The cost is one narrow rail that starts empty in this repo, because no ticket here uses
`wontfix`. A repo his skills write will fill it.

### `shipped` becomes `done`, `deferred` stays local

The published spec recognizes his five roles plus `done`, and nothing more. That keeps the
`supports mattpocock/skills v1.2.x` badge honest.

`deferred` is not terminal. It means "not now", which is an open state, and it carries real
information that `needs-triage` loses: it says someone looked and chose later. It survives as
this repo's own value, outside the spec, with its own lane in `scratchboard.json`. The demo board
then becomes live proof of the tier-3 tolerance ticket 01 promised, where a stranger's value
passes through untouched and gets its lane from local config.

The four tickets on `shipped` move to `done`. The three on `deferred` stay.
[Migrate this repo's own board to triage-role lanes](./09-migrate-this-repo-to-status-lanes.md)
does the moving.

### The wayfinder dialect gets `out-of-scope`

The gap exists twice, once per dialect. Wayfinder already has its terminal value in `resolved`.
What it lacks is "closed, but not resolved", which the skill calls ruling a ticket out of scope.
On a real tracker that is closing the issue. Local markdown offers only `claimed` and `resolved`,
so an out-of-scope ticket is indistinguishable from a live one.

Name a third value, `out-of-scope`. Upstream is silent here exactly as on the backlog side, so
ticket 01's rule applies unchanged: name it here, and say so out loud in the spec. The word is
wayfinder's own, taken from the map's `## Out of scope` section, so it reads as native.

Effort tickets never adopt the six triage roles. Wayfinder's skill writes `resolved`, and telling
users to disobey the skill they installed is not a coupling this project wants.

### Disjointness is a rule

The two enums share no value: `claimed`, `resolved`, `out-of-scope` against the six triage roles.
So a recognized value is readable as its dialect on its own, with no directory shape needed. The
spec states this as a rule, and the drift test that ticket 01 puts between the doc and the
dialect module holds it.

The rule reaches recognized values only. A value in neither enum, such as this repo's `deferred`,
and a file with no `status` at all, say nothing about which convention wrote them. Those fall
back to the group the file sits in, which
[How does the board recognize an effort folder](./03-recognize-an-effort-folder.md) settles.

This is the reason `resolved` was rejected as the sixth state and `wontfix` was rejected for
out-of-scope. Either choice would have broken the invariant.

### A ticket with no `status`

It lands in `Unmapped`, and the scan names the values it could not place. No default to
`needs-triage`, because a default is the board inventing state it was not told, which cuts
against read-only. This is the fourth slot of the spec, and it is stated plainly rather than left
to be discovered. It is also exactly the half-read shape the diagnostic in ticket 15 attaches to.

### What this does not decide

How a resolved or out-of-scope effort ticket renders. That waits on
[How does the board recognize an effort folder](./03-recognize-an-effort-folder.md) and
[What the wayfinder surface shows](./17-what-the-wayfinder-surface-shows.md).
