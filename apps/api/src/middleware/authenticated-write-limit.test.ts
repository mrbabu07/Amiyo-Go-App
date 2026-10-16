import assert from "node:assert/strict";
import test from "node:test";
import express from "express";
import { authenticatedWriteLimit } from "./authenticated-write-limit.js";

test("authenticated write limits are account-scoped and do not consume reads", async () => {
  const app = express();
  app.use((req, _res, next) => {
    const userId = req.header("x-test-user") || "customer-a";
    req.auth = { principal: { userId, roles: [], vendorIds: [] }, status: "ACTIVE", email: null, phone: null, profile: { firstName: null, lastName: null, displayName: null, avatarStorageKey: null, locale: "en", currency: "BDT" }, permissions: [], vendorMemberships: [] };
    next();
  });
  app.use(authenticatedWriteLimit({ code: "WRITE_RATE_LIMITED", limit: 2 }));
  app.all("/resource", (_req, res) => res.json({ ok: true }));
  const server = app.listen(0);
  await new Promise<void>((resolve) => server.once("listening", resolve));
  try {
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("Test server address unavailable");
    const url = `http://127.0.0.1:${address.port}/resource`;
    assert.equal((await fetch(url)).status, 200);
    assert.equal((await fetch(url, { method: "POST" })).status, 200);
    assert.equal((await fetch(url, { method: "POST" })).status, 200);
    const limited = await fetch(url, { method: "POST" });
    assert.equal(limited.status, 429);
    assert.equal((await limited.json() as { code: string }).code, "WRITE_RATE_LIMITED");
    assert.equal((await fetch(url, { method: "POST", headers: { "x-test-user": "customer-b" } })).status, 200);
  } finally {
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
});
