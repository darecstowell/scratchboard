# 03. How does the board recognize an effort folder and tell one shape from another?

Type: grilling
Blocked by: 01
Status: resolved

## Question

Three folder shapes live under `.scratch/` and nothing inside a file says which is which:

- a wayfinder effort, signalled by `map.md` beside an `issues/` folder
- a `to-tickets` feature, signalled by `spec.md` beside an `issues/` folder
- loose tickets, whatever a repo happens to do

Directory shape is the only signal available. Today the scanner has no notion of a non-ticket at
all, so every file matching the glob becomes a card or falls into the catch-all lane. That is
why this effort currently bakes junk onto the public demo.

Measured on this repo the moment the effort was written, with `--scan`:

```
byLane: {"Todo":18,"In progress":1,"Done":4,"Unmapped":13}
id 10 is on 2 tickets: .scratch/skills-pivot/issues/10-..., .scratch/todo/10-...
id 11 is on 2 tickets: .scratch/skills-pivot/issues/11-..., .scratch/todo/11-...
```

Re-measured on 2026-08-18, after the effort grew: `Unmapped` holds 18, the 15 effort tickets
plus `map.md` and both research files. The junk grows with the effort, so it is not a fixed cost.

The id collision was not predicted. His convention numbers effort tickets from `01` inside each
effort, while lane tickets are numbered globally across the board, and `idPattern` matches both.
So ids collide as soon as an effort passes ten tickets, and a second effort collides from `01`.
Recognition therefore has to scope ids, not just hide files.

Open:

- Does recognition live in `detect.mjs` beside the existing zero-config detection, or in config,
  or both?
- What does a repo write to override a wrong guess?
- Does a recognized effort disappear from the lanes entirely, or appear as one card that opens
  into the effort?
- What does the scanner do with a folder it half-recognizes, given the rule that a file it
  cannot read lands in `warnings` with its reason?

## Answer

Recognition is a live heuristic in the dialect module, correctable by a new `groups` key in
config. A recognized folder leaves the ticket list for a collection of its own.

### Where recognition lives

Both places, which is the shape ticket 01 already settled: "Detection keeps guessing at any repo.
The dialect is one recognized shape beside that, not a replacement for it."

The dialect module reads directory shape. A lead document beside an `issues/` folder marks a
group, and the lead document names the kind: `map.md` for a wayfinder effort, `spec.md` for a
`to-tickets` feature. `looksLikeTicket()` in `detect.mjs` is the existing per-file hook.

Heuristic alone gives a repo no way to correct a wrong guess. Config alone means a stranger who
clones the wayfinder convention gets junk on the board until they read the docs, which is the
failure this ticket exists to remove.

### One mechanism, two kinds

Both shapes go through the same recognition, the same id scoping, and the same removal from the
lanes. They differ only in a `kind` the payload carries.

Recognizing wayfinder alone would leave the identical bug standing for anyone using
`to-tickets`, because the id collision and the lane pollution have the same cause. The `kind`
records the difference without spending it. Whether the two kinds earn different views stays fog,
where the map put it, and belongs to
[Prototype the wayfinder view](./04-prototype-the-wayfinder-view.md) and
[One wayfinder view or several](./14-one-wayfinder-view-or-several.md).

### A group is not a ticket

A recognized group leaves the ticket list and lands in a collection of its own. It is not
excluded, and it is not one card sitting in a lane.

`AGENTS.md` now states that efforts are not tickets and are planning rather than backlog. A card
in a lane contradicts that vocabulary. Exclusion loses the effort completely, which fights the
standing note that a first-class wayfinder view is wanted. A collection is the thing a view
reads, and [Documents in the payload](./06-documents-in-the-payload.md) is already blocked on
this ticket, so it does the encoding.

The cost is a payload field on both sides, and until a view exists a user with an effort sees
silence where junk used to be.

### Roles by position

The collection holds every file under the group root, and each carries a role taken from where it
sits: `map` for the lead document, `issue` for a file under `issues/`, `other` for anything else.

This ticket names the roles. How a `role: other` file renders is ticket 06's. Recognizing only
the lead document and `issues/` would leave this effort's two research files in `Unmapped`, which
is part of the junk being removed.

### Ids scope to the group

The cross-collision fixes itself. Effort files leave the ticket list, so the warning at
`scan.mjs:211` can no longer pair `.scratch/skills-pivot/issues/10-*` with `.scratch/todo/10-*`.

The local id survives for display, because `03` is what a human calls the ticket, and namespacing
it to `skills-pivot/03` invents a string nobody writes. The uniqueness check survives too, scoped
inside the group, because two files numbered `03` in one effort is still a bug.

### The override

A new top-level `groups` key, kind-neutral so it serves both shapes:

```json
{
  "groups": [
    { "path": ".scratch/skills-pivot", "kind": "effort" },
    { "path": ".scratch/some-feature", "kind": "feature" },
    { "path": ".scratch/not-an-effort", "kind": "none" }
  ]
}
```

One key covers all three overrides a repo needs: a group the heuristic missed, a folder wrongly
taken for a group, and `kind: "none"` to opt a folder out. It joins `KNOWN_KEYS`, so an older
build warns and renders anyway under the unknown-keys rule.

`AGENTS.md` holds that no lane name, status value, or metadata key belongs in the source, which
would argue the marker filenames belong in config too. Ticket 01 already carved the exception by
settling on a named dialect module that hardcodes upstream's shape. The spec states this out
loud, so it does not read as an oversight.

### `groups` reclassifies, it never extends the walk

`tickets` owns what exists and `groups` owns what it means. A group naming a path the glob never
reaches earns a warning, not a second discovery mechanism.

Extending the walk would let a board show files its own glob does not match, and it would break
the `globRoot()` shortcut at `scan.mjs:135` that keeps a scan from walking the whole repo.

### `init` does not write groups

Detection stays live on every scan. `groups` exists only to correct a wrong guess.

This diverges from lanes on purpose. `configFrom()` materializes detected lanes into the config,
which is right because lanes are stable. Efforts are created and finished constantly, so writing
each one to config means a config edit before the board stops showing junk for every new effort.
That friction is what would stop anyone using this. The spec says why the two differ.

### Groups sit outside `counts.total`

`total` counts tickets, and a group is not a ticket. On this repo the number goes from 41 to 23,
which is the honest backlog. The group reports its own count, so nothing goes unreported.

### A half-recognized folder

A lead document with no `issues/`, or an `issues/` folder with no lead document, raises the tier-2
diagnostic ticket 01 defined, naming the half that is missing. The files then stay ordinary
tickets.

Excluding them instead would break the older rule that a board quietly dropping tickets is worse
than a board showing an error. Where that diagnostic surfaces belongs to
[How does the board offer its own repair skill](./15-offer-the-repair-skill-from-the-board.md).

### The weak point

`groups` is a generic word this codebase has not used before, chosen because Q3 required kind
neutrality. It is the part of this decision most worth revisiting before ticket 06 encodes it in
the payload.

### What this does not decide

What a recognized group looks like on screen. That is
[Prototype the wayfinder view](./04-prototype-the-wayfinder-view.md),
[One wayfinder view or several](./14-one-wayfinder-view-or-several.md), and
[Documents in the payload](./06-documents-in-the-payload.md).
