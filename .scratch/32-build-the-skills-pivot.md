---
title: Build the skills pivot, one spec for every decision the map locked
status: ready-for-human
priority: p0
labels: [spec, scanner, ui, config, docs, detection]
---

# Build the skills pivot, one spec for every decision the map locked

The [skills-pivot map](./skills-pivot/map.md) is closed. Every question it charted has an answer,
and no answer has been built. This is the build, in one piece.

Read the resolved tickets before starting. They hold the reasoning this spec only states:
[the reader spec](./skills-pivot/issues/01-own-the-local-tracker-spec.md),
[the sixth state](./skills-pivot/issues/02-name-the-sixth-state.md),
[recognizing a group](./skills-pivot/issues/03-recognize-an-effort-folder.md),
[the view design](./skills-pivot/issues/04-prototype-the-wayfinder-view.md),
[what the board does with skills](./skills-pivot/issues/16-what-the-board-does-with-skills.md),
[what the wayfinder surface shows](./skills-pivot/issues/17-what-the-wayfinder-surface-shows.md),
and [what scratchboard promises](./skills-pivot/issues/18-what-scratchboard-promises.md).
The visual reference is four prototypes at `src/ui/prototype-wayfinder-*.html`, of which
`prototype-wayfinder-c1-hover.html` is the design that won.

## Problem Statement

A person keeps their tickets as markdown in their repo and runs `npx scratchboard` to see them as
a board. It works.

Then they start using agent skills that plan. Those skills write more than tickets. A wayfinder
effort is a map document and a folder of decision tickets. A `to-tickets` feature is a spec
document and a folder of tickets. `/domain-modeling` writes a glossary and a decision log. The
board has no idea what any of it is.

What they see is worse than nothing:

- Every planning file becomes a card. This repo's own board shows 41 cards when the backlog is 23.
- Those cards land in a trailing `Unmapped` lane, because a planning file carries no triage status.
- Ticket numbering restarts at `01` inside a planning folder, so it collides with the backlog and
  the board reports duplicate ids for files that were never the same ticket.
- The map document, which is the most valuable file in the effort, renders as one more card with a
  wall of markdown inside it. Its dependency edges, its frontier, and its destination are invisible.
- The glossary and the decision log, the two artifacts that outlive the effort, are not read at all.

They also cannot point an agent at what they are looking at. They can copy a path, and then they
type the rest of the invocation by hand every time.

And a reader deciding whether to try scratchboard cannot tell any of this from the README, which
describes a general markdown board and says nothing about the workflow it now understands best.

## Solution

Scratchboard learns one file layout by name, called the dialect, and keeps guessing at every other
repo exactly as it does today.

A folder the dialect recognizes stops being a pile of cards and becomes a group. A group leaves the
ticket lanes and gets a tab of its own beside the board. An effort's tab shows the wayfinder view:
three columns by state, `behind us` folded, `takeable now` in the middle, `still blocked` on the
right, with live blocking edges drawn and a hover that shows what resolving a ticket would free up.
A feature's tab shows a plain ticket list. A third kind, context, shows the glossary and the
decision log.

A repo declares prepared invocations in config, and the existing copy button grows a caret that
copies a ready-to-paste line naming a skill and the path on screen.

A repo that uses none of this sees today's board, byte for byte. No tab bar, no caret, no change.

And the shipped copy says what the tool now is: a general markdown board, with the skill ecosystem
named as its best fit, the read-only position and the owns-no-format position both stated at the
top, and the limit stated out loud that a repo whose tickets live behind a tracker API has nothing
on disk to read.

## User Stories

### Seeing a planning folder for what it is

1. As a person with a wayfinder effort in my repo, I want the effort's files to leave the ticket
   lanes, so that my board shows my backlog instead of my planning.
2. As that person, I want the ticket count to report only tickets, so that the number on screen is
   the backlog I have to work through.
3. As that person, I want the effort to get a tab of its own, so that the planning is one click
   away rather than deleted.
