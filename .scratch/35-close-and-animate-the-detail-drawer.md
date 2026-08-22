---
title: Close the detail drawer on an outside click, and animate it in and out
status: needs-triage
priority: p3
labels: [ui, design, polish]
---

# Close the detail drawer on an outside click, and animate it in and out

The ticket detail is a right-edge panel on a native `<dialog>` opened with `showModal()`. Escape
closes it and so does the close button. Clicking the dimmed area beside it does nothing, which is
the one way people reach for first.

The motion is half built. It animates in and it does not animate out.

## What is there now

```css
.detail[open] { animation: detail-in var(--dur-med) var(--ease-out); }
@keyframes detail-in {
  from { transform: translateX(16px); opacity: 0; }
  to   { transform: none; opacity: 1; }
}
.detail::backdrop { background: var(--scrim); }
```

Three problems, in the order they are worth fixing.

**There is no exit.** `close()` removes the panel instantly, which cuts the spatial link between
the drawer and the board it came from. An exit should run about 20 to 30 percent faster than the
enter, because the reader has already decided to leave. Against a `--dur-med` enter of 200ms that
puts the exit near `--dur-fast` at 120ms, and both tokens already exist.

**The scrim pops.** `::backdrop` carries no transition, so the dim appears and vanishes in one
frame while the panel slides. A drawer and its backdrop move as a unit, so they take the same
duration and the same easing. Mismatched timing is what reads as broken.

**The enter is a keyframe on an open and close toggle.** A keyframe restarts from zero when the
state reverses part way. A transition retargets from wherever it is. Anyone who closes the drawer
while it is still opening sees the difference.

`transform` and `opacity` are the only properties in play today, which is right, so keep it that
way. `--dur-fast` at 120ms, `--dur-med` at 200ms, and `--ease-out` at
`cubic-bezier(0.2, 0, 0, 1)` are declared already. Do not invent a new token or a new curve.

Opening a ticket is an occasional action rather than something done a hundred times an hour, so it
earns motion, and it stays under 300ms.

## The outside click

`board.js` already binds a click handler on the dialog, so the branch has somewhere to go. Because
`.detail-in` fills the dialog box, a click that lands on the backdrop arrives with the dialog
itself as its target, which is the whole test.

One order-of-operations question worth getting right: the copy control opens a menu inside the
drawer. An outside click while that menu is open should close the menu and leave the drawer
standing.

## The two traps

**A reduced-motion reader must still be able to close the drawer.** The stylesheet kills every
animation and transition with `!important` under `prefers-reduced-motion: reduce`. An exit written
as "start the transition, close on `transitionend`" never fires that event, so the drawer would
stay open forever for exactly the readers least able to work around it. Whatever drives the exit
needs a path that does not depend on an event that may never arrive.

**A baked board travels and gets opened in whatever browser is to hand.** Animating a `<dialog>`
out through CSS alone wants `@starting-style` and `transition-behavior: allow-discrete`, both of
which are recent. Where they are missing the drawer must fall back to today's instant close rather
than to a drawer that will not shut.

## Done when

- A click on the dimmed area closes the drawer, and a click inside it does not.
- An outside click while the copy menu is open closes the menu and leaves the drawer open.
- The drawer animates out as well as in, with the exit faster than the enter.
- The panel and the backdrop share one duration and one easing.
- Reversing part way through retargets rather than restarting.
- Only `transform` and `opacity` are animated.
- With `prefers-reduced-motion: reduce`, the drawer opens and closes instantly and always closes.
- In a browser without the newer dialog transition features, the drawer still closes.
- Escape and the close button behave exactly as they do today.
