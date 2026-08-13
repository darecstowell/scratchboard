#!/usr/bin/env node
import { run } from "../src/cli.mjs";

run(process.argv.slice(2)).catch((err) => {
  process.stderr.write(`scratchboard: ${err && err.message ? err.message : err}\n`);
  process.exit(1);
});
