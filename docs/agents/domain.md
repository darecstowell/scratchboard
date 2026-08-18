# Domain docs

How the engineering skills read this repo's domain documentation before they explore the code.

## Before exploring, read these

- **`CONTEXT.md`** at the repo root.
- **`docs/adr/`** for the decisions that touch the area you are about to work in.

If a file does not exist, **continue silently**. Do not report that it is missing, and do not
propose to create it up front. The `/domain-modeling` skill, reached through `/grill-with-docs`
and `/improve-codebase-architecture`, writes these files when a term or a decision is actually
resolved.

`AGENTS.md` holds the rules of this repo and is not a domain doc, but read it first. It states
the constraints that a change must keep.

## File structure

This repo is single-context:

```
/
├── AGENTS.md
├── CONTEXT.md
├── docs/adr/
│   ├── 0001-zero-dependencies.md
│   └── 0002-config-names-every-lane.md
└── src/
```

## Use the glossary's vocabulary

When your output names a domain concept, in a ticket title, a refactor proposal, a hypothesis,
or a test name, use the term as `CONTEXT.md` defines it. Do not drift to a synonym the glossary
avoids.

If the concept is not in the glossary, that is a signal. Either you invent language the project
does not use, so think again, or there is a real gap, so note it for `/domain-modeling`.

## Flag ADR conflicts

If your output contradicts an ADR, say so instead of overriding it quietly:

> _Contradicts ADR-0007 (zero dependencies), but worth reopening because..._
