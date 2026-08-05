import assert from "node:assert/strict";
import test from "node:test";
import type { PrismaClient } from "@prisma/client";
import { IdentityService } from "./identity.service.js";

const userId = "11111111-1111-4111-8111-111111111111";

function deletionRequest(executeAfter: Date) {
  return { id: "22222222-2222-4222-8222-222222222222", userId, status: "requested", reason: null, requestedAt: new Date("2026-08-01T00:00:00.000Z"), executeAfter, completedAt: null };
}

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
