# Read CONTEXT.md and the ADRs by fixed path, not by a second glob

The board describes a repo through one glob, and the most durable artifacts in the skill
ecosystem sit outside it: `CONTEXT.md` and `docs/adr/` at the repo root. We read them, and we do
it by naming those paths in the dialect module rather than by adding a second discovery glob.

## Considered options

A `documents` glob in config was rejected. It adds walk roots, it loses the `globRoot()` shortcut
that keeps a scan off the whole repo, and it asks a repo to describe a layout the repo did not
choose. The skill picked those paths, so the reader can name them.

Reading nothing was rejected on the second pass. A map is planning that ends when the effort ends,
and the glossary and the decision log are what outlive it, so refusing them leaves out the part
that lasts.

## Consequences

This is where the coupling line sits. Scratchboard now holds a rival skill's file layout in its
own source, and a rename upstream breaks the read. The drift test that ticket 01 put on the tracker
dialect covers this too.

Discovery is two stats and one shallow directory read, so the walk is untouched.

`CONTEXT-MAP.md` is followed to each context it names, which is the first time the scanner opens a
path chosen by repo content. Every resolved path is fenced to the repo root, a path that escapes
is refused and named in `warnings`, and the fence ships with a test that attacks it.

Any repo with a `CONTEXT.md` now gets a view, whether or not it has ever run wayfinder. That is
wider than the effort that prompted it, and it is deliberate.
