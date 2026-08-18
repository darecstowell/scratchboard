# 15. How does the board offer its own repair skill when it half reads a repo?

Type: grilling
Blocked by: 03, 07

## Question

Settled in [Does scratchboard publish the local-markdown tracker spec](./01-own-the-local-tracker-spec.md):
tolerance runs in three tiers, and the middle one is new. A shape the board recognizes but only
half reads raises a diagnostic that names the fix.

This ticket decides what that diagnostic looks like and what it offers.

The repair already exists. `skills/scratchboard/SKILL.md` ships in this repo and publishes
through `skills.sh`, and its stated trigger is tickets missing from the board, tickets in the
wrong lanes or in `Unmapped`, and a format the scanner cannot read. Nothing new has to be built
for the fix itself, only the surface that points at it.

Open:

- Where does the diagnostic live? Beside the existing warnings surface, as a dismissible banner,
  or inside the effort view where the half-read shape was found.
- What does it say? Naming the shape it half read is more useful than naming the rule it broke,
  but the user has to be able to act on it either way.
- What does it hand over? An install line, a skill invocation, a `npx scratchboard init`
  command, or a link to the spec. The copyable string problem is the same one
  [Which skills does the launcher offer](./07-skill-launcher-argument-templates.md) solves, so
  the two share machinery and differ in source: that ticket offers other people's skills from a
  ticket, this one offers scratchboard's own skill from a diagnostic.
- A baked board is published. What does a diagnostic disclose about the repo it was baked from,
  and does it belong in a published artifact at all?
- What happens when the reader is not the repo owner and cannot run the fix?
