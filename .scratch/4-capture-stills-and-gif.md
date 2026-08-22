---
title: Capture the still screenshots and the animated demo
status: ready-for-human
priority: p1
labels: [docs, marketing]
---

# Capture the still screenshots and the animated demo

A Pages demo does not render inside a social post, an npm listing, or a search result, so the
stills are what most people see first.

Done, and no placeholder is left in the README:

- `assets/board-tour.gif`, the header hero. Filters, sort, and a ticket opening.
- `assets/screenshot-phosphor.png` and `assets/screenshot-latte.png`, both 1600 wide, both
  reading this repo's own tickets rather than a fixture.

This drops off p0 with them, because the empty README was the reason it carried one.

Still needed:

- One short animated capture of a live reload: an agent edits a ticket in one pane, the card
  moves in the other. That is the thing nobody believes until they see it. The tour GIF does
  not cover it, because every card in it moves because a human clicked.

## Done when

The live reload capture sits under the `--serve` section, and it shows a file changing on one
side and the board answering on the other.

## Comments

The shipped-copy rewrite added a fourth image slot, `IMAGE SLOT 4` in the README, reserving
`assets/screenshot-effort.png` at 1600x1000: a wide still of the effort view, three columns by
state, with the takeable tickets in the middle. It is a comment rather than a link, so nothing is
broken while it is missing.

That view now exists and this repo's own board renders it, so the capture is takeable.
