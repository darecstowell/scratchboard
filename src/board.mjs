import { basename } from "node:path";
import { resolveRoot } from "./root.mjs";
import { loadConfig } from "./config.mjs";
import { detect, configFrom, failure } from "./detect.mjs";
import { scan } from "./scan.mjs";
import { pkg } from "./cli.mjs";

/** Config wins key by key. Everything absent comes from detection. */
export async function resolveBoard(options) {
  const { root, configPath } = resolveRoot(options);
  const warnings = [];
  const config = loadConfig(configPath, warnings);

  // A named parser makes the preset irrelevant, so it satisfies the format requirement alone.
  const reads = config.format || config.parser;
  const complete = config.tickets && reads && config.lanes;
  const report = complete ? null : await detect(root, options);
  if (report && !report.format && !reads) {
    return { root, configPath, config: null, warnings, report };
  }

  const merged = { ...(report ? configFrom(report) : {}), ...config };
  if (!merged.title) merged.title = basename(root);
  if (!merged.facets) merged.facets = [];

  return { root, configPath, config: merged, warnings, report };
}

/** A warning nobody reads is a ticket quietly dropped, so the terminal carries them too.
 * Only the payload may reach stdout, so every human line goes to stderr. */
export function notice(payload) {
  const warnings = (payload.warnings || []).filter((warning) => warning && warning.reason);
  const empty = payload.counts.total === 0;
  if (!warnings.length && !empty) return "";

  const lines = warnings.map(
    (warning) => `  ${warning.path ? `${warning.path}: ` : ""}${warning.reason}`
  );
  if (!empty) {
    return [`· ${lines.length} scan ${lines.length === 1 ? "note" : "notes"}`, ...lines, ""].join("\n");
  }
  return [
    "✗ No tickets on the board",
    ...lines,
    "",
    "  scratchboard init --tickets '<glob>' names the ticket files yourself.",
    "",
  ].join("\n");
}

export async function board(options) {
  const { root, configPath, config, warnings, report } = await resolveBoard(options);
  if (!config) {
    process.stderr.write(failure(report));
    process.exitCode = 1;
    return;
  }

  const payload = await scan({ root, config, warnings, version: pkg.version });

  if (options.scan) {
    process.stdout.write(`${JSON.stringify(payload)}\n`);
    return;
  }

  process.stderr.write(notice(payload));

  if (options.serve) {
    const { serve } = await import("./serve.mjs");
    return serve({ root, config, options: { ...options, report }, payload, warnings });
  }

  const { bakeToFile } = await import("./bake.mjs");
  return bakeToFile({ payload, options, report, root, configPath });
}
