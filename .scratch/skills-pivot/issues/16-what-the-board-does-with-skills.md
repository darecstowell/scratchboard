# 16. What does the board do with skills?

Type: grilling
Blocked by: none
Status: resolved

## Question

Merged from three tickets that shared one surface: the skill launcher, whether the bake reads the
machine, and how the board offers its own repair skill. They share the copyable-string machinery
and differ only in where the string comes from, so deciding them apart would have meant deciding
the same thing three times.

### The launcher

The idea: open a ticket, pick a skill, copy a ready-made invocation.

The survey killed the free version. Only five skills declare `argument-hint`, no `SKILL.md` uses
argument placeholders, and the skills that do take a path document it in prose that nothing can
read. So templates are hand-authored, which makes the list a curated set someone maintains.

- Which skills earn a place? The survey found only four with any board relationship, and two of
  those are one-line slash commands rather than skills.
- Where do templates live? Config, so a stranger can add their own, or shipped defaults, or both?
- What does the copied string look like when a skill takes no argument, the majority case?
- Does the launcher offer skills that are not installed, and how would it know?

### Reading the machine

A launcher that only offers installed skills has to read `~/.agents/skills`, the plugin cache, and
`settings.json` at bake time. That cuts against what a baked board is. The output is one
self-contained portable file, often published, and this repo publishes its own to Pages on every
push. Reading the machine embeds machine state into that artifact, so the public demo would list
the maintainer's installed skills.

- Is machine detection worth it at all, against a fixed shipped list?
- If yes, is it a bake-time read, an opt-in flag, or something the local server does but the baked
  file does not?
- Zero dependencies holds, but does it also imply the scan stays inside the repo? That rule is
  unstated and this is the first thing to test it.
- What does a baked board published by someone else disclose that they did not intend?

### The repair diagnostic

[Does scratchboard publish the local-markdown tracker spec](./01-own-the-local-tracker-spec.md)
settled that tolerance runs in three tiers, and the middle one is new: a shape the board
recognizes but only half reads raises a diagnostic that names the fix.

The repair already exists. `skills/scratchboard/SKILL.md` ships here and publishes through
`skills.sh`, triggered by tickets missing from the board, tickets in the wrong lane or in
`Unmapped`, and a format the scanner cannot read. Nothing new has to be built for the fix, only
the surface that points at it.

- Where does the diagnostic live? Beside the warnings surface, as a dismissible banner, or inside
  the effort view where the half-read shape was found.
- What does it say? Naming the shape it half read is more useful than naming the rule it broke,
  but the user has to be able to act either way.
- What does it hand over? An install line, a skill invocation, `npx scratchboard init`, or a link
  to the spec.
- A baked board is published. What does a diagnostic disclose about the repo it was baked from,
  and does it belong in a published artifact at all?
- What happens when the reader is not the repo owner and cannot run the fix?

### Across all three

- [Name the sixth lifecycle state](./02-name-the-sixth-state.md) gave
  `skills/scratchboard/SKILL.md` a second job, owning the vocabulary upstream is silent about.
  Does that change what the skill is, and what the board says about it?

## Answer

The board ships no skill catalogue. It ships one copy affordance, and a repo declares what goes
in it.

### The correction that reshaped this

A skill does not act on a ticket. The board copies a string, a human pastes it, and an agent does
the work with a skill loaded. So this is a copy affordance rather than a launcher, and an entry is
a prepared invocation: a skill name plus the one fact the board holds, the path of the thing on
screen.

The survey's list of skills that touch a board answers a different question, which is which skills
read `.scratch/`. That set is three skills and two slash commands, all pull-request flavored, and
it is the wrong list for a reader deciding where to point an agent.

### The launcher

A curated catalogue was taken first and then rejected on a second pass, once the shape was drawn.
Nine shipped entries would put nine upstream skill names in the board's source, which is a second
coupling in a different place from the one
[ticket 01](./01-own-the-local-tracker-spec.md) drew at reading. Six of the nine take no argument,
so those entries save a paste rather than a decision.

What ships instead:

- The existing `copy path` button in the detail header, with its `c` shortcut, is the whole
  mechanism. It already exists.
- A repo declares prepared invocations in config. The button grows a caret only when there is
  more than one thing to copy, so a stock board with no config is byte-identical to today's.
- Config is additive, overrides by name, and carries an opt-out, which is the shape
  [ticket 03](./03-recognize-an-effort-folder.md) gave `groups`.
- The affordance keys on the path of whatever detail view is open, so one mechanism serves a
  ticket and a map document alike. What a document view is waits on
  [ticket 17](./17-what-the-wayfinder-surface-shows.md).
- A template substitutes `{path}` and nothing else. `{id}` is the trap: an id is optional by rule,
  so an id template copies a broken string with no error on every repo that uses none. A title
  carries quotes into a line bound for a prompt. Both can be added later without breaking a config
  that exists; neither can be taken away.
- The browser substitutes on click. The payload carries the template list once at the top rather
  than a finished string on every ticket, because a per-ticket field is a far larger contract
  change than a single top-level list, on a project that rejected mermaid over payload size.

The no-argument problem dissolves rather than resolves. A repo that wants a bare invocation writes
that template itself.

### Reading the machine

No, and the answer is a rule rather than a preference: **the board describes the repo, never the
machine.** No flag, and no carve-out for `--serve`.

The scan reads the repo and nothing else. It never reads `~/.agents/skills`, the plugin cache, or
`settings.json`. A flag is a footgun that publishes machine state the one time it is forgotten,
and a serve-only carve-out would make the local board and the baked board show different things,
which breaks the payload contract.

The consequence is accepted rather than mitigated: the board can never know whether a skill is
installed, so it offers what config declares and a reader may paste a string that does nothing.

This also settles the fog item asking whether the board reads the installed version of the skills.
It does not, by either install route.

### The repair diagnostic

The tier-2 diagnostic from ticket 01 rides the existing warnings surface. A finding that knows its
repair is a `warnings` entry with a fix attached, not a second channel, which is what the rule
about every survivable failure landing in `warnings` already says. It appears in the `N notes`
panel in the header. It is not an item in the copy menu, so a broken read never grows a menu on a
board that declared no entries.

It names the shape it half read rather than the rule it broke: `read .scratch/skills-pivot/ as an
effort but found no map.md`. It hands over the `/scratchboard` invocation **and** one plain
sentence naming the fix, because after the machine rule the board can never rule out a reader
without the skill, and an invocation alone is dead text for them. It never hands over
`npx scratchboard init` directly, because `init` writes config with no prompt in an agent run and
the skill deliberately asks first.

It stays in a published board unconditionally. It discloses repo paths, which every card already
shows. A reader who is not the owner cannot run the fix, and the diagnostic still earns its place
by explaining why the board looks wrong, which is the more common need. A published board that
silently misreads three tickets is the failure the warnings rule exists to prevent.

### Across all three

`skills/scratchboard/SKILL.md` stays one skill. Both jobs are making the repo and the board agree,
and a second skill doubles the install surface for a project whose pitch is that it installs
nothing.

The description has to be widened to earn it. Today it triggers only on a broken board, which the
vocabulary job from [ticket 02](./02-name-the-sixth-state.md) would never fire, since that job is
triggered by an agent writing a ticket's `status`. Writing that copy is execution, not a decision,
so it belongs to the build rather than to this map.

### Where the coupling line now sits

The only skill name anywhere in the board's source is scratchboard's own, inside its own
diagnostic. Every other skill name in the ecosystem is a string in somebody's config file. That is
consistent with ticket 01's "authority stops at reading".
