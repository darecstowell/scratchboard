import { test, ticket, writeRepo } from "./context.mjs";
import assert from "node:assert/strict";
import { createServer as createHttpServer, get } from "node:http";
import { createServer as createSocketServer } from "node:net";
import { writeFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { scan } from "../src/scan.mjs";
import {
  serve,
  listen,
  createWatcher,
  watchMode,
  hostAllowed,
  HOST,
  PORT_TRIES,
} from "../src/serve.mjs";

const CONFIG = {
  title: "Fixture",
  tickets: "tickets/**/*.md",
  format: "yaml-frontmatter",
  idPattern: "^(\\d+)-",
  lanes: [
    { name: "Todo", match: { path: "tickets/todo/**" } },
    { name: "Done", match: { path: "tickets/done/**" }, collapsed: true },
  ],
  facets: [{ field: "priority", colors: { p1: "amber" } }],
};

const card = (title) => ticket(title, { priority: "p1" }, `# ${title}\n\nbody text\n`);

const fixture = (t) =>
  writeRepo(t, {
    "tickets/todo/1-first.md": card("First"),
    "tickets/todo/2-second.md": card("Second"),
    "tickets/done/3-third.md": card("Third"),
  });

async function start(t, root, options = {}) {
  const payload = await scan({ root, config: CONFIG, version: "0.1.0" });
  const running = await serve({
    root,
    config: CONFIG,
    payload,
    options: { port: 0, open: false, quiet: true, ...options },
  });
  t.after(() => running.close());
  return running;
}

function fetchText(url) {
  return new Promise((done, failed) => {
    get(url, (response) => {
      let body = "";
      response.setEncoding("utf8");
      response.on("data", (chunk) => (body += chunk));
      response.on("end", () => done({ status: response.statusCode, headers: response.headers, body }));
    }).on("error", failed);
  });
}

/** One SSE reader that resolves on the first data frame after `act` runs. */
function firstEvent(url, act) {
  return new Promise((done, failed) => {
    const request = get(url, (response) => {
      let buffer = "";
      response.setEncoding("utf8");
      response.on("data", (chunk) => {
        buffer += chunk;
        const frame = buffer.split("\n\n").find((part) => part.startsWith("data: "));
        if (!frame) return;
        request.destroy();
        done({ headers: response.headers, data: JSON.parse(frame.slice(6)) });
      });
      response.on("error", () => {});
      setTimeout(act, 30);
    });
    request.on("error", (error) => {
      if (error.code !== "ECONNRESET") failed(error);
    });
    setTimeout(() => {
      request.destroy();
      failed(new Error("no sse frame arrived"));
    }, 8000).unref();
  });
}

function hold(port) {
  const blocker = createSocketServer();
  return new Promise((held) => {
    blocker.listen(port, HOST, () => held(blocker));
  });
}

const close = (server) =>
  new Promise((closed) => {
    server.close(closed);
  });

/** The host owns the ephemeral range too, so a contiguous run is found by trying. */
async function holdRun(count, attempts = 20) {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const first = await hold(0);
    const base = first.address().port;
    const held = [first];
    try {
      for (let step = 1; step < count; step += 1) held.push(await hold(base + step));
      return { base, held };
    } catch {
      for (const server of held) await close(server);
    }
  }
  throw new Error(`no run of ${count} free ports after ${attempts} attempts`);
}

test("the board binds 127.0.0.1 and nothing else", async (t) => {
  const running = await start(t, await fixture(t));
  const address = running.server.address();
  assert.equal(address.address, HOST);
  assert.equal(running.url, `http://127.0.0.1:${address.port}/`);
});

test("the printed url and the opened url both name the port really bound", async (t) => {
  const root = await fixture(t);
  const blocker = await hold(0);
  const taken = blocker.address().port;
  t.after(() => close(blocker));

  const printed = [];
  const opened = [];
  const running = await start(t, root, {
    port: taken,
    quiet: false,
    open: true,
    print: (text) => printed.push(text),
    opener: (url) => opened.push(url),
  });

  const bound = running.server.address().port;
  assert.ok(bound > taken && bound < taken + PORT_TRIES, `walked to ${bound} from ${taken}`);
  assert.equal(running.port, bound);
  assert.deepEqual(opened, [`http://127.0.0.1:${bound}/`]);
  assert.ok(printed.join("").includes(`serving http://127.0.0.1:${bound}/`));
  assert.equal(printed.join("").includes(String(taken)), false);
  assert.ok(printed.join("").includes("watching tickets"));

  const response = await fetchText(running.url);
  assert.equal(response.status, 200);
});

