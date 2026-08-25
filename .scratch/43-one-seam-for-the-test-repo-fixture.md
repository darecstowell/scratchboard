---
title: Build a test repo fixture through one seam
status: done
priority: p2
labels: [testing, architecture]
---

# Build a test repo fixture through one seam

Seven test files each write their own "make me a repo to scan" helper. There is no seam for it, so
each one re-derives the directory names, the frontmatter shape, and the cleanup by hand:

- `test/cli-scan.test.mjs:11-26` and `test/cli-bake.test.mjs:11-26` are the same 15 lines twice.
  Only the import order differs.
- `test/init.test.mjs:8-21` repeats the same ticket template and the same `tasks/todo` and
  `tasks/done` tree.
- `test/serve.test.mjs:31-43` is a fourth shape, with `tickets/todo` and `tickets/done` and
  different frontmatter.
- `test/detect.test.mjs:106-117`, `test/board.test.mjs:9-25`, and `test/root.test.mjs:8-13` each
  have a `tree` helper, at three different interfaces.
- `test/dates.test.mjs:20-36` wraps git around its own.

Delete any one of them and nothing concentrates. The other six carry on, each maintained alone.
A mistake in one, a path fence written wrong for example, is invisible to the other six.

`test/detect.test.mjs` already settled the best interface of the group: a flat map from path to
contents.

## The seam

One `writeRepo(t, files, options)` in `test/context.mjs`, which already owns cleanup through
`t.after`. It takes the flat path-to-contents map, plus a `ticket(title, fields)` helper so each
caller supplies its own frontmatter shape rather than inheriting one.

Same primitives as today: `node:fs/promises`, `node:os`, and `node:path`. Nothing installed.

## Done when

- One `writeRepo` is the only fixture builder, and all seven call sites use it.
- `ticket()` takes the fields, so no call site is forced into another's frontmatter shape.
- The seven local helpers are deleted, not left beside it.
- The suite passes on Node 18 and on current.
- `node tools/guard.mjs` passes, and `package.json` gains no dependency.
