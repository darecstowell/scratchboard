---
title: Commit a lockfile for the npx-fetched lint and type tooling
status: needs-triage
priority: p2
labels: [ci, security, tooling]
---

# Commit a lockfile for the npx-fetched lint and type tooling

Lint and type checking are fetched by `npx` at a pinned version rather than declared, in CI and
locally alike. That is what keeps `package.json` free of a `devDependencies` line, and
`tools/guard.mjs` fails the build if one appears.

The pin is weaker than it reads.
[The mermaid research](./skills-pivot/issues/13-research-mermaid-rendering-cost.md) measured that
an `npx` pin does not reach transitive dependencies, so the tool is pinned and everything it pulls
in underneath is not. It also measured that `npx` is not offline with a warm cache.

CI runs this against the repository, so an unpinned transitive dependency runs there.
[What scratchboard promises](./skills-pivot/issues/18-what-scratchboard-promises.md) judged this a
real hole and recorded it in `AGENTS.md` rather than patching it, because it never reaches a user's
install or a published board. The fix is this ticket.

A lockfile in a repo whose headline is zero dependencies needs its own sentence, or it reads as the
rule breaking. It is not: the rule is about the install graph of `npx scratchboard`, and this
tooling is not in it.

## Done when

- The CI lint and type run resolves the same tree on every run, transitive dependencies included.
- `tools/guard.mjs` still fails on any line under `dependencies` or `devDependencies`.
- `npm test` still needs nothing installed.
- `AGENTS.md` says why a lockfile exists and what it does not cover.

## Comments

Half of the last `Done when` line is met. `AGENTS.md` now describes the carve-out honestly: the
tooling is fetched by `npx` at a pinned version, that pin does not reach the tools' own transitive
dependencies, so CI runs unpinned code, and it never reaches a user's install or a published board.

The lockfile itself is still the work.
