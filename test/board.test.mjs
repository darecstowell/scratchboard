import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { resolveBoard } from "../src/board.mjs";
import { scan } from "../src/scan.mjs";

const READER = `
  export function parse(path, text) {
    const [head, ...rest] = text.split("\\n");
    return { id: null, title: head.trim(), body: rest.join("\\n"), fields: { kind: "custom" } };
  }
`;

function tree(config, reader = READER) {
  const root = mkdtempSync(join(tmpdir(), "scratchboard-board-"));
  mkdirSync(join(root, "tickets", "1-alpha"), { recursive: true });
  mkdirSync(join(root, "tickets", "2-beta"), { recursive: true });
  writeFileSync(join(root, "tickets", "1-alpha", "issue.md"), "Alpha\n\nBody.\n");
  writeFileSync(join(root, "tickets", "2-beta", "issue.md"), "Beta\n\nBody.\n");
  if (reader !== null) writeFileSync(join(root, "reader.mjs"), reader);
  writeFileSync(join(root, "scratchboard.json"), JSON.stringify(config, null, 2));
  return root;
}

const PARSER_CONFIG = {
  title: "Custom",
  tickets: "tickets/**/issue.md",
  parser: "reader.mjs",
  lanes: [{ name: "All", match: { path: "tickets/**" } }],
};

test("a config naming tickets, a parser and lanes skips detection", async () => {
  const root = tree(PARSER_CONFIG);
  const resolved = await resolveBoard({ config: join(root, "scratchboard.json") });

  assert.equal(resolved.report, null, "detection never ran");
  assert.equal(resolved.config.parser, "reader.mjs");
  assert.equal(resolved.config.format, undefined);

  const payload = await scan({ ...resolved, version: "0.1.0" });
  assert.equal(payload.counts.total, 2);
  assert.equal(payload.counts.byLane.All, 2);
  assert.equal(payload.format, "parser:reader.mjs");
  assert.deepEqual(
    payload.tickets.map((one) => one.title).sort(),
    ["Alpha", "Beta"]
  );
});

test("a named parser that will not load stops the run rather than reading with a preset", async () => {
  const root = tree({ ...PARSER_CONFIG, format: "yaml-frontmatter" }, null);
  const resolved = await resolveBoard({ config: join(root, "scratchboard.json") });

  await assert.rejects(
    scan({ ...resolved, version: "0.1.0" }),
    /custom parser reader\.mjs did not load/
  );
});
