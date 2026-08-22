# The local markdown dialect

Scratchboard publishes the dialect it reads. It does not publish the layout other tools write.
Authority stops at reading: the board describes what it understands, and the agent writes the
file. A reader contract still serves an author, so a setup document can point at this page either
way, but nothing here tells you how to write a ticket.

This follows the [mattpocock/skills](https://github.com/mattpocock/skills) layout additively. No
name here competes with a name those skills already write. Where upstream is silent, the name is
coined here, and every table below says so per value in its `Named by` column. Two values are
scratchboard's own: the terminal triage state `done`, and the wayfinder issue status
`out-of-scope`.

This spec never prescribes typography, ticket numbering, or heading format. Those belong to the
tool that writes the file. The board reads what it finds.

Four slots follow, in this order:

1. [Where files live](#1-where-files-live)
2. [Which fields are read](#2-which-fields-are-read)
3. [Which values are recognized](#3-which-values-are-recognized)
4. [What happens to input that is not recognized](#4-what-happens-to-input-that-is-not-recognized)

The executable form is `src/dialect.mjs`, the one module that holds this vocabulary.
`test/dialect.test.mjs` reads this page and that module together and fails when the two disagree.

## The version this reads

```
supports mattpocock/skills v1.2.x
```

That string is the README badge, and it is read from this page by the drift test, so the badge
and the spec cannot name two different versions. It means every file shape those skills write at
that version renders on the board with no config, which the fixtures under
`test/fixtures/upstream/` defend in CI.

The badge states what scratchboard was built against. It cannot verify what you have installed. A
plugin install records a version on disk that anything can read. The `find-skills` install route
records a source repository, a skill path, and a folder hash, and no version at all, so there is
nothing on disk to compare against.

## 1. Where files live

A group is exactly one lead document beside an `issues/` folder, inside the tree the ticket glob
already describes. The lead document names the kind. The files of a group leave the ticket lanes
and get a surface of their own, so a board never shows the same file twice.

### Lead documents

| Lead document | Kind | Named by |
| --- | --- | --- |
| `map.md` | `effort` | upstream |
| `spec.md` | `feature` | upstream |
| `CONTEXT.md` | `context` | upstream |

An effort is a wayfinder map and its decision tickets. A feature is a spec and its build tickets.
A context is a domain glossary and its decision records.

### Fixed names

| Name | What it is | Named by |
| --- | --- | --- |
| `issues/` | The folder holding a group's tickets, beside the lead document | upstream |
| `CONTEXT.md` | A single context's glossary, at the root or beside the code it covers | upstream |
| `CONTEXT-MAP.md` | The root index of a repository that holds more than one context | upstream |
| `docs/adr/` | The decision records beside a context, newest first | upstream |

A context is found by fixed path and never by a glob. The board reads `CONTEXT-MAP.md` at the
root, follows its links, reads `CONTEXT.md` at the root, and lists one shallow directory per
context. Nothing else is opened. Every path opened here, the fixed names and the link targets
alike, is resolved against the repository root, and one that escapes it by path, by scheme, by
percent escape, or by symbolic link is refused and named in the warnings. A refused decision
directory costs its context the decision log and nothing else.

## 2. Which fields are read

### The map's sections

Each heading below is a `##` heading in the lead document, and its section runs to the next
heading of the same depth or shallower. The text is passed through as written, including any HTML
comment the template carries.

| Heading | Payload key |
| --- | --- |
| `Destination` | `destination` |
| `Notes` | `notes` |
| `Decisions so far` | read and dropped, because the board already lists the tickets |
| `Not yet specified` | `fog` |
| `Out of scope` | `outOfScope` |

A lead document that is not a map, such as a `spec.md`, carries none of these headings, so every
key is empty. That is a normal reading, not a fault.

### An issue's structured lines

These are read from the top of an issue file in an `effort` group, up to its first `##` heading,
as an unordered run of lines. Upstream promises only that they sit near the top, so order is
never assumed. A label wrapped in bold, such as `**Status:**`, reads the same as a plain one.

| Line | Payload key | Named by |
| --- | --- | --- |
| `Type:` | `type` | upstream |
| `Status:` | `state` and `claimed`, derived | upstream |
| `Blocked by:` | `blockedBy` | upstream |

Only an `effort` group reads these. A `feature` group writes the same ideas as prose, so its
`Status:` line carries a triage role rather than a wayfinder status, and its `Blocked by:` line is
free text that no edge is drawn from. Directory shape is the only signal of which convention is in
play, which is why the strict reading is scoped to the kind that guarantees it.

### The context map

| Heading | What the board reads | Named by |
| --- | --- | --- |
| `Contexts` | One markdown link per bullet, each naming a context and its `CONTEXT.md` | upstream |

A link target that names a directory is read as the `CONTEXT.md` inside it. A target that names
any other file is refused, because a context map opens nothing but a lead document.

### A decision record's status

Read from the frontmatter of a decision record, and from nothing else. The dialect reads it from
the file rather than through the ticket parser, because a repository picks that parser for its own
tickets and a decision record is not one.

| Field | Payload key | Named by |
| --- | --- | --- |
| `Status` | `status` | upstream |

A record that carries no status carries `null`, and the board shows no badge for it.

### Roles

Every file in a group carries a role, which comes from where the file sits and from nothing else.

| Role | What it is |
| --- | --- |
| `lead` | The lead document of the group |
| `issue` | A file under the group's `issues/` folder |
| `other` | Any other file inside the group |

## 3. Which values are recognized

### Ticket types

Read from the `Type:` line of an issue in an `effort` group.

| Value | Meaning | Named by |
| --- | --- | --- |
| `research` | Reading outside the working directory to surface a fact a decision waits on | upstream |
| `prototype` | A cheap concrete artifact to react to | upstream |
| `grilling` | A conversation that resolves a decision | upstream |
| `task` | Manual work that unblocks a decision | upstream |

Any other value is read and shown as written. The list above is what the board understands, not
what it allows.

### Issue statuses

Read from the `Status:` line of an issue in an `effort` group. The comparison is lower case.

| Value | Meaning | Named by |
| --- | --- | --- |
| `claimed` | A session took this ticket before starting work | upstream |
| `resolved` | The question is answered and the answer is in the file | upstream |
| `out-of-scope` | Ruled beyond the destination, and never coming back | scratchboard |

`out-of-scope` is scratchboard's own. On a real tracker this state is a closed issue plus one line
in the map's `Out of scope` section, and a flat markdown file has no closed state to carry it. The
word is taken from that section so it reads as native. An issue with no `Status:` line at all is
open and unclaimed, which is a shape upstream writes and the board reads.

### Triage statuses

Read from whichever metadata field a repository already uses for triage, which is config, not
dialect. The board recognizes no field name here. These are the role strings the skills speak in,
listed so a reader can see the whole vocabulary in one place.

| Value | Meaning | Named by |
| --- | --- | --- |
| `needs-triage` | A maintainer needs to evaluate this ticket | upstream |
| `needs-info` | Waiting on the reporter for information | upstream |
| `ready-for-agent` | Fully specified, ready for an agent working alone | upstream |
| `ready-for-human` | Needs a human to implement it | upstream |
| `wontfix` | Will not be actioned | upstream |
| `done` | Shipped and verifiable in the history | scratchboard |

`done` is scratchboard's own. The five roles above it are a triage queue rather than a lifecycle,
and on a real tracker "done" is the issue being closed. An agent writes it, and the board never
does, because read-only holds.

### Blocked by

| Value | Meaning | Named by |
| --- | --- | --- |
| `none` | This ticket names no blockers | upstream |

Anything else on the line is read as a comma separated list of ticket numbers. A leading `#` on a
number is ignored. A number that names no file in the same group raises a warning and leaves the
ticket blocked, because a blocker nobody can find is not an unblocked ticket.

### Derived states

The board computes these from the lines above. Nobody writes them into a file, and no repository
needs to know them.

| State | When the board reports it |
| --- | --- |
| `behind-us` | The issue is resolved |
| `takeable-now` | Every blocker it names is resolved |
| `still-blocked` | A blocker it names is unresolved or missing |
| `out-of-scope` | The issue is out of scope |

## 4. What happens to input that is not recognized

Tolerance runs in three tiers, and the middle one is new.

1. **A file the parser cannot read lands in the warnings with its path and its reason.** A board
   that quietly drops three tickets is worse than a board that shows an error. This is unchanged
   and it holds for every failure a scan can survive.
2. **A shape the board recognizes but only half reads raises a diagnostic that names the fix.**
   This tier is new. It exists because a repair the interface offers needs something visible to
   attach to. Each diagnostic carries the path, the reading the board attempted, and one plain
   sentence naming the repair, which an agent can carry out with `/scratchboard`.
3. **Anything else passes through untouched and silent.** A stranger's own field, its own status
   value, and its own folder are never scolded. The board shows them and says nothing.

Three shapes reach tier two today: a folder holding two lead documents, a lead document with no
`issues/` folder beside it, and an `issues/` folder with no lead document beside it. A folder
holding two lead documents is ambiguous rather than a group, because picking a winner by
precedence or by directory order would make the board's reading depend on something nobody wrote
down. In all three cases the files stay ordinary tickets and nothing is dropped.

### The carve-out

This project's standing rule is that no lane name, status value, or metadata key belongs in the
source. The dialect is the single exception to that rule, and it is stated here so it does not
read as an oversight. Detection is untouched and keeps guessing at any repository. The dialect is
one recognized shape beside detection, never a replacement for it, and a repository that uses none
of these names loses nothing.

### Config

Three keys in `scratchboard.json` cover the cases recognition gets wrong. Detection never writes
any of the three. Lanes are stable, so detection materializes them into config and they stay
correct. Efforts and features are created and finished constantly, so writing each one to config
would mean editing the config before the board stops showing junk for every new folder. Recognition
by shape has to work with no config at all, or the feature is a chore.

#### `groups`

An array. Each entry names a path relative to the repository root and the kind it takes.

```json
"groups": [
  { "path": ".scratch/an-effort", "kind": "effort" },
  { "path": "notes/archive", "kind": "none" }
]
```

| Kind | What it does |
| --- | --- |
| `effort` | Read this folder as a wayfinder map and its decision tickets |
| `feature` | Read this folder as a spec and its build tickets |
| `context` | Read this folder as a glossary and its decision records |
| `none` | Opt this folder out of being a group, whatever its shape |

`kind: "none"` is how a folder that looks like a group but is not stays an ordinary set of
tickets, and it is also the repair the half-read diagnostics offer.

#### `documents`

An object. One key today.

```json
"documents": { "context": false }
```

`context: false` turns off context discovery, so `CONTEXT.md`, `CONTEXT-MAP.md`, and `docs/adr/`
are left alone. A repository that uses those names for something else sets this and the board stops
looking.

#### `invocations`

An array of the commands the board offers to copy. Each entry has a name and a template. Only
`{path}` is substituted, and a template using any other token is refused with a warning.

```json
"invocations": [
  { "name": "Open", "template": "code {path}" },
  { "name": "Claim", "template": null }
]
```

A `template` of `null` suppresses the entry with that name, so config is additive rather than all
or nothing.

## What this spec does not decide

- **A feature ticket's fields.** The upstream feature template separates `What to build`,
  `Blocked by`, and `Status` with blank lines. The key and value preset reads one block, so a
  feature ticket sitting flat rather than in a group yields only its first field. Inside a group
  this costs nothing, because a group's files are shown whole. Flat, it is a real gap and it is
  named here rather than papered over.
- **Which convention a lone file follows.** A `Status:` line carries a wayfinder status inside an
  `effort` group and a triage role everywhere else, and a file on its own says nothing about which
  wrote it. Directory shape is the only signal, and a file outside a group is read as triage.
- **The ordering of decision records.** They are listed by file name, newest first, because the
  upstream numbering is sequential. A repository that numbers them another way gets that order.
- **What a status on a decision record means.** The format makes it optional frontmatter, and most
  records carry none. The board shows it as written and reads nothing into it.
- **A blocker that names a ticket outside the group.** The number raises a warning and the ticket
  stays `still-blocked`, because a blocker nobody can find is not an unblocked ticket. No edge is
  drawn, because there is no card at the other end, so the columns show the state without showing
  the reason. The warning is the only place the reason appears.
