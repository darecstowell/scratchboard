import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { loadConfig, validate, withUnknown } from "../src/config.mjs";
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

test("groups reclassifies a folder, and kind none opts one out", () => {
  const warnings = [];
  const config = validate(
    {
      groups: [
        { path: ".scratch/skills-pivot", kind: "effort" },
        { path: ".scratch/some-feature", kind: "feature" },
        { path: "docs/context", kind: "context" },
        { path: ".scratch/not-an-effort", kind: "none" },
      ],
    },
    warnings
  );
  assert.deepEqual(config.groups, [
    { path: ".scratch/skills-pivot", kind: "effort" },
    { path: ".scratch/some-feature", kind: "feature" },
    { path: "docs/context", kind: "context" },
    { path: ".scratch/not-an-effort", kind: "none" },
  ]);
  assert.deepEqual(warnings, []);
});

test("a malformed groups entry warns and drops, and the rest of the key survives", () => {
  const warnings = [];
  const config = validate(
    {
      groups: [
        "just-a-string",
        { kind: "effort" },
        { path: ".scratch/one", kind: "efort" },
        { path: ".scratch/two" },
        { path: ".scratch/three", kind: "effort", colour: "red" },
      ],
    },
    warnings
  );
  assert.deepEqual(config.groups, [{ path: ".scratch/three", kind: "effort" }]);
  assert.ok(said(warnings, "groups[0] is not an object"));
  assert.ok(said(warnings, "groups[1] names no path"));
  assert.ok(said(warnings, 'unknown kind "efort" in groups[2]'));
  assert.ok(said(warnings, "groups[3]"));
  assert.ok(said(warnings, 'unknown key "colour" in groups[4]'));
});

test("groups that is not an array warns rather than throwing", () => {
  const warnings = [];
  let config;
  assert.doesNotThrow(() => {
    config = validate({ groups: { path: ".scratch", kind: "effort" }, title: "Board" }, warnings);
  });
  assert.equal("groups" in config, false);
  assert.equal(config.title, "Board");
  assert.ok(said(warnings, "groups must be an array"));
});

test("a group path that leaves the repository root is refused", () => {
  const warnings = [];
  const config = validate(
    {
      groups: [
        { path: "../elsewhere/effort", kind: "effort" },
        { path: "/etc/effort", kind: "effort" },
        { path: ".scratch/effort/", kind: "effort" },
      ],
    },
    warnings
  );
  assert.deepEqual(config.groups, [{ path: ".scratch/effort", kind: "effort" }]);
  assert.ok(said(warnings, "groups[0] path must be relative to the repository root"));
  assert.ok(said(warnings, "groups[1] path must be relative to the repository root"));
});

test("documents switches the context read on and off", () => {
  assert.deepEqual(validate({ documents: { context: true } }, []).documents, { context: true });
  assert.deepEqual(validate({ documents: { context: false } }, []).documents, { context: false });
});

test("a malformed documents warns, and a bad context value leaves the key readable", () => {
  const listed = [];
  let config;
  assert.doesNotThrow(() => {
    config = validate({ documents: ["context"], title: "Board" }, listed);
  });
  assert.equal("documents" in config, false);
  assert.equal(config.title, "Board");
  assert.ok(said(listed, "documents must be an object"));

  const warnings = [];
  const loose = validate({ documents: { context: "yes", adrs: "docs/adr" } }, warnings);
  assert.deepEqual(loose.documents, {});
  assert.ok(said(warnings, "context in documents must be true or false"));
  assert.ok(said(warnings, 'unknown key "adrs" in documents'));
});

test("invocations declares a name and a template, and a null template opts one out", () => {
  const warnings = [];
  const config = validate(
    {
      invocations: [
        { name: "grilling", template: "/grilling {path}" },
        { name: "review", template: "/review" },
        { name: "scratchboard", template: null },
      ],
    },
    warnings
  );
  assert.deepEqual(config.invocations, [
    { name: "grilling", template: "/grilling {path}" },
    { name: "review", template: "/review" },
    { name: "scratchboard", template: null },
  ]);
  assert.deepEqual(warnings, []);
});

