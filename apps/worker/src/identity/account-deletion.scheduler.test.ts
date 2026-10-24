import assert from "node:assert/strict";
import test from "node:test";
import { AccountDeletionScheduler } from "./account-deletion.scheduler.js";

test("expired deletion requests anonymize direct identity data atomically", async () => {
  const now = new Date("2026-10-24T12:00:00.000Z");
  const calls: string[] = [];
  const transaction = {
    $queryRaw: async () => { calls.push("lock"); return []; },
    accountDeletionRequest: { findUnique: async () => ({ id: "request", userId: "user", status: "requested", executeAfter: new Date("2026-10-23T12:00:00.000Z"), completedAt: null, user: { id: "user", status: "ACTIVE", providerSubject: "firebase-user", normalizedEmail: "buyer@example.test", normalizedPhone: "01700000000" } }), update: async () => { calls.push("request"); } },
    pushToken: { updateMany: async () => { calls.push("tokens"); } }, device: { updateMany: async () => { calls.push("devices"); } }, refreshSession: { updateMany: async () => { calls.push("sessions"); } },
    stockAlert: { updateMany: async () => { calls.push("stock-alerts"); } }, flashSaleAlert: { updateMany: async () => { calls.push("flash-alerts"); } }, address: { deleteMany: async () => { calls.push("addresses"); } },
    userProfile: { updateMany: async ({ data }: { data: Record<string, unknown> }) => { assert.equal(data.displayName, null); calls.push("profile"); } },
    user: { update: async ({ data }: { data: Record<string, unknown> }) => { assert.equal(data.status, "ANONYMIZED"); assert.equal(data.normalizedEmail, null); calls.push("user"); } },
    auditLog: { create: async () => { calls.push("audit"); } }
  };
  const client = { accountDeletionRequest: { findMany: async () => [{ id: "request" }] }, $transaction: async (run: (value: typeof transaction) => Promise<void>) => run(transaction) };
  const provider = { deleteIdentity: async (subject: string) => { assert.equal(subject, "firebase-user"); calls.push("provider"); } };
  await new AccountDeletionScheduler(client as never, provider, () => assert.fail("unexpected scheduler failure")).poll(now);
  assert.deepEqual(calls, ["lock", "provider", "tokens", "devices", "sessions", "stock-alerts", "flash-alerts", "addresses", "profile", "user", "request", "audit"]);
});

test("deletion scheduler ignores requests still inside recovery", async () => {
  let transactions = 0;
  const client = { accountDeletionRequest: { findMany: async ({ where }: { where: { executeAfter: { lte: Date } } }) => { assert.ok(where.executeAfter.lte); return []; } }, $transaction: async () => { transactions++; } };
  await new AccountDeletionScheduler(client as never, { deleteIdentity: async () => assert.fail("unexpected provider call") }, () => assert.fail("unexpected scheduler failure")).poll();
  assert.equal(transactions, 0);
});

test("provider failure rolls back anonymization and is reported for retry", async () => {
  const errors: unknown[] = [];
  let anonymized = false;
  const transaction = {
    $queryRaw: async () => [],
    accountDeletionRequest: { findUnique: async () => ({ id: "request", userId: "user", status: "scheduled", executeAfter: new Date(0), completedAt: null, user: { id: "user", status: "ACTIVE", providerSubject: "firebase-user", normalizedEmail: null, normalizedPhone: null } }) },
    user: { update: async () => { anonymized = true; } }
  };
  const client = { accountDeletionRequest: { findMany: async () => [{ id: "request" }] }, $transaction: async (run: (value: typeof transaction) => Promise<void>) => run(transaction) };
  const providerError = new Error("firebase unavailable");
  await new AccountDeletionScheduler(client as never, { deleteIdentity: async () => { throw providerError; } }, (error) => errors.push(error)).poll(new Date());
  assert.equal(anonymized, false);
  assert.deepEqual(errors, [providerError]);
});
