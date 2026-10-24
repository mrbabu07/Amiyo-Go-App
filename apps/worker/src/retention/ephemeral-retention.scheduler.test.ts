import assert from "node:assert/strict";
import test from "node:test";
import { EphemeralRetentionScheduler } from "./ephemeral-retention.scheduler.js";

test("retention deletes only expired or terminal ephemeral records", async () => {
  const now = new Date("2026-10-24T12:00:00.000Z");
  const writes: Array<{ model: string; where: unknown }> = [];
  const operation = (model: string) => ({ deleteMany: ({ where }: { where: unknown }) => { const value = { model, where }; writes.push(value); return value; } });
  const client = { idempotencyRecord: operation("idempotency"), outboxEvent: operation("outbox"), refreshSession: operation("session"), notificationDelivery: operation("notification-delivery"), $transaction: async (operations: unknown[]) => operations };
  await new EphemeralRetentionScheduler(client as never, () => assert.fail("unexpected scheduler failure")).poll(now);
  assert.deepEqual(writes.map((item) => item.model), ["idempotency", "outbox", "session", "notification-delivery"]);
  assert.deepEqual(writes[0]?.where, { expiresAt: { not: null, lte: now } });
  assert.match(JSON.stringify(writes[1]?.where), /processed/);
  assert.match(JSON.stringify(writes[3]?.where), /DELIVERED/);
  assert.doesNotMatch(JSON.stringify(writes), /order|payment|refund|audit/i);
});

test("overlapping retention polls do not run concurrently", async () => {
  let transactions = 0;
  let release: () => void = () => undefined;
  const pending = new Promise<void>((resolve) => { release = resolve; });
  const operation = { deleteMany: () => ({}) };
  const client = { idempotencyRecord: operation, outboxEvent: operation, refreshSession: operation, notificationDelivery: operation, $transaction: async () => { transactions++; await pending; } };
  const scheduler = new EphemeralRetentionScheduler(client as never, () => assert.fail("unexpected scheduler failure"));
  const first = scheduler.poll();
  await Promise.resolve();
  await scheduler.poll();
  release();
  await first;
  assert.equal(transactions, 1);
});
