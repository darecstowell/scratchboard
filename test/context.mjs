import { mkdir, mkdtemp, realpath, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { test as runnerTest } from "node:test";

const NOTHING = Symbol("nothing");

/**
 * Every cleanup runs in reverse order once the body settles, pass or throw.
 * A body failure outranks a cleanup failure, so the real fault reaches the runner.
 */
export async function withCleanups(body) {
  const cleanups = [];
  let result;
  let failure = NOTHING;

  try {
    result = await body({ after: (fn) => cleanups.unshift(fn) });
  } catch (error) {
    failure = error;
  }
  for (const fn of cleanups) {
    try {
      await fn();
    } catch (error) {
      if (failure === NOTHING) failure = error;
    }
  }

  if (failure !== NOTHING) throw failure;
  return result;
}

/** `t.after` landed in Node 18.13 and the floor is Node 18, so `t` is built here instead. */
export function test(name, options, body) {
  if (typeof options === "function") return runnerTest(name, () => withCleanups(options));
  return runnerTest(name, options, () => withCleanups(body));
}

/**
 * One fixture repo: a temp directory cleaned up here, a flat path-to-contents map, and `dirs`
 * for the empty directories a map cannot name. The root is the real path, because macOS hides
 * the temp directory behind a symlink and a test comparing roots reads through it.
 */
export async function writeRepo(t, files = {}, { dirs = [] } = {}) {
  const root = await realpath(await mkdtemp(join(tmpdir(), "scratchboard-repo-")));
  t.after(() => rm(root, { recursive: true, force: true }));

  for (const path of dirs) await mkdir(join(root, path), { recursive: true });
  for (const [path, text] of Object.entries(files)) {
    await mkdir(dirname(join(root, path)), { recursive: true });
    await writeFile(join(root, path), text);
  }
  return root;
}

const field = ([key, value]) =>
  `${key}: ${Array.isArray(value) ? `[${value.join(", ")}]` : value}\n`;

export function ticket(title, fields = {}, body = "Body.\n") {
  return `---\ntitle: ${title}\n${Object.entries(fields).map(field).join("")}---\n\n${body}`;
}
