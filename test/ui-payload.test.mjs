import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizePayload } from "../src/ui/payload.mjs";

const EMPTY = {
  title: "scratchboard",
  warnings: [],
  tickets: [],
  lanes: [],
  facets: [],
  groups: [],
  invocations: [],
};

const JUNK = [
  undefined,
  null,
  0,
  1,
  "",
  "a string",
  true,
  false,
  [],
  [null],
  [{ path: "a.md" }],
  {},
  { tickets: "no", lanes: 7, groups: true, invocations: 0, facets: [], warnings: "" },
  { tickets: [null, 3, "x"], lanes: [null, 3], groups: [null, 3], invocations: [null, 3] },
  { counts: "no" },
  { counts: { byLane: "no" } },
  { facets: [1, 2], facetConfig: "no" },
  { facetConfig: [null, 7, "x", {}] },
  { groups: [{ path: "p", files: "no", sections: 4 }] },
  { title: 42, warnings: { path: "a" } },
];

test("any value JSON.parse can return comes back as a fully defaulted payload", () => {
  for (const junk of JUNK) {
    const payload = normalizePayload(junk);
    assert.equal(typeof payload.title, "string", `${JSON.stringify(junk)} lost its title`);
    for (const key of ["warnings", "tickets", "lanes", "facets", "groups", "invocations"]) {
      assert.ok(Array.isArray(payload[key]), `${JSON.stringify(junk)} left ${key} unusable`);
    }
  }
});

test("a payload of nothing at all reads as an empty board", () => {
  assert.deepEqual(normalizePayload(null), EMPTY);
  assert.deepEqual(normalizePayload({}), EMPTY);
  assert.deepEqual(normalizePayload("garbage"), EMPTY);
});

test("a malformed payload keeps every entry the contract can still read", () => {
  const payload = normalizePayload({
    title: "",
    warnings: "gone",
    tickets: [null, "x", { path: "a.md", lane: "Todo" }],
    lanes: [null, 7, { name: "Todo" }],
    groups: [null, "x", { path: "g", files: [{ path: "f.md" }, { title: "no path" }, null] }],
    invocations: [null, { name: "n", template: "$& go" }, { name: "n2", template: null }],
  });

  assert.equal(payload.title, "scratchboard", "an empty title is no title");
  assert.deepEqual(payload.warnings, []);
  assert.deepEqual(payload.tickets, [{ path: "a.md", lane: "Todo", fields: {}, refs: [] }]);
  assert.deepEqual(payload.lanes, [{ name: "Todo", collapsed: false, icon: null, total: 1 }]);
  assert.equal(payload.groups.length, 1, "a group with no path is not a group");
  assert.deepEqual(
    payload.groups[0].files.map((file) => file.path),
    ["f.md"],
    "a file with no path is dropped, and the rest of the group survives"
  );
  assert.deepEqual(payload.invocations, [{ name: "n", template: "$& go" }]);
});

test("a missing groups key reads as no group, exactly as an empty array does", () => {
  assert.deepEqual(normalizePayload({ tickets: [] }).groups, []);
  assert.deepEqual(normalizePayload({ groups: [] }).groups, []);
  assert.deepEqual(normalizePayload({ groups: null }).groups, []);
});

test("a null template opts an entry out by name and never reaches a menu", () => {
  const payload = normalizePayload({
    invocations: [
      { name: "opted out", template: null },
      { name: "kept", template: "/skill $&" },
      { template: "no name" },
      { name: "wrong type", template: 7 },
    ],
  });

  assert.deepEqual(payload.invocations, [{ name: "kept", template: "/skill $&" }]);
});

test("a key the reader does not know rides through untouched", () => {
  const given = {
    version: "9.9.9",
    generated_at: "2026-08-24T00:00:00Z",
    root: "/tmp/board",
    somethingNewer: { deep: [1, 2] },
    tickets: [{ path: "a.md", lane: "Todo", severity: "high" }],
    lanes: [{ name: "Todo", ticketIds: ["1"], swimlane: "left" }],
    groups: [{ path: "g", kind: "effort", files: [{ path: "f.md", claimed: "kim" }], budget: 3 }],
    invocations: [{ name: "n", template: "t", icon: "tag" }],
    warnings: [{ path: "a.md", reason: "why", fix: "how", severity: "loud" }],
    counts: { total: 1, byLane: { Todo: 1 } },
  };

  const payload = normalizePayload(given);

  assert.equal(payload.version, "9.9.9");
  assert.deepEqual(payload.somethingNewer, { deep: [1, 2] });
  assert.equal(payload.tickets[0].severity, "high");
  assert.deepEqual(payload.lanes[0].ticketIds, ["1"]);
  assert.equal(payload.lanes[0].swimlane, "left");
  assert.equal(payload.groups[0].budget, 3);
  assert.equal(payload.groups[0].files[0].claimed, "kim");
  assert.equal(payload.invocations[0].icon, "tag");
  assert.deepEqual(payload.warnings[0], given.warnings[0]);
});

