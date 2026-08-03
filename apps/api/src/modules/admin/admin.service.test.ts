import assert from "node:assert/strict"; import test from "node:test"; import type { PrismaClient } from "@prisma/client"; import type { Session } from "@amiyo/contracts"; import { AdminService } from "./admin.service.js";
const userId = "11111111-1111-4111-8111-111111111111"; const customer: Session = { principal: { userId, roles: ["CUSTOMER"], vendorIds: [] }, status: "ACTIVE", email: null, phone: null, profile: { firstName: null, lastName: null, displayName: "Customer", avatarStorageKey: null, locale: "en", currency: "BDT" }, permissions: ["catalog:read"], vendorMemberships: [] }; const admin: Session = { ...customer, principal: { ...customer.principal, roles: ["SUPER_ADMIN"] }, permissions: ["admin:read", "admin:manage"] };
test("customer cannot read admin trust queues", async () => { await assert.rejects(() => new AdminService({} as PrismaClient).workspace(customer), /admin:read access is required/); });
test("admin cannot suspend their own account", async () => { await assert.rejects(() => new AdminService({} as PrismaClient).updateUser(admin, userId, { status: "SUSPENDED", reason: "Security review" }), /cannot change your own account status/); });
test("admin cannot change their own platform roles", async () => { await assert.rejects(() => new AdminService({} as PrismaClient).updateUserRoles(admin, userId, { roles: [], reason: "Access review" }), /cannot change your own platform roles/); });
test("customer cannot read marketplace analytics", async () => { await assert.rejects(() => new AdminService({} as PrismaClient).analytics(customer, { range: "30d" }), /admin:read access is required/); });
test("admin analytics derives bigint-safe metrics and customer segments", async () => {
  let userCountCall = 0;
  const client = {
    user: { count: async () => ++userCountCall === 1 ? 20 : 3 },
    order: { aggregate: async () => ({ _count: { _all: 3 }, _sum: { totalMinor: 90000n } }), groupBy: async () => [{ userId: "customer-1", _count: { _all: 2 }, _sum: { totalMinor: 60000n } }, { userId: "customer-2", _count: { _all: 1 }, _sum: { totalMinor: 30000n } }] },
    orderItem: { groupBy: async () => [{ productId: "product-1", _sum: { quantity: 4, lineTotalMinor: 70000n } }] },
    vendorOrder: { groupBy: async () => [{ vendorId: "vendor-1", _count: { _all: 3 }, _sum: { totalMinor: 90000n } }] },
    product: { findMany: async () => [{ id: "product-1", name: "Top product" }] },
    vendor: { findMany: async () => [{ id: "vendor-1", displayName: "Top vendor" }] },
    $queryRaw: async () => [{ date: new Date("2026-08-01T00:00:00.000Z"), orders: 3n, revenue: 90000n }]
  } as unknown as PrismaClient;
  const result = await new AdminService(client).analytics(admin, { range: "30d" });
  assert.equal(result.summary.gmv.amountMinor, "90000");
  assert.equal(result.summary.averageOrderValue.amountMinor, "30000");
  assert.equal(result.summary.repeatPurchaseRate, 50);
  assert.equal(result.segments.find((segment) => segment.key === "regular")?.customers, 1);
  assert.equal(result.topProducts[0]?.name, "Top product");
});
