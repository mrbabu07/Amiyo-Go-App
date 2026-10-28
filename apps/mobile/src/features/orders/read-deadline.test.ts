import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { URL } from "node:url";
import { withReadDeadline } from "../../network/request-deadline";

test("read deadlines abort stalled GET and HEAD without replay", async () => {
  for (const method of [undefined, "GET", "head"]) {
    let signal: AbortSignal | undefined;
    let attempts = 0;
    await assert.rejects(withReadDeadline(method, async (value) => { signal = value; attempts++; return new Promise<never>(() => {}); }, 5), /request took too long/);
    assert.equal(signal?.aborted, true);
    assert.equal(attempts, 1);
  }
});

test("read deadline wrapper preserves mutation behavior and typed failures", async () => {
  for (const method of ["POST", "PUT", "PATCH", "DELETE"]) {
    let calls = 0;
    assert.equal(await withReadDeadline(method, async (signal) => { calls++; assert.equal(signal, undefined); return "unchanged"; }, 1), "unchanged");
    assert.equal(calls, 1);
  }
  const failure = Object.assign(new Error("Rejected"), { status: 409, code: "RETURN_NOT_ELIGIBLE" });
  await assert.rejects(withReadDeadline("GET", async () => { throw failure; }), (error) => error === failure);
});

test("expired read token acquisition does not issue a late request", async () => {
  let resolve!: () => void;
  const token = new Promise<void>((ready) => { resolve = ready; });
  let requests = 0;
  await assert.rejects(withReadDeadline(undefined, async (signal) => { await token; if (signal?.aborted) throw new Error("Request timed out"); requests++; }, 5), /request took too long/);
  resolve();
  await Promise.resolve();
  assert.equal(requests, 0);
  for (const path of ["./orders.api.ts", "../operations/operations.api.ts", "../support/support.api.ts"]) {
    const source = readFileSync(new URL(path, import.meta.url), "utf8");
    assert.match(source, /withReadDeadline\(init\?\.method, async \(signal\)/);
    assert.match(source, /await user.getIdToken\(\); if \(signal\?\.aborted\)/);
    assert.match(source, /signal: signal \?\? init\?\.signal/);
  }
  const ordersApi = readFileSync(new URL("./orders.api.ts", import.meta.url), "utf8");
  assert.match(ordersApi, /cache: read \? "no-store" : init\?\.cache/);
});
