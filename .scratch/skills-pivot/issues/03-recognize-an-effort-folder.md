# 03. How does the board recognize an effort folder and tell one shape from another?

Type: grilling
Blocked by: 01

## Question

Three folder shapes live under `.scratch/` and nothing inside a file says which is which:

- a wayfinder effort, signalled by `map.md` beside an `issues/` folder
- a `to-tickets` feature, signalled by `spec.md` beside an `issues/` folder
- loose tickets, whatever a repo happens to do

Directory shape is the only signal available. Today the scanner has no notion of a non-ticket at
all, so every file matching the glob becomes a card or falls into the catch-all lane. That is
why this effort currently bakes junk onto the public demo.

Measured on this repo the moment the effort was written, with `--scan`:

```
byLane: {"Todo":18,"In progress":1,"Done":4,"Unmapped":13}
id 10 is on 2 tickets: .scratch/skills-pivot/issues/10-..., .scratch/todo/10-...
id 11 is on 2 tickets: .scratch/skills-pivot/issues/11-..., .scratch/todo/11-...
```

Re-measured on 2026-08-18, after the effort grew: `Unmapped` holds 18, the 15 effort tickets
plus `map.md` and both research files. The junk grows with the effort, so it is not a fixed cost.

The id collision was not predicted. His convention numbers effort tickets from `01` inside each
effort, while lane tickets are numbered globally across the board, and `idPattern` matches both.
So ids collide as soon as an effort passes ten tickets, and a second effort collides from `01`.
Recognition therefore has to scope ids, not just hide files.

Open:

- Does recognition live in `detect.mjs` beside the existing zero-config detection, or in config,
  or both?
- What does a repo write to override a wrong guess?
- Does a recognized effort disappear from the lanes entirely, or appear as one card that opens
  into the effort?
- What does the scanner do with a folder it half-recognizes, given the rule that a file it
  cannot read lands in `warnings` with its reason?
