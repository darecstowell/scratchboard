---
title: A repeated front matter key silently keeps the last value
status: ready-for-agent
priority: p3
labels: [parser, warnings]
---

# A repeated front matter key silently keeps the last value

`parseFrontmatter()` assigns into a plain object, so a key written twice keeps the second
value and drops the first. Nothing merges and nothing warns.

```yaml
labels: [bug]
priority: p1
labels: [ios]
```

That ticket carries one label. Both an agent appending a field and a human editing in a hurry
produce this shape, and the board shows a plausible answer that is not the answer the file
holds.

Last-write-wins is a defensible rule. Silence is not.

## Done when

A duplicated key raises a warning naming the file and the key, the value used stays the last
one so nothing changes for boards that already work, and a fixture covers it.
