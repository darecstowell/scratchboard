---
title: Front matter lists written as dashes parse to nothing
status: ready-for-agent
priority: p1
labels: [parser, bug]
---

# Front matter lists written as dashes parse to nothing

`yaml-frontmatter` reads an inline array and nothing else:

```yaml
labels: [bug, ios]
```

The block form is the more common way to write the same thing, and it fails:

```yaml
labels:
  - bug
  - ios
```

`labels:` with an empty value parses to `null`, which becomes an empty string. The two `- bug`
lines are then glued onto the previous string value by the continuation rule, or dropped. No
warning is raised. The facet is empty and the user has no way to see why.

This is the single most likely reason a stranger's board comes up with no labels on it.

## Done when

Both forms yield the same `fields.labels`, a fixture covers the block form with a nested list
and with a list of quoted values, and a value that is neither form still raises a warning
rather than parsing to a surprise.
