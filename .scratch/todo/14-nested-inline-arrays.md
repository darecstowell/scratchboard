---
title: A nested inline array parses to garbage instead of an error
status: needs-triage
priority: p3
labels: [parser]
---

# A nested inline array parses to garbage instead of an error

`readArray()` reads one bracket level. The first `]` ends it and the trailing `]` is never
looked at, so this front matter:

```yaml
labels: [a, [b, c]]
```

yields `["a", "[b", "c"]`. Three labels, one of them named `[b`, and a facet chip that reads
like a typo.

The behaviour is a deliberate simplification and the code says so. Real ticket front matter
does not nest lists. What is worth deciding is whether the failure should be loud: a value
that opens a second bracket is a value the parser knows it cannot read, and one hard rule
says such a file belongs in the warnings panel rather than on a card with wrong data.

Triage first. If no real ticket set has ever hit this, a warning is the whole fix and full
nesting support is not wanted.

## Done when

Either a nested array raises a warning naming the file and the key, or there is a recorded
decision that the current behaviour stands.
