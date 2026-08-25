import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { join } from "node:path";
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

test("a board with no tickets says why on stderr", async (t) => {
  const root = await writeRepo(t, {
    ...TICKETS,
    ...config({
      tickets: "does-not-exist/**/*.md",
      format: "yaml-frontmatter",
      lanes: [{ name: "All", match: { path: "**" } }],
    }),
  });
  const run = runIn(root, ["--no-open", "--out", join(root, "board.html")]);

  assert.equal(run.status, 0);
  assert.match(run.stderr, /No tickets on the board/);
  assert.match(run.stderr, /does-not-exist/);
  assert.match(run.stdout, /wrote /, "the summary line is still the run's own report");
});

test("scan notes reach stderr on a board that still renders", async (t) => {
  const root = await writeRepo(t, {
    ...TICKETS,
    ...config({
      somethingUnknown: true,
      tickets: "tasks/**/*.md",
      format: "yaml-frontmatter",
      lanes: [{ name: "Todo", match: { path: "tasks/todo/**" } }],
    }),
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
  const root = await writeRepo(t, {
    ...TICKETS,
    ...config({
      tickets: "tasks/**/*.md",
      format: "yaml-frontmatter",
      lanes: [{ name: "All", match: { path: "tasks/**" } }],
    }),
  });
  const run = runIn(root, ["--no-open", "--out", join(root, "board.html")]);
  assert.equal(run.stderr, "");
});
