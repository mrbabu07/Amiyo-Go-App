import assert from "node:assert/strict";
import test from "node:test";
import { createVendorPayoutAttempt } from "../operations/vendor-payout-attempt";

test("payout retry reuses its idempotency key after an ambiguous failure", async () => {
  let keys = 0;
  const attempt = createVendorPayoutAttempt<string>(() => `key-${++keys}`);
  await assert.rejects(attempt.submit("vendor:bank:100", async (key) => { assert.equal(key, "key-1"); throw new Error("response lost"); }));
  assert.equal(await attempt.submit("vendor:bank:100", async (key) => key), "key-1");
  assert.equal(keys, 1);
});

test("concurrent payout submission shares one request and confirmed response", async () => {
  const attempt = createVendorPayoutAttempt<string>(() => "key");
  let calls = 0;
  const submit = () => attempt.submit("vendor:bank:100", async () => { calls++; return "request-1"; });
  assert.deepEqual(await Promise.all([submit(), submit()]), ["request-1", "request-1"]);
  assert.equal(await submit(), "request-1");
  assert.equal(calls, 1);
});

test("reset rotates the key only after a confirmed payout", async () => {
  let keys = 0;
  const attempt = createVendorPayoutAttempt<string>(() => `key-${++keys}`);
  assert.equal(await attempt.submit("vendor:bank:100", async (key) => key), "key-1");
  attempt.reset("vendor:bank:100");
  assert.equal(await attempt.submit("vendor:bank:100", async (key) => key), "key-2");
});

test("changed payout input cannot submit while another request is pending", async () => {
  const attempt = createVendorPayoutAttempt<string>(() => "key");
  let finish: (value: string) => void = () => {};
  const pending = attempt.submit("first", () => new Promise<string>((resolve) => { finish = resolve; }));
  await Promise.resolve();
  await assert.rejects(attempt.submit("second", async () => "unexpected"), /already in progress/);
  finish("request-1");
  assert.equal(await pending, "request-1");
});
