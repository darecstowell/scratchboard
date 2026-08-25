import assert from "node:assert/strict";
import { join } from "node:path";
import { test, writeRepo } from "./context.mjs";
import { resolveRoot } from "../src/root.mjs";

const DIRS = ["repo/deep/deeper", "repo/.git"];

const tree = (t, files = {}, extra = []) => writeRepo(t, files, { dirs: [...DIRS, ...extra] });

test("the nearest ancestor holding a config wins", async (t) => {
  const base = await tree(t, { "repo/scratchboard.json": "{}" });
  const found = resolveRoot({}, join(base, "repo", "deep", "deeper"));
  assert.equal(found.root, join(base, "repo"));
  assert.equal(found.configPath, join(base, "repo", "scratchboard.json"));
  assert.equal(found.source, "config");
});

test("a config beats a .git higher up and a .git beside it", async (t) => {
  const base = await tree(t, { "repo/deep/scratchboard.json": "{}" });
  const found = resolveRoot({}, join(base, "repo", "deep", "deeper"));
  assert.equal(found.root, join(base, "repo", "deep"));
  assert.equal(found.source, "config");
});

test("with no config the repo root wins", async (t) => {
  const base = await tree(t);
  const found = resolveRoot({}, join(base, "repo", "deep", "deeper"));
  assert.equal(found.root, join(base, "repo"));
  assert.equal(found.configPath, null);
  assert.equal(found.source, "git");
});

test("with no config and no git the current directory wins", async (t) => {
  const base = await tree(t, {}, ["loose"]);
  const found = resolveRoot({}, join(base, "loose"));
  assert.equal(found.root, join(base, "loose"));
  assert.equal(found.source, "cwd");
});

test("--config overrides the search and sets the root to its directory", async (t) => {
  const base = await tree(t, {
    "repo/scratchboard.json": "{}",
    "repo/other/scratchboard.json": "{}",
  });
  const found = resolveRoot(
    { config: "other/scratchboard.json" },
    join(base, "repo")
  );
  assert.equal(found.root, join(base, "repo", "other"));
  assert.equal(found.source, "flag");
});

test("--config names a missing file by the path the user typed", async (t) => {
  const base = await tree(t);
  assert.throws(
    () => resolveRoot({ config: "nope/scratchboard.json" }, join(base, "repo")),
    /no config at nope\/scratchboard\.json/
  );
});

test("--config on a directory is refused, not read as an empty config", async (t) => {
  const base = await tree(t, {}, ["repo/held"]);
  assert.throws(() => resolveRoot({ config: "held" }, join(base, "repo")), /no config at held/);
  assert.throws(() => resolveRoot({ config: "." }, join(base, "repo")), /no config at \./);
});
