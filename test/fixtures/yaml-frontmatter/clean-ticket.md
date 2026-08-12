---
title: "The ledger never refreshes itself on either client"
priority: p0
source: found while triaging #197, minutes not landing on iPhone or Mac
status: ready-for-agent
labels: ["bug", "ios", "macos", "apple"]
---

## Problem

`LedgerModel.refresh()` has five call sites and every one of them needs the user to act.

Nothing subscribes the ledger to the silent push path.

## Done means

The ledger refreshes itself.
