# Issue tracker: local markdown

Tickets for this repo live as markdown files in `.scratch/`, and the board bakes them to the
Pages demo on every push. The tickets are public copy.

## Conventions

- Three lanes, and the folder is the lane: `.scratch/todo/`, `.scratch/in-progress/`,
  `.scratch/done/`.
- One ticket per file: `.scratch/<lane>/<n>-<slug>.md`. `<n>` is the next free number across
  all three lanes, because the number identifies the ticket and the lane can change.
- State lives in YAML frontmatter, not in the body:

  ```yaml
  ---
  title: Narrow the npm publish token to scratchboard alone
  status: ready-for-human
  priority: p0
  labels: [security, release, ci]
  ---
  ```

  `status` holds the triage role. See `triage-labels.md` for the strings.
- The body starts with an `# <title>` heading and ends with a `## Done when` section that a
  reader can verify.
- Comments and history append to the bottom under a `## Comments` heading.

## Lane discipline

A ticket lives where its work actually is, so moving a card means moving the file with
`git mv`. Nothing sits in `in-progress/` that nobody started, and nothing reaches `done/` that
is not shipped and verifiable in the history. A ticket in the wrong lane is a lie the demo
tells on every page load.

## When a skill says "publish to the issue tracker"

Write a new file in `.scratch/todo/`. Take the next free number, add the frontmatter above, and
give it a `## Done when` section.

## When a skill says "fetch the relevant ticket"

Read the file at the referenced path. The user usually gives the path or the ticket number. To
find a ticket by number, look in all three lanes, because the number does not say which lane
holds it.

## Wayfinding operations

Used by `/wayfinder`. The **map** is a file with one **child** file for each ticket. Efforts
live outside the three lanes, in `.scratch/<effort>/`, so they do not bake as cards.

- **Map**: `.scratch/<effort>/map.md` with the Notes, Decisions-so-far, and Fog body.
- **Child ticket**: `.scratch/<effort>/issues/NN-<slug>.md`, numbered from `01`, with the
  question in the body. A `Type:` line records the ticket type (`research`, `prototype`,
  `grilling`, or `task`). A `Status:` line records `claimed` or `resolved`.
- **Blocking**: a `Blocked by: NN, NN` line near the top. A ticket is unblocked when every file
  it names is `resolved`.
- **Frontier**: read `.scratch/<effort>/issues/` for files that are open, unblocked, and
  unclaimed. The first by number wins.
- **Claim**: set `Status: claimed` and save the file before any work.
- **Resolve**: append the answer under an `## Answer` heading, set `Status: resolved`, then
  append a context pointer (gist and link) to the Decisions-so-far in `map.md`.

## PRs as a request surface

Off. Pull requests from outside are not part of the triage queue.
