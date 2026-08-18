# 12. Should the zero-dependency rule be lifted?

Type: grilling
Blocked by: 13

## Question

`AGENTS.md` states this as the rule that is the product: an `npx` run that installs nothing is
why anyone tries this, `npm test` needs nothing installed, and `tools/guard.mjs` fails the build
if a line appears under `dependencies` or `devDependencies`. Lint and type tooling is fetched by
`npx` at a pinned version and never declared.

Two things now push against it. Mermaid rendering inside ticket markdown probably wants a real
renderer. A drawn wayfinder view wants layout, although the research found that one affordable
by hand.

Before deciding, note what the research already narrowed:

- Zero dependencies bars npm packages, not where code runs. Layout can happen at bake time and
  ship coordinates in the payload, so the browser bundle stays clean either way.
- The repo already has a third path it uses for lint and types: fetched by `npx` at a pinned
  version, never declared. Whether that path extends to a bake-time renderer is the real
  question, and it may make lifting unnecessary.

Open:

- Is the rule about the install, the bundle, the test run, or the trust story? They come apart
  here, and the answer decides which of them a dependency would actually break.
- If a dependency runs only at bake time and never ships in the baked file, has the rule been
  broken or honoured?
- If it is lifted, what replaces it as the line `tools/guard.mjs` holds? A rule with no guard
  degrades quietly.
- What does the README lose? Zero config and zero dependencies are both stated positions.