4. As a person with a `to-tickets` feature folder, I want the same treatment with no extra setup,
   so that I do not have to care which skill wrote the folder.
5. As a person whose ticket ids restart at `01` inside a planning folder, I want no duplicate-id
   warning against my backlog, so that the warnings I do get are real.
6. As that person, I want a duplicate id inside one effort to still warn, so that a genuine
   numbering bug is still caught.
7. As that person, I want the local id kept for display, so that the ticket I call `03` still reads
   as `03`.
8. As a person whose folder the board guessed wrong about, I want a config key that corrects it, so
   that I am not stuck with a bad guess.
9. As a person whose folder is not a group at all, I want a way to opt it out, so that a false
   positive is fixable.
10. As a person creating a new effort every week, I want recognition to stay live and automatic, so
    that I never edit config to stop the board showing junk.
11. As a person whose folder is half a group, a lead document with no `issues/` or the reverse, I
    want a warning that names which half is missing, so that I can fix it.
12. As that person, I want the files to stay ordinary tickets meanwhile, so that the board never
    quietly loses a file.
13. As a person whose folder holds both a `map.md` and a `spec.md`, I want the board to call it
    ambiguous and name both markers rather than pick one, so that the reading does not depend on
    something nobody wrote down.

### Reading an effort

14. As a person opening an effort tab, I want the destination visible without a click, so that I
    know what the effort is for before anything else.
15. As that person, I want the notes, the not-yet-specified list, and the out-of-scope list folded
    with counts, so that the header does not bury the columns.
16. As that person, I want three columns by state and not by dependency depth, so that the view
    answers the question I opened it with.
17. As that person, I want `takeable now` to be the column I read first, so that I can pick up work
    without tracing a graph.
18. As that person, I want `behind us` folded with its count, always, so that a long effort does
    not push the live work off screen.
19. As that person, I want only live blocking edges drawn, so that history does not make the
    picture unreadable.
20. As that person, I want hovering a ticket to show what it unblocks, so that I can see what
    resolving it would free up.
21. As that person, I want hovering to bring back that ticket's satisfied edges in a different
    colour, so that the history is hidden rather than destroyed.
22. As that person, I want a click to pin the selection, so that the view survives a screenshot.
23. As that person, I want a claimed ticket to show as claimed inside `takeable now` and not count
    toward the column number, so that I do not pick up work somebody already started.
24. As that person, I want an out-of-scope ticket to render in the header rather than in a column,
    so that the columns stay the route that was actually walked.
25. As that person, I want each ticket's type shown as a word, so that I can tell a research ticket
    from a grilling ticket at a glance.
26. As that person, I want the effort's research and prototype write-ups reachable from the view,
    so that the assets are not lost.
27. As that person, I want a card click to open the same detail panel the board already uses, so
    that I learn no second interface.
28. As that person, I want the map's Decisions-so-far list dropped rather than rendered, so that
    the same information does not appear twice and drift.
29. As that person, I want a link inside the map body to a ticket in the same effort to navigate
    in the board, so that a baked file is not full of dead links.
30. As a person with an effort of forty tickets, I want the view to behave the same way it does
    with four, so that nothing changes shape under me.

### Reading a glossary and a decision log

31. As a person whose repo has a `CONTEXT.md`, I want it to appear as its own tab, so that the
    vocabulary is on the board with the work.
32. As that person, I want the ADRs listed with the newest first, so that the most recent decision
    is at the top.
33. As that person, I want an ADR with a status to show it as a badge and an ADR without one to
    show nothing, so that the list matches what the files actually carry.
34. As a person whose repo splits into several contexts through a `CONTEXT-MAP.md`, I want each
    context to get a tab of its own, so that a large repo is legible.
35. As that person, I want a path in the map that points outside the repo to be refused and named
    in the warnings, so that a scan cannot be talked into reading my home directory.
36. As that person, I want a link that resolves to nothing to raise a warning while everything else
    still renders, so that one bad line does not cost me the whole board.
37. As a person who wants no context tab, I want a config key to switch it off, so that I can
    decline it.

