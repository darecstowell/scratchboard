---
title: Should an explicitly named port walk up when it is busy?
status: needs-triage
priority: p2
labels: [serve, cli, design]
---

# Should an explicitly named port walk up when it is busy?

`--serve` defaults to port 8787 and walks up when that port is taken, so two boards on one
machine both start. The board this was ported from tried forty ports, 8787 through 8826,
treating only `EADDRINUSE` and `EACCES` as reasons to move on, and failed loudly once it ran
out.

Walking up from the default is clearly right. Nobody chose 8787, so nobody minds landing on
8788.

What no document settles is what should happen after `--serve --port 9000`. One rule covers
both cases today.

**The case for walking up anyway.** One rule is easier to explain than two. A developer who
passes a port often wants any port that works, and the run prints the address it bound to, so
nothing is hidden.

**The case for failing instead.** Someone who names a port usually named it for a reason: a
reverse proxy pointing at it, a firewall rule allowing it, a bookmark, a container port
mapping. Quietly binding 9001 satisfies the letter of the request and breaks the exact thing
the request was made for, and the breakage shows up somewhere else entirely.

Neither answer is obviously wrong, which is why this is a question rather than a bug. The
walk-up itself works and is tested. Only the explicit case is undecided.

Whatever is settled, the walk-up range needs a stated end. Forty attempts came from the
source board and no reasoning travelled with the number.

## Done when

There is a recorded decision covering the explicit case, the behaviour matches it, `--help`
states the rule in one line, and a test binds a named port first and asserts the chosen
outcome.
