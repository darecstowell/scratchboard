import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile, rm, mkdtemp, writeFile } from "node:fs/promises";
import { existsSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join } from "node:path";
import {
  bake,
  bakeToFile,
  codeForElement,
  comment,
  scriptFromModule,
  jsonForScript,
  summary,
  tempTarget,
  FONT_NOTICE,
  PALETTE_NOTICE,
  once,
  assetsOnce,
} from "../src/bake.mjs";
import { openCommand, openInBrowser } from "../src/open.mjs";

const HOSTILE = [
  "</script><script>window.stolen = 1;</script>",
  "<!-- <script> --> and <!--[if IE]>",
  "replacement traps: $& $' $` $1 $$ $<name>",
  "</SCRIPT foo> </style> </STYLE>",
  "control bytes: \u0000 \u0007, a tab\t, and a \\ backslash",
  "line terminators: \u2028 \u2029, and an emoji \u{1f9ea}",
].join("\n\n");

function payloadWith(body) {
  return {
    version: "0.1.0",
    generated_at: "2026-08-12T00:00:00Z",
    root: "/tmp/board",
    title: "Board",
    format: "yaml-frontmatter",
    counts: { total: 1, byLane: { Todo: 1 } },
    lanes: [{ name: "Todo", collapsed: false, ticketIds: ["1"] }],
    facets: {},
    facetConfig: [],
    tickets: [
      {
        id: "1",
        slug: "hostile",
        title: body,
        path: ".scratch/todo/1-hostile.md",
        lane: "Todo",
        fields: { labels: [body] },
        excerpt: body,
        body,
        refs: [],
        created: "2026-08-12",
        updated: "2026-08-12",
        date_source: "mtime",
      },
    ],
    warnings: [],
  };
}

const OPEN_TAG = '<script type="application/json" id="payload">';

function payloadFrom(html) {
  const at = html.indexOf(OPEN_TAG);
  assert.notEqual(at, -1, "the baked file carries no payload element");
  const from = at + OPEN_TAG.length;
  const to = html.indexOf("</script>", from);
  return JSON.parse(html.slice(from, to));
}

test("the comment cannot be closed early by its own text", () => {
  const out = comment(["safe", "hostile --> break out <!-- again", "a - b"]);
  assert.ok(out.startsWith("<!--\n"));
  assert.ok(out.endsWith("\n-->"));
  assert.equal(out.slice(4, -3).includes("-->"), false);
  assert.ok(out.includes("a - b"));
});

test("json for a script element escapes every angle bracket and still parses", () => {
  const text = jsonForScript({ body: HOSTILE });
  assert.equal(text.includes("<"), false);
  assert.deepEqual(JSON.parse(text), { body: HOSTILE });
});

test("code for a script or style element cannot end its own element", () => {
  const js = codeForElement('var a = "</script>"; // <!-- comment', "script");
  assert.equal(/<\/script/i.test(js), false);
  assert.equal(js.includes("<!--"), false);
  assert.equal(new Function(`${js}\nreturn a;`)(), "</script>");

  const css = codeForElement('a::after { content: "</STYLE>"; }', "style");
  assert.equal(/<\/style/i.test(css), false);
});

test("a hostile ticket body survives the bake byte for byte", async () => {
  const payload = payloadWith(HOSTILE);
  const html = await bake({ payload });

  const at = html.indexOf(OPEN_TAG) + OPEN_TAG.length;
  const region = html.slice(at, html.indexOf("</script>", at));
  assert.equal(region.includes("<"), false, "the payload can end its own element");

  assert.deepEqual(payloadFrom(html), payload);
  assert.equal(payloadFrom(html).tickets[0].body, HOSTILE);
  assert.equal(payloadFrom(html).tickets[0].fields.labels[0], HOSTILE);

  const tags = html.match(/<script\b/gi) || [];
  const plain = await bake({ payload: payloadWith("plain") });
  assert.equal(tags.length, (plain.match(/<script\b/gi) || []).length);
});

test("a body full of replacement patterns is not rewritten by the splice", async () => {
  const body = "$& $' $` $0 $1 $99 $$ $<x> and a literal $&$&";
  const html = await bake({ payload: payloadWith(body) });
  assert.equal(payloadFrom(html).tickets[0].body, body);
});

