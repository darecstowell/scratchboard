---
title: Publish 0.1.0 from a tag with provenance
status: shipped
priority: p1
labels: [release, ci]
---

# Publish 0.1.0 from a tag with provenance

`release.yml` publishes on a `v*` tag, checks the tag against `package.json`, and runs
`npm publish --provenance --access public`.

Three things needed a human with account access before the first tag: an npm automation
token in the repository secrets as `NPM_TOKEN`, GitHub Pages set to deploy from Actions with
the `github-pages` environment allowed to deploy from the default branch, and the package
name reserved.

Provenance needs the workflow to be the only publisher. Nothing was ever published from a
laptop, because the first manual publish makes every later provenance claim weaker than no
claim at all.

## Shipped

`v0.1.0` is tagged and the workflow published it. The npm page carries a SLSA v1 attestation
naming this repository and that workflow run. `npx scratchboard` runs from the public
registry with nothing installed.

The token is still scoped to every package on the account, which the first publish required.
Narrowing it is #23, and it lands before the next publish.
