import assert from "node:assert/strict";
import test from "node:test";
import express, { type NextFunction, type Request, type Response } from "express";
import type { AddressInfo } from "node:net";
import type { Session } from "@amiyo/contracts";
import { createIdentityRouter } from "./identity.routes.js";
import type { IdentityService } from "./identity.service.js";
import { ApiProblem } from "../../middleware/api-problem.js";

test("me reuses only this request's verified session without a duplicate database lookup", async () => {
  let synchronizations = 0;
  let status: Session["status"] = "ACTIVE";
  const service = {
    synchronizeSession: async (): Promise<Session> => { synchronizations++; return { status, principal: { userId: "user", roles: ["CUSTOMER"], vendorIds: [] }, phone: null, email: null, permissions: [], vendorMemberships: [], profile: { currency: "BDT", displayName: null, firstName: null, lastName: null, avatarStorageKey: null, locale: "en" } }; },
    getSession: async () => { throw new Error("Duplicate session query"); }
  } as unknown as IdentityService;
  const verifier = { verify: async (token: string) => { if (token !== "valid") throw new ApiProblem(401, "INVALID_ACCESS_TOKEN", "Invalid token"); return { subject: "user" }; } };
  const app = express();
  app.use(createIdentityRouter({ service, verifier }));
  app.use((error: ApiProblem, _req: Request, res: Response, _next: NextFunction) => { res.status(error.status).json({ code: error.code }); });
  const server = app.listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  try {
    for (let index = 0; index < 2; index++) {
      const response = await fetch(`${origin}/api/v2/me`, { headers: { Authorization: "Bearer valid" } });
      assert.equal(response.status, 200);
      assert.equal(response.headers.get("cache-control"), "no-store");
      assert.equal((await response.json()).principal.userId, "user");
    }
    assert.equal(synchronizations, 2);
    assert.equal((await fetch(`${origin}/api/v2/me`, { headers: { Authorization: "Bearer revoked" } })).status, 401);
    assert.equal(synchronizations, 2);
    status = "SUSPENDED";
    assert.equal((await fetch(`${origin}/api/v2/me`, { headers: { Authorization: "Bearer valid" } })).status, 403);
  } finally {
    server.closeAllConnections();
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
});
