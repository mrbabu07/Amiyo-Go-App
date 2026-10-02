import assert from "node:assert/strict";
import test from "node:test";
import { createCheckoutAttempt } from "./checkout-attempt";

test("network retry reuses the same idempotency key", async () => {
  let keys = 0;
  const attempt = createCheckoutAttempt<string>(() => `key-${++keys}`);
  await assert.rejects(attempt("customer:input", async (key) => { assert.equal(key, "key-1"); throw new Error("response lost"); }));
  assert.equal(await attempt("customer:input", async (key) => { assert.equal(key, "key-1"); return "order-1"; }), "order-1");
  assert.equal(keys, 1);
});

test("double submission shares the request and a confirmed result is not posted again", async () => {
  const attempt = createCheckoutAttempt<string>(() => "key");
  let calls = 0;
  const submit = async () => { calls++; return "order-1"; };
  assert.deepEqual(await Promise.all([attempt("input", submit), attempt("input", submit)]), ["order-1", "order-1"]);
  await attempt("input", submit);
  assert.equal(calls, 1);
});

test("different accounts and inputs do not share keys", async () => {
  let keys = 0;
  const attempt = createCheckoutAttempt<string>(() => `key-${++keys}`);
  assert.equal(await attempt("user-a:input", async (key) => key), "key-1");
  assert.equal(await attempt("user-b:input", async (key) => key), "key-2");
});

test("changed input cannot start a second checkout while the first is pending", async () => {
  const attempt = createCheckoutAttempt<string>(() => "key");
  let finish: (result: string) => void = () => {};
  const pending = attempt("first", () => new Promise<string>((resolve) => { finish = resolve; }));
  await Promise.resolve();
  await assert.rejects(attempt("second", async () => "unexpected"), /already in progress/);
  finish("order-1");
  assert.equal(await pending, "order-1");
});
