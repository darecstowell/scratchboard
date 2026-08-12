import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { createInterface } from "node:readline";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { CONFIG_NAME } from "./root.mjs";
import { configFrom, interactive } from "./detect.mjs";
import { openInBrowser } from "./open.mjs";

const CSS_LINK = '<link rel="stylesheet" href="board.css" />';
const JS_TAG = '<script src="board.js"></script>';
const ICON_LINK = '<link rel="icon" href="../../assets/favicon.svg" type="image/svg+xml" />';
const PAYLOAD_TAG = '<script type="application/json" id="payload">{}</script>';

export const FONT_NOTICE = [
  "Two fonts ship inside this file as base64 woff2, both under the",
  "SIL Open Font License 1.1 (https://openfontlicense.org).",
  "Copyright 2022 The Spline Sans Mono Project Authors (https://github.com/SorkinType/SplineSansMono)",
  "Copyright 2021 The Martian Mono Project Authors (https://github.com/evilmartians/mono)",
];

const LIVE_RELOAD = `<script>
(function () {
  if (typeof EventSource !== "function") return;
  var source = new EventSource("/events");
  source.addEventListener("message", function (event) {
    var data;
    try { data = JSON.parse(event.data); } catch (error) { return; }
    if (window.scratchboard && data && typeof data === "object") window.scratchboard.render(data);
  });
})();
</script>`;

/** No text can leave the comment early, whatever a ticket body holds. */
export function comment(lines) {
  const body = lines
    .map((line) => String(line).replace(/-{2,}/g, (run) => run.split("").join(" ")))
    .map((line) => `  ${line}`)
    .join("\n");
  return `<!--\n${body}\n-->`;
}

/** `<` is the only character that can end raw text or open a comment inside a script. */
export function jsonForScript(payload) {
  return JSON.stringify(payload).replace(/</g, "\\u003c");
}

/** A style element ends only at `</style`. A script also reacts to `<!--`. */
export function codeForElement(code, tag) {
  const closed = code.replace(new RegExp(`</(${tag})`, "gi"), (match, name) => `<\\/${name}`);
  return tag === "script" ? closed.replace(/<!--/g, "<\\!--") : closed;
}

function splice(text, marker, replacement) {
  const at = text.indexOf(marker);
  if (at === -1) throw new Error(`the interface template no longer holds ${marker}`);
  return text.slice(0, at) + replacement + text.slice(at + marker.length);
}

async function dataUrl(url, mime) {
  return `data:${mime};base64,${(await readFile(url)).toString("base64")}`;
}

let assets = null;

async function loadAssets() {
  const here = import.meta.url;
  const template = await readFile(new URL("./ui/index.html", here), "utf8");
  const script = await readFile(new URL("./ui/board.js", here), "utf8");
  const favicon = await dataUrl(new URL("../assets/favicon.svg", here), "image/svg+xml");

  const sheet = await readFile(new URL("./ui/board.css", here), "utf8");
  const fonts = new Map();
  for (const [, name] of sheet.matchAll(/url\("fonts\/([^"]+)"\)/g)) {
    if (fonts.has(name)) continue;
    fonts.set(name, await dataUrl(new URL(`./ui/fonts/${name}`, here), "font/woff2"));
  }
  const style = sheet.replace(
    /url\("fonts\/([^"]+)"\)/g,
    (match, name) => `url("${fonts.get(name)}")`
  );

  return { template, style, script, favicon };
}

export function assetsOnce() {
  if (!assets) assets = loadAssets();
  return assets;
}

export async function bake({ payload, live = false }) {
  const { template, style, script, favicon } = await assetsOnce();

  let html = splice(template, ICON_LINK, `<link rel="icon" href="${favicon}" type="image/svg+xml" />`);
  html = splice(html, CSS_LINK, `<style>\n${codeForElement(style, "style")}\n</style>`);
  html = splice(
    html,
    PAYLOAD_TAG,
    `<script type="application/json" id="payload">${jsonForScript(payload)}</script>`
  );
  html = splice(
    html,
    JS_TAG,
    `<script>\n${codeForElement(script, "script")}\n</script>${live ? `\n${LIVE_RELOAD}` : ""}`
  );

  return `${comment(FONT_NOTICE)}\n${html}`;
}

/** A private directory the caller owns, so no pre-made name in a shared temp can be followed. */
export async function tempTarget() {
  return join(await mkdtemp(join(tmpdir(), "scratchboard-")), "board.html");
}

const plural = (count, word) => `${count} ${word}${count === 1 ? "" : "s"}`;

const LANE_SOURCE = { folders: " from folders", field: " from a field" };

export function summary(payload, report) {
  const source = (report && LANE_SOURCE[report.laneSource]) || "";
  return `✓ ${plural(payload.counts.total, "ticket")} · ${payload.format} · ${plural(
    payload.lanes.length,
    "lane"
  )}${source}\n`;
}

function ask(question) {
  return new Promise((answered) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    rl.question(question, (answer) => {
      rl.close();
      answered(answer.trim());
    });
  });
}

/** The payoff comes first, so this runs after the board is already open. */
async function offerToSave({ root, report, configPath, say }) {
  if (configPath || !report || !report.format || !interactive()) return;
  const answer = await ask("\n? Save this as scratchboard.json so you can tune it? (y/N) ");
  if (!/^y(es)?$/i.test(answer)) return;
  await writeFile(
    join(root, CONFIG_NAME),
    `${JSON.stringify(configFrom(report), null, 2)}\n`,
    "utf8"
  );
  say(`  wrote ${CONFIG_NAME}\n`);
}

export async function bakeToFile({ payload, options, report, root, configPath, print }) {
  const say = print || ((text) => process.stdout.write(text));
  const html = await bake({ payload });
  const target = options.out ? resolve(options.out) : await tempTarget();
  const write = options.out
    ? { encoding: "utf8" }
    : { encoding: "utf8", flag: "wx", mode: 0o600 };
  await writeFile(target, html, write);

  const opened = options.open === false ? false : openInBrowser(target);
  say(`${summary(payload, report)}  ${opened ? "opened" : "wrote"} ${target}\n`);

  await offerToSave({ root, report, configPath, say });
  return target;
}
