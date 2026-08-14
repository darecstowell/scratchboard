# Reference

Everything scratchboard reads and every option it takes. The [README](../README.md) is the tour.

- [The root](#the-root)
- [CLI](#cli)
- [Config file](#config-file)
- [Globs](#globs)
- [Lanes](#lanes)
- [Facets](#facets)
- [Icons](#icons)
- [Detection](#detection)
- [Ticket identity and dates](#ticket-identity-and-dates)
- [Custom parsers](#custom-parsers)
- [Warnings](#warnings)
- [On the board](#on-the-board)
- [Scan payload](#scan-payload)

## The root

Every command resolves a root first, and every glob is relative to it.

1. `--config <path>` names the config, and the directory holding it becomes the root.
2. Otherwise the nearest parent directory holding `scratchboard.json`.
3. Then the nearest parent directory holding `.git`.
4. Then the current directory.

`--config` overrides both the search and the root, which is how a monorepo with two ticket trees
runs two boards.

## CLI

```
scratchboard                      bake to temp, open, exit
scratchboard --serve              serve + watch + live reload
scratchboard --out <path>         write the baked HTML here instead of temp
scratchboard --config <path>      use this config, and its directory as the root
scratchboard --port <n>           serve mode, default 8787, walks up on conflict
scratchboard --no-open            do not launch a browser
scratchboard --scan               print the JSON payload to stdout, exit
scratchboard --help               print this
scratchboard --version            print the version
scratchboard init                 detect and write scratchboard.json
  --tickets <glob>                skip the ticket-path prompt
  --yes                           accept detection, never prompt
```

`-h`, `-v`, and `-y` are accepted as short forms of `--help`, `--version`, and `--yes`. An
unknown flag or command stops the run rather than being ignored.

**Default run.** One self-contained HTML file is written to a private directory under the OS
temp directory, mode `0600`, and opened. `--out <path>` writes it where you say instead, and
overwrites what is there. Only `--scan` writes to stdout, so every human line goes to stderr and
the payload can be piped.

**`--serve`.** Binds `127.0.0.1` only. `--port` takes 1 to 65535, and when that port is busy it
walks up, trying 40 ports in all. The port it prints is the port it bound. On a
change it re-scans and pushes a new payload, and the page re-renders in place: lane scroll
positions, the search box, and an open ticket all survive. If the ticket you have open is gone
from the new scan, the board says so rather than leaving a stale copy on screen.

**`init`.** Runs detection and writes `scratchboard.json` at the root. In a terminal it asks you
to confirm the ticket glob and the format, prints the lanes and facets it proposes, and asks
whether to keep the facets. `--yes` and any non-interactive run skip all of that. It fills only
the keys the config is missing, so a second run leaves your lanes alone. The file is written to
a staging path and renamed, so a failed write cannot truncate the config you had.

After a zero-config run that found a board, scratchboard also offers to save the result once the
board is already open. Answering no writes nothing.

## Config file

`scratchboard.json` at the root. Every key is optional. Anything absent comes from detection.

| Key | Type | What it does |
| --- | --- | --- |
| `title` | string | The board header. Defaults to the directory name of the root. |
| `tickets` | glob | Which files are tickets, relative to the root. |
| `format` | `yaml-frontmatter` or `key-value-block` | Which preset reads the metadata. |
| `idPattern` | regex source | Pulls a ticket ID out of the file or folder name. The first capture group wins, and the whole match is used when there is no group. |
| `parser` | path | A local module that reads a format neither preset covers. Replaces `format`. |
| `lanes` | array | Lane name, match rule, and whether it starts collapsed. |
| `facets` | array | Which metadata fields become filter chips, their colours, their value order, and their icon. |

Config wins key by key, and detection fills the rest. Detection is skipped entirely when
`tickets`, `lanes`, and one of `format` or `parser` are all set, which is what makes a committed
config a fast run.

An unknown key raises a warning and is ignored, and `init` writes it back untouched, so a config
written against a newer version still renders on an older build and survives the round trip. The
same holds for unknown keys inside a lane or a facet.

A malformed value warns and falls back rather than stopping the run: a `format` that is not a
preset goes back to detection, an `idPattern` that is not a valid regular expression is dropped,
and a lane or facet that cannot be read is left out with its index named in the warning.

## Globs

Three tokens, matched case-sensitively against root-relative paths with forward slashes on every
platform, Windows included. A glob holding a backslash matches nothing and raises a warning that
says so.

| Token | Matches |
| --- | --- |
| `*` | anything inside one path segment |
| `**` | zero or more whole segments |
| `?` | one character |

No braces, no negation, no character classes. `.git` and `node_modules` are never walked, and
symbolic links are never followed. Walking starts at the deepest fixed directory in the ticket
glob, so nothing above it is read.

## Lanes

A lane is a match, not a location. A ticket is never relocated to join one.

```json
"lanes": [
  { "name": "Todo",  "match": { "path": ".scratch/todo/**" } },
  { "name": "Ready", "match": { "field": "status", "in": ["ready-for-agent", "ready-for-human"] } },
  { "name": "Done",  "match": { "field": "status", "equals": "done" }, "collapsed": true }
]
```

- `match` takes `path` or `field`, never both. A lane naming both is dropped with a warning.
- `field` takes `in` for a set of values, or `equals` for one.
- Matching is exact and case-sensitive. When the field holds a list, a ticket matches if any
  element matches.
- Lanes are tried in order and the first match wins. That order is also the order on screen.
- `"collapsed": true` renders a lane as a narrow rail carrying its count, and builds its cards
  the first time you expand it.
- A ticket matching no lane goes to a trailing `Unmapped` lane and raises a warning naming the
  values that matched nothing. It is never dropped.

A field used for lane matching drops out of the facet chips. Showing `status` as both the lane
and a filter sets one control against another. Path lanes are what keeps the folder and the
status as two separate axes.

## Facets

Any metadata field can become a filter chip. A facet takes an optional colour map, an optional
value order, and an optional icon.

```json
"facets": [
  {
    "field": "priority",
    "icon": "alert",
    "order": ["p0", "p1", "p2", "p3"],
    "colors": { "p0": "red", "p1": "amber", "p2": "cyan", "p3": "neutral" }
  },
  { "field": "labels" }
]
```

- The named colours are `red`, `amber`, `cyan`, `green`, and `neutral`. Any value you do not
  name, and any name that is not one of those five, falls back to `neutral`.
- The first facet carrying a colour map is also the badge on the card face.
- `icon` marks the field's row in the ticket detail. See [Icons](#icons).
- Without an `order`, values are ordered by how many tickets carry them, then by name. That
  reads well for labels and badly for a scale, because `p2` leads whenever it is the most
  common.
- With an `order`, every value you name takes its named place. Anything you leave out falls
  in behind by count, and a name no ticket carries is skipped rather than drawn empty.
- A facet may be written as a bare string, so `"facets": ["labels"]` is the same as
  `[{ "field": "labels" }]`.

## Icons

Every row in the ticket detail carries a small glyph beside its name. The icons are
[Octicons](https://github.com/primer/octicons), MIT, inlined as path data so a baked board still
fetches nothing.

The set is deliberately small, because every icon is bytes in every board:

`alert`, `book`, `calendar`, `check`, `columns`, `copy`, `cross-reference`, `file`, `link`,
`milestone`, `package`, `person`, `tag`, `workflow`.

The rows the board builds itself are fixed: `lane` takes `columns`, `path` takes `file`, `dates`
takes `calendar`, and `refs` takes `cross-reference`. The copy button in the ticket header takes
`copy`, and swaps to `check` while it confirms.

A metadata row takes the `icon` its facet names. With no `icon` named, these field names carry a
default, so a board reads right with no config at all:

| Field | Icon |
| --- | --- |
| `priority`, `severity` | `alert` |
| `status`, `state` | `workflow` |
| `labels`, `tags`, `type` | `tag` |
| `assignee`, `owner` | `person` |
| `milestone`, `epic` | `milestone` |
| `component`, `area` | `package` |
| `link`, `url` | `link` |
| `source` | `book` |

Any other field is drawn with no icon rather than a guessed one. An `icon` naming something
outside the set warns and the row keeps its default.

## Detection

Detection runs when the config leaves something out. It never writes anything on its own.

**Finding the tickets.** It walks the root, keeps the markdown, and drops anything git ignores.
It takes the first of `.scratch/`, `.tickets/`, `docs/issues/`, `issues/`, `tasks/` that holds a
file which is not a repo doc. `README.md`, `CONTRIBUTING.md`, `CHANGELOG.md`, `LICENSE.md`,
`CODE_OF_CONDUCT.md`, `AGENTS.md`, and `CLAUDE.md` never count as tickets. Failing all five it
takes the largest directory holding three or more markdown files a preset can read, and pulls in
its sibling directories when they are boards too.

**Picking the format.** Each preset is tried against the whole tree and against each repeated
file name inside it, such as `issue.md`. The winner is the pairing that reads the most files net
of the ones it cannot. A tree of loose notes around a repeated ticket file is why the narrower
set is tried at all. If no preset reaches a majority anywhere, the run stops and names the
sample file and the presets it tried.

**Proposing lanes.** Folders come first: the directories one level under the ticket base, when
there are between two and six of them. Failing that, a metadata field, when it has between two
and six distinct values, is on at least half the tickets, and holds no lists. Fields named
`status`, `state`, `stage`, `workflow`, `column`, or `lane` are preferred in that order. Lanes
are ordered backlog, ready, in progress, review, then anything done-like, and a done-like lane
starts collapsed. With neither folders nor a field to go on, everything lands in one `All` lane.

**Proposing facets.** Every other field whose values repeat, measured as distinct values against
total occurrences. A field where nearly every value is unique is an identifier, not a filter.

**Ranking and colouring a facet.** Detection knows two conventional vocabularies. A priority
scale reads `p0` to `p4`, or `blocker`, `critical`, `urgent`, `high`, `major`, `medium`,
`moderate`, `normal`, `low`, `minor`, `trivial`, `none`. It is ranked most urgent first and
accented red, amber, cyan, then neutral. A stage vocabulary is the same one that orders lanes,
and it is ranked but never accented, because green is the board's own on-state.

A facet is only ranked when at least two of its values are in one vocabulary and those values
are the majority. Anything else keeps count order and stays neutral, so a vocabulary detection
does not know is never guessed at. A value the scale does not hold sorts last and takes no
colour. Case is preserved, so a board writing `P0` is ranked and coloured the same as one
writing `p0`. Every part of this is a default that a `colors` or `order` in the config replaces.

**`idPattern`.** Set to `^(\d+)[-_]` when any ticket file or folder name starts with digits.

## Ticket identity and dates

The ticket name is the file name without its extension, except that `issue`, `index`, `readme`,
`ticket`, and `task` are container names, so the parent folder is used instead. `idPattern` runs
against that name, and what follows the match becomes the slug. A parser may return an `id`
directly, which wins over the pattern. Two tickets sharing an ID raise a warning naming both
paths, and both stay on the board. A ticket is allowed to have no ID at all.

`created` and `updated` come from one `git log` pass over the ticket tree, following renames, so
a ticket keeps its history when a path-lane board moves it between folders. Outside a git repo,
or for a file git does not know, the date falls back to the file mtime. The payload records
which of the two it used per ticket.

## Custom parsers

Two ticket formats work with no setup: YAML front matter, and a plain `Key: value` block. If
yours is neither, write a module and name it in the config.

```js
// scratchboard.parser.mjs
export function parse(path, text) {
  return {
    id,      // string or null
    title,   // string, never blank
    body,    // markdown, the ticket minus its metadata block
    fields   // flat object of strings and string arrays
  };
}
```

```json
{ "parser": "./scratchboard.parser.mjs" }
```

The path is relative to the root. A named parser replaces the preset outright and never degrades
back to one, because a preset that misreads every ticket is worse than a run that stops and says
why. A parser that fails to load, or exports no `parse` function, stops the run with the reason
and writes no board.

`fields` is untyped on purpose. Lanes and facets address it by name, so your own `severity` or
`team` field works with no code change. The real boundary is one line: the body has to be
markdown, because the board renders it. The metadata format is fully open.

Per-file failures are survivable and land in the warnings panel instead. Read three tickets from
different corners of your set before you write the parser, so it covers the variation the set
holds. The scratchboard skill will do this for you.

## Warnings

A file is never silently skipped, because a board that quietly drops three tickets is worse than
a board that shows an error. Warnings go to the panel on the board, to stderr, and to
`warnings` in the scan payload. They carry the path and the reason.

What lands there: a ticket glob matching nothing, a file that cannot be read, a parser that
threw, a ticket with no title, an ID on more than one ticket, tickets matching no lane, a glob
holding a backslash, an unknown or malformed config key, and a `git log` that failed.

Only two things stop a run: no preset or parser could read the format at all, and a named parser
that would not load.

## On the board

| Control | What it does |
| --- | --- |
| `/` | focus the search box |
| Escape | close the open ticket, then an open filter dropdown, then clear the search box |
| `c` | copy the path of the open ticket |
| sort | by updated, by ID, or by title. The ID sort hides itself when no ticket has one |

A facet with a long tail of values collapses into a dropdown. A facet with a short list shows
its values as chips, and any that do not fit the toolbar row move into a `+N` dropdown beside
them, so a board with long status names does not push the toolbar taller.

Search covers the ID, `#` and the ID, the title, the slug, the path, every field value, and the
ticket body. Search, filters, sort, and the open ticket all live in the URL hash, so a filtered
board is a link you can send. Two themes ship, `latte` and `phosphor`, both clearing WCAG AA for
text, and the board respects `prefers-reduced-motion`.

Ticket markdown comes from a repo and renders in a browser, so links are held to an allowlist of
safe schemes and the payload is escaped where it is inlined.

## Scan payload

`--scan` prints the payload the browser renders and exits. It is the contract between the
scanner and the interface.

| Key | What it holds |
| --- | --- |
| `version` | The scratchboard version that produced it |
| `generated_at` | ISO timestamp, seconds |
| `root` | Absolute path of the resolved root |
| `title` | Board header |
| `format` | The preset name, or `parser:` and the parser path |
| `counts` | `total`, and `byLane` keyed by lane name |
| `lanes` | Name, collapsed, and the ticket IDs in order |
| `facets` | Per field, the values with their counts |
| `facetConfig` | The facets as configured, minus any field used by a lane |
| `tickets` | ID, slug, title, path, lane, fields, excerpt, body, refs, dates |
| `warnings` | Path and reason for everything the scan survived |

`counts.byLane` and `warnings` are the report to read when a board looks wrong. A lane far short
of the count you expect, or an `Unmapped` entry, means the config and the tickets disagree.
