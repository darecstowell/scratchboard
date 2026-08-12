import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, realpathSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { resolveRoot } from "../src/root.mjs";

function tree() {
  const base = realpathSync(mkdtempSync(join(tmpdir(), "scratchboard-root-")));
  mkdirSync(join(base, "repo", "deep", "deeper"), { recursive: true });
  mkdirSync(join(base, "repo", ".git"), { recursive: true });
  return base;
}

test("the nearest ancestor holding a config wins", () => {
  const base = tree();
  writeFileSync(join(base, "repo", "scratchboard.json"), "{}");
  const found = resolveRoot({}, join(base, "repo", "deep", "deeper"));
  assert.equal(found.root, join(base, "repo"));
  assert.equal(found.configPath, join(base, "repo", "scratchboard.json"));
  assert.equal(found.source, "config");
});

test("a config beats a .git higher up and a .git beside it", () => {
  const base = tree();
  writeFileSync(join(base, "repo", "deep", "scratchboard.json"), "{}");
  const found = resolveRoot({}, join(base, "repo", "deep", "deeper"));
  assert.equal(found.root, join(base, "repo", "deep"));
  assert.equal(found.source, "config");
});

test("with no config the repo root wins", () => {
  const base = tree();
  const found = resolveRoot({}, join(base, "repo", "deep", "deeper"));
  assert.equal(found.root, join(base, "repo"));
  assert.equal(found.configPath, null);
  assert.equal(found.source, "git");
});

test("with no config and no git the current directory wins", () => {
  const base = tree();
  mkdirSync(join(base, "loose"), { recursive: true });
  const found = resolveRoot({}, join(base, "loose"));
  assert.equal(found.root, join(base, "loose"));
  assert.equal(found.source, "cwd");
});

test("--config overrides the search and sets the root to its directory", () => {
  const base = tree();
  writeFileSync(join(base, "repo", "scratchboard.json"), "{}");
  mkdirSync(join(base, "repo", "other"), { recursive: true });
  writeFileSync(join(base, "repo", "other", "scratchboard.json"), "{}");
  const found = resolveRoot(
    { config: "other/scratchboard.json" },
    join(base, "repo")
  );
  assert.equal(found.root, join(base, "repo", "other"));
  assert.equal(found.source, "flag");
});

test("--config names a missing file by the path the user typed", () => {
  const base = tree();
  assert.throws(
    () => resolveRoot({ config: "nope/scratchboard.json" }, join(base, "repo")),
    /no config at nope\/scratchboard\.json/
  );
});
