import assert from "node:assert/strict";
import test from "node:test";
import express, { type NextFunction, type Request, type Response } from "express";
import type { AddressInfo } from "node:net";
import type { Session } from "@amiyo/contracts";
import { createAuthenticationMiddleware, readBearerToken, requireSession } from "./identity.middleware.js";
import type { IdentityService } from "./identity.service.js";
import { ApiProblem } from "../../middleware/api-problem.js";

test("reads a case-insensitive bearer token", () => {
  assert.equal(readBearerToken("bearer token-value"), "token-value");
});

test("rejects missing and malformed authorization", () => {
  for (const value of [undefined, "Basic abc", "Bearer "]) {
    assert.throws(() => readBearerToken(value), (error) => error instanceof ApiProblem && error.code === "AUTHENTICATION_REQUIRED");
  }
});

test("overlapping routers reuse verified authentication only within the same request", async () => {
  let verifications = 0;
  let synchronizations = 0;
  let status: Session["status"] = "ACTIVE";
  let permissions = ["orders:read"];
  const service = { synchronizeSession: async (): Promise<Session> => {
    synchronizations++;
    return { status, principal: { userId: "user", roles: ["CUSTOMER"], vendorIds: [] }, phone: null, email: null, permissions: [...permissions], vendorMemberships: [], profile: { currency: "BDT", displayName: null, firstName: null, lastName: null, avatarStorageKey: null, locale: "en" } };
  } } as unknown as IdentityService;
  const verifier = { verify: async (token: string) => {
    verifications++;
    if (token !== "valid") throw new ApiProblem(401, "INVALID_ACCESS_TOKEN", "Invalid token");
    return { subject: "user" };
  } };
  const app = express();
  app.use(createAuthenticationMiddleware(verifier, service));
  app.use((req, _res, next) => {
    if (req.path === "/changed-token") req.headers.authorization = "Bearer revoked";
    next();
  });
  app.use(createAuthenticationMiddleware(verifier, service));
  app.get(["/orders", "/changed-token"], (req, res) => res.json(requireSession(req)));
  app.use((error: ApiProblem, _req: Request, res: Response, _next: NextFunction) => res.status(error.status).json({ code: error.code }));
  const server = app.listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  const request = (path = "/orders", token = "valid") => fetch(`${origin}${path}`, { headers: { Authorization: `Bearer ${token}` } });
  try {
    assert.equal((await request()).status, 200);
    assert.equal(verifications, 1);
    assert.equal(synchronizations, 1);
    permissions = [];
    assert.deepEqual((await (await request()).json()).permissions, []);
    assert.equal(verifications, 2);
    assert.equal(synchronizations, 2);
    assert.equal((await request("/changed-token")).status, 401);
    assert.equal(verifications, 4);
    assert.equal(synchronizations, 3);
    assert.equal((await request("/orders", "revoked")).status, 401);
    status = "SUSPENDED";
    assert.equal((await request()).status, 403);
    assert.equal(synchronizations, 4);
  } finally {
    server.closeAllConnections();
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
});
