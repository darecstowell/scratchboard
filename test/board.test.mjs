import assert from "node:assert/strict";
import { join } from "node:path";
import { test, writeRepo } from "./context.mjs";
import { resolveBoard } from "../src/board.mjs";
import { scan } from "../src/scan.mjs";

const READER = `
  export function parse(path, text) {
    const [head, ...rest] = text.split("\\n");
    return { id: null, title: head.trim(), body: rest.join("\\n"), fields: { kind: "custom" } };
  }
`;

const tree = (t, config, reader = READER) =>
  writeRepo(t, {
    "tickets/1-alpha/issue.md": "Alpha\n\nBody.\n",
    "tickets/2-beta/issue.md": "Beta\n\nBody.\n",
    ...(reader === null ? {} : { "reader.mjs": reader }),
    "scratchboard.json": JSON.stringify(config, null, 2),
  });

const PARSER_CONFIG = {
  title: "Custom",
  tickets: "tickets/**/issue.md",
  parser: "reader.mjs",
  lanes: [{ name: "All", match: { path: "tickets/**" } }],
};

test("a config naming tickets, a parser and lanes skips detection", async (t) => {
  const root = await tree(t, PARSER_CONFIG);
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

test("a named parser that will not load stops the run rather than reading with a preset", async (t) => {
  const root = await tree(t, { ...PARSER_CONFIG, format: "yaml-frontmatter" }, null);
  const resolved = await resolveBoard({ config: join(root, "scratchboard.json") });

  await assert.rejects(
    scan({ ...resolved, version: "0.1.0" }),
    /custom parser reader\.mjs did not load/
  );
});
