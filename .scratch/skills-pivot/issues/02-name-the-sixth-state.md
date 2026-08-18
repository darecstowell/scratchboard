# 02. Name the sixth lifecycle state, and decide what writes it

Type: grilling
Blocked by: 01

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
