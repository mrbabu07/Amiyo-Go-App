import assert from "node:assert/strict";
import test from "node:test";
import { loopbackOrigin, runAuthenticatedSmoke } from "./authenticated-marketplace-smoke.mjs";

test("authenticated demo smoke cannot send demo credentials to remote hosts", () => {
  for (const origin of ["https://example.com", "http://127.0.0.1.evil.test", "http://user:password@localhost:4000", "http://localhost/path", "http://localhost?token=secret"]) assert.throws(() => loopbackOrigin(origin));
  assert.equal(loopbackOrigin("http://127.0.0.1:4000").hostname, "127.0.0.1");
});

test("unavailable demo accounts fail closed without seeding or leaking provider errors", async () => {
  const calls = [];
  const report = await runAuthenticatedSmoke({ fetcher: async (url, options) => { calls.push({ url: String(url), options }); return new Response(JSON.stringify({ error: "private-provider-data" }), { status: 400 }); } });
  assert.equal(calls.length, 3);
  assert.ok(calls.every((call) => call.url.includes("signInWithPassword") && call.options.redirect === "error"));
  assert.equal(report.results.filter((result) => result.status === "fail").length, 3);
  assert.ok(report.results.some((result) => result.status === "skipped"));
  assert.doesNotMatch(JSON.stringify(report), /private-provider-data|AmiyoDemo123|idToken/);
});
