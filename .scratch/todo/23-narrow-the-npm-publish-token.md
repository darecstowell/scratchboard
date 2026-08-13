---
title: Narrow the npm publish token to scratchboard alone
status: ready-for-human
priority: p1
labels: [security, release, ci]
---

# Narrow the npm publish token to scratchboard alone

`release.yml` passes `NPM_TOKEN` to `npm publish`. That token is a granular automation token
scoped to every package on the account, because the package did not exist yet when it was
made and a token cannot name a package that is not there.

The package exists now, so the reason is gone and the scope is not. Anything that reads the
secret can publish any package the account owns, not just this one.

A published version cannot be recalled, so the blast radius of this token is every package on
the account, permanently.

## Done when

A new granular automation token scoped to `scratchboard` alone replaces `NPM_TOKEN` in the
repository secrets, the old token is revoked on npmjs.com, and a release runs green on the
new one. Do this before the next publish.
