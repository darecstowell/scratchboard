---
title: Rewrite the shipped copy against the locked position
status: ready-for-human
priority: p1
labels: [docs, marketing]
---

# Rewrite the shipped copy against the locked position

[What scratchboard promises](./skills-pivot/issues/18-what-scratchboard-promises.md) locked the
position and stopped short of writing it, because wayfinder plans rather than does. This ticket is
the writing pass. Nothing here is open: every line below is a decision already made.

## What changes

**The README.** The tagline stays generic and keeps saying that any git repository works. The
ecosystem name goes in the first paragraph below it, not in a section further down. Two positions
ride at the top instead of one: read-only keeps its place and its reason, and the sentence that
currently sits in `What it is not`, that it owns no directory and no file format, moves up beside
it. `What it is not` gains one line saying that a repo whose tickets live behind a tracker API gets
an empty board. A second screenshot shows the effort view.

**The npm listing.** The `description` and `keywords` in `package.json` say the ecosystem name.
npm search is most of the discovery.

**`--help`.** Unchanged. It is a list of flags, read by someone who already installed the tool.

**`AGENTS.md`.** The zero-dependency rule is restated as nothing in the install graph of
`npx scratchboard`, so a bake-time-only dependency is a break. The `npx` lint and type carve-out is
described honestly: the pin does not reach transitive dependencies, and
[the lockfile ticket](./28-lockfile-for-the-npx-tooling.md) owns the fix. The config rule is
restated as everything is config, except the dialect.

The badge and the reader spec are
[ticket 01's](./skills-pivot/issues/01-own-the-local-tracker-spec.md), not this one.

## Done when

- The name appears in the README's first paragraph and in the npm description and keywords.
- Two positions sit at the top of the README, each stated with its reason in the same breath.
- The tracker-API limit is stated in `What it is not`.
- `--help` is unchanged.
- `AGENTS.md` carries the restated dependency rule and the restated config rule.
- No em dash, no exclamation mark, no emoji. `tools/guard.mjs` checks this.
- Written with `/copywriting`.
