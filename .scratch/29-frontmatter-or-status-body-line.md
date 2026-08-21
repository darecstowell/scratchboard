---
title: Decide whether this repo's tickets move from frontmatter to a Status body line
status: needs-triage
priority: p3
labels: [docs, config, parser]
---

# Decide whether this repo's tickets move from frontmatter to a Status body line

Upstream records triage state as a `Status:` line near the top of a ticket body. This repo
deliberately chose YAML frontmatter, and the parser reads both shapes, so neither is broken.

Two settled decisions point in opposite directions here.

The rule that settled the folders was to organize the way upstream does, taken as a rule rather
than a shape:
[the migration](./skills-pivot/issues/09-migrate-this-repo-to-status-lanes.md) followed it far
enough to flatten the backlog. Applied to the field, it points at the body line.

[The reader spec ticket](./skills-pivot/issues/01-own-the-local-tracker-spec.md) settled that the
repo owns its layout after setup and the board reads whatever it finds. Applied here, it says
frontmatter is a legitimate local choice and there is nothing to fix.

Both are true, which is why this needs a decision rather than a fix. This repo's own board is the
demo, so whichever shape it uses is the one a visitor sees.

## Done when

- One shape is chosen for this repo, with the reason recorded.
- If the tickets move, all of them move, and the board renders identically after.
- The parser keeps reading both shapes either way. A stranger picks their own.
