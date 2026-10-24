import assert from "node:assert/strict";
import test from "node:test";
import { Prisma, type PrismaClient } from "@prisma/client";
import { IdentityService } from "./identity.service.js";
import { ApiProblem } from "../../middleware/api-problem.js";

const userId = "11111111-1111-4111-8111-111111111111";

function deletionRequest(executeAfter: Date) {
  return { id: "22222222-2222-4222-8222-222222222222", userId, status: "requested", reason: null, requestedAt: new Date("2026-08-01T00:00:00.000Z"), executeAfter, completedAt: null };
}

function sessionUser(lastLoginAt: Date | null) {
  return {
    id: userId,
    status: "ACTIVE",
    normalizedEmail: "customer@example.com",
    normalizedPhone: null,
    lastLoginAt,
    profile: { firstName: null, lastName: null, displayName: "Customer", avatarStorageKey: null, locale: "en", currency: "BDT" },
    roles: [],
    vendorMemberships: []
  };
}

function sessionRelations(user = sessionUser(new Date()), roles: () => unknown[] = () => user.roles) {
  return {
    userProfile: { findUnique: async () => user.profile },
    userRole: { findMany: async () => roles() },
    vendorMember: { findMany: async () => user.vendorMemberships }
  };
}

test("simultaneous session reads share work across service instances but never cache completed authorization", async () => {
  const user = sessionUser(new Date());
  let reads = 0;
  let release!: () => void;
  const gate = new Promise<void>((resolve) => { release = resolve; });
  const client = { ...sessionRelations(user), user: { findUnique: async () => { reads++; await gate; return user; } } } as unknown as PrismaClient;
  const first = new IdentityService(client);
  const second = new IdentityService(client);
  const requests = [first.getSession(userId), second.getSession(userId), first.getSession(userId)];
  assert.equal(reads, 1);
  release();
  const results = await Promise.all(requests);
  results[0]!.permissions.push("invented:permission");
  assert.ok(!results[1]!.permissions.includes("invented:permission"));
  user.status = "SUSPENDED";
  assert.equal((await second.getSession(userId)).status, "SUSPENDED");
  assert.equal(reads, 2);
});

test("synchronization shares only identical pending identities and releases failed work", async () => {
  const user = sessionUser(new Date());
  let reads = 0;
  let fail = true;
  const client = { ...sessionRelations(user), user: { findUnique: async () => { reads++; if (fail) throw new Error("Temporary read failure"); return user; } } } as unknown as PrismaClient;
  const service = new IdentityService(client);
  const identity = { subject: "firebase-customer", email: "customer@example.com" };
  const failures = await Promise.allSettled([service.synchronizeSession(identity), service.synchronizeSession(identity)]);
  assert.equal(reads, 1);
  assert.ok(failures.every((result) => result.status === "rejected"));
  fail = false;
  await Promise.all([service.synchronizeSession(identity), service.synchronizeSession(identity)]);
  assert.equal(reads, 2);
  await Promise.all([service.synchronizeSession(identity), service.synchronizeSession({ ...identity, displayName: "Changed" })]);
  assert.equal(reads, 4);
});

test("pending reads never cross database client or account boundaries", async () => {
  let reads = 0;
  const user = sessionUser(new Date());
  const createClient = () => ({ ...sessionRelations(user), user: { findUnique: async () => { reads++; return user; } } }) as unknown as PrismaClient;
  const first = new IdentityService(createClient());
  const second = new IdentityService(createClient());
  await Promise.all([first.getSession(userId), first.getSession("other"), second.getSession(userId)]);
  assert.equal(reads, 3);
});

test("session synchronization avoids repeated writes for active users", async () => {
  let updates = 0;
  let transactions = 0;
  const user = sessionUser(new Date());
  const client = {
    ...sessionRelations(user),
    user: { findUnique: async () => user, update: async () => { updates += 1; return user; } },
    $transaction: async () => { transactions += 1; }
  } as unknown as PrismaClient;
  const service = new IdentityService(client);
  await Promise.all(Array.from({ length: 8 }, () => service.synchronizeSession({ subject: "firebase-customer", email: "customer@example.com" })));
  assert.equal(updates, 0);
  assert.equal(transactions, 0);
});

