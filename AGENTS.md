# scratchboard

`npx scratchboard` renders the markdown tickets already in a repo as a kanban board, baked into
one self-contained HTML file. Read-only by choice: tickets are agent-driven, so the agent moves
the card.

## The rules that bite

**Zero dependencies, and it covers the test setup.** `node:test` and `node:assert` only. The rule
is the product, because an `npx` run that installs nothing is why anyone tries this. `npm test`
needs nothing installed, and a line under `dependencies` or `devDependencies` in `package.json`
is the tell that the rule broke. Lint and type tooling is fetched for the run by `npx` at a
pinned version, in CI and locally alike, and is never declared. `tools/guard.mjs` holds the line.

**Node 18 is the floor.** A version check failing on first contact is a bad first impression, so
run the suite on 18 as well as current before calling a change done.

**The payload is the contract.** `scan.mjs` emits it, the browser renders it, and `src/ui/` reads
nothing else. Adding a field is a change to both sides.

**Config names every lane and every field.** No lane name, status value, or metadata key belongs
in the source. A stranger's `severity` field has to work with no code change, which is the reason
this was extracted from the board it grew in.

**Ids are strings, everywhere.** A ticket is allowed to have no id at all, so DOM lookups key on
`path`.

**Ticket markdown is untrusted.** It comes from a stranger's repo and renders in a browser. The
`SAFE_HREF` allowlist in `board.js` and the payload escaping in `bake.mjs` are the only things
between the two, so a change there ships with a test that attacks it.

**A file the parser cannot read lands in `warnings` with its path and its reason.** A board that
quietly drops three tickets is worse than a board that shows an error. This holds for every
failure a scan can survive.

**Unknown config keys warn, and survive.** They are ignored on read and written back untouched,
so a config written against a newer version still renders on an older build.

**Both themes clear WCAG AA for text.** `test/theme.test.mjs` computes the ratios from the
stylesheet, so a palette edit that regresses contrast fails the suite instead of shipping.

## Verifying a scanner change

`tools/` holds the acceptance test, and it is stronger than the unit suite. Scratchboard was
ported from a working Python board, so both scanners can read the same real repo at one commit
and be diffed:

```
node tools/compare-python.mjs <path-to-that-repo>
node tools/compare-detection.mjs <path-to-that-repo>
```

The first proves the port still agrees on every ticket, field, and facet. The second proves a
zero-config run and a hand-written config produce the same lanes. Run both for anything touching
`scan.mjs`, `parse/`, `detect.mjs`, or `config.mjs`.

## The board is dogfooded

`.scratch/` holds this project's real backlog, and every push bakes it to the Pages demo with
scratchboard itself. Those tickets are public copy. File real, unstarted work: a ticket
describing something already done is a lie the demo tells on every page load.

## Shipped copy

The README, `--help`, CLI output, and the skill are all read by users. Plain and specific, with
no em dashes, no exclamation marks, and no emoji.

Read-only is a position. State it with its reason in the same breath and it reads as a decision:
tickets are agent-driven, so the agent moves the card.

## Comments

Comments are a cost. Names and structure carry the meaning; reach for a comment when they
genuinely cannot, and keep it to one line.

## Commits

Branch `<type>/<slug>`. Imperative subject, 72 characters.
