# 17. What does the wayfinder surface show, and what does the payload carry for it?

Type: grilling
Blocked by: none
Status: resolved

## Question

Merged from two tickets: what non-ticket documents enter the payload, and whether a map gets one
view or several. The payload question is unanswerable without knowing what the view needs, so they
were always one decision.

### Documents in the payload

The payload is the contract: `scan.mjs` emits it, the browser renders it, `src/ui/` reads nothing
else, and adding a field changes both sides. Today it carries tickets, lanes, facets, and
warnings, and it has no concept of a document.

[How does the board recognize an effort folder](./03-recognize-an-effort-folder.md) settled that a
recognized group holds every file the glob discovered under its root, each with a role of `map`,
since renamed to `lead` by the amendment below,
`issue`, or `other`. This decides what a `role: other` file becomes.

Candidates, by how reliably they sit in the working tree:

- `CONTEXT.md` and `docs/adr/NNNN-slug.md`, fixed templates at fixed paths, read and written by
  several unrelated skills. The most stable artifacts in the ecosystem.
- `spec.md` inside a feature folder.
- `map.md` inside an effort folder, which needs more than plain rendering.

Open:

- One document type with a kind field, or several distinct types?
- Does a document get an excerpt, dates, and refs the way a ticket does, or is it opaque body
  text?
- `CONTEXT.md` and ADRs live outside `.scratch/` entirely. Does the scanner grow a second glob,
  and does that break the promise that one glob defines the board?
- Ticket markdown is untrusted and documents are too. The `SAFE_HREF` allowlist and the bake
  escaping cover tickets today. Whatever lands here ships with a test that attacks it.

### One view or several

[Prototype the wayfinder view](./04-prototype-the-wayfinder-view.md) settled the shape: three
columns by state, live edges only, hover showing what a ticket unblocks. This decides how many
such surfaces exist and whether the shape changes with size.

The research gives this real edges rather than taste:

- Ghoniem, Fekete and Castagliola found adjacency matrices beat node-link diagrams past roughly 20
  nodes on every task except tracing a path. An effort at 10 to 50 tickets sits across that
  threshold, so no single view is right at both ends.
- A frontier-first list needs no layout and matches the read-only posture.
- The chosen columns-by-state design needs no layout either, which removes the cost argument that
  used to separate the options.

Open:

- Does switching automatically at a node count help a reader or disorient them? A view that
  changes under you is a real cost, not a clever feature.
- If several views ship, is the choice remembered, and where, given a baked file that fetches
  nothing?
- Every icon is bytes in every board, which is why the icon set is curated. The same argument
  applies to a second and third view. What is the budget?
- Is the frontier-first list a view at all, or is it what the board does by default with the graph
  as the thing you opt into?
- The chosen design carries a known gap: both ends of an edge can share a column. Does that change
  at forty tickets, where `behind us` grows without bound?

## Answer

An effort gets a view of its own beside the board, and the payload gains one key, `groups`. The
board itself does not change.

### The board stays the board

A repo with no group and no `CONTEXT.md` renders exactly today's board, with no tab bar at all,
not a bar holding one tab. This is the rule ticket 16 already set for the copy affordance: a
stock board is unchanged.

Where a group exists, the board is the first tab and the default view. The lanes, the fields, and
the facets are untouched. The one difference for a repo that wayfinds is the one ticket 03
already made: effort files leave the lanes, which takes this repo from 41 cards to 23.

### One view, three columns, at every size

The view is ticket 04's design and nothing beside it. There is no second view, no view picker,
and no switch at a node count.

The Ghoniem finding that a node-link diagram degrades past about 20 nodes was the argument for
shipping a matrix as well. It does not apply, because this design is not a node-link diagram.
Columns cannot tangle, since nothing is routed. A view that replaces itself when an effort
reaches its twenty-first ticket is a worse cost than the one it removes.

The frontier-first list is not an option any more either. The middle column is that list. Ticket
04 closed that fork without naming it.

A `kind: feature` group gets a plain ticket list rather than these columns. Two kinds, one view
each.

