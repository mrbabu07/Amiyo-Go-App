import assert from "node:assert/strict";
import test from "node:test";
import type { Auth } from "firebase/auth";
import { installAuthenticatedFetchRetry } from "./auth-fetch";

test("Amiyo API retries one invalid access token with a forced refresh", async () => {
  const originalFetch = globalThis.fetch;
  const forcedRefreshes: boolean[] = [];
  const authorizations: string[] = [];
  let requests = 0;
  globalThis.fetch = async (_input, init) => {
    requests += 1;
    authorizations.push(new Headers(init?.headers).get("authorization") ?? "");
    return requests === 1
      ? new Response(JSON.stringify({ code: "INVALID_ACCESS_TOKEN" }), { status: 401, headers: { "content-type": "application/problem+json" } })
      : new Response(JSON.stringify({ status: "ok" }), { status: 200, headers: { "content-type": "application/json" } });
  };
  const auth = { currentUser: { getIdToken: async (force: boolean) => { forcedRefreshes.push(force); return "fresh-token"; } } } as unknown as Auth;

  try {
    installAuthenticatedFetchRetry(auth, "http://localhost:4000");
    const response = await fetch("http://localhost:4000/api/v2/auth/session", { headers: { authorization: "Bearer stale-token" } });
    assert.equal(response.status, 200);
    assert.equal(requests, 2);
    assert.deepEqual(forcedRefreshes, [true]);
    assert.deepEqual(authorizations, ["Bearer stale-token", "Bearer fresh-token"]);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