### Pointing an agent at what is on screen

38. As a person looking at a ticket, I want to copy a ready-to-paste line naming a skill and this
    ticket's path, so that I do not retype the invocation every time.
39. As that person, I want my repo to declare which invocations appear, so that the list is the one
    my project actually uses.
40. As that person, I want the copy button to look and behave exactly as it does today when I have
    declared nothing, so that a stock board is unchanged.
41. As that person, I want the same affordance on a map document as on a ticket, so that one
    mechanism serves both.
42. As that person, I want to override a declared invocation by name and to opt one out, so that
    the config is additive rather than all-or-nothing.
43. As that person, I want the template to substitute the path and nothing else, so that a repo
    with no ticket ids never copies a broken string.
44. As a person who publishes a board, I want it to describe my repo and never my machine, so that
    sharing a board never leaks what I have installed.

### Being told when the board misread something

45. As a person whose folder the board half read, I want a warning that names the shape it read and
    the half that was missing, so that I know what is wrong.
46. As that person, I want the warning to hand me the fix in one plain sentence as well as a skill
    invocation, so that it is useful whether or not I have the skill installed.
47. As that person, I want that warning in the existing notes panel rather than in a new surface,
    so that I look in one place.
48. As a person reading somebody else's published board, I want the warning to still be there, so
    that I understand why the board looks wrong.
49. As that person, I want the warning never to hand me a command that writes config without
    asking, so that following it cannot damage a repo.

### Knowing what this tool is

50. As a reader deciding whether to try scratchboard, I want the first paragraph to name the skill
    ecosystem it fits best, so that I can tell in one screen whether it is for me.
51. As that reader, I want the tagline to still say it works on any git repository, so that I do
    not think it is a plugin for somebody else's project.
52. As that reader, I want to be told that a repo whose tickets live behind a tracker API gets an
    empty board, so that I do not waste a first run.
53. As that reader, I want the read-only position and the owns-no-format position both stated with
    their reasons at the top, so that I understand the design rather than just the limits.
54. As a person searching npm, I want the ecosystem named in the package description and keywords,
    so that I can find this at all.
55. As a person reading `--help`, I want a plain list of flags with no positioning, so that I can
    finish what I was doing.
56. As a person integrating against the file layout, I want a published reader spec, so that I know
    what the board reads without reading its source.
57. As that person, I want the spec to name its own holes, so that I can tell an undecided thing
    from a decided one.
58. As a maintainer, I want the spec and the code to fail CI when they disagree, so that the
    document cannot age into a lie.
59. As a maintainer, I want a fixture set built from the upstream templates, so that the version
    claim on the badge is defended rather than asserted.
60. As a maintainer, I want a scheduled job to file a ticket when upstream releases, so that the
    badge is refreshed deliberately.

### Keeping the promises the project already made

61. As a person running `npx scratchboard`, I want nothing installed, so that trying this costs me
    nothing.
62. As a person with a `severity` field of my own, I want it to keep working with no code change,
    so that the new behaviour did not cost me the old one.
63. As a person on an older build, I want a config written against a newer one to warn and still
    render, so that a config file is not a version trap.
64. As a person running the board on Node 18, I want everything here to work, so that the stated
    floor is real.
65. As a person whose tickets come from a stranger's repo, I want every new thing the board renders
    to be escaped, so that a board cannot attack the browser that opens it.

## Implementation Decisions

### The dialect module

A new module sits beside the generic detection heuristics and owns everything scratchboard knows
about the upstream file layout by name. Nothing else in the codebase learns upstream vocabulary.

It owns four jobs:

1. Recognizing a group from directory shape.
2. Splitting a lead document into its named sections.
3. Reading an issue's structured lines, `Type:`, `Status:`, and `Blocked by:`.
4. Deriving each issue's column state from those lines plus every blocker it names.

Detection is untouched and keeps guessing at any repo. The dialect is one recognized shape beside
detection, never a replacement for it. This is the single carve-out in the rule that no lane name,
status value, or metadata key belongs in the source, and the published spec states the carve-out
out loud so it does not read as an oversight.

