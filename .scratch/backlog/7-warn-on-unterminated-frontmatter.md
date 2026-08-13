---
title: An unclosed front matter fence turns metadata into body text
status: ready-for-agent
priority: p2
labels: [parser, warnings]
---

# An unclosed front matter fence turns metadata into body text

`splitFrontmatter()` looks for a closing `---` or `...`. When it finds none it returns
`{ block: null }`, and the whole file, opening fence included, becomes the body.

The ticket still renders. It has a title from its first heading, no fields at all, and it
lands in the catch-all lane. The user sees a card with `---` and `status: ready-for-agent`
printed as text and no clue that a missing three characters caused it.

One hard rule says a file the parser cannot read appears in the warnings panel with its path
and the reason. A file that opens with `---` and never closes it is that case, and today it
passes silently.

## Done when

A file that opens a fence and does not close it raises a warning naming the path and the
missing close, and a fixture covers it. A file with no fence at all stays silent, because
that is a legitimate ticket with no metadata.
