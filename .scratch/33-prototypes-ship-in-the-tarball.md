---
title: Keep the wayfinder prototypes out of the published package
status: done
priority: p2
labels: [release, distribution, maintenance]
---

# Keep the wayfinder prototypes out of the published package

Four prototype files ship to every person who runs `npx scratchboard`.

```
src/ui/prototype-wayfinder-c1-hover.html
src/ui/prototype-wayfinder-graphs-2.html
src/ui/prototype-wayfinder-graphs.html
src/ui/prototype-wayfinder-view.html
```

They are about 60 KB of a 418 KB unpacked package, so roughly one seventh of what a user
downloads is a design exercise the runtime never reads.

They arrived with the prototype pull request and nothing caught them. `tools/guard.mjs` holds a
`NEVER_SHIP` list, and `src/` is not on it because `src/` is exactly what the package must ship.
The guard also requires every file under `src/` to appear in the tarball, so adding a
`NEVER_SHIP` entry alone would put the two rules in conflict.

That conflict is the reason this is a decision rather than a one-line fix.

## The shapes

- **Move them.** A directory outside `src/`, so the existing rules keep working unchanged. It
  breaks the paths that
  [Prototype the wayfinder view](./skills-pivot/issues/04-prototype-the-wayfinder-view.md) cites,
  and that decision record is public copy, so the citation has to move with the files.
- **Exclude them by pattern.** A negation in the `files` field of `package.json`. Nothing moves
  and no link breaks, and the guard's "every file under `src/` ships" rule needs an exception that
  says which patterns are allowed to be missing.
- **Delete them.** The decision record already carries every finding the prototypes produced, and
  the branch still holds the files. It is the cheapest answer and it loses the artifact a reader
  can open.

## Done when

- No file under `src/ui/` that the runtime never reads appears in `npm pack --dry-run`.
- `tools/guard.mjs` fails if one comes back, so this cannot regress the way it arrived.
- Any decision record citing a prototype path still resolves.

## Shipped

Excluded, and the exclusion is guarded both ways so it cannot come back the way it arrived.

`package.json` carries a negation, `!src/ui/prototype-*.html`, beside the `src/` entry.
`tools/guard.mjs` gains one named carve-out in the everything-under-src-ships rule, and a second
check that fails when a carved file does appear in the tarball. Removing the negation now breaks
the build with four named failures, which was verified rather than assumed.

Nothing moved, so the paths
[Prototype the wayfinder view](./skills-pivot/issues/04-prototype-the-wayfinder-view.md) cites
still resolve.

The tarball goes from 37 files and 418 KB unpacked to 33 files and 358 KB. Caught before 0.3.0,
so no published version ever carried them.