test("the baked file references nothing outside itself", async () => {
  const html = await bake({ payload: payloadWith("plain") });
  const markup = html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "");

  for (const [, attribute, value] of markup.matchAll(/\s(href|src)="([^"]*)"/g)) {
    assert.ok(value.startsWith("data:"), `${attribute}="${value.slice(0, 40)}" is not inlined`);
  }
  assert.equal(html.includes('url("fonts/'), false, "a font url survived the bake");
  assert.equal(html.includes("@import"), false);
  assert.ok(html.includes('<link rel="icon" href="data:image/svg+xml;base64,'));
});

test("the baked board is one file, and it asks the network for nothing", async () => {
  const html = await bake({ payload: payloadWith("plain") });

  assert.equal(/<script[^>]*\ssrc=/i.test(html), false, "the page loads a second script file");
  assert.equal(/type="module"/.test(html), false, "a module element imports over the network");
  for (const reach of [/\bfetch\s*\(/, /XMLHttpRequest/, /new EventSource/, /\bimport\s*\(/, /importScripts/, /sendBeacon/, /new WebSocket/]) {
    assert.equal(reach.test(html), false, `the page reaches out with ${reach.source}`);
  }

  const markup = html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "");
  for (const [, attribute, value] of markup.matchAll(/\s(href|src)="([^"]*)"/g)) {
    const inside = value.startsWith("data:") || value.startsWith("#");
    assert.ok(inside, `${attribute}="${value.slice(0, 40)}" points outside the file`);
  }
  for (const [, value] of html.matchAll(/url\("([^"]*)"\)/g)) {
    assert.ok(value.startsWith("data:"), `url("${value.slice(0, 40)}") points outside the file`);
  }
});

