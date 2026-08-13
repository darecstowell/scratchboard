import { test } from "node:test";
import assert from "node:assert/strict";
import { withCleanups } from "./context.mjs";

test("cleanups run in reverse order after the body", async () => {
  const order = [];
  await withCleanups(async (t) => {
    t.after(() => order.push("first registered"));
    t.after(() => order.push("second registered"));
    order.push("body");
  });
  assert.deepEqual(order, ["body", "second registered", "first registered"]);
});

test("a cleanup runs even when the body throws, and the failure still surfaces", async () => {
  const order = [];
  await assert.rejects(
    withCleanups(async (t) => {
      t.after(() => order.push("cleaned"));
      throw new Error("body failed");
    }),
    /body failed/
  );
  assert.deepEqual(order, ["cleaned"]);
});

test("every cleanup runs when one throws, and that failure surfaces", async () => {
  const order = [];
  await assert.rejects(
    withCleanups(async (t) => {
      t.after(() => order.push("first registered"));
      t.after(() => {
        throw new Error("cleanup failed");
      });
      t.after(() => order.push("third registered"));
    }),
    /cleanup failed/
  );
  assert.deepEqual(order, ["third registered", "first registered"]);
});

test("a failing cleanup does not hide the body failure", async () => {
  const order = [];
  await assert.rejects(
    withCleanups(async (t) => {
      t.after(() => order.push("cleaned"));
      t.after(() => {
        throw new Error("cleanup failed");
      });
      throw new Error("body failed");
    }),
    /body failed/
  );
  assert.deepEqual(order, ["cleaned"]);
});

test("an async cleanup is awaited", async () => {
  const order = [];
  await withCleanups(async (t) => {
    t.after(async () => {
      await new Promise((done) => {
        setTimeout(done, 1);
      });
      order.push("slow");
    });
  });
  assert.deepEqual(order, ["slow"]);
});
