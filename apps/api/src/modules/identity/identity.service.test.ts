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

test("session synchronization avoids repeated writes for active users", async () => {
  let updates = 0;
  let transactions = 0;
  const user = sessionUser(new Date());
  const client = {
    user: { findUnique: async () => user, update: async () => { updates += 1; return user; } },
    $transaction: async () => { transactions += 1; }
  } as unknown as PrismaClient;
  const service = new IdentityService(client);
  await Promise.all(Array.from({ length: 8 }, () => service.synchronizeSession({ subject: "firebase-customer", email: "customer@example.com" })));
  assert.equal(updates, 0);
  assert.equal(transactions, 0);
});

test("session synchronization refreshes stale login activity without a serializable transaction", async () => {
  let updateData: Record<string, unknown> | undefined;
  const user = sessionUser(new Date(Date.now() - 10 * 60_000));
  const client = {
    user: {
      findUnique: async () => user,
      update: async ({ data }: { data: Record<string, unknown> }) => { updateData = data; return { ...user, lastLoginAt: data.lastLoginAt as Date }; }
    },
    $transaction: async () => { throw new Error("transaction should not run"); }
  } as unknown as PrismaClient;
  await new IdentityService(client).synchronizeSession({ subject: "firebase-customer", email: "customer@example.com" });
  assert.ok(updateData?.lastLoginAt instanceof Date);
});

test("session synchronization recovers from a concurrent login activity write", async () => {
  const user = sessionUser(new Date(Date.now() - 10 * 60_000));
  let reads = 0;
  const conflict = new Prisma.PrismaClientKnownRequestError("Concurrent login update", { code: "P2034", clientVersion: "5.22.0" });
  const client = {
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
  const client = { user: {
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
  const client = { user: {
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
  const client = { user: {
    findUnique: async () => { if (++reads === 1) return sessionUser(null); throw failure; },
    update: async () => { throw new Prisma.PrismaClientKnownRequestError("Conflict", { code: "P2034", clientVersion: "5.22.0" }); }
  } } as unknown as PrismaClient;
  await assert.rejects(() => new IdentityService(client).synchronizeSession({ subject: "firebase-customer" }), (error: unknown) => error === failure);
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
