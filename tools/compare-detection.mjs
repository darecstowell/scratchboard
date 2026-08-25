#!/usr/bin/env node
// Two --scan runs over one corpus: one from the committed config, one from detection alone.
import { resolve } from "node:path";
import { CLI, Report, SPEC_CONFIG, facetTally, run, withConfig } from "./corpus.mjs";

function compareLanes(config, detected, report) {
  const a = config.lanes.map((lane) => `${lane.name}${lane.collapsed ? " (collapsed)" : ""}`);
  const b = detected.lanes.map((lane) => `${lane.name}${lane.collapsed ? " (collapsed)" : ""}`);
  const failures = [];
  if (a.join(" | ") !== b.join(" | ")) failures.push(`config [${a}] against detection [${b}]`);
  report.category("lane names and order", failures, a.length);
}

function comparePlacement(config, detected, report) {
  const byPath = new Map(config.tickets.map((t) => [t.path, t]));
  const failures = [];
  for (const ticket of detected.tickets) {
    const other = byPath.get(ticket.path);
    if (!other) {
      failures.push(`${ticket.path}: only detection found it`);
      continue;
    }
    if (other.lane !== ticket.lane) {
      failures.push(`${ticket.path}: config ${other.lane}, detection ${ticket.lane}`);
    }
    byPath.delete(ticket.path);
  }
  for (const path of byPath.keys()) failures.push(`${path}: only the config run found it`);
  report.category("per-ticket lane", failures, detected.tickets.length);
}

function compareFacets(config, detected, report) {
  const mine = Object.keys(config.facets);
  const theirs = Object.keys(detected.facets);
  const shared = mine.filter((field) => theirs.includes(field));

  const onlyConfig = mine.filter((field) => !theirs.includes(field));
  const onlyDetected = theirs.filter((field) => !mine.includes(field));
  if (onlyConfig.length) report.note(`facet fields only the config asks for: ${onlyConfig.join(", ")}`);
  if (onlyDetected.length) report.note(`facet fields only detection proposes: ${onlyDetected.join(", ")}`);

  const failures = [];
  for (const field of shared) {
    const a = config.facets[field];
    const b = detected.facets[field];
    if (JSON.stringify(a) === JSON.stringify(b)) continue;
    const at = facetTally(config.facets, field);
    const bt = facetTally(detected.facets, field);
    let same = true;
    for (const value of new Set([...at.keys(), ...bt.keys()])) {
      if (at.get(value) !== bt.get(value)) {
        failures.push(`${field}.${value}: config ${at.get(value)}, detection ${bt.get(value)}`);
        same = false;
      }
    }
    // Detection proposes an order of its own, so a config that declares none legitimately
    // differs. The counts are the claim this category makes.
    if (same) report.note(`${field}: same counts in a different order`);
  }
  report.category("facet value counts", failures, shared.length);
}

function compareCounts(config, detected, report) {
  const failures = [];
  if (config.counts.total !== detected.counts.total) {
    failures.push(`config ${config.counts.total}, detection ${detected.counts.total}`);
  }
  for (const name of new Set([
    ...Object.keys(config.counts.byLane),
    ...Object.keys(detected.counts.byLane),
  ])) {
    if (config.counts.byLane[name] !== detected.counts.byLane[name]) {
      failures.push(`${name}: config ${config.counts.byLane[name]}, detection ${detected.counts.byLane[name]}`);
    }
  }
  report.category("ticket counts", failures, 1 + Object.keys(config.counts.byLane).length);
}

async function main() {
  const root = resolve(process.argv[2] || ".");

  const config = await withConfig(root, SPEC_CONFIG, async (path) =>
    JSON.parse(await run("node", [CLI, "--scan", "--config", path], root))
  );
  // An empty config declares nothing, so every key still comes from detection. It is written
  // because a corpus inside another repository would otherwise resolve that repository's root.
  const detected = await withConfig(root, {}, async (path) =>
    JSON.parse(await run("node", [CLI, "--scan", "--config", path], root))
  );

  process.stdout.write(
    `config ${config.counts.total} tickets, detection ${detected.counts.total} tickets\n\n`
  );

  const report = new Report();
  compareCounts(config, detected, report);
  compareLanes(config, detected, report);
  comparePlacement(config, detected, report);
  compareFacets(config, detected, report);
  report.print();
  process.exit(report.failed ? 1 : 0);
}

main().catch((error) => {
  process.stderr.write(`${error.message}\n`);
  process.exit(2);
});
