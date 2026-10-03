import assert from "node:assert/strict";
import test from "node:test";
import type { Session } from "@amiyo/contracts";
import { assertReturnPolicy, loadReturnPolicy } from "./return-policy.js";
import { OperationsService } from "./operations.service.js";
import { ApiProblem } from "../../middleware/api-problem.js";

const now = Date.parse("2026-10-03T00:00:00Z");
const base = { now, deadline: null, deliveredAt: new Date(now - 86400000), evidenceCount: 1, policy: { windowDays: 7, requireEvidence: true } };
test("window ends at the exact configured boundary and honors explicit admin dates", () => {
  assert.doesNotThrow(() => assertReturnPolicy(base));
  assert.throws(() => assertReturnPolicy({ ...base, deliveredAt: new Date(now - 7 * 86400000) }), /window has ended/);
  assert.doesNotThrow(() => assertReturnPolicy({ ...base, deliveredAt: new Date(now - 30 * 86400000), deadline: new Date(now + 1) }));
  assert.throws(() => assertReturnPolicy({ ...base, deadline: new Date(now) }), /window has ended/);
  assert.doesNotThrow(() => assertReturnPolicy({ ...base, deliveredAt: null, deadline: new Date(now + 1) }));
});
test("unverified dates fail closed and evidence follows admin policy", () => {
  for (const deliveredAt of [null, new Date(NaN), new Date(now + 1)]) assert.throws(() => assertReturnPolicy({ ...base, deliveredAt }), /dates need verification/);
  assert.throws(() => assertReturnPolicy({ ...base, evidenceCount: 0 }), /Attach a private/);
  assert.doesNotThrow(() => assertReturnPolicy({ ...base, evidenceCount: 0, policy: { ...base.policy, requireEvidence: false } }));
});
test("missing configuration uses declared defaults but malformed configured policy is rejected", async () => {
  assert.deepEqual(await loadReturnPolicy({ platformConfiguration: { findUnique: async () => null } } as never), { windowDays: 7, requireEvidence: true });
  await assert.rejects(() => loadReturnPolicy({ platformConfiguration: { findUnique: async () => ({ returnPolicy: { windowDays: 0, requireEvidence: false } }) } } as never), /policy is unavailable/);
});
test("creation enforces expiry before evidence lookup or return writes", async () => {
  const service = new OperationsService({ $transaction: async (operation: (transaction: unknown) => Promise<unknown>) => operation({
    idempotencyRecord: { findUnique: async () => null },
    vendorOrder: { findFirst: async () => ({ order: { returnWindowUntil: new Date(0) }, shipments: [{ deliveredAt: new Date(0) }] }) },
    platformConfiguration: { findUnique: async () => ({ returnPolicy: { windowDays: 7, requireEvidence: false } }) }
  }) } as never);
  const session = { status: "ACTIVE", principal: { userId: "customer", roles: ["CUSTOMER"], vendorIds: [] }, permissions: ["returns:manage"], phone: null, email: null, vendorMemberships: [], profile: { firstName: null, lastName: null, displayName: null, avatarStorageKey: null, currency: "BDT", locale: "en" } } satisfies Session;
  await assert.rejects(() => service.createReturn(session, { vendorOrderId: "package", reasonCode: "DAMAGED", refundMethod: "ORIGINAL_PAYMENT", items: [{ orderItemId: "item", quantity: 1 }] }, "key"), (error: unknown) => error instanceof ApiProblem && error.code === "RETURN_WINDOW_EXPIRED");
});
