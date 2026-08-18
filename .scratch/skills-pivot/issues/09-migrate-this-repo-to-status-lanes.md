# 09 — Migrate this repo's own board to triage-role lanes

Type: task
Blocked by: 02

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