### `behind us` is collapsed, always

It renders folded with its count. This repo already answered the same question for the `done` and
`wontfix` lanes, for the reason already written down: a lane that grows without bound is a lane
nobody reads.

No threshold. A view that behaves one way at 19 tickets and another at 21 is the thing the
paragraph above rejects. This closes the forty-ticket question ticket 04 left open.

### The map is the header, and its index is dropped

The map body renders as the view header. Destination is open. Notes, Not-yet-specified, and
Out-of-scope are folded, each with a count.

Decisions-so-far is parsed and discarded. The `behind us` column is that list. Rendering both puts
the same set of resolved work on one screen in two formats, and they drift the first time someone
edits one and not the other. The column becomes the canonical view of resolved work, and a stale
index in `map.md` is then invisible to a reader rather than misleading.

`role: other` files, this effort's two research write-ups, render as title and body documents in a
folded list beside the notes. They are not cards.

### A claimed ticket, and an out-of-scope ticket

Wayfinder's own frontier is open, unblocked, and unclaimed, so a claimed ticket is not takeable.
It stays in `takeable now`, greyed, and does not count toward the column number. A fourth column
splits the frontier across two places, which shortens the one column a reader opens the page for,
and it sits empty most of the time. The cost is stated rather than removed: the column named for
acting sometimes holds something nobody can act on.

Ticket 02 gave the dialect four states and ticket 04 gave the view three columns, so
`out-of-scope` had no home. It ships with `state: "out-of-scope"` and renders in the folded
out-of-scope section of the header, never in a column. `behind us` is the route that was walked,
and a ticket ruled past the destination was never a step on it, which is the same reason wayfinder
keeps these out of Decisions-so-far. The file is placed rather than dropped, so the rule that a
board never quietly loses a file holds.

### Edges

`blockedBy` rides on issues inside a `kind: effort` group and nowhere else. It is read from the
structured `Blocked by: NN, NN` line and from nothing else.

A `to-tickets` feature writes the same idea as prose, and it is not parsed. Guessing edges out of
sentences would make the board's picture of the work depend on sentence shape. An ordinary board
ticket carries no edges, because no view draws them and the bytes would ride in every board ever
baked.

Only the forward direction ships. The browser inverts it in one pass for ticket 04's hover.

### State is computed at bake time

The payload carries the answer, `state` and `claimed`, beside the raw `blockedBy` that hover
needs.

Ticket 01 gave the dialect module ownership of upstream vocabulary. If the browser derives the
columns, `board.js` has to learn what `resolved` and `out-of-scope` mean, and that code ships in
every board including boards with no effort in them. The argument against is that a derived value
goes stale, and it is accepted rather than answered: a baked board is a snapshot of a moment, so
everything in it already is.

The same rule sends the map's section split to bake time. Only the dialect knows that a heading
called "Not yet specified" is the fog. Shipping raw markdown and slicing it in the browser puts
English heading names into the UI source, which is what the config rule exists to prevent, and it
breaks the first time somebody renames a heading.

### `CONTEXT.md` and the ADRs are a third kind of group

They enter the payload. This reverses the first recommendation in this session, which refused them
on the grounds that reading them means a second glob.

That objection was aimed at the wrong mechanism. They are not a pattern to search for. They are
three named locations that `/domain-modeling` and `/grill-with-docs` write to and nowhere else, so
discovery is one stat of `CONTEXT.md`, one stat of `CONTEXT-MAP.md`, and one shallow read of
`docs/adr/`. There is no recursion, no second walk root, and the `globRoot()` shortcut that keeps
a scan off the whole repo is untouched. Ticket 03 refused inventing discovery out of glob results,
which is a different thing. Ticket 01 already carved the exception for a dialect module that
hardcodes upstream's shape, and this is that exception used again.

They are also the artifacts that matter most. A map is planning and it ends when the effort ends.
The glossary and the decision log are what survive it.

Config keeps a `documents` key to correct or switch off a wrong read. It reclassifies and never
extends the walk, the same rule `groups` lives under.

