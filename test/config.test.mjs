import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { loadConfig, validate } from "../src/config.mjs";
import { scan } from "../src/scan.mjs";

const LANES = fileURLToPath(new URL("./fixtures/lanes", import.meta.url));

function tempConfig(text) {
  const dir = mkdtempSync(join(tmpdir(), "scratchboard-config-"));
  const path = join(dir, "scratchboard.json");
  writeFileSync(path, text);
  return path;
}

const said = (warnings, needle) => warnings.some((one) => one.reason.includes(needle));

test("an unknown top-level key warns and is ignored, and the run still succeeds", async () => {
  const path = tempConfig(
    JSON.stringify({
      title: "Lanes",
      tickets: "tickets/**/issue.md",
      format: "yaml-frontmatter",
      swimlanes: ["nope"],
      lanes: [{ name: "All", match: { path: "tickets/**" } }],
    })
  );
  const warnings = [];
  const config = loadConfig(path, warnings);

  assert.equal("swimlanes" in config, false);
  assert.ok(said(warnings, 'unknown key "swimlanes"'));

  const payload = await scan({ root: LANES, config, warnings, version: "0.1.0" });
  assert.equal(payload.counts.total, 5);
  assert.equal(payload.counts.byLane.All, 5);
});

test("a lane matching both path and field is rejected", () => {
  const warnings = [];
  const config = validate(
    {
      lanes: [
        { name: "Both", match: { path: "tickets/**", field: "status", in: ["ready"] } },
        { name: "Fine", match: { path: "tickets/**" } },
      ],
    },
    warnings
  );
  assert.deepEqual(
    config.lanes.map((lane) => lane.name),
    ["Fine"]
  );
  assert.ok(said(warnings, "matches on both path and field"));
});

test("equals and in both name the values a field lane accepts", () => {
  const warnings = [];
  const config = validate(
    {
      lanes: [
        { name: "One", match: { field: "status", equals: "ready" } },
        { name: "Many", match: { field: "status", in: ["doing", "review"] } },
        { name: "Neither", match: { field: "status" } },
      ],
    },
    warnings
  );
  assert.deepEqual(config.lanes[0].match, { field: "status", in: ["ready"] });
  assert.deepEqual(config.lanes[1].match, { field: "status", in: ["doing", "review"] });
  assert.equal(config.lanes.length, 2);
  assert.ok(said(warnings, "against no values"));
});

test("equals and in place the same tickets", async () => {
  const base = {
    tickets: "tickets/**/issue.md",
    format: "yaml-frontmatter",
    idPattern: "^(\\d+)-",
    facets: [],
  };
  const lanesFrom = (match) => validate({ lanes: [{ name: "Ready", match }] }, []).lanes;
  const withEquals = await scan({
    root: LANES,
    config: { ...base, lanes: lanesFrom({ field: "status", equals: "ready" }) },
    version: "0.1.0",
  });
  const withIn = await scan({
    root: LANES,
    config: { ...base, lanes: lanesFrom({ field: "status", in: ["ready"] }) },
    version: "0.1.0",
  });
  assert.deepEqual(withEquals.counts.byLane, withIn.counts.byLane);
  assert.equal(withEquals.counts.byLane.Ready, 2);
});

test("a bad idPattern warns rather than throwing", () => {
  const warnings = [];
  let config;
  assert.doesNotThrow(() => {
    config = validate({ idPattern: "^(\\d+" }, warnings);
  });
  assert.equal("idPattern" in config, false);
  assert.ok(said(warnings, "not a valid regular expression"));
});

test("malformed JSON warns rather than throwing", () => {
  const path = tempConfig('{ "title": "Broken", ');
  const warnings = [];
  let config;
  assert.doesNotThrow(() => {
    config = loadConfig(path, warnings);
  });
  assert.deepEqual(config, {});
  assert.ok(said(warnings, "is not valid JSON"));
});

test("a config that is not an object warns rather than throwing", () => {
  const warnings = [];
  const config = loadConfig(tempConfig("[1, 2, 3]"), warnings);
  assert.deepEqual(config, {});
  assert.ok(said(warnings, "must hold a JSON object"));
});

test("a field used for lane matching is excluded from facets", async () => {
  const payload = await scan({
    root: LANES,
    config: {
      tickets: "tickets/**/issue.md",
      format: "yaml-frontmatter",
      lanes: [
        { name: "Ready", match: { field: "status", in: ["ready"] } },
        { name: "Rest", match: { path: "tickets/**" } },
      ],
      facets: [{ field: "status" }, { field: "labels" }],
    },
    version: "0.1.0",
  });
  assert.deepEqual(Object.keys(payload.facets), ["labels"]);
});

test("a path lane leaves status a facet, so folder and triage stay separate axes", async () => {
  const payload = await scan({
    root: LANES,
    config: {
      tickets: "tickets/**/issue.md",
      format: "yaml-frontmatter",
      lanes: [{ name: "All", match: { path: "tickets/**" } }],
      facets: [{ field: "status" }, { field: "labels" }],
    },
    version: "0.1.0",
  });
  assert.deepEqual(Object.keys(payload.facets), ["status", "labels"]);
});

const laneScan = (facets) =>
  scan({
    root: LANES,
    config: {
      tickets: "tickets/**/issue.md",
      format: "yaml-frontmatter",
      lanes: [{ name: "All", match: { path: "tickets/**" } }],
      facets,
    },
    version: "0.1.0",
  });

test("without an order, facet values fall by count and then by name", async () => {
  const payload = await laneScan([{ field: "status" }]);
  assert.deepEqual(
    payload.facets.status.map((one) => one.value),
    ["ready", "Ready", "doing", "done"]
  );
});

test("a declared order places its values, and the rest fall in behind by count", async () => {
  const payload = await laneScan([{ field: "status", order: ["done", "doing", "ready"] }]);
  assert.deepEqual(
    payload.facets.status.map((one) => one.value),
    ["done", "doing", "ready", "Ready"]
  );
});

test("an order naming a value no ticket carries places the rest anyway", async () => {
  const payload = await laneScan([{ field: "status", order: ["blocked", "done"] }]);
  assert.deepEqual(
    payload.facets.status.map((one) => one.value),
    ["done", "ready", "Ready", "doing"]
  );
});

test("a value named twice in an order still outranks an unlisted value", async () => {
  const payload = await laneScan([{ field: "status", order: ["done", "done"] }]);
  assert.equal(payload.facets.status[0].value, "done", "the repeat must not sink the value");
});

test("an order that is not an array warns, and the facet still renders", async () => {
  const warnings = [];
  const config = validate({ facets: [{ field: "status", order: "p0" }] }, warnings);
  assert.equal("order" in config.facets[0], false);
  assert.ok(said(warnings, "order in facets[0] must be an array"));
});
