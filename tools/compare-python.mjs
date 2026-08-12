#!/usr/bin/env node
// Reads both scanners live at one commit and compares them. Never hardcodes a count.
import { existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { CLI, Report, SPEC_CONFIG, facetTally, run, withConfig } from "./corpus.mjs";

const isEmpty = (value) =>
  value === undefined ||
  value === null ||
  value === "" ||
  (Array.isArray(value) && value.length === 0);

const asList = (value) => (Array.isArray(value) ? value.map(String) : [String(value)]);

function sameValue(a, b) {
  if (isEmpty(a) && isEmpty(b)) return true;
  if (isEmpty(a) !== isEmpty(b)) return false;
  const la = asList(a);
  const lb = asList(b);
  return la.length === lb.length && la.every((one, i) => one === lb[i]);
}

/** Python's fixed key list emits priority, status, labels and source even when absent. */
function pythonFields(ticket) {
  return {
    priority: ticket.priority,
    status: ticket.status,
    labels: ticket.labels,
    source: ticket.source,
    ...(ticket.extra || {}),
  };
}

function compareTickets(py, node, report) {
  const pyById = new Map(py.tickets.map((t) => [String(t.id), t]));
  const nodeById = new Map(node.tickets.map((t) => [String(t.id), t]));

  report.category(
    "readable tickets",
    py.tickets.length === node.tickets.length
      ? []
      : [`python ${py.tickets.length}, node ${node.tickets.length}`],
    py.tickets.length
  );

  const idFailures = [];
  for (const id of pyById.keys()) if (!nodeById.has(id)) idFailures.push(`only python: ${id}`);
  for (const id of nodeById.keys()) if (!pyById.has(id)) idFailures.push(`only node: ${id}`);
  report.category("ticket ids", idFailures, pyById.size);

  const shared = [...pyById.keys()].filter((id) => nodeById.has(id));
  const titles = [];
  const plain = { slug: [], path: [], excerpt: [], body: [] };
  const fields = [];
  const refs = [];
  let emptyShape = 0;
  let refsToUnreadable = 0;

  for (const id of shared) {
    const p = pyById.get(id);
    const n = nodeById.get(id);

    if (p.title !== n.title) {
      titles.push(`${id}: ${JSON.stringify(p.title)} vs ${JSON.stringify(n.title)}`);
    }
    for (const key of Object.keys(plain)) {
      if (p[key] !== n[key]) {
        plain[key].push(`${id}: python ${JSON.stringify(p[key])}, node ${JSON.stringify(n[key])}`);
      }
    }

    const pf = pythonFields(p);
    const nf = n.fields || {};
    for (const key of new Set([...Object.keys(pf), ...Object.keys(nf)])) {
      if (JSON.stringify(pf[key]) === JSON.stringify(nf[key])) continue;
      if (sameValue(pf[key], nf[key])) {
        emptyShape += 1;
        continue;
      }
      fields.push(`${id}.${key}: python ${JSON.stringify(pf[key])}, node ${JSON.stringify(nf[key])}`);
    }

    // Python keeps ids from ticket directories that never became tickets. Node cannot.
    const pyRefs = p.refs.map(String).filter((ref) => nodeById.has(ref));
    refsToUnreadable += p.refs.length - pyRefs.length;
    const nodeRefs = n.refs.map(String);
    if (pyRefs.join(",") !== nodeRefs.join(",")) {
      refs.push(`${id}: python [${pyRefs}], node [${nodeRefs}]`);
    }
  }

  report.category("titles", titles, shared.length);
  report.category("field values", fields, shared.length);
  report.category("slug", plain.slug, shared.length);
  report.category("path", plain.path, shared.length);
  report.category("excerpt", plain.excerpt, shared.length);
  report.category("body", plain.body, shared.length);
  report.category("refs", refs, shared.length);

  if (emptyShape) {
    report.note(
      `${emptyShape} fields empty on both sides in a different shape: python emits its four fixed keys as null, node carries only the keys the file holds and writes a null value as ""`
    );
  }
  if (refsToUnreadable) {
    report.note(
      `${refsToUnreadable} python refs name directories that hold no readable ticket, which only python knows about, so they are out of the ref comparison`
    );
  }
}

function compareFacets(py, node, report) {
  const failures = [];
  const names = new Set([...Object.keys(py.facets || {}), ...Object.keys(node.facets || {})]);
  for (const name of names) {
    if (!py.facets[name] || !node.facets[name]) {
      failures.push(`${name}: only ${py.facets[name] ? "python" : "node"} has it`);
      continue;
    }
    const a = facetTally(py.facets, name);
    const b = facetTally(node.facets, name);
    for (const value of new Set([...a.keys(), ...b.keys()])) {
      if (a.get(value) !== b.get(value)) {
        failures.push(`${name}.${value}: python ${a.get(value)}, node ${b.get(value)}`);
      }
    }
  }
  report.category("facets", failures, names.size);
}

function compareLaneCounts(py, node, report) {
  const lanes = { todo: "Todo", "in-progress": "In progress", done: "Done" };
  const failures = [];
  for (const [pyName, nodeName] of Object.entries(lanes)) {
    if (py.counts[pyName] !== node.counts.byLane[nodeName]) {
      failures.push(`${pyName}: python ${py.counts[pyName]}, node ${node.counts.byLane[nodeName]}`);
    }
  }
  report.category("lane counts", failures, Object.keys(lanes).length);
}

async function main() {
  const root = resolve(process.argv[2] || ".");
  if (!existsSync(join(root, "board", "serve.py"))) {
    process.stderr.write(`no board/serve.py under ${root}\n`);
    process.exit(2);
  }

  const [py, node] = await withConfig(root, SPEC_CONFIG, async (configPath) => [
    JSON.parse(await run("python3", ["board/serve.py", "--scan"], root)),
    JSON.parse(await run("node", [CLI, "--scan", "--config", configPath], root)),
  ]);

  process.stdout.write(`python ${py.tickets.length} tickets, node ${node.tickets.length} tickets\n\n`);

  const report = new Report();
  compareTickets(py, node, report);
  compareFacets(py, node, report);
  compareLaneCounts(py, node, report);
  report.note("warnings are not compared: python warns from two rules this design drops");
  report.print();
  process.exit(report.failed ? 1 : 0);
}

main().catch((error) => {
  process.stderr.write(`${error.message}\n`);
  process.exit(2);
});
