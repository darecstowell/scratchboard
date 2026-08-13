import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, symlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { globToRegExp, matchGlob, globRoot, walk } from "../src/walk.mjs";

test("* matches within one segment only", () => {
  assert.ok(matchGlob("a/b.md", "a/*.md"));
  assert.ok(matchGlob("a/.md", "a/*.md"));
  assert.ok(!matchGlob("a/b/c.md", "a/*.md"));
});

test("** matches zero or more whole segments", () => {
  assert.ok(matchGlob(".scratch/issue.md", ".scratch/**/issue.md"));
  assert.ok(matchGlob(".scratch/todo/issue.md", ".scratch/**/issue.md"));
  assert.ok(matchGlob(".scratch/todo/199-x/issue.md", ".scratch/**/issue.md"));
  assert.ok(!matchGlob(".scratch/todo/other.md", ".scratch/**/issue.md"));
});

test("a trailing ** matches the directory and everything under it", () => {
  assert.ok(matchGlob(".scratch/todo", ".scratch/todo/**"));
  assert.ok(matchGlob(".scratch/todo/a/issue.md", ".scratch/todo/**"));
  assert.ok(!matchGlob(".scratch/done/a/issue.md", ".scratch/todo/**"));
  assert.ok(!matchGlob(".scratch/todone/a.md", ".scratch/todo/**"));
});

test("a leading ** matches from the root down", () => {
  assert.ok(matchGlob("a.md", "**/*.md"));
  assert.ok(matchGlob("x/y/a.md", "**/*.md"));
});

test("? matches exactly one character", () => {
  assert.ok(matchGlob("a1.md", "a?.md"));
  assert.ok(!matchGlob("a.md", "a?.md"));
  assert.ok(!matchGlob("a12.md", "a?.md"));
  assert.ok(!matchGlob("a/.md", "a?.md"));
});

test("matching is case-sensitive", () => {
  assert.ok(matchGlob("Notes.md", "Notes.md"));
  assert.ok(!matchGlob("notes.md", "Notes.md"));
});

test("regex and brace metacharacters are literal", () => {
  assert.ok(matchGlob("a+b.md", "a+b.md"));
  assert.ok(matchGlob("a.b.md", "a.b.md"));
  assert.ok(!matchGlob("axb.md", "a.b.md"));
  assert.ok(matchGlob("{a}.md", "{a}.md"));
  assert.ok(!matchGlob("a.md", "{a,b}.md"));
});

test("globToRegExp is anchored at both ends", () => {
  const re = globToRegExp("a/*.md");
  assert.ok(re.source.startsWith("^"));
  assert.ok(re.source.endsWith("$"));
  assert.ok(!re.test("z/a/b.md"));
  assert.ok(!re.test("a/b.md.bak"));
});

test("globRoot returns the deepest fixed directory prefix", () => {
  assert.equal(globRoot(".scratch/**/issue.md"), ".scratch");
  assert.equal(globRoot(".scratch/todo/*.md"), ".scratch/todo");
  assert.equal(globRoot("docs/issues/a.md"), "docs/issues");
  assert.equal(globRoot("**/*.md"), "");
  assert.equal(globRoot("*.md"), "");
});

function fixture() {
  const root = mkdtempSync(join(tmpdir(), "scratchboard-walk-"));
  mkdirSync(join(root, ".git"), { recursive: true });
  mkdirSync(join(root, "node_modules", "pkg"), { recursive: true });
  mkdirSync(join(root, ".scratch", "todo", "1-a"), { recursive: true });
  mkdirSync(join(root, ".scratch", "done"), { recursive: true });
  writeFileSync(join(root, ".git", "config.md"), "x");
  writeFileSync(join(root, "node_modules", "pkg", "readme.md"), "x");
  writeFileSync(join(root, ".scratch", "todo", "1-a", "issue.md"), "x");
  writeFileSync(join(root, ".scratch", "done", "issue.md"), "x");
  writeFileSync(join(root, "README.md"), "x");
  return root;
}

test("walk returns root-relative POSIX paths", async () => {
  const root = fixture();
  const found = await walk(root);
  assert.ok(found.includes(".scratch/todo/1-a/issue.md"));
  assert.ok(found.includes("README.md"));
  for (const path of found) assert.ok(!path.includes("\\"), path);
});

test("walk skips .git and node_modules", async () => {
  const root = fixture();
  const found = await walk(root);
  assert.ok(!found.some((p) => p.startsWith(".git/")));
  assert.ok(!found.some((p) => p.startsWith("node_modules/")));
});

test("walk returns a stable sorted order", async () => {
  const root = fixture();
  const a = await walk(root);
  const b = await walk(root);
  assert.deepEqual(a, b);
  assert.deepEqual(a, [...a].sort());
});

test("walk does not follow directory symlinks", async () => {
  const root = fixture();
  symlinkSync(join(root, ".scratch"), join(root, "loop"), "dir");
  const found = await walk(root);
  assert.ok(!found.some((p) => p.startsWith("loop/")));
});
