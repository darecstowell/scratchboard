# 18. What does scratchboard promise, and to whom?

Type: grilling
Blocked by: none
Status: resolved

## Question

Merged from three tickets: what the README claims, what a repo using none of these skills still
gets, and whether the zero-dependency rule survives. All three are the same question asked from
different ends, which is what this project says it is and who it says it to.

### The shipped copy

The README, `--help`, CLI output, and the skill are all read by users, and they currently describe
a general markdown board with zero config. If the position changes, that copy changes with it, and
the copy is the position. Whether the first line names his skills at all is the decision, not a
detail.

- Does the tagline name the ecosystem, name the workflow shape without naming him, or stay generic
  with a section further down?
- Read-only is a position, stated with its reason. Does specializing add a second position that
  has to be stated the same way?
- What does the Pages demo show once this repo's own board changes shape?
- Naming: does anything get renamed, or does `scratchboard` already carry it?

### The stranger's repo

The config rule is the reason this was extractable: no lane name, status value, or metadata key
belongs in the source, and a stranger's `severity` field has to work with no code change.
Specializing puts pressure on that rule, and the question is what survives it.

- Is the specialized behaviour detection plus defaults, so a stranger's board is unchanged, or is
  it a distinct mode?
- What does a stranger see when nothing is detected? Today's board unchanged, or a board visibly
  shaped for a workflow they do not have?
- Does the config schema grow keys that only mean something inside this ecosystem, and is that
  acceptable given unknown keys already warn and survive?
- The survey found value concentrates on local-markdown repos, because a tracker-backed repo keeps
  its map behind an API where a file reader sees nothing. Is that boundary stated out loud or left
  implied?

### The dependency rule

`AGENTS.md` states this as the rule that is the product: an `npx` run that installs nothing is why
anyone tries this, `npm test` needs nothing installed, and `tools/guard.mjs` fails the build if a
line appears under `dependencies` or `devDependencies`.

Both original pressures have since eased.
[What mermaid rendering costs](./13-research-mermaid-rendering-cost.md) recommends keeping the
escaped fence, and [Prototype the wayfinder view](./04-prototype-the-wayfinder-view.md) found the
chosen design needs no layout engine at all. So this is now a policy decision rather than a forced
one, which is a better position to decide it from.

- Is the rule about the install, the bundle, the test run, or the trust story? They come apart
  here, and the answer decides which of them a dependency would actually break.
- If a dependency runs only at bake time and never ships in the baked file, has the rule been
  broken or honoured?
- If it is lifted, what replaces it as the line `tools/guard.mjs` holds? A rule with no guard
  degrades quietly.
- What does the README lose? Zero config and zero dependencies are both stated positions, which is
  why this sits with the copy rather than apart from it.
- The mermaid research measured that an `npx` pin does not reach transitive dependencies and that
  `npx` is not offline with a warm cache. That narrows the third path this repo already uses for
  lint and types. Does that change the rule's shape even if it is not lifted?

## Answer

Scratchboard stays a general markdown board and names the ecosystem as its best fit. The
zero-dependency rule holds, and it is a rule about the install. The config rule holds, and it gains
one named exception. Nothing is renamed.

### The shipped copy

The tagline stays generic and keeps saying that any git repository works. The ecosystem name goes
in the first paragraph below it, not in a section further down. Two forces pull the other way and
this is where they balance. Discovery wants the name high, because a person who uses those skills
and wants to see their map has to be able to find this, and a name buried at 60 percent of the page
reaches no search. Honesty wants the name low, because
[the reader spec ticket](./01-own-the-local-tracker-spec.md) settled a reader posture and not a
partnership, and a tagline that names a third party reads as a plugin. The deciding fact is that
the same ticket already puts a `supports mattpocock/skills v1.2.x` badge at the top of the page. A
badge that names a version while the prose hides the name does not agree with itself.

The README carries two positions at the top, not one. Read-only keeps its place and its reason.
Beside it goes a sentence the README already has, three quarters of the way down: it owns no
directory and no file format, and it reads the layout the repo already has. The position was
written before this effort started. It is promoted rather than invented, because a third
close-sounding sentence near the top would blur the two that are already there.

The demo opens on the board. A kanban board is legible in one second and a stranger's decision map
is not, so the board is what a first-time visitor should land on. The effort tab is visible from
there, and a second README screenshot shows the effort view so it does not need a click.

Nothing is renamed. A generic tagline is what makes the rename question go away: the word
`scratchboard` never has to carry the ecosystem.

The npm description and keywords say the name, because npm search is most of the discovery.
`--help` does not. It is a list of flags, read by a person who already installed the tool and is
trying to finish something, and positioning does not belong there. The CLI output and the skill
description were already settled by
[what the board does with skills](./16-what-the-board-does-with-skills.md).

### The stranger's repo

The board says out loud that a repo whose tickets live behind a tracker API gets an empty board. It
is one line in `What it is not`, beside the Backlog.md paragraph that already does this kind of
honesty. The survey found that value concentrates on local-markdown repos for exactly this reason,
and leaving it implied buys nothing and costs a bad first run.

The config rule keeps its shape and gains one named exception. The rule is that no lane name, status
value, or metadata key belongs in the source, and a stranger's `severity` field works with no code
change. The dialect breaks it, by construction: it is one file layout the board reads by name. So
the rule is restated as everything is config, except the dialect. `groups` and `invocations` are not
part of the exception. They declare structure rather than anyone's vocabulary, and their values are
scratchboard's own words, so they were always inside the rule.

### The dependency rule

The rule is about the install. Four readings had come apart: the install, the baked file, the test
run, and the trust story. The baked file is already covered by a separate promise, that one
self-contained file fetches nothing. The test run follows rather than leads. The install and the
trust story are one promise said two ways, which is that `npx scratchboard` downloads nothing.

So the rule is restated as nothing in the install graph of `npx scratchboard`. That answers the
bake-time question in the strict direction: a dependency that runs only during a bake and never
reaches the baked file still breaks the rule, because `npx` installs it either way. Both original
pressures had eased before this was decided, so it is a policy choice and not a forced one.
`tools/guard.mjs` needs no change, because the checks it already runs, no declared dependencies and
no non-`node:` imports, are the install graph.

The lint and type tooling is a real hole and it gets written down rather than patched.
[The mermaid research](./13-research-mermaid-rendering-cost.md) measured that an `npx` pin does not
reach transitive dependencies, so a tool fetched at a pinned version still runs unpinned code, and
CI runs it against this repository. It never reaches a user's install or a published board, which
is why it is honest wording in `AGENTS.md` rather than work here. A committed lockfile for those
tools is the real fix and it is ordinary backlog work, not a step toward this destination.

### What this closes

The map reaches its destination with this ticket. The nine entries under `Not yet specified` were
sorted rather than left standing. Six became backlog tickets at `.scratch/25` through `.scratch/30`.
One was already decided, since `groups` and `invocations` are now defined terms in `CONTEXT.md`. Two
went out of scope: how wide mermaid rendering would reach, which cannot arise while the research
recommends the plain fence, and what else a dependency budget would buy, which is a different effort
now that the rule holds.

### What this does not decide

The README rewrite. This ticket locks the decision, and the rewrite is a copywriting pass against
it. Wayfinder plans rather than does, and a session that resolves a decision and then rewrites the
shipped copy has stopped resolving decisions.