test("anonymized identity tombstones never restore contact data on login", async () => {
  let updates = 0;
  const user = { ...sessionUser(null), status: "ANONYMIZED" as const, normalizedEmail: null, normalizedPhone: null };
  const client = { ...sessionRelations(), user: { findUnique: async () => user, update: async () => { updates++; return user; } } } as unknown as PrismaClient;
  const session = await new IdentityService(client).synchronizeSession({ subject: "firebase-customer", email: "restored@example.test", phone: "01700000000" });
  assert.equal(session.status, "ANONYMIZED");
  assert.equal(session.email, null);
  assert.equal(session.phone, null);
  assert.equal(updates, 0);
});

test("session synchronization refreshes stale login activity without a serializable transaction", async () => {
  let updateData: Record<string, unknown> | undefined;
  let updateIncludedRelations = false;
  const user = sessionUser(new Date(Date.now() - 10 * 60_000));
  const client = {
    ...sessionRelations(user),
    user: {
      findUnique: async () => user,
      update: async (input: { data: Record<string, unknown>; include?: unknown }) => { updateData = input.data; updateIncludedRelations = input.include !== undefined; return { ...user, lastLoginAt: input.data.lastLoginAt as Date }; }
    },
    $transaction: async () => { throw new Error("transaction should not run"); }
  } as unknown as PrismaClient;
  await new IdentityService(client).synchronizeSession({ subject: "firebase-customer", email: "customer@example.com" });
  assert.ok(updateData?.lastLoginAt instanceof Date);
  assert.equal(updateIncludedRelations, false);
});

test("session synchronization recovers from a concurrent login activity write", async () => {
  const user = sessionUser(new Date(Date.now() - 10 * 60_000));
  let reads = 0;
  const conflict = new Prisma.PrismaClientKnownRequestError("Concurrent login update", { code: "P2034", clientVersion: "5.22.0" });
  const client = {
    ...sessionRelations(user),
    user: {
      findUnique: async () => { reads += 1; return { ...user, lastLoginAt: reads > 1 ? new Date() : user.lastLoginAt }; },
      update: async () => { throw conflict; }
    }
  } as unknown as PrismaClient;
  const session = await new IdentityService(client).synchronizeSession({ subject: "firebase-customer", email: "customer@example.com" });
  assert.equal(session.status, "ACTIVE");
  assert.equal(reads, 2);
});

test("login write conflicts cannot resurrect a deleted account", async () => {
  let reads = 0;
  const client = { ...sessionRelations(), user: {
    findUnique: async () => ++reads === 1 ? sessionUser(null) : null,
    update: async () => { throw new Prisma.PrismaClientKnownRequestError("Conflict", { code: "P2034", clientVersion: "5.22.0" }); }
  } } as unknown as PrismaClient;
  await assert.rejects(() => new IdentityService(client).synchronizeSession({ subject: "firebase-customer" }),
    (error: unknown) => error instanceof ApiProblem && error.status === 401);
  assert.equal(reads, 2);
});

test("login conflict recovery uses current account status and permissions", async () => {
  let reads = 0;
  const previous = { ...sessionUser(null), roles: [{ role: { name: "SUPER_ADMIN", permissions: [{ permission: { key: "admin:manage" } }] } }] };
  const current = { ...sessionUser(new Date()), status: "SUSPENDED" };
  const client = { ...sessionRelations(current, () => reads === 1 ? previous.roles : current.roles), user: {
    findUnique: async () => ++reads === 1 ? previous : current,
    update: async () => { throw new Prisma.PrismaClientKnownRequestError("Conflict", { code: "P2034", clientVersion: "5.22.0" }); }
  } } as unknown as PrismaClient;
  const result = await new IdentityService(client).synchronizeSession({ subject: "firebase-customer" });
  assert.equal(result.status, "SUSPENDED");
  assert.deepEqual(result.principal.roles, []);
  assert.deepEqual(result.permissions, []);
});

