---
title: Ref detection guesses at pull request numbers
status: ready-for-agent
priority: p3
labels: [parser, refs]
---

# Ref detection guesses at pull request numbers

`findRefs()` turns `#123` in a ticket body into a link to ticket 123. Two rules keep it from
linking things that are not tickets, and both are guesses.

The first blanks any markdown link whose target contains `/pull/`. That catches the common
case and misses a bare URL.

The second reads the fourteen characters before the match, lowercases them, and skips the
reference when they end with `pr ` or `pull request `. Fourteen is exactly the length of
`pull request `, so `see pull request  #7` with two spaces links, and `PR#7` with no space
links too.

The token itself has no word boundary, so `foo#123` and `abc#12` both count.

None of this is wrong often enough to be urgent. It is wrong in a way nobody can predict from
reading the board, which is the part worth fixing.

## Done when

The rule is one a user could state in a sentence, `#123` inside a code fence or a URL never
counts, and fixtures cover the cases above.