test("a busy port walks up, and the reported port is the one really bound", async (t) => {
  const blocker = await hold(0);
  const taken = blocker.address().port;
  t.after(() => close(blocker));

  const server = createHttpServer(() => {});
  t.after(() => close(server));

  /* another process on the host may own the next port, so the walk-up is a relation,
     not an exact step */
  const port = await listen(server, taken);
  assert.ok(port > taken && port < taken + PORT_TRIES, `walked to ${port} from ${taken}`);
  assert.equal(server.address().port, port);
});

test("it walks past a run of busy ports", async (t) => {
  const { base, held } = await holdRun(3);
  t.after(async () => {
    for (const server of held) await close(server);
  });

  const server = createHttpServer(() => {});
  t.after(() => close(server));
  const port = await listen(server, base);
  assert.ok(port >= base + 3, `stopped at ${port}, inside the run held from ${base}`);
  assert.ok(port < base + PORT_TRIES);
});

test("an exhausted range fails loudly and names it", async (t) => {
  const blocker = await hold(0);
  const taken = blocker.address().port;
  t.after(() => close(blocker));

  const server = createHttpServer(() => {});
  t.after(() => close(server));

  await assert.rejects(
    listen(server, taken, HOST, 1),
    new RegExp(`no free port between ${taken} and ${taken}`)
  );
});

test("the walk-up range is the forty ports the source board used", () => {
  assert.equal(PORT_TRIES, 40);
});

test("an error that is not a busy port stops the run", async (t) => {
  const server = createHttpServer(() => {});
  t.after(() => close(server));
  await assert.rejects(listen(server, 0, "203.0.113.1"), (error) => error.code !== undefined);
});

