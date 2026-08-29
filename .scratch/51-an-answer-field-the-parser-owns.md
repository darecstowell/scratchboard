---
title: Give the answer a field the parser owns
status: needs-triage
priority: p3
labels: [wayfinder, dialect, architecture]
---

# Give the answer a field the parser owns

A resolved map issue shows its answer on its card. The text comes from the `## Answer` heading the
wayfinder skill writes when it closes a ticket, and nothing in the scanner reads that heading.
`src/ui/board-render.mjs` does, at render time, out of the raw `file.body` the payload already
carries.

That was a deliberate call in [ticket 49](./49-recut-the-wayfinder-map-surface.md), taken to keep
one change out of the parser, the payload, and the spec at once. It leaves three things crooked.

**The renderer parses markdown structure.** Reading a heading out of a body is the parser's job.
`answerOf` has to track fenced code state so a `## Answer` inside a code block does not become a
card's answer, which is parsing, in the file that is supposed to be data in and string out.

**The payload contract is bent.** `AGENTS.md` says `normalizePayload` holds every default and
every type check. `src/ui/payload.mjs` checks only `path` on a group's files, so `file.body` and
`file.state` reach the renderer unchecked and `answerOf` defends itself instead.

**Nothing else can use it.** The answer is a real field of a resolved decision. A second consumer,
a different view, or anyone reading the payload has to re-parse the body to get it.

The published spec is the reason to be careful rather than the reason not to act.
`docs/local-markdown-spec.md` says only that a resolved issue's answer "is in the file", and
`test/dialect.test.mjs` holds that document to `src/dialect.mjs`. Naming the field publishes it.

## Done when

- `src/dialect.mjs` reads the `## Answer` section into a field on a map issue.
- `src/ui/payload.mjs` type-checks it, and `board-render.mjs` renders it without parsing.
- `docs/local-markdown-spec.md` names the heading and the field, and the dialect test agrees.
- The fenced-code case keeps its test, wherever the reading ends up living.

## Comments

Found while shipping ticket 49, and recorded rather than folded in, because the shape is a spec
decision and not a defect.
