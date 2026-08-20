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
runtime renderer adds 8.2 one-ticket boards of payload, taking a 437,856 byte board to 4,010,152
bytes, which is 9.2 times its current size. Both numbers are given because they answer different
questions. 8.2 is what the bundle costs, 9.2 is what the board becomes.

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

### The security position is the harder blocker, and it is a record rather than a live exposure

`mermaid@11.17.0` sits outside every affected range. The 2025 advisories are fixed in 11.10.0,
CVE-2026-41148, CVE-2026-41149 and CVE-2026-41159 in 11.15.0, and CVE-2026-50159 and
CVE-2026-71437 in 11.16.1. Nothing in the findings fires in a current pin, and saying otherwise
would be wrong.

What the record shows is rate and reach. Sixteen advisories, nine of them in 2026, four fixed
inside two weeks, and seven reachable from diagram text alone under the default
`securityLevel: strict` at the time they shipped. Adopting this is adopting that release cadence.

Two properties are structural rather than historical. Mermaid offers no render timeout as a
guarantee, which is why three separate infinite-loop CVEs were possible, so the house rule that
every survivable failure lands in `warnings` with its path and its reason cannot be honored with
a `try/catch`. It needs a subprocess and a wall clock. And the flowchart `img:` shape is
unsanitized, with no `formatUrl` call unlike `setLink`, so a future renderer would turn a
stranger's ticket into an outbound request from the bake machine and a permanent beacon in every
published board, invisible to the `SAFE_HREF` allowlist.

Neither applies to what ships today. The escaped fence cannot execute, beacon, or hang.
GHSA-m4gq-x24j-jpmf is worth noting anyway, because it hit exactly the prebuilt-bundle
consumption mode a baked board would use, while source-importing consumers were unaffected.

### The `npx` hatch is weaker than assumed

Measured: `npx @mermaid-js/mermaid-cli@11.15.0` writes `^11.15.0` into its cache entry and
resolved `mermaid` to 11.17.0. The pin does not pin the security-sensitive package.

npx is also not offline with a warm cache, because `getManifest` hardcodes `preferOnline: true`,
and Chromium lands outside the npm cache entirely. This narrows the pattern the repo already uses
for lint and type tooling, so it is worth knowing beyond mermaid.

### If rendering is wanted anyway

The findings name seven permanent obligations: pin `mermaid` and the CLI by a committed lockfile
with integrity hashes rather than a version range, since an `npx` CLI pin does not reach
transitive `mermaid` and its cache lockfile is never committed, run in a subprocess with a kill
timer, set `suppressErrorRendering`, set `htmlLabels: false`, extend the `secure` array,
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
[What scratchboard promises](./18-what-scratchboard-promises.md), which this
research unblocks. These findings say what mermaid would cost, not what the budget should be.
