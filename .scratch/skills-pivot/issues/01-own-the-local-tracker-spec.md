# 01 — Does scratchboard publish the local-markdown tracker spec, or read whatever a repo declares?

Type: grilling
Blocked by: none

## Question

His local-markdown tracker is a seed template he does not treat as canonical, and the repo owns
it after setup. This repo already rewrote it. The survey found five gaps in it: no closed state,
no parent pointer, two incompatible `Status:` enums, two incompatible `Blocked by:` formats, and
unwritten triage mechanics.

Two positions:

- **Read what the repo declares.** Scratchboard stays downstream, tolerates variation, and
  detects what it can. Nothing to maintain, but the wayfinder view reads a layout every adopter
  is free to redefine.
- **Publish the layout.** Scratchboard writes the spec, becomes its executable form, and the
  setup doc points at it. The coupling runs outward. Cost: an ongoing spec to maintain, and a
  fork risk if he later defines that corner himself.

This is the root of the map. Every other coupling question reads differently depending on the
answer, which is why almost everything else waits on it.

Decide the position, and if it is "publish", decide where the spec lives and what it covers.
