---
title: Check the skills.sh listing page after the first install
status: deferred
priority: p3
labels: [distribution, docs]
---

# Check the skills.sh listing page after the first install

`skills.sh.json` names one grouping and one skill. The group description is the only prose on
that page anyone controls, so it is worth confirming it renders as written.

The page appears only after the telemetry service indexes the repository, which normally
happens after someone installs the skill through the CLI. Pages are also cached, so an edit
does not show up at once.

That means a missing page on day one is not a broken config, and treating it as one leads to
editing a file that was already correct.

Check after the first real install, and confirm:

- The group title and description read as intended at the page width.
- The skill appears inside the group rather than under "Other skills", which would mean the
  name did not match.

## Done when

The page has been seen and either matches the file or the mismatch is filed as its own
ticket.
