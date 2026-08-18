# 01. Does scratchboard publish the local-markdown tracker spec, or read whatever a repo declares?

Type: grilling
Blocked by: none
Status: resolved

## Question

His local-markdown tracker is a seed template he does not treat as canonical, and the repo owns
it after setup. This repo already rewrote it. The survey found five gaps in it: no closed state,
no parent pointer, two incompatible `Status:` enums, two incompatible `Blocked by:` formats, and
unwritten triage mechanics.

Two positions:

- **Read what the repo declares.** Scratchboard stays downstream, tolerates variation, and
  detects what it can. Nothing to maintain, but the wayfinder view reads a layout every adopter
  is free to redefine.
- **Publish the layout.** Scratchboard writes the spec, becomes its executable form, and the
  setup doc points at it. The coupling runs outward. Cost: an ongoing spec to maintain, and a
  fork risk if he later defines that corner himself.

This is the root of the map. Every other coupling question reads differently depending on the
answer, which is why almost everything else waits on it.

Decide the position, and if it is "publish", decide where the spec lives and what it covers.

## Evidence gathered while charting

His stock ticket template is `# <NN> — <Ticket title>`, and `tools/guard.mjs` bans em dashes in
shipped copy. Following his template faithfully broke this repo's own house rules on the first
push, 16 files at once.

That is a small instance of the general problem. A repo that adopts his conventions inherits his
typography, his numbering, and his field names, and has no say in any of it unless someone
writes the layout down. It is evidence for publishing the spec rather than reading whatever a
repo declares, because the alternative is every adopter patching the same friction alone.

## Answer

Publish a reader spec. Scratchboard publishes the dialect it reads, and does not publish the
layout that other tools write. The coupling runs outward far enough to be legible, and stops
before it becomes a standard someone has to obey.

### Where authority stops

At reading. Read-only is already the position, and it extends cleanly: the board describes what
it understands, the agent writes the file. A reader contract still serves an author, so the
setup doc can point at it either way.

The spec never prescribes typography, ticket numbering, or the heading format. The em dash
friction that broke the guard on 16 files stays this repo's problem to patch, not a thing the
spec corrects upstream.

### When upstream changes

Follow upstream, additively. Never invent a field name that competes with one his skills already
write. Where he is silent, name it here and say so out loud in the spec.

### The artifact

`docs/local-markdown-spec.md`, with a named dialect module beside the generic heuristics in
`detect.mjs` as its executable form. A drift test holds the two together and fails when they
disagree, the pattern `test/icons.test.mjs` already uses for the icon lists. A spec with no
guard degrades quietly.

Detection keeps guessing at any repo. The dialect is one recognized shape beside that, not a
replacement for it.

### What the spec covers

Four slots:

1. Where files live.
2. Which fields are read.
3. Which values are recognized.
4. What happens to input that is not recognized.

It ships with named holes. The terminal state waits on
[Name the sixth lifecycle state](./02-name-the-sixth-state.md), and the half-matched folder waits
on [How does the board recognize an effort folder](./03-recognize-an-effort-folder.md). A hole
that is visible is better than a guess that reads as settled.

### The badge

The README carries a badge reading `supports mattpocock/skills v1.2.x`. It means every file
shape those skills write at that version renders on the board with no config. A fixture set
built from the upstream templates defends the claim, so it fails in CI instead of aging into a
lie. A scheduled job watches upstream releases and files a ticket when one lands.

The version the badge names is the same field the spec names, read from one place, so the two
cannot disagree.

### Tolerance, in three tiers

- A file the parser cannot read lands in `warnings` with its path and its reason. Unchanged.
- A shape the board recognizes but only half reads raises a diagnostic that names the fix.
- Anything else passes through untouched and silent. A stranger's `severity` field has to work
  with no code change, so the board never scolds a repo for its own vocabulary.

The middle tier is new. It exists because a repair the interface offers needs something visible
to attach to.

### Evidence that corrected the survey

The survey reported no version to pin to. That is wrong at the source. `mattpocock/skills` ships
semver through changesets: a `CHANGELOG.md`, git tags and GitHub releases from v1.0.0 to v1.2.3
on 2026-08-06, and a `.claude-plugin/plugin.json` carrying the version, kept in sync with
`package.json` by a script. Six releases in two months.

What is true is narrower. A plugin install puts that version on disk where anything can read it.
A `find-skills` install, which is what this machine has, records a source repo, a skill path, and
a folder hash in `.skill-lock.json`, and no version at all. So the badge states what scratchboard
was built against. It cannot verify what a given user has installed.

### What this does not decide

The spec is not written here. This ticket locks the position and the shape, and the writing is
work for after the map.
