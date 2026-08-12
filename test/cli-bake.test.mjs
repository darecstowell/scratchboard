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


test("a board with no tickets says why on stderr", async (t) => {
  const root = await repo(t, {
    config: {
      tickets: "does-not-exist/**/*.md",
      format: "yaml-frontmatter",
      lanes: [{ name: "All", match: { path: "**" } }],
    },
  });
  const run = runIn(root, ["--no-open", "--out", join(root, "board.html")]);

  assert.equal(run.status, 0);
  assert.match(run.stderr, /No tickets on the board/);
  assert.match(run.stderr, /does-not-exist/);
  assert.match(run.stdout, /wrote /, "the summary line is still the run's own report");
});

test("scan notes reach stderr on a board that still renders", async (t) => {
  const root = await repo(t, {
    config: {
      somethingUnknown: true,
      tickets: "tasks/**/*.md",
      format: "yaml-frontmatter",
      lanes: [{ name: "Todo", match: { path: "tasks/todo/**" } }],
    },
  });
  const run = runIn(root, ["--no-open", "--out", join(root, "board.html")]);

  assert.equal(run.status, 0, "a board with notes still renders");
  assert.match(run.stdout, /✓ 3 tickets/);
  assert.match(run.stderr, /2 scan notes/);
  assert.match(run.stderr, /unknown key "somethingUnknown"/);
  assert.match(run.stderr, /1 ticket matches no lane/);
  assert.equal(run.stdout.includes("unknown key"), false, "notes stay off stdout");
});

test("a clean board says nothing on stderr", async (t) => {
  const root = await repo(t, {
    config: {
      tickets: "tasks/**/*.md",
      format: "yaml-frontmatter",
      lanes: [{ name: "All", match: { path: "tasks/**" } }],
    },
  });
  const run = runIn(root, ["--no-open", "--out", join(root, "board.html")]);
  assert.equal(run.stderr, "");
});
