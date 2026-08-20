---
title: Ejecting the interface, if anyone asks for it
status: deferred
priority: p3
labels: [config, deferred]
---

# Ejecting the interface, if anyone asks for it

An `--eject` flag was specified early and cut before 0.1.0. It was written down before there
was a step to build it, and no document ever said what an ejected copy contains or how it
runs. A flag that ships dead is worse than one that does not ship.

The case that motivated it was a strange ticket format, and the custom parser hook covers
that: about thirty lines against one contract, with the runtime install left in place so
upgrades keep working.

Ejecting to change the *interface* is a different want and a real one. Nobody has asked yet.

Revisit when someone does, and answer these first:

- What does an ejected copy contain? The whole `src/ui/` tree, or a template and a stylesheet?
- How does it run? A config key naming a directory is the smallest version.
- What happens on upgrade? An ejected copy that silently stops tracking the payload schema is
  a support burden with no owner.

## Done when

Someone has asked, or a year has passed and the answer is that nobody wanted it.