### Recognizing a group

Exactly one lead document beside an `issues/` folder marks a group, and the lead document names the
kind:

| Lead document | Kind      |
| ------------- | --------- |
| `map.md`      | `effort`  |
| `spec.md`     | `feature` |
| `CONTEXT.md`  | `context` |

A folder holding two lead documents is ambiguous rather than a group. It raises the recognized-but-
half-read diagnostic naming both markers it found, and its files stay ordinary tickets. Choosing a
winner by precedence or by filesystem order would make the board's reading depend on something
nobody wrote down.

A lead document with no `issues/`, or an `issues/` folder with no lead document, is half a group.
It raises the same diagnostic naming the missing half, and its files stay ordinary tickets.
Excluding them would break the older rule that a board quietly dropping tickets is worse than a
board showing an error.

The per-file hook that decides whether a path looks like a ticket is the existing extension point.
Recognition attaches there.

### A group is a collection, not a card

A recognized group leaves the ticket list entirely. It is not excluded and it is not one card in a
lane. It lands in a collection of its own that the new view reads.

The collection holds every file the `tickets` glob already discovered under the group root. Each
file carries a role taken from where it sits:

- `lead` for the lead document
- `issue` for a file under `issues/`
- `other` for anything else

Discovery stays the glob's job. A file the glob never matched is no more visible inside a group
than outside one.

Ids scope to the group. The duplicate-id check runs inside a group rather than across the repo, so
an effort numbering from `01` no longer collides with the backlog, and two files numbered `03`
inside one effort still warn. The local id survives for display.

Groups sit outside the total ticket count. The group reports its own count, so nothing goes
unreported. On this repo the total goes from 41 to 23.

### Context is a third kind of group, discovered by fixed paths

The glossary and the decision log enter the payload as `kind: "context"`, with `CONTEXT.md` as the
lead document and each ADR as a file under it. The tab, the header, the payload key, and the
renderer are all reused. A second collection that behaves identically to a group would be two names
for one shape.

Discovery is three fixed reads and never a second glob: one stat of `CONTEXT.md`, one stat of
`CONTEXT-MAP.md`, and one shallow read of the ADR directory. There is no recursion and no second
walk root, so the shortcut that keeps a scan from walking the whole repo is untouched.

When a `CONTEXT-MAP.md` exists, the board follows its links and gives each context a group of its
own. **This is the one part of the build that carries real risk.** It is the first time the scanner
opens a path chosen by untrusted repo content.

- Every resolved path must land inside the repo root. A path that escapes is refused and named in
  the warnings.
- A link that resolves to nothing raises the half-read diagnostic while everything else still
  renders.
- The fence is the whole defence, so it ships with a test that attacks it.

### Derived state is computed during the scan

The payload carries the answer, not the raw vocabulary. If the browser derived the columns, the
board script would have to learn what `resolved`, `claimed`, and `out-of-scope` mean, and that code
would ride in every board ever baked including boards with no effort in them.

The same rule sends the lead document's section split to the scan. Only the dialect knows that a
heading called "Not yet specified" is the fog. Slicing raw markdown in the browser would put English
heading names into the interface source, which is what the config rule exists to prevent.

A derived value can go stale. That is accepted rather than answered, because a baked board is a
snapshot of a moment and everything in it already is.

Note that "bake time" means the scan. The same payload is handed to `--serve` and to the bake, so a
served board carries the derived state too. The existing decision record on this now says so.

### Blocking edges

`blockedBy` rides on issues inside an `effort` group and nowhere else. It is read from the
structured `Blocked by: NN, NN` line and from nothing else. A feature folder writes the same idea as
prose and it is not parsed, because guessing edges out of sentences would make the board's picture
of the work depend on sentence shape. An ordinary board ticket carries no edges at all, because no
view draws them and the bytes would ride in every board.

Only the forward direction ships. The browser inverts it in one pass for the hover.

