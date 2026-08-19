# 13. Research: what mermaid rendering costs, and whether bake time avoids it

Type: research
Blocked by: none
Status: resolved

## Question

Rendering mermaid diagrams inside ticket markdown is wanted. A baked board is one self-contained
file that fetches nothing, so a runtime renderer would ship in every board a user produces.

Find out:

- What mermaid actually costs when bundled, current version, minified and gzipped, and how much
  of that is reachable if only a few diagram types are supported.
- Whether mermaid can render to static SVG at bake time, in Node, without a browser or a
  headless browser, and what that requires.
- Whether smaller renderers exist that cover flowchart and sequence diagrams alone, and what they
  give up.
- Whether the `npx`-fetch-at-a-pinned-version pattern this repo already uses for lint and type
  tooling can run a renderer at bake time without declaring a dependency.
- What happens to a diagram that fails to parse, given the rule that a file the parser cannot
  read lands in `warnings` with its path and its reason.
- The security position. Ticket markdown is untrusted, and a diagram renderer is a new parser
  fed by a stranger's repo. What is the attack surface of rendering mermaid from untrusted input,
  at bake time and at runtime.

Report with citations to primary sources. Findings gate the decision on the dependency rule.

## Answer

Findings: [What mermaid costs, and whether bake time avoids it](../research/mermaid-cost.md).

Keep the incumbent. `board.js` already renders a mermaid fence as escaped `<pre><code>`, which
costs zero bytes, cannot execute, cannot beacon, and cannot hang.

### Size, and why a subset does not exist

`mermaid@11.17.0` ships 3,572,296 bytes minified, 976,004 gzipped. A board today is 437,856 bytes
for one ticket and 558,972 for this repo's own 41-ticket board. `serve.mjs` sets no
`Content-Encoding` and the default path opens over `file://`, so raw is the real number: a
runtime renderer makes every board a user produces 8.2 times its current size.

Tree-shaking cannot cut it. `diagram-orchestration.ts` statically imports all 42 diagram types
into one registration call, `sideEffects` is undeclared, and the pull request adding it was closed
unmerged. `registerExternalDiagrams` only adds. The one supported lever, `@mermaid-js/tiny`, is
still 2,554,781 bytes, or 5.8 boards. A hand-stripped flowchart and sequence build reaches
979,043 bytes, but it requires stubbing content-hashed chunk filenames that change every release.

### Bake time works, and it costs Node 18

Rendering to static SVG in Node without a browser is real. `svgdom` renders 10 of 12 types at
28ms each with clean self-contained output, measured 12 to 39 percent wide on text. It needs
`jsdom` for DOMPurify, and without DOMPurify the SVG sanitizes to length 0.

`jsdom`, `svgdom`, and Puppeteer all declare Node 22 or newer. Only `@mermaid-js/mermaid-cli`
supports Node 18, and it wants Puppeteer and roughly 1 GB of Chromium. Node 18 is the floor, so
this path is closed until that floor moves.

jsdom alone is worse than useless here. It does not implement `getBBox`, and when the method is
stubbed mermaid does not fail, it emits two different flowcharts sharing one viewBox.

### The security position is the harder blocker

Seven advisories fire under mermaid's own default `securityLevel: strict`, from diagram text
alone: CVE-2025-54880, CVE-2025-54881, CVE-2026-41148, CVE-2026-41149, CVE-2026-41159,
CVE-2026-50159, and CVE-2026-71437.

Mermaid ships no render timeout against three shipped infinite-loop CVEs. The house rule that
every failure a scan survives lands in `warnings` with its path and its reason therefore cannot
be honored with a `try/catch`. It needs a subprocess and a wall clock.

The flowchart `img:` shape is unsanitized, with no `formatUrl` call, unlike `setLink`. A
stranger's ticket beacons from the bake machine and leaves a permanent tracker in every published
board, invisible to the `SAFE_HREF` allowlist. GHSA-m4gq-x24j-jpmf hit exactly the prebuilt-bundle
consumption mode a baked board would use, while source-importing consumers were unaffected.

### The `npx` hatch is weaker than assumed

Measured: `npx @mermaid-js/mermaid-cli@11.15.0` writes `^11.15.0` into its cache entry and
resolved `mermaid` to 11.17.0. The pin does not pin the security-sensitive package.

npx is also not offline with a warm cache, because `getManifest` hardcodes `preferOnline: true`,
and Chromium lands outside the npm cache entirely. This narrows the pattern the repo already uses
for lint and type tooling, so it is worth knowing beyond mermaid.

### If rendering is wanted anyway

The findings name seven permanent obligations: pin to 11.16.1 or newer, run in a subprocess with
a kill timer, set `suppressErrorRendering`, set `htmlLabels: false`, extend the `secure` array,
strip `<image>` elements independently, and wrap output in an only-child `<div>`. The
zero-dependency rule is not the expensive part. The maintenance is.

### The aside worth carrying forward

`@viz-js/viz` is zero-dependency Graphviz in wasm, inlining its own wasm, running headless in
Node with no font metrics needed. If the real want was ever to draw the dependency graph rather
than to support mermaid, that is a much smaller question, and
[Prototype the wayfinder view](./04-prototype-the-wayfinder-view.md) has since drawn one by hand
with no wasm at all.

### What this does not decide

Whether the dependency rule moves. That is
[Should the zero-dependency rule be lifted](./12-lift-the-zero-dependency-rule.md), which this
research unblocks. These findings say what mermaid would cost, not what the budget should be.
