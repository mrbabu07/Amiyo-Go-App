import assert from "node:assert/strict";
import test from "node:test";
import { ShutdownTimeoutError, withShutdownTimeout } from "./shutdown-timeout.js";

test("worker shutdown returns completed cleanup", async () => {
  assert.equal(await withShutdownTimeout(Promise.resolve("closed"), 100), "closed");
});

test("worker shutdown fails after its bounded drain window", async () => {
  await assert.rejects(withShutdownTimeout(new Promise(() => undefined), 5), (error: unknown) => error instanceof ShutdownTimeoutError && error.timeoutMs === 5);
});
