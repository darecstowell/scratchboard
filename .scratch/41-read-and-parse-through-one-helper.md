---
title: Read and parse a file through one helper
status: done
priority: p2
labels: [scanner, warnings, architecture]
---

# Read and parse a file through one helper

AGENTS.md holds one rule here: a file the parser cannot read lands in `warnings` with its path and
its reason, and this holds for every failure a scan can survive. One rule, written twice.

`src/scan.mjs:266-287` holds the group files. `src/scan.mjs:304-326` holds the top-level tickets.
Both call `readFile`, catch, push a warning that reads "cannot read", and continue. Both then call
`parser.parse`, catch, push a warning that reads "parser threw", and continue.

They diverge only after a good parse. A group file tolerates a null result. A top-level ticket
also demands a title, and is dropped with a warning if it has none. A reader has to compare the
two loops to find that one difference, instead of reading one shared primitive and two short
policies.

Both arrived in the same commit, `a5cc146`. This is fresh code, not legacy.

## The seam

`readAndParse(root, path, parser, warnings)`. It returns the text and the parsed result, returns a
null parse when the parser throws, and returns nothing at all when the file cannot be read. Each
site keeps its own thin policy above it: the group loop stores what comes back, the ticket loop
also checks the title.

## Done when

- One helper owns the read, the parse, and both warning messages.
- Both loops call it, and each keeps only the policy that makes it different.
- The existing tests pass unchanged. `test/scan.test.mjs` covers a throwing parser near line 158
  and a parser returning no title near line 181.
- The helper has a direct test for each of its three outcomes.
- `node tools/compare-python.mjs` and `node tools/compare-detection.mjs` both agree against a real
  repo, because AGENTS.md requires it for any change to `scan.mjs`.
