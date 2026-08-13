import { execFile } from "node:child_process";
import { stat } from "node:fs/promises";
import { join } from "node:path";

const GIT_TIMEOUT = 30_000;

function git(root, args) {
  return new Promise((resolve) => {
    execFile(
      "git",
      ["-C", root, "-c", "core.quotePath=false", ...args],
      { timeout: GIT_TIMEOUT, maxBuffer: 64 * 1024 * 1024 },
      (error, stdout, stderr) => {
        if (error) {
          const detail =
            (stderr && stderr.trim().split("\n")[0]) ||
            error.message ||
            `exit ${error.code}`;
          resolve({ ok: false, detail });
          return;
        }
        resolve({ ok: true, stdout });
      }
    );
  });
}

/** Local calendar date, matching what the user sees in their own timezone. */
export function toDay(value) {
  const date = value instanceof Date ? value : new Date(value);
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

function follow(renames, path) {
  let current = path;
  for (let hops = 0; hops < 64; hops += 1) {
    const next = renames.get(current);
    if (next === undefined || next === current) return current;
    current = next;
  }
  return current;
}

/**
 * One `git log` pass for the whole board, keyed by file path and following renames, so a
 * ticket keeps its history when a path-lane board moves it between lanes.
 */
export async function gitDates(root, scope) {
  const prefixRun = await git(root, ["rev-parse", "--show-prefix"]);
  if (!prefixRun.ok) {
    return { dates: new Map(), warning: null, available: false };
  }
  const prefix = prefixRun.stdout.trim();

  const pathspec = ["--", scope || "."];
  const log = await git(root, [
    "log",
    "--name-status",
    "-M",
    "--diff-filter=AMR",
    "--format=%H%x00%aI",
    ...pathspec,
  ]);
  if (!log.ok) {
    return {
      dates: new Map(),
      warning: `git log failed (${log.detail}), dates fall back to file mtime`,
      available: true,
    };
  }

  const renames = new Map();
  const spans = new Map();
  let stamp = null;

  for (const line of log.stdout.split("\n")) {
    if (line.includes("\0")) {
      const iso = line.slice(line.indexOf("\0") + 1).trim();
      const parsed = new Date(iso);
      stamp = Number.isNaN(parsed.getTime()) ? null : parsed;
      continue;
    }
    if (!line || stamp === null) continue;

    const parts = line.split("\t");
    const status = parts[0];
    if (!status) continue;

    let path;
    if (status.startsWith("R") && parts.length >= 3) {
      const from = strip(prefix, parts[1]);
      const to = strip(prefix, parts[2]);
      if (from === null || to === null) continue;
      path = follow(renames, to);
      renames.set(from, path);
    } else if (parts.length >= 2) {
      path = strip(prefix, parts[1]);
      if (path === null) continue;
      path = follow(renames, path);
    } else {
      continue;
    }

    const span = spans.get(path);
    if (!span) spans.set(path, { first: stamp, last: stamp });
    else {
      if (stamp < span.first) span.first = stamp;
      if (stamp > span.last) span.last = stamp;
    }
  }

  const dates = new Map();
  for (const [path, span] of spans) {
    dates.set(path, { created: toDay(span.first), updated: toDay(span.last) });
  }
  return { dates, warning: null, available: true };
}

function strip(prefix, path) {
  if (!prefix) return path;
  if (!path.startsWith(prefix)) return null;
  return path.slice(prefix.length);
}

export async function datesFor(root, paths, scope) {
  const { dates, warning } = await gitDates(root, scope);
  const out = new Map();
  for (const path of paths) {
    const found = dates.get(path);
    if (found) {
      out.set(path, { ...found, date_source: "git" });
      continue;
    }
    let day;
    try {
      day = toDay(new Date((await stat(join(root, path))).mtimeMs));
    } catch {
      day = toDay(new Date());
    }
    out.set(path, { created: day, updated: day, date_source: "mtime" });
  }
  return { dates: out, warning };
}
