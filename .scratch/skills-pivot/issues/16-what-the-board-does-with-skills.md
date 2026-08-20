# 16. What does the board do with skills?

Type: grilling
Blocked by: none

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
