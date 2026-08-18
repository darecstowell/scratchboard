# Skill ecosystem survey

Gathered while charting this map, from the skills installed on the maintainer's machine at
`~/.agents/skills` (reached through the `~/.claude/skills` symlink). Findings are about the
installed versions, not the published latest.

## The catalogue

117 skills load in a session: 106 personal plus 11 from enabled plugins. Provenance comes from
`~/.agents/.skill-lock.json`, written by the `find-skills` installer.

| Source | Count |
| --- | --- |
| `mattpocock/skills` | 33 |
| `coreyhaines31/marketingskills` | 39 |
| `emilkowalski/skills` | 7 |
| other tracked | 2 |
| no recorded provenance | 25 |

The marketing skills are not his. Design and animation skills are not his either.

## There is no version to pin to

His pack carries no version field and no manifest. Freshness is tracked only by a per-skill git
blob hash and an install timestamp in the lockfile. The marketing pack and the Resend plugin do
carry semver, which is where the impression of a version number comes from.

## Argument shapes are not machine-readable

Only five skills declare `argument-hint`: `pr-walkthrough`, `handoff`, `claude-handoff`, `teach`,
`kb-handoff`. No `SKILL.md` anywhere uses `$ARGUMENTS` or positional placeholders.

Some skills document an argument in prose instead. `to-tickets` accepts a spec path, an issue
number, or a URL. `wayfinder` is invoked with a map reference and an optional ticket. Neither
declares it in frontmatter, so nothing can read it. Argument templates have to be hand-authored.

## No usage or enable telemetry

`~/.claude/stats-cache.json` holds session, message, and token aggregates and never names a
skill. Enable state is per-plugin, in `settings.json` under `enabledPlugins`. Personal skills
have no enable flag at all; `disable-model-invocation: true` only stops autonomous triggering
and still leaves the skill invocable by name.

## The stock local tracker has no lanes

The seed template at `setup-matt-pocock-skills/issue-tracker-local.md` defines one folder per
feature:

- `.scratch/<feature-slug>/spec.md`
- `.scratch/<feature-slug>/issues/NN-<slug>.md`, numbered from `01`
- Triage state on a `Status:` line near the top
- History appended under a `## Comments` heading

`todo/`, `in-progress/`, and `done/` are this repo's own addition. Out of the box his workflow
produces files with no board at all.

## Wayfinding operations, stock

- Map at `.scratch/<effort>/map.md`
- Child ticket at `.scratch/<effort>/issues/NN-<slug>.md`
- `Type:` line, one of `research`, `prototype`, `grilling`, `task`
- `Status:` line, `claimed` or `resolved`
- `Blocked by: NN, NN` near the top
- Resolution appended under an `## Answer` heading

## Five gaps in the local tracker

1. **No closed state.** The five triage roles are `needs-triage`, `needs-info`,
   `ready-for-agent`, `ready-for-human`, `wontfix`. On a real tracker "done" is the issue being
   closed, which is tracker state. Local markdown defines no equivalent.
2. **No parent pointer.** The GitHub template has a `## Parent` section and a `Part of #<map>`
   convention. The local template has neither, in either direction. A spec does not know its
   tickets and a map does not know its children, except by sharing a folder.
3. **Two incompatible `Status:` enums.** `to-tickets` writes triage roles. Wayfinder writes
   `claimed` and `resolved`. Same field name, unrelated state machines, and nothing in a file
   says which convention produced it.
4. **Two incompatible `Blocked by:` formats.** Wayfinder specifies `NN, NN`. The `to-tickets`
   local template says "the numbers/titles", freeform.
5. **Triage mechanics are unwritten locally.** `triage/SKILL.md` is entirely `gh` and `#42`
   flavored. Nothing says how to close, label, or comment on a local file.

Directory shape is the only signal of which convention is in play: `map.md` present suggests
wayfinder, `spec.md` present suggests `to-spec` and `to-tickets`.

## What a file reader can and cannot see

Wayfinder's canonical store is the issue tracker, not files. Claim is the assignee field,
blocking is a native dependency edge, open and closed is issue state. The `Status:` and
`Blocked by:` lines exist only in the local fallback.

For a tracker-backed repo, a file reader sees none of the map. Value concentrates on
local-markdown repos.

Unreachable by design: prototype output and research findings both land on throwaway branches,
out of main. Prototypes take a second shape as UI variants behind a `?variant=` param inside a
live route.

## The most stable artifacts nobody asked about

`domain-modeling` writes `CONTEXT.md` at the repo root and `docs/adr/NNNN-slug.md`, both with
fixed templates, fixed paths, and lazy creation. `improve-codebase-architecture` reads and
extends them, `tdd` reads them for vocabulary, `grill-with-docs` writes them. Nothing else in
the ecosystem has that gravity, and all of it sits in the working tree.

## Which skills touch a board at all

Related: `code-review` and `review`, near-duplicate twins that look for a spec under `.scratch/`
matched loosely by branch name; `pr-walkthrough`, the only one with a declared argument;
`create-pr` and `address-pr-feedback`, which are one-line slash commands in `~/.claude/commands/`
rather than skills.

Unrelated: `tdd`, `codebase-design`, `diagnose`, `diagnosing-bugs`, `writing-for-agents`,
`write-a-skill`, `improve-codebase-architecture`, `orchestrate-plan`. `orchestrate-plan` never
mentions a ticket or a map. `grilling` writes nothing at all.
