// Shared plumbing for the two corpus comparisons. The corpus repo is left exactly as found.
import { execFile } from "node:child_process";
import { existsSync, readFileSync, writeFileSync, unlinkSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";

export const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "..");
export const CLI = join(REPO, "bin", "cli.mjs");
const MAX_BUFFER = 256 * 1024 * 1024;

/** The OffMain example from the spec, verbatim. */
export const SPEC_CONFIG = {
  title: "OffMain",
  tickets: ".scratch/**/issue.md",
  format: "yaml-frontmatter",
  idPattern: "^(\\d+)-",
  lanes: [
    { name: "Todo", match: { path: ".scratch/todo/**" } },
    { name: "In progress", match: { path: ".scratch/in-progress/**" } },
    { name: "Done", match: { path: ".scratch/done/**" }, collapsed: true },
  ],
  facets: [
    {
      field: "priority",
      order: ["p0", "p1", "p2", "p3"],
      colors: { p0: "red", p1: "amber", p2: "cyan", p3: "neutral" },
    },
    { field: "status" },
    { field: "labels" },
  ],
};

export function run(command, args, cwd) {
  return new Promise((ok, fail) => {
    execFile(command, args, { cwd, maxBuffer: MAX_BUFFER }, (error, stdout, stderr) => {
      if (error) fail(new Error(`${command} ${args.join(" ")} failed: ${stderr || error.message}`));
      else ok(stdout);
    });
  });
}

/** Put the corpus in the wanted config state, run, and restore whatever was there. */
export async function withConfig(root, config, body) {
  const path = join(root, "scratchboard.json");
  const had = existsSync(path);
  const kept = had ? readFileSync(path, "utf8") : null;
  if (config === null) {
    if (had) unlinkSync(path);
  } else {
    writeFileSync(path, `${JSON.stringify(config, null, 2)}\n`);
  }
  try {
    return await body(path);
  } finally {
    if (had) writeFileSync(path, kept);
    else if (existsSync(path)) unlinkSync(path);
  }
}

export class Report {
  constructor() {
    this.categories = [];
    this.notes = [];
  }

  category(name, failures, checked) {
    this.categories.push({ name, failures, checked });
  }

  note(text) {
    this.notes.push(text);
  }

  get failed() {
    return this.categories.some((one) => one.failures.length > 0);
  }

  print() {
    const width = this.categories.reduce((n, one) => Math.max(n, one.name.length), 0);
    for (const one of this.categories) {
      const mark = one.failures.length ? "FAIL" : "ok  ";
      process.stdout.write(
        `  ${mark} ${one.name.padEnd(width)}  ${one.checked} checked, ${one.failures.length} differ\n`
      );
      for (const line of one.failures.slice(0, 10)) process.stdout.write(`         ${line}\n`);
      if (one.failures.length > 10) {
        process.stdout.write(`         ... ${one.failures.length - 10} more\n`);
      }
    }
    if (this.notes.length) {
      process.stdout.write("\n  explained divergences\n");
      for (const line of this.notes) process.stdout.write(`    - ${line}\n`);
    }
    process.stdout.write(this.failed ? "\nFAIL\n" : "\nPASS\n");
  }
}

export function facetTally(facets, field) {
  return new Map((facets[field] || []).map((one) => [one.value, one.count]));
}
