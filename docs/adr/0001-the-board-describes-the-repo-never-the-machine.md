# The board describes the repo, never the machine

A skill copy affordance would be more useful if the board knew which skills were installed, which
means reading `~/.agents/skills`, the plugin cache, and `settings.json` at bake time. We refuse
that, as a rule rather than a preference: the scan reads the repo and nothing else.

## Considered options

An opt-in flag, and a read that the local `--serve` run performs but the baked file does not. Both
were rejected. A flag publishes machine state the one time someone forgets it, and a serve-only
carve-out would make the local board and the baked board show different things, which breaks the
rule that the payload is the contract.

## Consequences

A baked board is portable and often published, and this repo publishes its own on every push, so
this is what keeps a maintainer's installed skills out of a public artifact.

The cost is accepted rather than mitigated: the board can never know whether a skill is installed,
so a prepared invocation may be a string that does nothing when pasted. This is also why the
repair diagnostic hands over a plain sentence beside its invocation.
