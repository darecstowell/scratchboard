---
title: Show that a served board is live, and that its connection is still up
status: needs-triage
priority: p2
labels: [ui, serve, design, polish]
---

# Show that a served board is live, and that its connection is still up

`--serve` watches the files and pushes a re-render, so cards move on their own while an agent
works underneath. Nothing on screen says so.

A board that has not changed in ten minutes looks exactly like a board whose server died ten
minutes ago. That is the real gap. "Is this live" is worth answering, and "is this still
connected" is worth more, because today the failure is silent and the reader keeps trusting a
frozen page.

## What already exists

`bake.mjs` injects a `LIVE_RELOAD` script only when `live` is true, so a served board and a baked
board already differ by construction. That script opens an `EventSource` on `/events` and hands
each payload to `window.scratchboard.render`.

`EventSource` carries the state this ticket wants for free: it opens, it errors, and it reconnects
on its own. `readyState` plus the `open` and `error` events are the whole signal. Nothing new has
to be watched.

The header already holds `.hd-notice`, a `role="status"` span with `aria-live="polite"`, so the
polite-announcement pattern is set and should be followed rather than reinvented.

## The shape

A small resting indicator, not a banner. Three states, because the middle one is the reason this
is worth building:

- **connected**: a subtle animation, slow enough to read as a heartbeat rather than a spinner.
- **reconnecting**: the animation stops or changes, so a dropped stream is visible.
- **closed**: still, and clearly not live.

A word beside it is worth considering, because a lone coloured dot is not self-explaining and
this board already prefers a word to an icon elsewhere.

## The rules this has to respect

- **It ships only in a served board.** A baked file travels, and a heartbeat in a file somebody
  opened from a chat message would be a lie. Gate it the way `LIVE_RELOAD` is already gated.
- **Reduced motion is not optional.** `board.css` already has a
  `prefers-reduced-motion: reduce` block. A reader who asked for no motion still needs the three
  states, so the animation degrades to a static difference rather than disappearing.
- **No new palette values, and no new icon.** The theme test now checks all four foreground tones
  against the backgrounds and the tints, and the icon set is curated and validated against a list.
  A CSS dot costs nothing; an octicon costs bytes in every board.
- **A re-render must not delete it.** The live script calls `render()` on every push. The board
  already has a rule that what a rebuild clears has to miss everything it does not rebuild, and
  `test/ui.test.mjs` holds that line for the toolbar. The indicator lands on the same side of it.
- **Zero dependencies.** CSS animation, plain DOM.

## Worth deciding rather than assuming

Whether the indicator also marks the moment a re-render lands. A brief flash on each push would
answer "did my edit reach the board", which is a different and possibly better question than "is
the connection up". It is also the version most likely to become annoying on a second monitor,
which is the exact place this feature is meant to live.

## Done when

- A served board shows it is live, and stops showing it when the stream drops.
- A baked board carries none of it, and its bytes outside the payload are unchanged.
- The three states are distinguishable with `prefers-reduced-motion: reduce` set.
- Both themes clear the contrast bar, with no new palette value and no new icon.
- A re-render leaves the indicator in place, held by a test.
