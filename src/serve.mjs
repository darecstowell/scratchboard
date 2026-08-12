import { createServer } from "node:http";
import { watch } from "node:fs";
import { stat } from "node:fs/promises";
import { join } from "node:path";
import { globRoot, walk } from "./walk.mjs";
import { scan } from "./scan.mjs";
import { pkg } from "./cli.mjs";
import { bake, summary } from "./bake.mjs";
import { openInBrowser } from "./open.mjs";

export const HOST = "127.0.0.1";
export const PORT_TRIES = 40;
export const DEBOUNCE_MS = 100;
export const POLL_MS = 1000;

const MOVE_ON = new Set(["EADDRINUSE", "EACCES"]);

/** Resolves with the port actually bound, which is the only port anything may print. */
export function listen(server, port, host = HOST, tries = PORT_TRIES) {
  const last = port + tries - 1;
  return new Promise((bound, failed) => {
    let current = port;
    const attempt = () => {
      const onError = (error) => {
        if (!MOVE_ON.has(error.code)) return failed(error);
        if (current >= last) {
          return failed(new Error(`no free port between ${port} and ${last}`));
        }
        current += 1;
        attempt();
      };
      server.once("error", onError);
      server.listen(current, host, () => {
        server.removeListener("error", onError);
        bound(server.address().port);
      });
    };
    attempt();
  });
}

export function watchMode(platform = process.platform, version = process.versions.node) {
  if (platform !== "linux") return "native";
  return Number(version.split(".")[0]) >= 20 ? "native" : "poll";
}

function nativeWatcher(dirs, fire) {
  const handles = [];
  for (const dir of dirs) {
    try {
      const handle = watch(dir, { recursive: true }, () => fire());
      handle.on("error", () => {});
      handles.push(handle);
    } catch {
      /* a directory that is not there yet cannot be watched, and nothing changes in it */
    }
  }
  return {
    close() {
      for (const handle of handles) handle.close();
    },
  };
}

async function mark(dirs) {
  const marks = [];
  for (const dir of dirs) {
    for (const path of await walk(dir)) {
      try {
        const info = await stat(join(dir, path));
        marks.push(`${dir}/${path}:${info.mtimeMs}:${info.size}`);
      } catch {
        /* it went away between the walk and the stat, which the next pass reports */
      }
    }
  }
  return marks.join("\n");
}

function pollWatcher(dirs, fire, interval) {
  let previous = null;
  let stopped = false;
  let busy = false;

  const pass = async () => {
    if (stopped || busy) return;
    busy = true;
    try {
      const now = await mark(dirs);
      if (previous !== null && now !== previous) fire();
      previous = now;
    } finally {
      busy = false;
    }
  };

  const ready = pass();
  const timer = setInterval(pass, interval);
  return {
    ready,
    poll: pass,
    close() {
      stopped = true;
      clearInterval(timer);
    },
  };
}

/** One interface over both paths, so a test can force the poller. */
export function createWatcher({ dirs, onChange, mode = watchMode(), interval = POLL_MS }) {
  return mode === "poll" ? pollWatcher(dirs, onChange, interval) : nativeWatcher(dirs, onChange);
}

/** A loopback bind still answers a page that resolved its own name to 127.0.0.1, so name the host. */
export function hostAllowed(header, port) {
  if (typeof header !== "string") return false;
  return header === `${HOST}:${port}` || header === `localhost:${port}`;
}

function sse(request, response, clients) {
  response.writeHead(200, {
    "Content-Type": "text/event-stream; charset=utf-8",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  });
  response.write("retry: 1000\n\n");
  clients.add(response);
  request.on("close", () => clients.delete(response));
}

export async function serve({ root, config, options = {}, payload, warnings = [] }) {
  let current = payload;
  let bound = 0;
  const clients = new Set();

  const server = createServer((request, response) => {
    if (!hostAllowed(request.headers.host, bound)) {
      response.writeHead(403, { "Content-Type": "text/plain; charset=utf-8" });
      response.end("host not allowed\n");
      return;
    }
    const path = (request.url || "/").split("?")[0];
    if (path === "/events") return sse(request, response, clients);
    if (path === "/" || path === "/index.html") {
      bake({ payload: current, live: true }).then(
        (html) => {
          response.writeHead(200, {
            "Content-Type": "text/html; charset=utf-8",
            "Cache-Control": "no-store",
          });
          response.end(html);
        },
        (error) => {
          response.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
          response.end(`${error.message}\n`);
        }
      );
      return;
    }
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("not found\n");
  });

  const port = await listen(server, typeof options.port === "number" ? options.port : 8787);
  bound = port;
  const url = `http://${HOST}:${port}/`;

  const base = globRoot(config.tickets);
  const dirs = [base ? join(root, base) : root];

  let timer = null;
  let pending = null;

  const rescan = async () => {
    try {
      current = await scan({ root, config, warnings, version: pkg.version });
      const frame = `data: ${JSON.stringify(current)}\n\n`;
      for (const client of clients) client.write(frame);
    } catch (error) {
      process.stderr.write(`  scan failed: ${error.message}\n`);
    }
  };

  const onChange = () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      pending = rescan();
    }, DEBOUNCE_MS);
  };

  const watcher = createWatcher({ dirs, onChange, mode: options.watchMode });

  const say = options.print || ((text) => process.stdout.write(text));
  if (options.quiet !== true) {
    say(`${summary(current, options.report)}  serving ${url}\n  watching ${base || "."} · ctrl-c to stop\n`);
  }
  if (options.open !== false) (options.opener || openInBrowser)(url);

  return {
    url,
    port,
    server,
    watcher,
    clients,
    settled: () => pending,
    async close() {
      clearTimeout(timer);
      watcher.close();
      await pending;
      for (const client of clients) client.end();
      clients.clear();
      await new Promise((closed) => server.close(closed));
    },
  };
}
