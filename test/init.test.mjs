import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "./context.mjs";
import { init } from "../src/detect.mjs";

const ticket = (title, status) =>
  `---\ntitle: ${title}\nstatus: ${status}\nlabels: [alpha, beta]\n---\n\nBody.\n`;

async function repo(t, config) {
  const root = await mkdtemp(join(tmpdir(), "sb-init-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(join(root, "tasks", "todo"), { recursive: true });
  await mkdir(join(root, "tasks", "done"), { recursive: true });
  await writeFile(join(root, "tasks", "todo", "1-a.md"), ticket("A", "todo"));
  await writeFile(join(root, "tasks", "todo", "2-b.md"), ticket("B", "todo"));
  await writeFile(join(root, "tasks", "done", "3-c.md"), ticket("C", "done"));
  if (config !== undefined) await writeFile(join(root, "scratchboard.json"), config);
  return root;
}

/** init prints and can set an exit code, neither of which belongs in the runner's own output. */
function capture(t) {
  const out = [];
  const err = [];
  const stdout = process.stdout.write.bind(process.stdout);
  const stderr = process.stderr.write.bind(process.stderr);
  const code = process.exitCode;
  process.stdout.write = (text) => out.push(text) && true;
  process.stderr.write = (text) => err.push(text) && true;
  t.after(() => {
    process.stdout.write = stdout;
    process.stderr.write = stderr;
    process.exitCode = code;
  });
  return { out, err };
}

const written = {
  title: "Kept",
  theme: "phosphor",
  futureKey: { mode: "later" },
  tickets: "tasks/**/*.md",
  format: "yaml-frontmatter",
  lanes: [
    { name: "Todo", match: { path: "tasks/todo/**" } },
    { name: "Done", match: { path: "tasks/done/**" }, collapsed: true, color: "green" },
  ],
};

test("init writes back every key it did not understand, top level and inside a lane", async (t) => {
  const root = await repo(t, `${JSON.stringify(written, null, 2)}\n`);
  capture(t);

  await init({ config: join(root, "scratchboard.json"), yes: true });

  const after = JSON.parse(await readFile(join(root, "scratchboard.json"), "utf8"));
  assert.deepEqual(after.futureKey, { mode: "later" }, "an unknown top-level key survives");
  assert.equal(after.theme, "phosphor", "so does an unknown scalar");
  assert.equal(after.lanes[1].color, "green", "and an unknown key inside a lane");

  assert.equal(after.title, "Kept");
  assert.equal(after.tickets, "tasks/**/*.md");
  assert.deepEqual(after.lanes.map((lane) => lane.name), ["Todo", "Done"]);
  assert.deepEqual(after.lanes[1].match, { path: "tasks/done/**" });
  assert.equal(after.lanes[1].collapsed, true);
});

test("a second init leaves the file it just wrote unchanged", async (t) => {
  const root = await repo(t, `${JSON.stringify(written, null, 2)}\n`);
  capture(t);

  const target = join(root, "scratchboard.json");
  await init({ config: target, yes: true });
  const once = await readFile(target, "utf8");
  await init({ config: target, yes: true });
  assert.equal(await readFile(target, "utf8"), once);
});

test("init refuses to overwrite a config it could not parse", async (t) => {
  const broken = '{ "tickets": "tasks/**/*.md",\n';
  const root = await repo(t, broken);
  const io = capture(t);

  await init({ config: join(root, "scratchboard.json"), yes: true });

  assert.equal(process.exitCode, 1);
  assert.equal(await readFile(join(root, "scratchboard.json"), "utf8"), broken);
  assert.match(io.err.join(""), /is not valid JSON/);
  assert.equal(io.out.join(""), "", "nothing human reaches stdout");
});

test("init fills an empty config with what it detected", async (t) => {
  const root = await repo(t);
  const target = join(root, "scratchboard.json");
  await writeFile(target, "{}\n");
  capture(t);

  await init({ config: target, yes: true });

  const after = JSON.parse(await readFile(target, "utf8"));
  assert.equal(after.tickets, "tasks/**/*.md");
  assert.equal(after.format, "yaml-frontmatter");
  assert.deepEqual(after.lanes.map((lane) => lane.name), ["Todo", "Done"]);
});

test("init creates the config beside the tickets when the repo holds none", async (t) => {
  const root = await repo(t);
  const here = process.cwd();
  t.after(() => process.chdir(here));
  process.chdir(root);
  capture(t);

  await init({ yes: true });

  const after = JSON.parse(await readFile(join(root, "scratchboard.json"), "utf8"));
  assert.equal(after.tickets, "tasks/**/*.md");
  assert.equal(after.format, "yaml-frontmatter");
  assert.deepEqual(after.lanes.map((lane) => lane.name), ["Todo", "Done"]);
});