test("a template naming a token the board cannot substitute warns and is dropped", () => {
  const warnings = [];
  const config = validate(
    {
      invocations: [
        { name: "byId", template: "/grilling {id}" },
        { name: "byTitle", template: "/grilling {path} {title}" },
        { name: "byPath", template: "/grilling {path}" },
      ],
    },
    warnings
  );
  assert.deepEqual(config.invocations, [{ name: "byPath", template: "/grilling {path}" }]);
  assert.ok(said(warnings, "invocations[0] uses {id}"));
  assert.ok(said(warnings, "invocations[1] uses {title}"));
  assert.ok(said(warnings, "only {path} is substituted"));
});

test("a malformed invocations entry warns and drops, and the rest of the key survives", () => {
  const warnings = [];
  const config = validate(
    {
      invocations: [
        null,
        { template: "/grilling {path}" },
        { name: "empty", template: "  " },
        { name: "wrong", template: 7 },
        { name: "fine", template: "/fine {path}", shortcut: "g" },
      ],
    },
    warnings
  );
  assert.deepEqual(config.invocations, [{ name: "fine", template: "/fine {path}" }]);
  assert.ok(said(warnings, "invocations[0] is not an object"));
  assert.ok(said(warnings, "invocations[1] has no name"));
  assert.ok(said(warnings, "invocations[2] has no template"));
  assert.ok(said(warnings, "invocations[3] has no template"));
  assert.ok(said(warnings, 'unknown key "shortcut" in invocations[4]'));
});

test("invocations that is not an array warns rather than throwing", () => {
  const warnings = [];
  let config;
  assert.doesNotThrow(() => {
    config = validate({ invocations: "/grilling {path}" }, warnings);
  });
  assert.equal("invocations" in config, false);
  assert.ok(said(warnings, "invocations must be an array"));
});

test("the three new keys are known, and a genuinely unknown key beside them still warns", () => {
  const warnings = [];
  const config = validate(
    {
      groups: [{ path: ".scratch/skills-pivot", kind: "effort" }],
      documents: { context: true },
      invocations: [{ name: "grilling", template: "/grilling {path}" }],
      swimlanes: ["nope"],
    },
    warnings
  );
  assert.equal(config.groups.length, 1);
  assert.deepEqual(config.documents, { context: true });
  assert.equal(config.invocations.length, 1);
  assert.equal("swimlanes" in config, false);
  assert.deepEqual(
    warnings.map((one) => one.reason),
    ['unknown key "swimlanes", ignored']
  );
});

test("a config naming none of the three keys reads exactly as it did", () => {
  const warnings = [];
  const config = validate(
    {
      title: "Lanes",
      tickets: "tickets/**/issue.md",
      format: "yaml-frontmatter",
      lanes: [{ name: "All", match: { path: "tickets/**" } }],
      facets: [{ field: "status" }],
    },
    warnings
  );
  assert.deepEqual(config, {
    title: "Lanes",
    tickets: "tickets/**/issue.md",
    format: "yaml-frontmatter",
    lanes: [{ name: "All", collapsed: false, match: { path: "tickets/**" } }],
    facets: [{ field: "status" }],
  });
  assert.deepEqual(warnings, []);
});

test("a key a newer version wrote inside the three survives a rewrite untouched", () => {
  const raw = {
    groups: [{ path: ".scratch/skills-pivot", kind: "effort", lead: "plan.md" }],
    documents: { context: true, adrs: "docs/adr" },
    invocations: [{ name: "grilling", template: "/grilling {path}", icon: "book" }],
  };
  const rewritten = withUnknown(raw, validate(raw, []));
  assert.deepEqual(rewritten.groups, [
    { path: ".scratch/skills-pivot", kind: "effort", lead: "plan.md" },
  ]);
  assert.deepEqual(rewritten.documents, { context: true, adrs: "docs/adr" });
  assert.deepEqual(rewritten.invocations, [
    { name: "grilling", template: "/grilling {path}", icon: "book" },
  ]);
});

test("a rewrite adds none of the three keys to a config that declared none", () => {
  const raw = { title: "Lanes", tickets: "tickets/**/issue.md" };
  const rewritten = withUnknown(raw, validate(raw, []));
  assert.deepEqual(Object.keys(rewritten), ["title", "tickets"]);
});