test("the renderer travels inside the board's one script, with no module keyword left", async () => {
  const html = await bake({ payload: payloadWith("plain") });
  const renderer = await readFile(new URL("../src/ui/markdown.mjs", import.meta.url), "utf8");

  assert.match(renderer, /^export function renderMarkdown\(source, resolveLink\) \{$/m, "the seam is gone");
  assert.equal(html.includes("export function renderMarkdown"), false, "a module keyword reached the page");
  assert.equal(html.split("function renderMarkdown(").length - 1, 1, "the renderer is inlined once");

  const blocks = [...html.matchAll(/<script>([\s\S]*?)<\/script>/gi)].map(([, code]) => code);
  const holding = blocks.filter((code) => code.includes("function renderMarkdown("));
  assert.equal(holding.length, 1, "the renderer sits in more than one element");
  assert.ok(holding[0].includes('"use strict"'), "the renderer and the board are two elements");
});

test("the payload reader travels inside the board's one script, with no module keyword left", async () => {
  const html = await bake({ payload: payloadWith("plain") });
  const reader = await readFile(new URL("../src/ui/payload.mjs", import.meta.url), "utf8");

  assert.match(reader, /^export function normalizePayload\(data\) \{$/m, "the seam is gone");
  assert.equal(html.includes("export function normalizePayload"), false, "a module keyword reached the page");
  assert.equal(html.split("function normalizePayload(").length - 1, 1, "the reader is inlined once");

  const blocks = [...html.matchAll(/<script>([\s\S]*?)<\/script>/gi)].map(([, code]) => code);
  const holding = blocks.filter((code) => code.includes("function normalizePayload("));
  assert.equal(holding.length, 1, "the reader sits in more than one element");
  assert.ok(holding[0].includes("function renderMarkdown("), "the reader and the renderer are two elements");
});

test("the markup helpers travel inside the board's one script, with no module keyword left", async () => {
  const html = await bake({ payload: payloadWith("plain") });
  const helpers = await readFile(new URL("../src/ui/board-render.mjs", import.meta.url), "utf8");

  assert.match(helpers, /^export function headHtml\(group, markdownHtml\) \{$/m, "the seam is gone");
  assert.equal(html.includes("export function headHtml"), false, "a module keyword reached the page");
  assert.equal(html.split("function headHtml(").length - 1, 1, "the helpers are inlined once");

  const blocks = [...html.matchAll(/<script>([\s\S]*?)<\/script>/gi)].map(([, code]) => code);
  const holding = blocks.filter((code) => code.includes("function headHtml("));
  assert.equal(holding.length, 1, "the helpers sit in more than one element");
  assert.ok(holding[0].includes("function normalizePayload("), "the helpers and the reader are two elements");
});

test("the concatenated modules share one scope, so no two of them declare one name", async () => {
  const html = await bake({ payload: payloadWith("plain") });
  const blocks = [...html.matchAll(/<script>([\s\S]*?)<\/script>/gi)].map(([, code]) => code);

  assert.ok(blocks.length, "the page carries no script at all");
  /* A name two modules both declare is a SyntaxError the browser reports and no test sees. */
  for (const code of blocks) new Function(code);
});

test("a module becomes script text and keeps every declaration it exported", () => {
  const out = scriptFromModule('export const A = 1;\nexport function f() { return A; }\nexport class C {}\n');
  assert.equal(out.includes("export"), false);
  assert.equal(new Function(`${out}\nreturn f() + (new C() instanceof C ? 1 : 0);`)(), 2);
});

test("every woff2 lands as a base64 data url inside its font-face", async () => {
  const html = await bake({ payload: payloadWith("plain") });
  const inlined = [...html.matchAll(/url\("data:font\/woff2;base64,([A-Za-z0-9+/=]+)"\)/g)];
  assert.equal(inlined.length, 10, "every @font-face src should be inlined");

  const distinct = new Set(inlined.map(([, base64]) => base64));
  assert.equal(distinct.size, 4, "four woff2 subsets ship with the board");
  for (const base64 of distinct) {
    assert.equal(Buffer.from(base64, "base64").subarray(0, 4).toString("latin1"), "wOF2");
  }
});

test("each template marker appears once, so a splice cannot land in the contract", async () => {
  const template = await readFile(new URL("../src/ui/index.html", import.meta.url), "utf8");
  for (const marker of [
    '<link rel="stylesheet" href="board.css" />',
    '<script src="board.js"></script>',
    '<link rel="icon" href="../../assets/favicon.svg" type="image/svg+xml" />',
    '<script type="application/json" id="payload">{}</script>',
  ]) {
    assert.equal(template.split(marker).length - 1, 1, `${marker} is not unique`);
  }
});

test("the file opens with both font copyright lines", async () => {
  const html = await bake({ payload: payloadWith("plain") });
  assert.ok(html.startsWith("<!--"));
  const head = html.slice(0, html.indexOf("-->"));
  for (const line of FONT_NOTICE) assert.ok(head.includes(line), `missing: ${line}`);
  assert.ok(
    head.includes(
      "Copyright 2022 The Spline Sans Mono Project Authors (https://github.com/SorkinType/SplineSansMono)"
    )
  );
  assert.ok(
    head.includes(
      "Copyright 2021 The Martian Mono Project Authors (https://github.com/evilmartians/mono)"
    )
  );
  assert.ok(html.indexOf("<!doctype html>") > html.indexOf("-->"));
});

test("the standalone file carries the palette copyright its licence asks for", async () => {
  const html = await bake({ payload: payloadWith("plain") });
  const head = html.slice(0, html.indexOf("<!doctype html>"));
  for (const line of PALETTE_NOTICE) assert.ok(head.includes(line), `missing: ${line}`);
  assert.ok(
    head.includes("Copyright (c) 2021 Catppuccin (https://github.com/catppuccin/catppuccin)"),
    "the MIT copyright line does not travel with the copy"
  );
  assert.ok(head.includes("MIT License"), "the notice never names the licence");

  const text = await readFile(new URL("../licenses/Catppuccin-MIT.txt", import.meta.url), "utf8");
  assert.ok(text.includes("Copyright (c) 2021 Catppuccin"), "the full text and the notice disagree");
});

test("a failed asset read is not cached, so the next request can succeed", async () => {
  let calls = 0;
  const cached = once(async () => {
    calls += 1;
    if (calls === 1) throw new Error("EIO");
    return "loaded";
  });

  await assert.rejects(cached(), /EIO/);
  assert.equal(await cached(), "loaded", "a transient failure poisons every later request");
  assert.equal(calls, 2);
});

test("a successful asset read is cached, and the loader runs once", async () => {
  let calls = 0;
  const cached = once(async () => {
    calls += 1;
    return { template: "t" };
  });

  const [first, second] = [await cached(), await cached()];
  assert.equal(first, second, "each bake re-read the assets from disk");
  assert.equal(calls, 1);
  assert.equal(await assetsOnce(), await assetsOnce(), "the real assets are cached too");
});

test("the inlined script carries no raw control character", async () => {
  const html = await bake({ payload: payloadWith("plain") });
  const control = html.match(/[ --]/);
  assert.equal(control, null, `a control character would be replaced by the html parser`);
  assert.equal(html.includes("�"), false);
});

test("live reload is added only when asked for", async () => {
  const off = await bake({ payload: payloadWith("plain") });
  const on = await bake({ payload: payloadWith("plain"), live: true });
  assert.equal(off.includes("EventSource"), false);
  assert.ok(on.includes('new EventSource("/events")'));
  assert.ok(on.includes("window.scratchboard.render"));
});

test("summary names the ticket count, the format, and the lane source", () => {
  const payload = payloadWith("plain");
  assert.equal(summary(payload, null), "✓ 1 ticket · yaml-frontmatter · 1 lane\n");
  assert.equal(
    summary(payload, { laneSource: "folders" }),
    "✓ 1 ticket · yaml-frontmatter · 1 lane from folders\n"
  );
  payload.counts.total = 177;
  payload.lanes = [1, 2, 3];
  assert.equal(
    summary(payload, { laneSource: "field" }),
    "✓ 177 tickets · yaml-frontmatter · 3 lanes from a field\n"
  );
});

test("the default target is a private directory in the os temp, never the repo", async (t) => {
  const target = await tempTarget();
  const other = await tempTarget();
  t.after(() => rm(dirname(target), { recursive: true, force: true }));
  t.after(() => rm(dirname(other), { recursive: true, force: true }));

  assert.ok(target.startsWith(tmpdir()));
  assert.equal(basename(target), "board.html");
  assert.notEqual(dirname(target), dirname(other), "no two runs share a directory");
  assert.equal(statSync(dirname(target)).mode & 0o777, 0o700, "the directory is the caller's alone");
  assert.equal(existsSync(target), false, "the name is claimed by the write, not before it");
});

test("the temp board is written for the owner alone and never over a planted name", async (t) => {
  let target = null;
  t.after(() => (target ? rm(dirname(target), { recursive: true, force: true }) : null));

  target = await bakeToFile({
    payload: payloadWith("plain"),
    options: { open: false },
    report: null,
    root: tmpdir(),
    configPath: "scratchboard.json",
    print: () => {},
  });

  assert.equal(statSync(target).mode & 0o777, 0o600);
  await assert.rejects(
    writeFile(target, "second", { encoding: "utf8", flag: "wx" }),
    /EEXIST/,
    "the same name is never written twice"
  );
});

test("bakeToFile writes where --out names and never opens with --no-open", async (t) => {
  const dir = await mkdtemp(join(tmpdir(), "sb-bake-"));
  t.after(() => rm(dir, { recursive: true, force: true }));

  const out = join(dir, "board.html");
  const printed = [];
  const target = await bakeToFile({
    payload: payloadWith("plain"),
    options: { out, open: false },
    report: null,
    root: dir,
    configPath: join(dir, "scratchboard.json"),
    print: (text) => printed.push(text),
  });
  assert.equal(target, out);

  const html = await readFile(out, "utf8");
  assert.ok(html.startsWith("<!--"));
  assert.equal(printed.join(""), `✓ 1 ticket · yaml-frontmatter · 1 lane\n  wrote ${out}\n`);
});

test("bakeToFile falls back to temp and reports the path it opened", async (t) => {
  let target = null;
  t.after(() => (target ? rm(target, { force: true }) : null));

  const printed = [];
  target = await bakeToFile({
    payload: payloadWith("plain"),
    options: { open: false },
    report: { laneSource: "folders", format: "yaml-frontmatter" },
    root: tmpdir(),
    configPath: "scratchboard.json",
    print: (text) => printed.push(text),
  });

  assert.ok(target.startsWith(tmpdir()));
  assert.equal(
    printed.join(""),
    `✓ 1 ticket · yaml-frontmatter · 1 lane from folders\n  wrote ${target}\n`
  );
});

test("a run that is not a tty is never offered the config prompt", async (t) => {
  const dir = await mkdtemp(join(tmpdir(), "sb-bake-"));
  t.after(() => rm(dir, { recursive: true, force: true }));

  assert.equal(process.stdin.isTTY && process.stdout.isTTY ? true : false, false);

  const printed = [];
  await bakeToFile({
    payload: payloadWith("plain"),
    options: { out: join(dir, "board.html"), open: false },
    report: { laneSource: "folders", format: "yaml-frontmatter", tickets: "**/*.md" },
    root: dir,
    configPath: null,
    print: (text) => printed.push(text),
  });

  assert.equal(printed.join("").includes("?"), false, "an agent run must never be asked");
  assert.equal(printed.join("").includes("scratchboard.json"), false);
  await assert.rejects(readFile(join(dir, "scratchboard.json"), "utf8"));
});

test("the browser opener is zero dependency and platform specific", () => {
  assert.deepEqual(openCommand("/tmp/a.html", "darwin"), { file: "open", args: ["/tmp/a.html"] });
  assert.deepEqual(openCommand("/tmp/a.html", "linux"), {
    file: "xdg-open",
    args: ["/tmp/a.html"],
  });
  assert.deepEqual(openCommand("/tmp/a.html", "win32"), {
    file: "explorer.exe",
    args: ["/tmp/a.html"],
  });
  assert.deepEqual(openCommand("/tmp/a.html", "sunos"), {
    file: "xdg-open",
    args: ["/tmp/a.html"],
  });
});

test("a hostile path reaches the opener as one argument, on every platform", () => {
  const hostile = "C:\\tmp\\a&calc.exe ^| %USERPROFILE% \"q\".html";
  for (const platform of ["win32", "darwin", "linux", "sunos"]) {
    const command = openCommand(hostile, platform);
    assert.notEqual(command.file, "cmd", "cmd.exe re-reads its own command line");
    assert.deepEqual(command.args, [hostile], "the path is data, never command text");
  }
});

test("a launcher that is not there does not crash the run", () => {
  assert.equal(typeof openInBrowser("/tmp/nothing.html", "sunos"), "boolean");
});

test("the stylesheet points at the licence texts above the font declarations", async () => {
  const css = await readFile(new URL("../src/ui/board.css", import.meta.url), "utf8");
  const first = css.indexOf("@font-face");
  const pointer = css.indexOf("licenses/");

  assert.ok(pointer !== -1, "board.css names the licence directory");
  assert.ok(pointer < first, "the pointer sits above the first @font-face block");
  assert.match(css.slice(0, first), /OFL/);

  const html = await bake({ payload: payloadWith("plain") });
  assert.ok(html.includes("licenses/"), "the pointer travels with the inlined fonts");
});

test("the interface template lets a search engine index the public demo", async () => {
  const template = await readFile(new URL("../src/ui/index.html", import.meta.url), "utf8");
  assert.equal(/noindex/.test(template), false);
});

/** A map body, a decision record and a declared template all reach the browser now, so all
 *  three are untrusted the way a ticket body already was. */
function payloadWithGroups(body) {
  const payload = payloadWith("plain");
  payload.groups = [
    {
      kind: "effort",
      path: ".scratch/an-effort",
      title: body,
      sections: { destination: body, notes: body, fog: body, outOfScope: body },
      files: [
        { role: "lead", path: ".scratch/an-effort/map.md", title: body, id: null, body },
        {
          role: "issue",
          path: ".scratch/an-effort/issues/01-one.md",
          title: body,
          id: "01",
          body,
          type: body,
          state: "takeable-now",
          claimed: false,
          blockedBy: [body],
        },
      ],
    },
    {
      kind: "context",
      path: ".",
      title: body,
      sections: {},
      files: [
        { role: "lead", path: "CONTEXT.md", title: body, id: null, body },
        { role: "other", path: "docs/adr/0001-one.md", title: body, id: "0001", body, status: body },
      ],
    },
  ];
  payload.invocations = [
    { name: body, template: `/grilling {path} ${body}` },
    { name: "opted out", template: null },
  ];
  return payload;
}

test("a hostile map body, decision record and template survive the bake byte for byte", async () => {
  const payload = payloadWithGroups(HOSTILE);
  const html = await bake({ payload });

  const at = html.indexOf(OPEN_TAG) + OPEN_TAG.length;
  const region = html.slice(at, html.indexOf("</script>", at));
  assert.equal(region.includes("<"), false, "the payload can end its own element");

  const back = payloadFrom(html);
  assert.deepEqual(back, payload);
  assert.equal(back.groups[0].sections.destination, HOSTILE, "a map section was rewritten");
  assert.equal(back.groups[0].files[1].body, HOSTILE, "an effort ticket body was rewritten");
  assert.equal(back.groups[1].files[1].status, HOSTILE, "a decision record status was rewritten");
  assert.equal(back.invocations[0].template, `/grilling {path} ${HOSTILE}`, "a template was rewritten");
  assert.equal(back.invocations[1].template, null, "an opt-out must reach the browser as it was written");

  const plain = await bake({ payload: payloadWithGroups("plain") });
  assert.equal((html.match(/<script\b/gi) || []).length, (plain.match(/<script\b/gi) || []).length);
});

test("a template that tries to close the payload element cannot", async () => {
  const attack = '</script><script>window.stolen = 1;</script><!--';
  const payload = payloadWith("plain");
  payload.invocations = [{ name: attack, template: `${attack} {path}` }];
  const html = await bake({ payload });

  const at = html.indexOf(OPEN_TAG) + OPEN_TAG.length;
  const region = html.slice(at, html.indexOf("</script>", at));
  assert.equal(region.includes("<"), false, "the template can end its own element");
  assert.equal(payloadFrom(html).invocations[0].template, `${attack} {path}`);
  const plain = await bake({ payload: payloadWith("plain") });
  assert.equal(
    (html.match(/<script\b/gi) || []).length,
    (plain.match(/<script\b/gi) || []).length,
    "the file grew a script element"
  );
});

test("a group path that tries to break out of an attribute is only ever data", async () => {
  const attack = '" onload="window.stolen = 1';
  const payload = payloadWith("plain");
  payload.groups = [
    { kind: "effort", path: attack, title: attack, sections: {}, files: [] },
  ];
  const html = await bake({ payload });

  const markup = html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "");
  assert.equal(markup.includes("onload"), false, "the attack reached the markup");
  assert.equal(markup.includes("window.stolen"), false);
  assert.equal(payloadFrom(html).groups[0].path, attack);
});

test("a hostile repair sentence in a warning survives the bake byte for byte", async () => {
  const payload = payloadWith("plain");
  payload.warnings = [
    { path: HOSTILE, reason: HOSTILE, fix: `Add a map.md. ${HOSTILE}` },
    { path: ".scratch/half-read", reason: "read as an effort and found no map.md" },
  ];
  const html = await bake({ payload });

  const at = html.indexOf(OPEN_TAG) + OPEN_TAG.length;
  const region = html.slice(at, html.indexOf("</script>", at));
  assert.equal(region.includes("<"), false, "a repair sentence can end the payload element");

  const back = payloadFrom(html);
  assert.equal(back.warnings[0].fix, `Add a map.md. ${HOSTILE}`);
  assert.equal(back.warnings[0].reason, HOSTILE);
  assert.equal("fix" in back.warnings[1], false, "an ordinary warning grew a third key");

  const markup = html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "");
  assert.equal(markup.includes("window.stolen"), false, "the attack reached the markup");
});

test("a payload with no group and no invocation bakes the file it baked before", async () => {
  const plain = await bake({ payload: payloadWith("plain") });
  const withKeys = await bake({ payload: payloadWithGroups("plain") });

  assert.equal(plain.includes('"groups"'), false, "an absent key must not be invented");
  assert.equal(plain.includes('"invocations"'), false);
  assert.ok(withKeys.includes('"groups"'));
  const empty = await bake({ payload: { ...payloadWith("plain"), groups: [], invocations: [] } });
  assert.ok(empty.includes('"groups":[]'), "an empty array is the scan's own answer and travels as one");
  assert.equal(
    plain.replace(/<script type="application\/json"[\s\S]*?<\/script>/, ""),
    withKeys.replace(/<script type="application\/json"[\s\S]*?<\/script>/, ""),
    "the payload is the only thing a group changes in the file"
  );
});
