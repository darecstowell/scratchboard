---
name: scratchboard
description: >
  Repairs a scratchboard kanban board that reads a repo's markdown tickets wrong. Use when
  tickets are missing from the board, when the board shows them in the wrong lanes or in
  Unmapped, or when scratchboard reports it cannot read a ticket format.
license: MIT
metadata:
  version: 0.1.0
---

Detection finds the tickets, picks a preset, and proposes lanes and facets on its own, so the
three jobs below are the parts that take judgement or code.

You write two files, `scratchboard.json` and `scratchboard.parser.mjs`, both at the repo root,
and you ask the user before each. Tickets stay as they are.

## 1. Locate the tickets

Ask the user where their tickets live and take the glob from their answer. A repo can hold
`.scratch/`, `docs/issues/`, and `tasks/` at once, and detection takes the first one it finds.

**Done when** the user has confirmed a glob, listing it returns the files they call tickets, and
you have read one of them.

## 2. Review detection

`init` writes `scratchboard.json` with no prompt in an agent run, so ask first, then read back
what it produced:

```bash
npx scratchboard init --tickets '<glob>'
npx scratchboard --scan
```

`counts.byLane` and `warnings` in the scan payload are the report: a lane far short of the count
the user expects, and a warning naming the values that matched nothing.

Tickets in the trailing `Unmapped` lane are drift: the config and the tickets disagree, and the
tickets win. Correct the lanes against these rules.

- A lane matches on `path` or on `field`, never both. `field` takes `in` (any of) or `equals`.
- Matching is exact and case-sensitive. A field holding a list matches when any element matches.
- Lanes are tried in order and the first match wins. That order is also the order on screen.
- `"collapsed": true` renders a lane as a narrow rail, which is what a `Done` lane wants.
- A field used for lane matching drops out of the facet chips. Path lanes are what keeps folder
  and status as two separate filters.

`init` fills only the keys the config is missing, so a second run leaves your lanes alone. Edit
`scratchboard.json` directly to change them.

**Done when** a fresh scan shows no `Unmapped` entry in `counts.byLane` and no warning about
tickets matching no lane, or the user has named each value that is left there as one to leave
out.

## 3. Write a parser when no preset matched

The trigger is a run that stops with `✗ Could not read ticket metadata`. No preset read the
format, so the board has nothing to render until you supply a reader.

Read three tickets from different corners of the set, so the parser covers the variation the set
holds. Then write `scratchboard.parser.mjs` at the repo root. The block below is the contract it
has to satisfy rather than code to copy: you supply the four values, and how you read them out of
the file is yours.

```js
export function parse(path, text) {
  return { id, title, body, fields };
}
```

- `id` is a string or `null`.
- `title` is a non-blank string. Fall back to the first heading, then to the file name.
- `body` is the markdown with the metadata block removed, because the board renders it.
- `fields` is a flat object of strings and string arrays. Lanes and facets address it by name,
  so keep the user's own field names.

Add `"parser": "./scratchboard.parser.mjs"` to `scratchboard.json`, beside the `tickets` and
`lanes` keys. Those three are what lets a run skip detection, because `parser` covers the
reading job on its own and `format` is optional once it is set. A named parser replaces the
preset outright. A parser that fails to load stops the run with the reason and writes no board,
which keeps a preset from misreading every ticket in silence.

**Done when** a scan reports `format` as `parser:` followed by your parser path, `counts.total`
equal to the number of files the glob matches, `warnings` empty, and a non-blank `title` on
every ticket.

For a working session, hand the user `npx scratchboard --serve`.
