# 11 — What does the board still promise a repo that uses none of these skills?

Type: grilling
Blocked by: 01

## Question

The config rule is the reason this was extractable: no lane name, status value, or metadata key
belongs in the source, and a stranger's `severity` field has to work with no code change.

Specializing puts pressure on that rule. The question is what survives it.

Open:

- Is the specialized behaviour detection plus defaults, so a stranger's board is unchanged, or is
  it a distinct mode?
- What does a stranger see when nothing is detected? Today's board unchanged, or a board visibly
  shaped for a workflow they do not have?
- Does the config schema grow keys that only mean something inside this ecosystem, and is that
  acceptable given unknown keys already warn and survive?
- The survey found that value concentrates on local-markdown repos, because a tracker-backed repo
  keeps its map behind an API where a file reader sees nothing. Is that boundary stated out loud
  or left implied?
