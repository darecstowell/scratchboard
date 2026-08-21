# scratchboard

Scratchboard bakes the markdown tickets already in a repo into one self-contained HTML kanban
board. This glossary holds the terms that are specific to that job, so a stranger's word and this
project's word do not drift apart.

## Language

**Prepared invocation**:
A skill name paired with the path of the thing on screen, ready to put on the clipboard. Declared
by a repo in config, never shipped by the board.
_Avoid_: command, shortcut, launcher entry

**Copy affordance**:
The detail-view control that puts a string on the clipboard. It copies and nothing else, because
the board runs no agent.
_Avoid_: launcher, runner, skill picker

**Diagnostic**:
A scan warning that also names its fix. It is a `warnings` entry rather than a channel of its own,
so it appears wherever warnings appear.
_Avoid_: error, alert, banner