### The payload contract

Two new top-level keys. `tickets` is unchanged, and both new keys are always present, empty when
the repo carries neither, because the browser reads them without a guard.

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
and `blockedBy` are present on an effort's issues and absent everywhere else. `state` is one of
`behind-us`, `takeable-now`, `still-blocked`, or `out-of-scope`.

The second key is the list of prepared invocations the repo declared, carried once at the top rather
than as a finished string on every ticket. A per-ticket field would be a far larger contract change,
on a project that rejected mermaid over payload size.

### Config keys

Three new top-level keys, all optional, all reclassifying rather than extending the walk. A key
naming a path the glob never reaches earns a warning, not a second discovery mechanism.

```json
{
  "groups": [
    { "path": ".scratch/skills-pivot", "kind": "effort" },
    { "path": ".scratch/some-feature", "kind": "feature" },
    { "path": ".scratch/not-an-effort", "kind": "none" }
  ],
  "documents": { "context": true },
  "invocations": [
    { "name": "grilling", "template": "/grilling {path}" }
  ]
}
```

- `groups` covers all three overrides a repo needs: a group the heuristic missed, a folder wrongly
  taken for a group, and `kind: "none"` to opt a folder out.
- `documents` corrects or switches off the context read.
- `invocations` declares the prepared invocations. It is additive, it overrides by name, and it
  carries an opt-out, which is the shape `groups` already has.

All three join the known-key list, so an older build warns and renders anyway under the existing
unknown-keys rule.

**Detection never writes any of them.** Lanes are materialized into config because lanes are stable.
Efforts are created and finished constantly, so writing each one to config would mean a config edit
before the board stops showing junk for every new effort. That friction is what would stop anyone
using this. The published spec says why the two differ.

### The wayfinder view

The design is the prototype's and nothing beside it. There is no second view, no view picker, and no
switch at a node count. The finding that node-link diagrams degrade past about twenty nodes does not
apply, because columns cannot tangle: nothing is routed, and position is a column index and a row
index.

- Three columns by state: `behind us`, `takeable now`, `still blocked`. Rows inside a column are
  ticket order and nothing else.
- `behind us` renders folded with its count, always, with no threshold. This is the same rule the
  terminal lanes already follow, for the same reason.
- Only live edges are drawn. An edge whose blocker is resolved is history, and drawing it at the
  same weight as a live blocker is what made every earlier prototype unreadable.
- Hover shows what the hovered ticket unblocks, downstream only, and restores that ticket's
  satisfied edges in a different colour. Click pins the selection.
- A claimed ticket greys inside `takeable now` and does not count toward the column number.
- An out-of-scope ticket renders in the folded out-of-scope section of the header, never in a column.
- Type shows as a short word above the title. No new icons: the icon set is curated, every icon is
  bytes in every board, and one of the four types has no glyph a reader would identify.

A known gap, stated rather than discovered: both ends of an edge can land in the same column, so an
intra-column edge leaves and re-enters on the right instead of running backwards across the cards.
This is the price of choosing state over depth.

A `feature` group gets a plain ticket list rather than these columns. A `context` group gets the
glossary plus the ADR list, newest number first, with a distinct treatment rather than the ticket
card, and an optional status as a badge that is simply absent when a file carries none. Lanes by
status would give four columns with three permanently empty and would imply that a decision moves
through stages, which is not what a decision record is.

### The map body is the view header

Destination is open. Notes, not-yet-specified, and out-of-scope are folded, each with a count.
`role: other` files render as title and body documents in a folded list beside the notes, not as
cards.

Decisions-so-far is parsed and discarded. The `behind us` column is that list, and rendering both
puts the same set of resolved work on one screen in two formats that drift the first time somebody
edits one and not the other.

### The tab bar

One row. The board is pinned first and is always the default view. Groups follow in path order. The
row scrolls sideways and never wraps.

**A repo with no group and no glossary renders exactly today's board, with no tab bar at all, not a
bar holding one tab.**

