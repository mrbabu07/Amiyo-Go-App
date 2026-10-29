import assert from "node:assert/strict";
import test from "node:test";
import type { Request, Response } from "express";
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
  const first = createAuthenticationMiddleware(verifier, service);
  const second = createAuthenticationMiddleware(verifier, service);
  const request = (token = "valid") => {
    const headers: Record<string, string> = { authorization: `Bearer ${token}` };
    return { headers, header: (name: string) => headers[name.toLowerCase()] } as unknown as Request;
  };
  const invoke = async (middleware: typeof first, req: Request) => {
    let nextError: unknown;
    await middleware(req, {} as Response, (error?: unknown) => { nextError = error; });
    return nextError;
  };

  const shared = request();
  assert.equal(await invoke(first, shared), undefined);
  assert.equal(await invoke(second, shared), undefined);
  assert.deepEqual(requireSession(shared).permissions, ["orders:read"]);
  assert.equal(verifications, 1);
  assert.equal(synchronizations, 1);

  permissions = [];
  const refreshed = request();
  assert.equal(await invoke(first, refreshed), undefined);
  assert.deepEqual(requireSession(refreshed).permissions, []);
  assert.equal(verifications, 2);
  assert.equal(synchronizations, 2);

  const changed = request();
  assert.equal(await invoke(first, changed), undefined);
  changed.headers.authorization = "Bearer revoked";
  assert.ok(await invoke(second, changed) instanceof ApiProblem);
  assert.equal(verifications, 4);
  assert.equal(synchronizations, 3);

  assert.ok(await invoke(first, request("revoked")) instanceof ApiProblem);
  status = "SUSPENDED";
  const suspendedError = await invoke(first, request());
  assert.ok(suspendedError instanceof ApiProblem && suspendedError.status === 403);
  assert.equal(synchronizations, 4);
});
