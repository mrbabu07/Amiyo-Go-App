import assert from "node:assert/strict";
import test from "node:test";
import type { PrismaClient } from "@prisma/client";
import type { Session, VendorRegistration } from "@amiyo/contracts";
import { VendorService } from "./vendor.service.js";

const userId = "11111111-1111-4111-8111-111111111111";
const categoryId = "22222222-2222-4222-8222-222222222222";
const session: Session = { principal: { userId, roles: ["CUSTOMER"], vendorIds: [] }, status: "ACTIVE", email: "seller@example.com", phone: null, profile: { firstName: null, lastName: null, displayName: "Seller", avatarStorageKey: null, locale: "en", currency: "BDT" }, permissions: [], vendorMemberships: [] };
const input: VendorRegistration = { legalName: "Seller Commerce", displayName: "Seller Shop", phone: "01700000000", address: { line1: "Road 1", division: "Dhaka", district: "Dhaka", upazila: "Savar" }, categoryIds: [categoryId], acceptedTerms: true, termsVersion: "2026.06", privacyVersion: "2026.06" };

test("vendor registration rejects an existing membership", async () => {
  const client = { vendorMember: { findFirst: async () => ({ id: "member" }) } } as unknown as PrismaClient;
  await assert.rejects(() => new VendorService(client).register(session, input), /already belongs to a vendor workspace/);
});

test("vendor registration obeys platform availability controls", async () => {
  const disabled = { platformConfiguration: { findUnique: async () => ({ featureFlags: { sellerRegistration: false }, maintenanceMode: { enabled: false } }) } } as unknown as PrismaClient;
  await assert.rejects(() => new VendorService(disabled).register(session, input), /temporarily paused/);
  const maintenance = { platformConfiguration: { findUnique: async () => ({ featureFlags: { sellerRegistration: true }, maintenanceMode: { enabled: true, message: "Scheduled maintenance is active" } }) } } as unknown as PrismaClient;
  await assert.rejects(() => new VendorService(maintenance).register(session, input), /Scheduled maintenance is active/);
});

test("vendor registration creates an owner workspace atomically", async () => {
  let vendorData: Record<string, unknown> | undefined;
  let roleAssigned = false;
  let transactionTimeout: number | undefined;
  const vendor = { id: "33333333-3333-4333-8333-333333333333", legalName: input.legalName, displayName: input.displayName, status: "PENDING", version: 1, shops: [{ id: "44444444-4444-4444-8444-444444444444", vendorId: "33333333-3333-4333-8333-333333333333", name: input.displayName, slug: "seller-shop", status: "DRAFT", description: null, settings: null, version: 1 }], kycSubmissions: [], bankAccounts: [] };
  const transaction = { role: { findUnique: async () => ({ id: "55555555-5555-4555-8555-555555555555" }) }, category: { findMany: async () => [{ id: categoryId }] }, vendor: { create: async ({ data }: { data: Record<string, unknown> }) => { vendorData = data; return vendor; } }, userRole: { upsert: async () => { roleAssigned = true; } }, auditLog: { create: async () => ({}) } };
  const client = { vendorMember: { findFirst: async () => null }, $transaction: async (operation: (value: typeof transaction) => Promise<unknown>, options?: { timeout?: number }) => { transactionTimeout = options?.timeout; return operation(transaction); } } as unknown as PrismaClient;
  const result = await new VendorService(client).register(session, input);
  assert.equal(result.status, "PENDING");
  assert.equal(roleAssigned, true);
  assert.equal(transactionTimeout, 60_000);
  assert.equal(vendorData?.displayName, input.displayName);
});

test("vendor report applies the selected period and derives fulfilment metrics", async () => {
  const reportSession = { ...session, principal: { ...session.principal, vendorIds: ["33333333-3333-4333-8333-333333333333"] }, permissions: ["vendor:read"], vendorMemberships: [{ vendorId: "33333333-3333-4333-8333-333333333333", role: "VENDOR_OWNER", permissions: ["vendor:read"] }] } as Session;
  let since: Date | undefined;
  const client = { vendorOrder: { findMany: async ({ where }: { where: { createdAt: { gte: Date } } }) => { since = where.createdAt.gte; return [{ id: "44444444-4444-4444-8444-444444444444", status: "DELIVERED", totalMinor: 25000n, createdAt: new Date() }, { id: "55555555-5555-4555-8555-555555555555", status: "CANCELLED", totalMinor: 10000n, createdAt: new Date() }]; } }, product: { count: async () => 4 }, inventoryItem: { count: async () => 2 }, return: { count: async () => 1 } } as unknown as PrismaClient;
  const report = await new VendorService(client).report(reportSession, 7);
  assert.equal(report.periodDays, 7); assert.equal(report.averageOrderMinor, "25000"); assert.equal(report.fulfilmentRate, 50); assert.equal(report.cancelledCount, 1); assert.equal(report.returnCount, 1); assert.ok(since instanceof Date);
});
