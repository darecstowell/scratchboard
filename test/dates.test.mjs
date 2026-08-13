import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, utimesSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { datesFor, toDay } from "../src/dates.mjs";

function haveGit() {
  try {
    execFileSync("git", ["--version"], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

const skip = haveGit() ? false : "git is not available";

function repo() {
  const root = mkdtempSync(join(tmpdir(), "scratchboard-dates-"));
  const git = (args, when) =>
    execFileSync("git", ["-C", root, ...args], {
      stdio: "ignore",
      env: {
        ...process.env,
        GIT_AUTHOR_NAME: "Test",
        GIT_AUTHOR_EMAIL: "test@example.test",
        GIT_COMMITTER_NAME: "Test",
        GIT_COMMITTER_EMAIL: "test@example.test",
        ...(when ? { GIT_AUTHOR_DATE: when, GIT_COMMITTER_DATE: when } : {}),
      },
    });
  git(["init", "-q"]);
  return { root, git };
}

test("a ticket keeps its created date through a git mv between lanes", { skip }, async () => {
  const { root, git } = repo();
  const born = "2021-03-04T12:00:00";
  const moved = "2021-09-08T12:00:00";

  mkdirSync(join(root, "tickets", "todo", "1-alpha"), { recursive: true });
  writeFileSync(join(root, "tickets", "todo", "1-alpha", "issue.md"), "Alpha, at rest.\n");
  git(["add", "-A"]);
  git(["commit", "-q", "-m", "add alpha"], born);

  mkdirSync(join(root, "tickets", "done"), { recursive: true });
  git(["mv", "tickets/todo/1-alpha", "tickets/done/1-alpha"]);
  git(["commit", "-q", "-m", "finish alpha"], moved);

  const path = "tickets/done/1-alpha/issue.md";
  const { dates } = await datesFor(root, [path], "tickets");
  const stamps = dates.get(path);

  assert.equal(stamps.date_source, "git");
  assert.equal(stamps.created, "2021-03-04");
  assert.equal(stamps.updated, "2021-09-08");
});

test("a file git has never seen falls back to mtime", { skip }, async () => {
  const { root, git } = repo();
  mkdirSync(join(root, "tickets"), { recursive: true });
  writeFileSync(join(root, "tickets", "tracked.md"), "Tracked.\n");
  git(["add", "-A"]);
  git(["commit", "-q", "-m", "add tracked"], "2021-03-04T12:00:00");

  writeFileSync(join(root, "tickets", "loose.md"), "Never committed.\n");
  const when = new Date("2019-06-07T12:00:00");
  utimesSync(join(root, "tickets", "loose.md"), when, when);

  const { dates } = await datesFor(root, ["tickets/tracked.md", "tickets/loose.md"], "tickets");
  assert.equal(dates.get("tickets/tracked.md").date_source, "git");
  assert.equal(dates.get("tickets/loose.md").date_source, "mtime");
  assert.equal(dates.get("tickets/loose.md").created, "2019-06-07");
  assert.equal(dates.get("tickets/loose.md").updated, "2019-06-07");
});

test("outside a git repo every date comes from mtime", async () => {
  const root = mkdtempSync(join(tmpdir(), "scratchboard-nogit-"));
  mkdirSync(join(root, "tickets"), { recursive: true });
  writeFileSync(join(root, "tickets", "one.md"), "One.\n");
  const when = new Date("2018-01-02T12:00:00");
  utimesSync(join(root, "tickets", "one.md"), when, when);

  const { dates, warning } = await datesFor(root, ["tickets/one.md"], "tickets");
  const stamps = dates.get("tickets/one.md");

  assert.equal(warning, null);
  assert.equal(stamps.date_source, "mtime");
  assert.equal(stamps.created, "2018-01-02");
});

test("a day is the local calendar date", () => {
  assert.equal(toDay(new Date(2026, 7, 12, 15, 4, 5)), "2026-08-12");
  assert.equal(toDay(new Date(2026, 0, 1, 0, 0, 0)), "2026-01-01");
});