A card click opens the existing right-edge detail panel unchanged, keyed on path like the rest of
the interface. There is no second detail surface. What the row does when it genuinely does not fit
is the existing toolbar-measurement ticket's problem, and solving it twice differently is how two
toolbars end up disagreeing.

### Links resolve inside the payload

A relative link whose target matches a path already in the payload becomes in-board navigation.
Everything else keeps today's safe-href behaviour with no change. A baked board is one file, so a
relative link to a markdown path is dead by construction, and the map body is almost entirely such
links. The resolver matches against paths in the payload and never touches disk, so it opens no read
surface.

### Prepared invocations

The existing copy-path control in the detail header, with its keyboard shortcut, is the whole
mechanism. It grows a caret only when the repo declared entries, so a stock board is byte-identical
to today's.

- The affordance keys on the path of whatever detail view is open, so one mechanism serves a ticket
  and a map document alike.
- A template substitutes the path token and nothing else. An id token is the trap, because an id is
  optional by rule and an id template would copy a broken string with no error on every repo that
  uses none. A title carries quotes into a line bound for a prompt. Both can be added later without
  breaking a config that exists, and neither can be taken away.
- The browser substitutes on click.

**The board describes the repo, never the machine.** The scan never reads an installed skill
directory, a plugin cache, or an agent settings file. There is no flag and no carve-out for
`--serve`, because a flag is a footgun the one time it is forgotten and a serve-only carve-out would
make the local board and the baked board show different things. The consequence is accepted rather
than mitigated: the board can never know whether a skill is installed, so a reader may paste a
string that does nothing.

### The diagnostic

A finding that knows its repair is a warnings entry with a fix attached, not a second channel. It
appears in the existing notes panel in the header, never as an item in the copy menu, so a broken
read never grows a menu on a board that declared no entries.

It names the shape it half read rather than the rule it broke, in the manner of "read
`.scratch/skills-pivot/` as an effort but found no `map.md`". It hands over the scratchboard skill
invocation **and** one plain sentence naming the fix, because the machine rule means the board can
never rule out a reader without the skill and an invocation alone is dead text for them. It never
hands over the config-writing command directly, because that command writes config with no prompt in
an agent run while the skill deliberately asks first.

It stays in a published board unconditionally. It discloses repo paths, which every card already
shows, and it earns its place by explaining why the board looks wrong.

### The published reader spec

A new document publishes the dialect the board reads. It never publishes the layout other tools
write. Authority stops at reading: the board describes what it understands and the agent writes the
file.

Four slots:

1. Where files live.
2. Which fields are read.
3. Which values are recognized.
4. What happens to input that is not recognized.

It follows upstream additively and never invents a field name that competes with one upstream
already writes. Where upstream is silent, the name is coined here and the spec says so out loud. The
two values scratchboard names for itself are the terminal state and the out-of-scope state.

Tolerance runs in three tiers, and the middle one is new:

1. A file the parser cannot read lands in the warnings with its path and its reason. Unchanged.
2. A shape the board recognizes but only half reads raises a diagnostic that names the fix.
3. Anything else passes through untouched and silent. A stranger's own vocabulary is never scolded.

The middle tier exists because a repair the interface offers needs something visible to attach to.

### The badge and its defence

The README carries a badge reading `supports mattpocock/skills v1.2.x`. It means every file shape
those skills write at that version renders with no config. A fixture set built from the upstream
templates defends the claim in CI. The version the badge names and the version the spec names are
read from one place, so the two cannot disagree.

The badge states what scratchboard was built against, and it cannot verify what a given user has
installed: a plugin install records a version on disk, and the install route this machine uses
records a source repo, a skill path, and a folder hash, with no version at all.

A scheduled job watches upstream releases and files a ticket when one lands.

### The shipped copy

The full brief is [ticket 31](./31-rewrite-the-shipped-copy.md). In summary:

- The tagline stays generic. The ecosystem name goes in the first paragraph below it.
- Two positions ride at the top: read-only, and the owns-no-directory-and-no-file-format sentence
  that currently sits three quarters of the way down.