test("the served page is the baked board plus one events connection", async (t) => {
  const running = await start(t, await fixture(t));
  const response = await fetchText(running.url);

  assert.equal(response.status, 200);
  assert.match(response.headers["content-type"], /text\/html/);
  assert.ok(response.body.startsWith("<!--"));
  assert.ok(response.body.includes("Copyright 2021 The Martian Mono Project Authors"));
  assert.equal(response.body.match(/new EventSource\(/g).length, 1);
  assert.ok(response.body.includes('new EventSource("/events")'));
  assert.ok(response.body.includes("window.scratchboard.render"));
  assert.equal(response.body.includes('<script src="board.js">'), false);
  assert.ok(response.body.includes('"title":"First"'));
});

test("anything but the board and the stream is a 404", async (t) => {
  const running = await start(t, await fixture(t));
  const response = await fetchText(`${running.url}tickets/todo/1-first.md`);
  assert.equal(response.status, 404);
});

test("a ticket edit pushes one payload down the stream", async (t) => {
  const root = await fixture(t);
  const running = await start(t, root);

  const event = await firstEvent(`${running.url}events`, () =>
    writeFile(join(root, "tickets", "todo", "1-first.md"), card("First, renamed"))
  );

  assert.match(event.headers["content-type"], /text\/event-stream/);
  assert.equal(event.data.counts.total, 3);
  const titles = event.data.tickets.map((entry) => entry.title);
  assert.ok(titles.includes("First, renamed"));
  assert.equal(titles.includes("First"), false);
  assert.deepEqual(
    event.data.lanes.map((lane) => lane.name),
    ["Todo", "Done"]
  );
});

test("a new ticket file reaches the stream too", async (t) => {
  const root = await fixture(t);
  const running = await start(t, root);

  const event = await firstEvent(`${running.url}events`, () =>
    writeFile(join(root, "tickets", "todo", "4-fourth.md"), card("Fourth"))
  );
  assert.equal(event.data.counts.total, 4);
});

test("the poller drives the same push path as the native watcher", async (t) => {
  const root = await fixture(t);
  const running = await start(t, root, { watchMode: "poll" });
  assert.equal(typeof running.watcher.poll, "function");

  const event = await firstEvent(`${running.url}events`, () =>
    writeFile(join(root, "tickets", "todo", "2-second.md"), card("Second, edited"))
  );
  assert.ok(event.data.tickets.some((entry) => entry.title === "Second, edited"));
});

test("an edit made the instant the poller is serving still reaches the stream", async (t) => {
  const root = await fixture(t);
  const running = await start(t, root, { watchMode: "poll" });

  /* serve resolves only once the baseline is taken, so this edit is a change and
     not part of the snapshot the poller compares against */
  await writeFile(join(root, "tickets", "todo", "1-first.md"), card("First, raced"));

  const event = await firstEvent(`${running.url}events`, () => running.watcher.poll());
  assert.ok(event.data.tickets.some((entry) => entry.title === "First, raced"));
});

test("the poller reports a change on its own", async (t) => {
  const root = await fixture(t);
  let fired = 0;
  const watcher = createWatcher({
    dirs: [join(root, "tickets")],
    onChange: () => (fired += 1),
    mode: "poll",
    interval: 20,
  });
  t.after(() => watcher.close());

  await watcher.ready;
  assert.equal(fired, 0, "a quiet tree fires nothing");

  await writeFile(join(root, "tickets", "todo", "5-fifth.md"), card("Fifth"));
  await watcher.poll();
  assert.equal(fired, 1);

  await watcher.poll();
  assert.equal(fired, 1, "an unchanged tree fires nothing");

  await rm(join(root, "tickets", "todo", "5-fifth.md"));
  await watcher.poll();
  assert.equal(fired, 2, "a removal is a change");
});

test("the poller stops when it is closed", async (t) => {
  const root = await fixture(t);
  let fired = 0;
  const watcher = createWatcher({
    dirs: [join(root, "tickets")],
    onChange: () => (fired += 1),
    mode: "poll",
    interval: 20,
  });
  await watcher.ready;
  watcher.close();

  await writeFile(join(root, "tickets", "todo", "6-sixth.md"), card("Sixth"));
  await watcher.poll();
  assert.equal(fired, 0);
});

test("only node 18 on linux polls", () => {
  assert.equal(watchMode("linux", "18.20.8"), "poll");
  assert.equal(watchMode("linux", "20.11.0"), "native");
  assert.equal(watchMode("linux", "22.18.0"), "native");
  assert.equal(watchMode("darwin", "18.20.8"), "native");
  assert.equal(watchMode("win32", "18.20.8"), "native");
});

function fetchWithHost(port, host) {
  return new Promise((done, failed) => {
    const request = get({ host: HOST, port, path: "/", headers: { Host: host } }, (response) => {
      let body = "";
      response.setEncoding("utf8");
      response.on("data", (chunk) => (body += chunk));
      response.on("end", () => done({ status: response.statusCode, body }));
    });
    request.on("error", failed);
  });
}

test("a request naming another host is refused, however it reached the socket", async (t) => {
  const running = await start(t, await fixture(t));
  const { port } = running;

  for (const host of ["evil.example.com", `evil.example.com:${port}`, `127.0.0.1:${port + 1}`]) {
    const spoofed = await fetchWithHost(port, host);
    assert.equal(spoofed.status, 403, `Host: ${host} reached the board`);
    assert.equal(spoofed.body.includes("<!doctype"), false, "no ticket body leaves the process");
  }

  for (const host of [`127.0.0.1:${port}`, `localhost:${port}`]) {
    const allowed = await fetchWithHost(port, host);
    assert.equal(allowed.status, 200, `Host: ${host} was refused`);
  }
});

test("the event stream is behind the same host check", async (t) => {
  const running = await start(t, await fixture(t));
  const spoofed = await new Promise((done, failed) => {
    get(
      { host: HOST, port: running.port, path: "/events", headers: { Host: "evil.example.com" } },
      (response) => done(response.statusCode)
    ).on("error", failed);
  });
  assert.equal(spoofed, 403);
  assert.equal(running.clients.size, 0);
});

test("hostAllowed names the port that is really bound", () => {
  assert.equal(hostAllowed("127.0.0.1:8787", 8787), true);
  assert.equal(hostAllowed("localhost:8787", 8787), true);
  assert.equal(hostAllowed("127.0.0.1:8788", 8787), false);
  assert.equal(hostAllowed("127.0.0.1", 8787), false);
  assert.equal(hostAllowed(undefined, 8787), false);
});
