import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const CLI = fileURLToPath(new URL("../bin/cli.mjs", import.meta.url));

const ticket = (title, status) =>
  `---\ntitle: ${title}\nstatus: ${status}\nlabels: [alpha, beta]\n---\n\nBody.\n`;

async function repo(t, { tickets = true, config = null } = {}) {
  const root = await mkdtemp(join(tmpdir(), "sb-cli-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  if (tickets) {
    await mkdir(join(root, "tasks", "todo"), { recursive: true });
    await mkdir(join(root, "tasks", "done"), { recursive: true });
    await writeFile(join(root, "tasks", "todo", "1-a.md"), ticket("A", "todo"));
    await writeFile(join(root, "tasks", "todo", "2-b.md"), ticket("B", "todo"));
    await writeFile(join(root, "tasks", "done", "3-c.md"), ticket("C", "done"));
  }
  if (config) await writeFile(join(root, "scratchboard.json"), JSON.stringify(config, null, 2));
  return root;
}

const runIn = (root, args) =>
  spawnSync(process.execPath, [CLI, ...args], { cwd: root, encoding: "utf8" });

test("--scan puts the payload on stdout and nothing else", async (t) => {
  const root = await repo(t);
  const run = runIn(root, ["--scan"]);

  assert.equal(run.status, 0);
  assert.equal(run.stderr, "", "no human line shares the machine channel");
  const payload = JSON.parse(run.stdout);
  assert.equal(payload.counts.total, 3);
});

test("--scan in a repo with no tickets leaves stdout empty and exits non-zero", async (t) => {
  const root = await repo(t, { tickets: false });
  const run = runIn(root, ["--scan"]);

  assert.equal(run.status, 1);
  assert.equal(run.stdout, "", "a machine caller reads JSON or nothing");
  assert.match(run.stderr, /No markdown tickets found/);
});

test("--scan still emits JSON when the configured glob matches nothing", async (t) => {
  const root = await repo(t, {
    config: {
      tickets: "does-not-exist/**/*.md",
      format: "yaml-frontmatter",
      lanes: [{ name: "All", match: { path: "**" } }],
    },
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
