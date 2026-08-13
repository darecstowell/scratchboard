import { test as runnerTest } from "node:test";

const NOTHING = Symbol("nothing");

/**
 * Every cleanup runs in reverse order once the body settles, pass or throw.
 * A body failure outranks a cleanup failure, so the real fault reaches the runner.
 */
export async function withCleanups(body) {
  const cleanups = [];
  let result;
  let failure = NOTHING;

  try {
    result = await body({ after: (fn) => cleanups.unshift(fn) });
  } catch (error) {
    failure = error;
  }
  for (const fn of cleanups) {
    try {
      await fn();
    } catch (error) {
      if (failure === NOTHING) failure = error;
    }
  }

  if (failure !== NOTHING) throw failure;
  return result;
}

/** `t.after` landed in Node 18.13 and the floor is Node 18, so `t` is built here instead. */
export function test(name, body) {
  return runnerTest(name, () => withCleanups(body));
}
