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

When a skill names a role, for example "apply the AFK-ready triage label", write the string from
the right-hand column into the ticket's `status` field.

The lane is a separate axis. `status` says how ready a ticket is, and the folder says where the
work is. Do not use one to mean the other.

Edit the right-hand column to change the vocabulary.