- The what-it-is-not section gains one line saying a tracker-backed repo gets an empty board.
- A second screenshot shows the effort view.
- The package description and keywords name the ecosystem.
- `--help` is unchanged.

The agent rules document gains the restated dependency rule, which is now about the install graph so
a bake-time-only dependency still breaks it, an honest description of the pinned-fetch carve-out for
lint and type tooling, and the restated config rule with the dialect as its one named exception.

The scratchboard skill stays one skill with a widened description. Today it triggers only on a broken
board, and it now also owns the vocabulary an agent writes when it moves a card.

Every word of this is checked by the existing house-rules guard: no em dash, no exclamation mark, no
emoji, in prose and in source string literals alike.

## Testing Decisions

A good test here asserts on external behaviour and never on how the code reached it. The payload is
the contract, so a scan test asserts on the payload a repo produces and not on which function
produced it. Confirmed with the developer before writing this spec.

### The scan is the seam for almost everything

Everything new that is data is observable in the payload, so it is tested where a stranger's repo
actually meets the code. The existing scan tests are the prior art: they build a fixture repo, call
the scan with a config, and assert on the payload it returns.

Covered here: group recognition and all three kinds, the lead document rule, roles by position, the
ambiguous folder, the half-recognized folder, id scoping, the total count dropping groups, derived
state and claimed, blocking edges, the lead document section split, the glossary and decision-log
discovery, the map-file path fence and its attack test, the prepared-invocation list, and every
diagnostic landing in the warnings.

**There is deliberately no unit seam on the dialect module's recognition functions.** Recognition is
observable in the payload, so it is tested through the scan. One seam, not two.

### Three more existing seams

- **Config validation** takes the three new keys: shape checks, bad input, and the rule that an
  unknown key warns and survives untouched. The existing config tests are the prior art.
- **The baked file** takes the escaping. Ticket markdown was already untrusted and now so are map
  bodies, decision records, and config-declared templates. Anything new that reaches the browser
  gets an attack test, under the rule the existing escaping already lives under.
- **The board script read as source text** takes the interface work, because nothing in this repo
  runs a DOM. The tab bar, the columns, the hover, the copy caret, and link resolution are held by
  asserting on structure in the source. The existing toolbar-ownership test is the prior art, and it
  already reads two files to hold one rule.

### One new seam, and it is not a behaviour test

A drift test holds the published reader spec and the dialect module together and fails when they
disagree, plus the fixture set built from the upstream templates that defends the badge. This means
reading both files as text, which is exactly what the existing icon test does for the icon lists.

### Standing rules that apply

- Zero dependencies covers the test setup. The test runner and the assertion library are Node
  builtins and nothing else.
- The suite runs on Node 18 as well as current before anything is called done.
- The two acceptance tools in the tools directory are stronger than the unit suite and must both be
  run for anything touching the scan, the parsers, detection, or config.
- Both themes must still clear the text contrast bar, which the theme test computes from the
  stylesheet.
- The icon test holds the two halves of the icon set together. This build adds no icon.

## Out of Scope

- **Implementation tickets.** This spec is the whole plan. Slicing it into tickets was declined.
- **Mermaid rendering.** The research recommends keeping the escaped code fence. How wide it would
  reach if it ever landed is ruled out of scope on the map.
- **Lifting the dependency rule.** It holds and it is about the install graph. What else a budget
  would buy is a different effort.
- **A committed lockfile for the pinned lint and type tooling.** Real, and its own backlog ticket.
- **Renaming the `groups` and `invocations` config keys.** Both are now defined terms in the
  glossary.
- **Linking a spec to its tickets with a pointer field.** Colocation is the link today. Its own
  backlog ticket.
- **A started state for triage.** Its own backlog ticket.
- **Lane icons and shorter priority labels.** Its own backlog ticket.
- **Fitting the tab row by measurement.** The existing toolbar-measurement ticket owns it for both
  toolbars.
