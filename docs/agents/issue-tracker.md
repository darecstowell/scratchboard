# Issue tracker: local markdown

Tickets for this repo live as markdown files in `.scratch/`, and the board bakes them to the
Pages demo on every push. The tickets are public copy.

## Conventions

- The `status` field is the lane, and the folder carries nothing. Every folder under `.scratch/`
  is a piece of work, never a state.
- One ticket per file: `.scratch/<n>-<slug>.md`, flat at the root. `<n>` is the next free number
  across the backlog.
- State lives in YAML frontmatter, not in the body:

  ```yaml
  ---
  title: Narrow the npm publish token to scratchboard alone
  status: ready-for-human
  priority: p0
  labels: [security, release, ci]
  ---
  ```

  `status` holds the triage role and places the card. See `triage-labels.md` for the strings.
- The body starts with an `# <title>` heading and ends with a `## Done when` section that a
  reader can verify.
- Comments and history append to the bottom under a `## Comments` heading.

## Lane discipline

A ticket's `status` says where its work actually is, so moving a card means editing one line.
Nothing carries `done` that is not shipped and verifiable in the history. A ticket whose
`status` is a lie is a lie the demo tells on every page load.

The lanes are declared in `scratchboard.json`, one per value, in triage order. `done` and
`wontfix` are collapsed, because a terminal lane grows without bound and nobody reads it. The
board never writes `status`; an agent does, which is what "tickets are agent-driven, so the
agent moves the card" already says.

## When a skill says "publish to the issue tracker"

Write a new file at `.scratch/<n>-<slug>.md`. Take the next free number, add the frontmatter
above with `status: needs-triage`, and give it a `## Done when` section.

## When a skill says "fetch the relevant ticket"

Read the file at the referenced path. The user usually gives the path or the ticket number. A
backlog ticket is `.scratch/<n>-*.md`; an effort's ticket is `.scratch/<effort>/issues/<NN>-*.md`
and numbers restart at `01` inside each effort, so the two can collide.

## Wayfinding operations

Used by `/wayfinder`. The **map** is a file with one **child** file for each ticket. An effort is
a folder of its own at `.scratch/<effort>/`, and it is planning rather than backlog, so its
tickets never take the triage roles above.

An effort file carries no `status` the lanes recognize, so it matches no lane, and that does not
keep it off the board. The `tickets` glob is `.scratch/**/*.md`, so every effort file becomes a
card in the trailing `Unmapped` lane, and effort numbering from `01` collides with the backlog's
numbering. Recognizing an effort folder is the subject of
[How does the board recognize an effort folder](../../.scratch/skills-pivot/issues/03-recognize-an-effort-folder.md),
and no config the scanner reads today can express the exclusion.

- **Map**: `.scratch/<effort>/map.md` with the Notes, Decisions-so-far, and Fog body.
- **Child ticket**: `.scratch/<effort>/issues/NN-<slug>.md`, numbered from `01`, with the
  question in the body. A `Type:` line records the ticket type (`research`, `prototype`,
  `grilling`, or `task`). A `Status:` line records `claimed`, `resolved`, or `out-of-scope`.
- **Blocking**: a `Blocked by: NN, NN` line near the top, naming ticket numbers. A ticket is
  unblocked when every ticket it names carries `Status: resolved`. `Blocked by: none` means it
  has no blockers.
- **Frontier**: read `.scratch/<effort>/issues/` for files that are open, unblocked, and
  unclaimed. The first by number wins.
- **Claim**: set `Status: claimed` and save the file before any work.
- **Resolve**: append the answer under an `## Answer` heading, set `Status: resolved`, then
  append a context pointer (gist and link) to the Decisions-so-far in `map.md`.

## PRs as a request surface

Off. Pull requests from outside are not part of the triage queue.
