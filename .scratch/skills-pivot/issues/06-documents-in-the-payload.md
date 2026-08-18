# 06. What non-ticket documents enter the payload, and how?

Type: grilling
Blocked by: 03, 04

## Question

The payload is the contract: `scan.mjs` emits it, the browser renders it, `src/ui/` reads nothing
else, and adding a field changes both sides. Today it carries tickets, lanes, facets, and
warnings. It has no concept of a document.

Candidates, in descending order of how reliably they sit in the working tree:

- `CONTEXT.md` and `docs/adr/NNNN-slug.md`, fixed templates at fixed paths, read and written by
  several unrelated skills. The most stable artifacts in the whole ecosystem.
- `spec.md` inside a feature folder.
- `map.md` inside an effort folder, which needs more than plain rendering.

Open:

- One document type with a kind field, or several distinct types?
- Does a document get an excerpt, dates, and refs the way a ticket does, or is it opaque body
  text?
- `CONTEXT.md` and ADRs live outside `.scratch/` entirely. Does the scanner grow a second glob,
  and does that break the promise that one glob defines the board?
- Ticket markdown is untrusted, and documents are too. The `SAFE_HREF` allowlist and the bake
  escaping cover tickets today. Whatever lands here ships with a test that attacks it.
