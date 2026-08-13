---
title: Prove two boards in one monorepo actually work
status: ready-for-agent
priority: p2
labels: [config, tests, docs]
---

# Prove two boards in one monorepo actually work

One board per config is a stated non-goal turned inside out: a second board means a second
config file, on purpose. The mechanism is `--config <path>`, which overrides both the config
search and the root, so a repo can hold two ticket trees and two configs and serve either.

That is the design. It has never been run end to end.

Open questions the test will answer:

- All paths in the config and the payload are relative to the root. With `--config` pointing
  at a nested directory, is the root that directory, and do the ticket paths in the payload
  stay relative to it?
- Do the git dates still resolve, given the pass runs with `-C root` and strips the prefix
  that `rev-parse --show-prefix` reports?
- In `--serve`, do two boards on two ports each watch only their own tree?

## Done when

A fixture monorepo with two configs renders two different boards, both with correct relative
paths, and the README says in one line how to run the second one.
