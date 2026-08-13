---
title: Add lint, type checking, and a house-rules guard to CI
status: shipped
priority: p2
labels: [ci, tooling]
---

# Add lint, type checking, and a house-rules guard to CI

`npm test` ran the unit suite and nothing else. Style, types, and the zero-dependency rule
were held by review alone, which is the weakest place to hold a rule that is the product.

The hard part is that the checks may not become dependencies. A `devDependencies` line for
ESLint would break the promise that an `npx` run installs nothing.

## Shipped

`checks.yml` runs three jobs. Lint and type checking fetch their tooling through `npx` at a
pinned version, in CI and locally alike, and neither is declared in `package.json`.
`tools/guard.mjs` reads `package.json` and fails the build if a `dependencies` or
`devDependencies` line ever appears.

The three jobs are required on `main` alongside the Node 18, 20, and 22 test matrix.
