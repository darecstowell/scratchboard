import { test } from "node:test";
import assert from "node:assert/strict";
import { parseArgs, HELP, pkg } from "../src/cli.mjs";

test("defaults to the board command with the browser open", () => {
  const opts = parseArgs([]);
  assert.equal(opts.command, "board");
  assert.equal(opts.open, true);
  assert.equal(opts.serve, false);
  assert.equal(opts.port, 8787);
});

test("reads every documented flag", () => {
  const opts = parseArgs([
    "--serve",
    "--out",
    "board.html",
    "--config",
    "a/scratchboard.json",
    "--port",
    "9000",
    "--no-open",
    "--scan",
  ]);
  assert.equal(opts.serve, true);
  assert.equal(opts.out, "board.html");
  assert.equal(opts.config, "a/scratchboard.json");
  assert.equal(opts.port, 9000);
  assert.equal(opts.open, false);
  assert.equal(opts.scan, true);
});

test("reads init and its flags", () => {
  const opts = parseArgs(["init", "--tickets", "docs/issues/**/*.md", "--yes"]);
  assert.equal(opts.command, "init");
  assert.equal(opts.tickets, "docs/issues/**/*.md");
  assert.equal(opts.yes, true);
});

test("rejects an unknown flag by name", () => {
  assert.throws(() => parseArgs(["--nope"]), /unknown flag: --nope/);
});

test("rejects an unknown command by name", () => {
  assert.throws(() => parseArgs(["setup"]), /unknown command: setup/);
});

test("rejects a value flag with no value", () => {
  assert.throws(() => parseArgs(["--out"]), /--out needs a value/);
});

test("rejects a port outside the legal range", () => {
  assert.throws(() => parseArgs(["--port", "0"]), /--port needs a number/);
  assert.throws(() => parseArgs(["--port", "http"]), /--port needs a number/);
});

test("help documents every flag the parser accepts", () => {
  const documented = new Set(HELP.match(/--[a-z-]+/g));
  for (const flag of [
    "--serve",
    "--out",
    "--config",
    "--port",
    "--no-open",
    "--scan",
    "--help",
    "--version",
    "--tickets",
    "--yes",
  ]) {
    assert.ok(documented.has(flag), `${flag} is missing from --help`);
  }
});

test("help names the package version", () => {
  assert.ok(HELP.startsWith(`scratchboard ${pkg.version}`));
});
