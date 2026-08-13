---
title: Publish 0.1.0 from a tag with provenance
status: ready-for-human
priority: p1
labels: [release, ci]
---

# Publish 0.1.0 from a tag with provenance

`release.yml` publishes on a `v*` tag, checks the tag against `package.json`, and runs
`npm publish --provenance --access public`. It has never run. Nothing is on npm yet.

Before the first tag, three things need a human with account access:

- An npm automation token in the repository secrets as `NPM_TOKEN`. A granular token scoped
  to this one package is enough and is the safer shape.
- GitHub Pages set to deploy from Actions, and the `github-pages` environment allowed to
  deploy from the default branch, or `demo.yml` fails on its first run.
- The npm package name reserved. It was free at design time and free is not the same as
  still free.

Provenance needs the workflow to be the only publisher. Never publish from a laptop, because
the first manual publish makes every later provenance claim weaker than no claim at all.

## Done when

`v0.1.0` is tagged, the workflow published it, and the npm page shows the provenance badge
pointing at this repository and that workflow run.
