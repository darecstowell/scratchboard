import { test as runnerTest } from "node:test";

/** Cleanups run in reverse order once the body settles, pass or throw. */
export async function withCleanups(body) {
  const cleanups = [];
  try {
    return await body({ after: (fn) => cleanups.unshift(fn) });
  } finally {
    for (const fn of cleanups) await fn();
  }
}

/** `t.after` landed in Node 18.13 and the floor is Node 18, so `t` is built here instead. */
export function test(name, body) {
  return runnerTest(name, () => withCleanups(body));
}
