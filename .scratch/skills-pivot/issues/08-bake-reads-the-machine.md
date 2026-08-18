# 08. Should the bake read the machine's installed skills?

Type: grilling
Blocked by: 07

## Question

A launcher that only offers installed skills has to read `~/.agents/skills`, the plugin cache,
and `settings.json` at bake time.

That cuts against what a baked board is. The output is one self-contained portable file, often
published, and this repo publishes its own to Pages on every push. Reading the machine embeds
machine state into that artifact, which means the public demo would list the maintainer's
installed skills.

Open:

- Is machine detection worth it at all, against a fixed shipped list?
- If yes, is it a bake-time read, an opt-in flag, or something the local server does but the
  baked file does not?
- Zero dependencies holds, but does zero dependencies also imply the scan stays inside the repo?
  That rule is currently unstated and this is the first thing to test it.
- What does a baked board published by someone else disclose that they did not intend?
