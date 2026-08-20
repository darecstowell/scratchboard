# Triage labels

The skills speak in five canonical triage roles. This file maps those roles to the strings this
repo uses. A ticket carries its role in the `status` field of its frontmatter.

| Label in mattpocock/skills | Label in our tracker | Meaning                                  |
| -------------------------- | -------------------- | ---------------------------------------- |
| `needs-triage`             | `needs-triage`       | Maintainer needs to evaluate this ticket |
| `needs-info`               | `needs-info`         | Waiting on the reporter for information  |
| `ready-for-agent`          | `ready-for-agent`    | Fully specified, ready for an AFK agent  |
| `ready-for-human`          | `ready-for-human`    | Needs a human to implement it            |
| `wontfix`                  | `wontfix`            | Will not be actioned                     |
| none                       | `done`               | Shipped and verifiable in the history    |

When a skill names a role, for example "apply the AFK-ready triage label", write the string from
the right-hand column into the ticket's `status` field.

`done` is scratchboard's own, and upstream has no equivalent: the five roles are a triage queue,
not a lifecycle, and on a real tracker "done" is the issue being closed. An agent writes it, and
`skills/scratchboard/SKILL.md` teaches that. The board never does, because read-only holds.

`status` is also the lane. There is no second axis: the folder carries nothing, so the field
says both how ready a ticket is and where the card sits.

Edit the right-hand column to change the vocabulary.

`scratchboard.json` declares one lane per value in this table, and one more for `deferred`.
`deferred` is not in the table because it is not a triage role and not in the published spec. It
means "someone looked and chose later", which `needs-triage` loses, so it survives as this repo's
own value. A stranger's unrecognized value behaves the same way: it passes through untouched and
takes its lane from local config.

[Name the sixth lifecycle state](../../.scratch/skills-pivot/issues/02-name-the-sixth-state.md)
settled `done`, and
[Migrate this repo's own board to triage-role lanes](../../.scratch/skills-pivot/issues/09-migrate-this-repo-to-status-lanes.md)
made the config match.
