---
title: Extract the markdown renderer, and attack it in a test
status: ready-for-agent
priority: p0
labels: [security, ui, testing, architecture]
---

# Extract the markdown renderer, and attack it in a test

AGENTS.md states the rule plainly. Ticket markdown is untrusted, the `SAFE_HREF` allowlist in
`board.js` and the payload escaping in `bake.mjs` are the only things between a stranger's repo
and a browser, and "a change there ships with a test that attacks it".

No test attacks it. `test/ui.test.mjs:213-227` reads `board.js` as text and matches the source
against a regular expression. Line 219 asserts that the literal string
`SAFE_HREF.test(href)) return ""` is present somewhere in the file. It never calls the function.
A change that keeps that literal and breaks the escape around it keeps the suite green.

The cause is the shape of the module, not the care of the tests. `renderMarkdown` and its helpers
at `src/ui/board.js:37-288` are about 220 lines of recursive descent: fences, lists with a
blank-line lookahead, tables, block quotes, headings, and an inline pass that hides tokens behind
a marker character to keep escaped spans out of the second pass. Every one of these functions is
pure. String in, string out. No DOM read and no DOM write. They sit inside the top-level
`(() => { "use strict"; ... })()`, they are never exported, and so nothing can call them.

## The seam

Move `renderMarkdown` and its private helpers into `src/ui/markdown.mjs`, with the interface
`renderMarkdown(source, resolveLink) -> htmlString`. `resolveLink(href)` replaces the current
`inBoardTarget` closure over `knownPaths` and `linkBase`, so the caller supplies what the module
needs instead of the module reading mutable state above it.

`src/parse/markdown.mjs` already proves the pattern. It is a plain ESM file, `node:test` imports
it directly, and nothing is installed to make that work.

The baked board stays one self-contained HTML file. `bake.mjs` already splices the text of
`board.js` into an inline script element through `codeForElement`. It reads `markdown.mjs` too,
drops the `export` keyword with the same kind of text transform it already applies, and puts the
result ahead of the IIFE. No install-time cost, no build-time cost, and no runtime fetch.

## Done when

- `src/ui/markdown.mjs` exports `renderMarkdown`, and `board.js` calls it.
- A test calls `renderMarkdown` with a `javascript:` link and asserts on the returned HTML. The
  same test covers `data:`, `vbscript:`, and a scheme with leading whitespace or mixed case.
- Nested lists, nested fences, and tables are covered by input and output pairs, not by a
  regular expression over the source.
- The source-text tests in `test/ui.test.mjs` that this replaces are deleted, not left beside it.
- `test/bake.test.mjs` asserts the baked board is one file that fetches nothing.
- `node tools/guard.mjs` passes, and `package.json` gains no dependency.
