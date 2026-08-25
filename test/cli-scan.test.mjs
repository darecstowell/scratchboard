import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { test, ticket, writeRepo } from "./context.mjs";

const CLI = fileURLToPath(new URL("../bin/cli.mjs", import.meta.url));

const card = (title, status) => ticket(title, { status, labels: ["alpha", "beta"] });

const TICKETS = {
  "tasks/todo/1-a.md": card("A", "todo"),
  "tasks/todo/2-b.md": card("B", "todo"),
  "tasks/done/3-c.md": card("C", "done"),
};

const config = (settings) => ({ "scratchboard.json": JSON.stringify(settings, null, 2) });

const runIn = (root, args) =>
  spawnSync(process.execPath, [CLI, ...args], { cwd: root, encoding: "utf8" });

test("--scan puts the payload on stdout and nothing else", async (t) => {
  const root = await writeRepo(t, TICKETS);
  const run = runIn(root, ["--scan"]);

  assert.equal(run.status, 0);
  assert.equal(run.stderr, "", "no human line shares the machine channel");
  const payload = JSON.parse(run.stdout);
  assert.equal(payload.counts.total, 3);
});

test("--scan in a repo with no tickets leaves stdout empty and exits non-zero", async (t) => {
  const root = await writeRepo(t);
  const run = runIn(root, ["--scan"]);

  assert.equal(run.status, 1);
  assert.equal(run.stdout, "", "a machine caller reads JSON or nothing");
  assert.match(run.stderr, /No markdown tickets found/);
});

test("--scan still emits JSON when the configured glob matches nothing", async (t) => {
  const root = await writeRepo(t, {
    ...TICKETS,
    ...config({
      tickets: "does-not-exist/**/*.md",
      format: "yaml-frontmatter",
      lanes: [{ name: "All", match: { path: "**" } }],
    }),
  });
  const run = runIn(root, ["--scan"]);

  assert.equal(run.status, 0);
  const payload = JSON.parse(run.stdout);
  assert.equal(payload.counts.total, 0);
  assert.ok(
    payload.warnings.some((one) => one.path === "does-not-exist/**/*.md"),
    "the empty board carries its reason in the payload"
  );
});
