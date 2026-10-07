import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { URL } from "node:url";
import { withRequestDeadline } from "./request-deadline";

test("engagement requests return results and propagate definite failures unchanged", async () => {
  assert.equal(await withRequestDeadline(async () => "done"), "done");
  const failure = new Error("validation failed");
  await assert.rejects(withRequestDeadline(async () => { throw failure; }), (error) => error === failure);
});

test("a stalled request is aborted without automatically replaying a write", async () => {
  let attempts = 0;
  let signal: AbortSignal | undefined;
  await assert.rejects(withRequestDeadline(async (currentSignal) => {
    attempts += 1;
    signal = currentSignal;
    return new Promise<never>(() => {});
  }, 5), /Refresh to check the latest state/);
  assert.equal(signal?.aborted, true);
  assert.equal(attempts, 1);
});

test("a token resolved after the deadline cannot start a late HTTP mutation", async () => {
  let resolveToken!: () => void;
  const token = new Promise<void>((resolve) => { resolveToken = resolve; });
  let writes = 0;
  await assert.rejects(withRequestDeadline(async (signal) => {
    await token;
    if (signal.aborted) throw new Error("Request timed out");
    writes += 1;
  }, 5), /request took too long/);
  resolveToken();
  await Promise.resolve();
  assert.equal(writes, 0);
  const source = readFileSync(new URL("./engagement.api.ts", import.meta.url), "utf8");
  assert.match(source, /withRequestDeadline\(async \(signal\)/);
  assert.match(source, /await user.getIdToken\(\); if \(signal.aborted\)/);
  assert.match(source, /\.\.\.init, signal, headers/);
});