test("what the caller hands over is never written to", () => {
  const given = {
    tickets: [{ path: "a.md" }],
    lanes: [{ name: "Todo" }],
    groups: [{ path: "g", files: [{ path: "f.md" }] }],
  };
  const before = JSON.stringify(given);

  normalizePayload(given);
  assert.equal(JSON.stringify(given), before, "normalizing edited the payload it was given");
});

test("a group defaults its kind, its title and its sections", () => {
  const payload = normalizePayload({
    groups: [
      { path: "z", kind: "novel", title: "" },
      { path: "a", kind: "context", sections: [] },
      { path: "m", kind: "effort", title: "Skills pivot", sections: { fog: "unknown" } },
    ],
  });

  assert.deepEqual(
    payload.groups.map((group) => [group.path, group.kind, group.title]),
    [
      ["a", "context", "a"],
      ["m", "effort", "Skills pivot"],
      ["z", "feature", "z"],
    ],
    "groups sort by path, an unknown kind is a feature, and a missing title is the path"
  );
  assert.deepEqual(payload.groups[0].sections, {}, "sections is always an object");
  assert.deepEqual(payload.groups[1].sections, { fog: "unknown" });
});

test("a group keeps its files in payload order, with every field the view reads", () => {
  const files = [
    { role: "lead", path: "g/map.md", title: "Map" },
    { role: "issue", path: "g/2.md", id: "2", state: "takeable-now", blockedBy: ["1"] },
    { role: "issue", path: "g/1.md", id: "1", status: "accepted" },
  ];
  const payload = normalizePayload({ groups: [{ path: "g", kind: "effort", files }] });

  assert.deepEqual(payload.groups[0].files, files, "the scan already ordered them");
});

test("a ticket keeps its id as a string and needs none to survive", () => {
  const payload = normalizePayload({
    tickets: [
      { id: "007", path: "a.md", lane: "Todo" },
      { path: "b.md", lane: "Todo" },
    ],
  });

  assert.equal(payload.tickets[0].id, "007", "an id was coerced with Number()");
  assert.equal(payload.tickets.length, 2, "a ticket with no id fell off the board");
  assert.equal("id" in payload.tickets[1], false, "an id was invented");
});

test("a ticket gets a fields map and a refs list whatever arrived", () => {
  const payload = normalizePayload({
    tickets: [
      { path: "a.md" },
      { path: "b.md", fields: null, refs: "1, 2" },
      { path: "c.md", fields: { labels: ["ui"] }, refs: ["1"] },
    ],
  });

  assert.deepEqual(payload.tickets[0].fields, {});
  assert.deepEqual(payload.tickets[0].refs, []);
  assert.deepEqual(payload.tickets[1].fields, {});
  assert.deepEqual(payload.tickets[1].refs, []);
  assert.deepEqual(payload.tickets[2].fields, { labels: ["ui"] });
  assert.deepEqual(payload.tickets[2].refs, ["1"]);
});

test("a lane carries the glyph the scan named, and nothing else reaches the board", () => {
  const payload = normalizePayload({
    lanes: [{ name: "Todo", icon: "check" }, { name: "Doing", icon: 7 }, { name: "Done", icon: "" }],
    tickets: [],
  });

  assert.deepEqual(
    payload.lanes.map((lane) => lane.icon),
    ["check", null, null],
    "a glyph that is not a non-empty string is no glyph"
  );
});

test("a lane counts what the scan says, and counts its own tickets when the scan says nothing", () => {
  const payload = normalizePayload({
    counts: { byLane: { Todo: 40, Done: "many" } },
    lanes: [{ name: "Todo" }, { name: "Done" }, { name: "Empty", collapsed: true }],
    tickets: [
      { path: "a.md", lane: "Todo" },
      { path: "b.md", lane: "Done" },
      { path: "c.md", lane: "Done" },
    ],
  });

  assert.deepEqual(payload.lanes, [
    { name: "Todo", collapsed: false, icon: null, total: 40 },
    { name: "Done", collapsed: false, icon: null, total: 2 },
    { name: "Empty", collapsed: true, icon: null, total: 0 },
  ]);
});

test("facet order follows the config first and the tallies after", () => {
  const payload = normalizePayload({
    facets: { labels: [{ value: "ui", count: 2 }], status: [], priority: "no" },
    facetConfig: [
      { field: "status", colors: { done: "green" } },
      { field: "priority", icon: "tag" },
      { field: "absent", colors: { a: "red" } },
    ],
  });

  assert.deepEqual(
    payload.facets.map((facet) => facet.field),
    ["status", "priority", "labels"],
    "a configured field the payload never tallied is not a facet"
  );
  assert.deepEqual(payload.facets[0].colors, { done: "green" });
  assert.equal(payload.facets[1].icon, "tag");
  assert.deepEqual(payload.facets[2], { field: "labels", values: [{ value: "ui", count: 2 }], colors: null, icon: null });
  assert.deepEqual(payload.facets[1].values, [], "a tally that is not a list is no tally");
});
