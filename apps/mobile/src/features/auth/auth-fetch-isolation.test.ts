import assert from "node:assert/strict";
import test from "node:test";
import type { Auth } from "firebase/auth";
import { authenticatedFetchRetry } from "./auth-fetch";

const invalid = () => new Response(JSON.stringify({ code: "INVALID_ACCESS_TOKEN" }), { status: 401 });
const request = { method: "POST", headers: { authorization: "Bearer old", "Idempotency-Key": "same-operation" }, body: "{}" };

test("a request from the previous account is never replayed as the new account", async () => {
  let refreshes = 0;
  let calls = 0;
  const auth = { currentUser: { uid: "first", getIdToken: async () => { refreshes++; return "new"; } } } as unknown as Auth;
  const fetcher = authenticatedFetchRetry(auth, "https://api.example.test", async () => {
    calls++;
    Object.assign(auth, { currentUser: { uid: "second" } });
    return invalid();
  });
  assert.equal((await fetcher("https://api.example.test/orders", request)).status, 401);
  assert.equal(calls, 1);
  assert.equal(refreshes, 0);
});

test("account changes during token refresh prevent replay and sign-out", async () => {
  let calls = 0;
  let signouts = 0;
  const auth = { currentUser: { uid: "first", getIdToken: async () => { Object.assign(auth, { currentUser: { uid: "second" } }); return "new"; } } } as unknown as Auth;
  const fetcher = authenticatedFetchRetry(auth, "https://api.example.test", async () => { calls++; return invalid(); }, async () => { signouts++; });
  await fetcher("https://api.example.test/orders", request);
  assert.equal(calls, 1);
  assert.equal(signouts, 0);
});

test("retry retains mutation body and idempotency key and signs out only after repeated invalid token", async () => {
  const auth = { currentUser: { uid: "first", getIdToken: async () => "fresh" } } as unknown as Auth;
  let calls = 0;
  let signouts = 0;
  const fetcher = authenticatedFetchRetry(auth, "https://api.example.test", async (_input, init) => {
    calls++;
    assert.equal(init?.body, "{}");
    assert.equal(new Headers(init?.headers).get("Idempotency-Key"), "same-operation");
    if (calls === 2) assert.equal(new Headers(init?.headers).get("authorization"), "Bearer fresh");
    return invalid();
  }, async () => { signouts++; });
  await fetcher("https://api.example.test/orders", request);
  assert.equal(calls, 2);
  assert.equal(signouts, 1);
});

test("transient token refresh failure does not sign the customer out", async () => {
  const auth = { currentUser: { uid: "first", getIdToken: async () => { throw { code: "auth/network-request-failed" }; } } } as unknown as Auth;
  let signouts = 0;
  const fetcher = authenticatedFetchRetry(auth, "https://api.example.test", async () => invalid(), async () => { signouts++; });
  assert.equal((await fetcher("https://api.example.test/orders", request)).status, 401);
  assert.equal(signouts, 0);
});

test("other origins never receive refreshed credentials", async () => {
  let refreshes = 0;
  const auth = { currentUser: { uid: "first", getIdToken: async () => { refreshes++; return "fresh"; } } } as unknown as Auth;
  const fetcher = authenticatedFetchRetry(auth, "https://api.example.test", async () => invalid());
  await fetcher("https://other.example.test/orders", request);
  assert.equal(refreshes, 0);
});

test("a delayed invalid retry cannot sign out a different account", async () => {
  let calls = 0;
  let signouts = 0;
  const auth = { currentUser: { uid: "first", getIdToken: async () => "fresh" } } as unknown as Auth;
  const fetcher = authenticatedFetchRetry(auth, "https://api.example.test", async () => {
    calls++;
    if (calls === 2) Object.assign(auth, { currentUser: { uid: "second" } });
    return invalid();
  }, async () => { signouts++; });
  await fetcher("https://api.example.test/orders", request);
  assert.equal(calls, 2);
  assert.equal(signouts, 0);
});

test("revoked credentials invalidate only the account that initiated refresh", async () => {
  let signouts = 0;
  const auth = { currentUser: { uid: "first", getIdToken: async () => { throw { code: "auth/user-disabled" }; } } } as unknown as Auth;
  const fetcher = authenticatedFetchRetry(auth, "https://api.example.test", async () => invalid(), async () => { signouts++; });
  await fetcher("https://api.example.test/orders", request);
  assert.equal(signouts, 1);
});
