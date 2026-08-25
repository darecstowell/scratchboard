---
title: Cache the glob results
priority: p1
status: confirmed
labels: [scanner, performance]
---

# Cache the glob results

Every lane compiles the same glob again for each file. Compile it once and keep the result.
