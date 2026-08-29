# scratchboard

`npx scratchboard` renders the markdown tickets already in a repo as a kanban board, baked into
one self-contained HTML file. Read-only by choice: tickets are agent-driven, so the agent moves
the card.

## The rules that bite

**Zero dependencies, and the rule is the install graph of `npx scratchboard`.** `node:test` and
`node:assert` only. The rule is the product, because an `npx` run that installs nothing is why
anyone tries this. A dependency that runs only during a bake breaks it too, because `npx`
installs it either way. `npm test` needs nothing installed, and a line under `dependencies` or
`devDependencies` in `package.json` is the tell that the rule broke. `tools/guard.mjs` holds the
line.

**The lint and type tooling is the one hole, and it is written down rather than patched.** `npx`
fetches those tools for the run at a pinned version, in CI and locally alike, and they are never
declared. The pin does not reach their own transitive dependencies, so the tooling runs unpinned
code in CI. It never reaches a user's install or a published board, which is why it is stated
here instead of fixed here.
[The lockfile ticket](.scratch/28-lockfile-for-the-npx-tooling.md) owns the fix.

**Node 18 is the floor.** A version check failing on first contact is a bad first impression, so
run the suite on 18 as well as current before calling a change done.

**The payload is the contract.** `scan.mjs` emits it, the browser renders it, and `src/ui/` reads
nothing else. Adding a field is a change to both sides. `src/ui/payload.mjs` is the one reader:
`normalizePayload` holds every default and every type check, so `board.js` gets a payload it can
trust. `test/ui-payload.test.mjs` calls it, and the bake concatenates it ahead of the board
script, the same way it does the renderer.

**A pure helper leaves `board.js`, because a test can call it.** Nothing here runs a DOM, so a
helper that stays inside the board script can only be tested by a regular expression over its own
source. `src/ui/board-render.mjs` holds the data in and string out half of the view: the link
resolver, the group header, the columns, the cards, and the downstream walk. It touches no
`document` and no `window`, and every piece of state it needs comes in as a parameter.
`test/ui-board-render.test.mjs` calls it. `board.js` keeps the event wiring, and the bake
concatenates the module ahead of it. The three modules share one scope in the baked page, so a
name two of them declare is a syntax error in the browser rather than a red test.

**Config names every lane and every field, except the dialect.** No lane name, status value, or
metadata key belongs in the source. A stranger's `severity` field has to work with no code
change, which is the reason this was extracted from the board it grew in. The dialect is the one
named exception: it is a single file layout the board reads by name, and it sits beside detection
rather than replacing it. The `groups` and `invocations` config keys are not part of the
exception. They declare structure rather than anyone's vocabulary, so they were always inside the
rule.

**Ids are strings, everywhere.** A ticket is allowed to have no id at all, so DOM lookups key on
`path`.

**Ticket markdown is untrusted.** It comes from a stranger's repo and renders in a browser. The
`SAFE_HREF` allowlist in `src/ui/markdown.mjs` and the payload escaping in `bake.mjs` are the only
things between the two, so a change there ships with a test that attacks it. The renderer is a
plain module, `test/ui-markdown.test.mjs` calls it, and `bake.mjs` drops the `export` keyword and
concatenates the text ahead of the board script, so the page stays one file that fetches nothing.

**A file the parser cannot read lands in `warnings` with its path and its reason.** A board that
quietly drops three tickets is worse than a board that shows an error. This holds for every
failure a scan can survive.

**Unknown config keys warn, and survive.** They are ignored on read and written back untouched,
so a config written against a newer version still renders on an older build.

**The toolbar has two owners.** Search and sort are declared in `index.html`; the facet controls
are built by `board.js` and rebuilt on every render. What that rebuild clears has to miss
everything the page declares, or it deletes a control nobody rebuilds. `test/ui.test.mjs` reads
both files and holds the line, because nothing here runs a DOM.

**The icon set is small on purpose, and its two halves must agree.** Octicons are inlined as
path data in `board.js`, because a baked board fetches nothing. Every icon is bytes in every
board, so the set is curated rather than complete. `config.mjs` validates icon names against its
own list, and `test/icons.test.mjs` reads the bundle to hold the two together. Adding an icon
means both lists and the reference table.

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

The second one also has a corpus of its own, so it runs on every push:

```
node tools/compare-detection.mjs tools/fixtures/offmain
```

`tools/fixtures/offmain/` is twelve tickets in the OffMain layout the spec config describes,
with folder lanes and an `issue.md` in each ticket folder. It sits beside the tooling rather than
in `.scratch/`, so the demo board never counts it, and outside `src/`, so the tarball never ships
it. This repo cannot be that corpus: the backlog is flat and `status` is the lane, which
detection cannot guess, so the two runs would disagree forever.

Both runs name a config on the command line, and the detection run names an empty one. An empty
config declares nothing, so every key still comes from detection, and naming it anchors the root
at the corpus. A corpus inside another repository would otherwise resolve that repository's root
and read its tickets instead.

`compare-python.mjs` stays a local step, because it needs a second repository at one commit and
that is a decision of its own.

## The board is dogfooded

`.scratch/` holds this project's real backlog, and every push bakes it to the Pages demo with
scratchboard itself. Those tickets are public copy.

The `status` field is the lane, and the folder carries nothing. A backlog ticket is a file at
`.scratch/<n>-<slug>.md`, and changing a lane means editing one line rather than moving a file.
`status` holds the five triage roles plus `done`, this project's own terminal state, and
`deferred`, this project's own value outside the spec. `docs/agents/triage-labels.md` holds the
strings. A ticket whose `status` is a lie is a lie the demo tells on every page load.

Every folder under `.scratch/` is a piece of work, never a state. That is the upstream rule, and
it is why the backlog sits flat at the root. Wayfinder efforts are the one folder shape here: an
effort is a map and its decision tickets at `.scratch/<effort>/`, and it is planning rather than
backlog. `docs/agents/issue-tracker.md` holds the conventions. The scanner reads that shape now:
the demo scans with no warnings, 40 tickets on the lanes, no `Unmapped` lane, and two groups, this
repo's own context and the skills-pivot effort. A group's files leave the lanes and get a surface
of their own, so the effort is planning on the demo and the backlog stays the board.
[docs/local-markdown-spec.md](docs/local-markdown-spec.md) publishes what the scanner reads, and
`test/dialect.test.mjs` fails when the document and `src/dialect.mjs` disagree.

## Shipped copy

The README, `--help`, CLI output, and the skill are all read by users. Plain and specific, with
no em dashes, no exclamation marks, and no emoji.

Two positions ride at the top of the README, and each is stated with its reason in the same
breath, which is what makes a position read as a decision rather than an apology. Read-only:
tickets are agent-driven, so the agent moves the card. And it owns no directory and no file
format: it reads the layout the repo already has.

## Comments

Comments are a cost. Names and structure carry the meaning; reach for a comment when they
genuinely cannot, and keep it to one line.

## Commits

Branch `<type>/<slug>`. Imperative subject, 72 characters.

## Agent skills

### Issue tracker

Tickets are markdown files in `.scratch/`, and the `status` field is the lane. See
[docs/agents/issue-tracker.md](docs/agents/issue-tracker.md).

### Triage labels

The five canonical roles plus `done`, read from each ticket's `status` field. See
[docs/agents/triage-labels.md](docs/agents/triage-labels.md).

### Domain docs

Single-context: `CONTEXT.md` and `docs/adr/` at the repo root. See
[docs/agents/domain.md](docs/agents/domain.md).