- **A skills browser showing usage and enabled state.** Neither exists on disk.
- **Rendering prototype and research assets from their branches.** They live on throwaway branches
  by design.
- **A read-write board, and any tracker API.** Both contradict the reason this is read-only.
- **How a `role: other` file renders in detail.** Named, listed, and no more than that here.

## Further Notes

The four prototypes are on `main` at `src/ui/prototype-wayfinder-*.html`. Read
`prototype-wayfinder-c1-hover.html` for the design that won. The other three are the rejected
layered passes, kept because the decision record cites them.

The three rejected alternatives worth knowing about, so nobody rediscovers them: a layered node-link
graph in three variants, correct layout and still chaotic because the problem was drawing the past
rather than the routing; an adjacency matrix, which cannot get messy at any size and is worst at the
one thing a map needs, which is following a chain; and an indented outline, which is zero crossings
by construction but shows a ticket with two blockers twice.

For the record, the layered engine was built and measured at about sixty lines for layering, dummy
nodes, and barycenter ordering. The chosen design needs none of it, because position is a column
index and a row index.

This repo's own board is the public demo and it bakes on every push, so every change here is visible
to strangers the moment it lands on the default branch.

## Done when

- A repo with an effort, a feature folder, or a glossary gets a tab for each, and its planning files
  leave the ticket lanes.
- A repo with none of them renders today's board with no tab bar.
- The wayfinder view matches the winning prototype: three columns by state, `behind us` folded, live
  edges only, downstream hover, click to pin.
- The glossary and the decision log render, several contexts work through the map file, and a path
  that escapes the repo root is refused and named in the warnings.
- The copy control grows a caret only when the repo declared invocations, and substitutes the path
  token alone.
- Every half read raises a diagnostic that names the shape and hands over a plain sentence plus the
  skill invocation.
- The reader spec is published, and CI fails when it and the dialect module disagree.
- The badge is defended by fixtures built from the upstream templates.
- The README, the package metadata, and the agent rules match the locked position, and `--help` is
  unchanged.
- The full suite and the house-rules guard pass on Node 18 and on current, and both acceptance tools
  agree.

## Comments

Built. Every `Done when` line above holds except the last half of the last one, and the work sits
in the working tree rather than in the history, which is why this is `ready-for-human` and not
`done`.

Five agents built it in parallel from this spec, each owning a disjoint set of files: the config
keys, the dialect and the scanner, the interface, the shipped copy, and the reader spec with its
drift test. A sixth reviewed the whole diff with fresh context, and a seventh fixed what the review
found.

What the board does now, on this repo:

- 32 tickets, zero warnings, seven lanes, and no `Unmapped` lane at all.
- Two groups: this repo's own context, `CONTEXT.md` plus three decision records, and the
  skills-pivot effort at 14 files.
- The four cross-collision id warnings are gone, because ids now scope to the group.

Verified: 363 tests on Node 18.20.8 and 22.18.0, `tools/guard.mjs` clean across 276 files, and
both acceptance tools PASS against the OffMain corpus.

Two blockers came out of the review and both are fixed.

The first was a real escape. `inRoot()` fenced the `CONTEXT-MAP.md` link target and held every
attack thrown at it, but `listDecisions()` read its directory with no realpath check, so a
`docs/adr` symlinked outside the repo pulled that content into the payload with no warning and
then into a shareable file. `src/walk.mjs` already skips every symlink, so this was an
inconsistency rather than a policy. Now refused, named in `warnings`, and the glossary still
renders when only its decision log is refused.

The second was a dead read. The interface read `file.status` to badge a decision record and the
scan never wrote it, so a specified feature shipped as dead code and no test caught it, because
each side held its own belief. The field is read from the record's own frontmatter now, and the
drift test ties the published spec's table to the module so the two cannot part again.

Not verifiable here, and stated rather than assumed: the badge fixture set defends the claim
against the templates as they read today, and nothing on this machine records which version a
`find-skills` install actually has.

Follow-on work this raised: [ticket 33](./33-prototypes-ship-in-the-tarball.md).
