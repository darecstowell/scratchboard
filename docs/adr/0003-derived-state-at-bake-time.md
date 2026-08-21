# Wayfinder state is computed at bake time

The wayfinder view sorts tickets into `behind us`, `takeable now`, and `still blocked`, which is
derived from each ticket's `Status:` and from every blocker it names. The scan computes it and the
payload carries the answer, so the browser sorts cards it is already told about.

"Bake time" here means the scan rather than the bake step alone. `src/board.mjs` runs `scan()` once
and hands the same payload to `--serve` and to `bakeToFile`, so a served board carries the derived
state too. The contrast that matters is scan against browser, not bake against serve.

## Considered options

Shipping the raw `Status:` values and deriving the columns in the browser was rejected. It teaches
`board.js` what `resolved`, `claimed`, and `out-of-scope` mean, which is upstream vocabulary that
ticket 01 gave to the dialect module. That code would then ride in every board ever baked,
including boards with no effort in them.

The same argument sends the split of `map.md` into named sections to bake time. Only the dialect
knows that a heading called "Not yet specified" is the fog.

## Consequences

A derived value can go stale, and this is accepted rather than mitigated. A baked board is a
snapshot of one moment, so every value in it already is.

The raw `blockedBy` list ships beside the derived state, because the hover behaviour needs the
edges themselves. The board inverts it to find what a ticket unblocks.