test("failed login conflict rereads never fall back to stale permissions", async () => {
  let reads = 0;
  const failure = new Error("Database unavailable");
  const client = { ...sessionRelations(), user: {
    findUnique: async () => { if (++reads === 1) return sessionUser(null); throw failure; },
    update: async () => { throw new Prisma.PrismaClientKnownRequestError("Conflict", { code: "P2034", clientVersion: "5.22.0" }); }
  } } as unknown as PrismaClient;
  await assert.rejects(() => new IdentityService(client).synchronizeSession({ subject: "firebase-customer" }), (error: unknown) => error === failure);
});

test("session relations start concurrently and preserve scoped permissions", async () => {
  const user = sessionUser(new Date());
  const started: string[] = [];
  let release: () => void = () => {};
  const barrier = new Promise<void>((resolve) => { release = resolve; });
  const relation = async (name: string) => { started.push(name); if (started.length === 3) release(); await barrier; };
  const client = {
    user: { findUnique: async () => user },
    userProfile: { findUnique: async ({ where }: { where: unknown }) => { assert.deepEqual(where, { userId }); await relation("profile"); return user.profile; } },
    userRole: { findMany: async ({ where }: { where: unknown }) => { assert.deepEqual(where, { userId }); await relation("roles"); return [{ role: { name: "CUSTOMER", permissions: [{ permission: { key: "orders:read" } }] } }]; } },
    vendorMember: { findMany: async ({ where }: { where: unknown }) => {
      assert.deepEqual(where, { userId, status: "active" }); await relation("vendors");
      return [{ vendorId: "vendor", role: "OWNER", permissions: [{ granted: true, permissionKey: "orders:read" }, { granted: true, permissionKey: "products:manage" }, { granted: false, permissionKey: "payouts:manage" }] }];
    } }
  } as unknown as PrismaClient;
  const result = await new IdentityService(client).getSession(userId);
  assert.equal(started.length, 3);
  assert.deepEqual(result.permissions, ["orders:read", "products:manage"]);
  assert.deepEqual(result.principal.vendorIds, ["vendor"]);
  assert.equal(result.profile.displayName, "Customer");
});

test("missing accounts do not trigger relation reads", async () => {
  const client = { user: { findUnique: async () => null } } as unknown as PrismaClient;
  await assert.rejects(() => new IdentityService(client).getSession(userId), (error: unknown) => error instanceof ApiProblem && error.code === "USER_NOT_FOUND");
});

test("relation failures fail closed instead of returning partial permissions", async () => {
  const failure = new Error("Role query failed");
  const client = { ...sessionRelations(), user: { findUnique: async () => sessionUser(new Date()) }, userRole: { findMany: async () => { throw failure; } } } as unknown as PrismaClient;
  await assert.rejects(() => new IdentityService(client).getSession(userId), (error: unknown) => error === failure);
});

test("account deletion can be cancelled inside the recovery window", async () => {
  let auditAction = "";
  const existing = deletionRequest(new Date(Date.now() + 60_000));
  const transaction = { accountDeletionRequest: { findFirst: async () => existing, update: async () => ({ ...existing, status: "cancelled" }) }, auditLog: { create: async ({ data }: { data: { action: string } }) => { auditAction = data.action; } } };
  const client = { $transaction: async (operation: (value: typeof transaction) => Promise<unknown>) => operation(transaction) } as unknown as PrismaClient;
  const result = await new IdentityService(client).cancelDeletion(userId, "request-1");
  assert.equal(result.status, "cancelled");
  assert.equal(auditAction, "identity.deletion.cancelled");
});

test("account deletion cannot be cancelled after recovery expires", async () => {
  const existing = deletionRequest(new Date(Date.now() - 60_000));
  const transaction = { accountDeletionRequest: { findFirst: async () => existing } };
  const client = { $transaction: async (operation: (value: typeof transaction) => Promise<unknown>) => operation(transaction) } as unknown as PrismaClient;
  await assert.rejects(() => new IdentityService(client).cancelDeletion(userId), /recovery window has expired/);
});
