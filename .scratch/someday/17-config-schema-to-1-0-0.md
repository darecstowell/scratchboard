---
title: Reach 1.0.0 when the config schema survives strangers
status: needs-info
priority: p2
labels: [release, config]
---

# Reach 1.0.0 when the config schema survives strangers

`0.x` is an honest signal, not a placeholder. The config schema was designed against two
ticket layouts, and the version says out loud that it will change once real layouts arrive.
While on `0.x`, a breaking config change bumps the minor.

The bar for 1.0.0 is the schema, not the feature list. The tool can feel finished and still
be wrong about what a lane is.

Track what strangers force. Each of these is a signal the schema is not settled:

- A lane that needs to match on two things at once, which `match` refuses today.
- A facet that needs an order other than count order.
- A field whose values need normalising before they can be matched.
- Any key added to `scratchboard.json` after 0.1.0.

Unknown keys already warn and are ignored rather than failing the run, so a config written
against a newer version still renders on an older one. That property is what makes waiting
cheap, and it must survive to 1.0.0.

## Done when

Real configs from repos nobody here wrote have run for long enough that the last schema
change is behind us, and the reason for 1.0.0 is written down.
