import { readFileSync } from "node:fs";

const pkg = JSON.parse(
  readFileSync(new URL("../package.json", import.meta.url), "utf8")
);

const HELP = `scratchboard ${pkg.version}

  scratchboard                      bake to temp, open, exit
  scratchboard --serve              serve + watch + live reload
  scratchboard --out <path>         write the baked HTML here instead of temp
  scratchboard --config <path>      use this config, and its directory as the root
  scratchboard --port <n>           serve mode, default 8787, walks up on conflict
  scratchboard --no-open            do not launch a browser
  scratchboard --scan               print the JSON payload to stdout, exit
  scratchboard --help               print this
  scratchboard --version            print the version
  scratchboard init                 detect and write scratchboard.json
    --tickets <glob>                skip the ticket-path prompt
    --yes                           accept detection, never prompt
`;

const VALUE_FLAGS = new Set(["--out", "--config", "--port", "--tickets"]);
const BOOL_FLAGS = new Set([
  "--serve",
  "--no-open",
  "--scan",
  "--help",
  "-h",
  "--version",
  "-v",
  "--yes",
  "-y",
]);

export function parseArgs(argv) {
  const opts = {
    command: "board",
    serve: false,
    scan: false,
    help: false,
    version: false,
    open: true,
    yes: false,
    out: null,
    config: null,
    port: 8787,
    tickets: null,
  };

  const rest = [...argv];
  if (rest[0] && !rest[0].startsWith("-")) {
    const command = rest.shift();
    if (command !== "init") throw new Error(`unknown command: ${command}`);
    opts.command = "init";
  }

  while (rest.length) {
    const arg = rest.shift();
    if (VALUE_FLAGS.has(arg)) {
      const value = rest.shift();
      if (value === undefined) throw new Error(`${arg} needs a value`);
      if (arg === "--out") opts.out = value;
      else if (arg === "--config") opts.config = value;
      else if (arg === "--tickets") opts.tickets = value;
      else if (arg === "--port") {
        const port = Number(value);
        if (!Number.isInteger(port) || port < 1 || port > 65535) {
          throw new Error(`--port needs a number from 1 to 65535, got ${value}`);
        }
        opts.port = port;
      }
      continue;
    }
    if (!BOOL_FLAGS.has(arg)) throw new Error(`unknown flag: ${arg}`);
    if (arg === "--serve") opts.serve = true;
    else if (arg === "--no-open") opts.open = false;
    else if (arg === "--scan") opts.scan = true;
    else if (arg === "--help" || arg === "-h") opts.help = true;
    else if (arg === "--version" || arg === "-v") opts.version = true;
    else if (arg === "--yes" || arg === "-y") opts.yes = true;
  }

  return opts;
}

export async function run(argv) {
  const opts = parseArgs(argv);

  if (opts.help) {
    process.stdout.write(HELP);
    return;
  }
  if (opts.version) {
    process.stdout.write(`${pkg.version}\n`);
    return;
  }

  if (opts.command === "init") {
    const { init } = await import("./detect.mjs");
    return init(opts);
  }
  const { board } = await import("./board.mjs");
  return board(opts);
}

export { HELP, pkg };
