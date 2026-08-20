# 18. What does scratchboard promise, and to whom?

Type: grilling
Blocked by: none

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
