import assert from "node:assert/strict";
import test from "node:test";
import type { Session } from "@amiyo/contracts";
import { assertReturnPolicy, effectiveReturnPolicy, inheritedCategoryPolicies, loadReturnPolicy } from "./return-policy.js";
import { OperationsService } from "./operations.service.js";
import { ApiProblem } from "../../middleware/api-problem.js";

const now = Date.parse("2026-10-03T00:00:00Z");
const base = { now, deadline: null, deliveredAt: new Date(now - 86400000), evidenceCount: 1, policy: { returnable: true, windowDays: 7, requireEvidence: true } };
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
  assert.deepEqual(await loadReturnPolicy({ platformConfiguration: { findUnique: async () => null } } as never), { returnable: true, windowDays: 7, requireEvidence: true });
  await assert.rejects(() => loadReturnPolicy({ platformConfiguration: { findUnique: async () => ({ returnPolicy: { windowDays: 0, requireEvidence: false } }) } } as never), /policy is unavailable/);
});

test("category return policies use the strictest selected product rule", () => {
  const globalPolicy = { returnable: true, windowDays: 14, requireEvidence: false };
  assert.deepEqual(effectiveReturnPolicy(globalPolicy, [null]), globalPolicy);
  assert.deepEqual(effectiveReturnPolicy(globalPolicy, [{ returnable: true, windowDays: 7, requireEvidence: true }]), { returnable: true, windowDays: 7, requireEvidence: true });
  assert.equal(effectiveReturnPolicy(globalPolicy, [{ returnable: false, windowDays: 1, requireEvidence: true }]).returnable, false);
  assert.throws(() => assertReturnPolicy({ deadline: null, deliveredAt: new Date(), evidenceCount: 1, policy: { returnable: false, windowDays: 1, requireEvidence: true }, now: Date.now() }), /not returnable/);
});

test("subcategory products inherit the nearest valid category return policy", () => {
  const parentPolicy = { returnable: true, windowDays: 14, requireEvidence: true };
  const childPolicy = { returnable: false, windowDays: 1, requireEvidence: true };
  const rows = [{ id: "root", parentId: null, returnPolicy: parentPolicy }, { id: "child", parentId: "root", returnPolicy: null }, { id: "leaf", parentId: "child", returnPolicy: childPolicy }, { id: "cycle-a", parentId: "cycle-b", returnPolicy: null }, { id: "cycle-b", parentId: "cycle-a", returnPolicy: null }];
  const policies = inheritedCategoryPolicies(rows, ["child", "leaf", "cycle-a", "missing"]);
  assert.deepEqual(policies.get("child"), parentPolicy);
  assert.deepEqual(policies.get("leaf"), childPolicy);
  assert.equal(policies.has("cycle-a"), false);
  assert.equal(policies.has("missing"), false);
});
test("creation enforces expiry before evidence lookup or return writes", async () => {
  const service = new OperationsService({ $transaction: async (operation: (transaction: unknown) => Promise<unknown>) => operation({
    idempotencyRecord: { findUnique: async () => null },
    vendorOrder: { findFirst: async () => ({ order: { returnWindowUntil: new Date(0) }, shipments: [{ deliveredAt: new Date(0) }], items: [{ id: "item", product: { category: { returnPolicy: null } }, returnItems: [] }] }) },
    platformConfiguration: { findUnique: async () => ({ returnPolicy: { windowDays: 7, requireEvidence: false } }) }
  }) } as never);
  const session = { status: "ACTIVE", principal: { userId: "customer", roles: ["CUSTOMER"], vendorIds: [] }, permissions: ["returns:manage"], phone: null, email: null, vendorMemberships: [], profile: { firstName: null, lastName: null, displayName: null, avatarStorageKey: null, currency: "BDT", locale: "en" } } satisfies Session;
  await assert.rejects(() => service.createReturn(session, { vendorOrderId: "package", reasonCode: "DAMAGED", refundMethod: "ORIGINAL_PAYMENT", items: [{ orderItemId: "item", quantity: 1 }] }, "key"), (error: unknown) => error instanceof ApiProblem && error.code === "RETURN_WINDOW_EXPIRED");
});