They are not a new collection. `kind: "context"` is a third kind of group, with `CONTEXT.md` as
the lead document and each ADR as a file under it. The tab, the header, the payload key, and the
renderer are all reused. A second collection that behaves identically to a group is two names for
one shape, which is how a payload contract rots.

The ADRs render as a list, highest number first, with a distinct treatment rather than the ticket
card. The optional `Status:` shows as a badge when a file carries one and is simply absent when it
does not. Lanes by status would give four columns with three permanently empty, since the format
says most ADRs carry no status, and would imply that a decision moves through stages, which is not
what an ADR is.

### One correction to ticket 03

The lead role was named `map`, which fits one kind of group. It becomes `lead`, so the roles are
`lead`, `issue`, and `other`. `map.md`, `spec.md`, and `CONTEXT.md` are all leads. Ticket 03
already named its own naming as the part most worth revisiting.

### Several contexts

`CONTEXT-MAP.md` links out to a `CONTEXT.md` per context with its own `docs/adr/` beside it. The
board follows those links and gives each context a group of its own, because a repo large enough
to split its contexts is the repo that most needs a glossary.

Every resolved path must land inside the repo root. A path that escapes is refused and named in
`warnings`, and a link that resolves to nothing raises the tier-2 diagnostic while the rest still
render.

This is the one part of the decision that carries real risk. It is the first time the scanner
opens a path chosen by untrusted repo content. The fence is the whole defence, so it ships with a
test that attacks it, under the rule the markdown escaping already lives under.

### The type shows as a word

A card shows `research`, `prototype`, `grilling`, or `task` as a short word above the title. No
new icons.

The icon set is small on purpose, validated in `config.mjs` and held to the bundle by
`test/icons.test.mjs`, because every icon is bytes in every board including boards with no effort.
Four new icons for one view is the opposite of curating a set, and `grilling` has no glyph a
reader would identify. The word costs only the string, which already ships. This leaves the icon
budget closed rather than spent.

### Links resolve inside the payload

A relative link whose target matches a path already in the payload becomes in-board navigation.
Everything else keeps today's `SAFE_HREF` behaviour with no change.

A baked board is one file, so a relative link to a `.md` path is dead by construction, and the map
body is almost entirely such links. Resolving them is what makes wayfinder's rule of naming a
ticket rather than numbering it pay off on screen. The resolver matches against paths in the
payload and never touches disk, so it opens no read surface.

### The tab bar

One row. The board is pinned first and always present. Groups follow in path order. The row
scrolls sideways and never wraps.

A card click opens the existing right-edge detail panel unchanged, keyed on `path` like the rest
of the UI. There is no second detail surface.

What the row does when it genuinely does not fit is handed to
[Fit the toolbar chips by measurement](../../24-fit-the-toolbar-by-measurement.md), which owes the
same answer for the toolbar already. Solving it twice, differently, is how two toolbars end up
disagreeing.

### The payload

One new top-level key from this ticket. `tickets` is unchanged.

The payload gains two top-level keys in total across the effort.
[What the board does with skills](./16-what-the-board-does-with-skills.md) adds the other, the list
of prepared invocations a repo declares in config, carried once at the top so the browser can
substitute `{path}` on click. That key is that ticket's to specify, not this one's, and it is
present whether or not a group exists.

```text
groups: [
  { kind: "effort" | "feature" | "context",
    path, title,
    sections: { destination, notes, fog, outOfScope },
    files: [
      { role: "lead" | "issue" | "other",
        path, title, id, body,
        type, state, claimed, blockedBy }
    ] }
]
```

`sections` carries what the lead document holds, split by the dialect. `type`, `state`, `claimed`,
and `blockedBy` are present on an effort's issues and absent elsewhere.

### What this does not decide

Whether `groups` is the right name. The lead role was renamed and the key was left alone, so the
fog entry stands.

Whether the tab row needs measurement to fit. Ticket 24 owns it.

## Comments

An interactive mock of all seventeen decisions was built during the session and thrown away. It is
not committed.
