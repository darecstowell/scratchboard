---
title: Run the test matrix on Windows
status: ready-for-agent
priority: p1
labels: [ci, portability, tests]
---

# Run the test matrix on Windows

Nothing in this repo has ever run on Windows. The CI matrix is three versions of Node on
`ubuntu-latest` only, so every path assumption in the walker, the glob matcher, and the root
resolver is untested on a backslash platform.

The parts most likely to break:

- `walk()` builds relative paths with a literal `/`, then `scan()` joins them back with
  `node:path`. That round trip is correct on POSIX and unverified on Windows.
- Globs match against root-relative POSIX paths. A path that arrives with backslashes matches
  nothing and the ticket disappears with no warning.
- `root.mjs` walks up to a parent directory. A drive root ends that walk differently from `/`.
- The bake path writes to the OS temp directory and spawns an opener on the file.
  `openCommand()` maps `win32` to `explorer.exe`, and that branch has never run.

## Done when

`windows-latest` is in the `test.yml` matrix on at least one Node version, the suite passes
there, and a scan over a fixture tree returns the same ticket paths on both platforms.
