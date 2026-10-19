import assert from "node:assert/strict";
import test from "node:test";
import type { PrismaClient } from "@prisma/client";
import type { Session, VendorRegistration } from "@amiyo/contracts";
import { VendorService } from "./vendor.service.js";

const userId = "11111111-1111-4111-8111-111111111111";
const categoryId = "22222222-2222-4222-8222-222222222222";
const session: Session = { principal: { userId, roles: ["CUSTOMER"], vendorIds: [] }, status: "ACTIVE", email: "seller@example.com", phone: null, profile: { firstName: null, lastName: null, displayName: "Seller", avatarStorageKey: null, locale: "en", currency: "BDT" }, permissions: [], vendorMemberships: [] };
const input: VendorRegistration = { legalName: "Seller Commerce", displayName: "Seller Shop", phone: "01700000000", address: { line1: "Road 1", division: "Dhaka", district: "Dhaka", upazila: "Savar" }, categoryIds: [categoryId], acceptedTerms: true, termsVersion: "2026.06", privacyVersion: "2026.06" };
const vendorId = "33333333-3333-4333-8333-333333333333";
const kycSession: Session = { ...session, principal: { ...session.principal, roles: ["VENDOR_OWNER"], vendorIds: [vendorId] }, permissions: ["vendor:read", "kyc:manage"], vendorMemberships: [{ vendorId, role: "VENDOR_OWNER", permissions: ["vendor:read", "kyc:manage"] }] };
const shopSession: Session = { ...kycSession, permissions: ["vendor:read", "vendor:manage"], vendorMemberships: [{ vendorId, role: "VENDOR_OWNER", permissions: ["vendor:read", "vendor:manage"] }] };
const kycDocument = { documentType: "TRADE_LICENSE" as const, storageKey: `private/kyc/${userId}/license.pdf`, mimeType: "application/pdf", checksum: "a".repeat(64) };

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

test("shop media accepts only the seller's completed upload with the expected purpose", async () => {
  const shopId = "44444444-4444-4444-8444-444444444444";
  const uploadId = "66666666-6666-4666-8666-666666666666";
  let updateData: Record<string, unknown> | undefined;
  const workspace = { id: vendorId, legalName: "Seller Commerce", displayName: "Seller Shop", status: "APPROVED", version: 1, shops: [{ id: shopId, vendorId, name: "Seller Shop", slug: "seller-shop", status: "ACTIVE", description: null, logoStorageKey: "public/shop/logo.webp", bannerStorageKey: null, settings: null, version: 2 }], kycSubmissions: [], bankAccounts: [] };
  const transaction = { mediaUpload: { findMany: async ({ where }: any) => { assert.equal(where.userId, userId); assert.equal(where.visibility, "public"); assert.equal(where.status, "ready"); return [{ id: uploadId, purpose: "shop", storageKey: "public/shop/logo.webp" }]; } }, vendorShop: { updateMany: async ({ data }: any) => { updateData = data; return { count: 1 }; } }, auditLog: { create: async () => ({}) } };
  const client = { $transaction: async (operation: (value: typeof transaction) => Promise<unknown>) => operation(transaction), vendor: { findUniqueOrThrow: async () => workspace }, vendorShop: { findMany: async () => workspace.shops }, vendorKycSubmission: { findMany: async () => workspace.kycSubmissions }, vendorBankAccount: { findMany: async () => workspace.bankAccounts } } as unknown as PrismaClient;
  const result = await new VendorService(client).updateShop(shopSession, shopId, { version: 1, logoUploadId: uploadId });
  assert.equal(updateData?.logoStorageKey, "public/shop/logo.webp");
  assert.equal(result.shops[0]?.logoUrl, "https://media.amiyo.local/public/shop/logo.webp");

  transaction.mediaUpload.findMany = async () => [{ id: uploadId, purpose: "banner", storageKey: "public/banner/wrong.webp" }];
  await assert.rejects(() => new VendorService(client).updateShop(shopSession, shopId, { version: 1, logoUploadId: uploadId }), /completed public shop image upload/);
});

test("shop media can be cleared without trusting a client storage key", async () => {
  const shopId = "44444444-4444-4444-8444-444444444444";
  let updateData: Record<string, unknown> | undefined;
  const workspace = { id: vendorId, legalName: "Seller Commerce", displayName: "Seller Shop", status: "APPROVED", version: 1, shops: [], kycSubmissions: [], bankAccounts: [] };
  const transaction = { mediaUpload: { findMany: async () => { throw new Error("clear must not query uploads"); } }, vendorShop: { updateMany: async ({ data }: any) => { updateData = data; return { count: 1 }; } }, auditLog: { create: async () => ({}) } };
  const client = { $transaction: async (operation: (value: typeof transaction) => Promise<unknown>) => operation(transaction), vendor: { findUniqueOrThrow: async () => workspace }, vendorShop: { findMany: async () => workspace.shops }, vendorKycSubmission: { findMany: async () => workspace.kycSubmissions }, vendorBankAccount: { findMany: async () => workspace.bankAccounts } } as unknown as PrismaClient;
  await new VendorService(client).updateShop(shopSession, shopId, { version: 3, bannerUploadId: null });
  assert.equal(updateData?.bannerStorageKey, null);
});

test("KYC submission accepts only the seller's scanned private uploads", async () => {
  let created = false;
  const transaction = { vendorKycSubmission: { findFirst: async () => null, create: async () => { created = true; return { id: categoryId }; } }, mediaUpload: { findMany: async ({ where }: any) => { assert.deepEqual(where, { userId, purpose: "kyc", visibility: "private", status: "ready", storageKey: { in: [kycDocument.storageKey] } }); return []; } }, auditLog: { create: async () => ({}) } };
  const client = { $transaction: async (operation: (value: typeof transaction) => Promise<unknown>) => operation(transaction) } as unknown as PrismaClient;
  await assert.rejects(() => new VendorService(client).submitKyc(kycSession, { documents: [kycDocument] }), /private, scanned and completed upload/);
  assert.equal(created, false);
});

test("KYC submission is atomic and blocks another active review", async () => {
  const activeTransaction = { vendorKycSubmission: { findFirst: async () => ({ id: categoryId, status: "REVIEWING" }) } };
  const activeClient = { $transaction: async (operation: (value: typeof activeTransaction) => Promise<unknown>) => operation(activeTransaction) } as unknown as PrismaClient;
  await assert.rejects(() => new VendorService(activeClient).submitKyc(kycSession, { documents: [kycDocument] }), /reviewing KYC submission already exists/);

  let audited = false;
  const workspace = { id: vendorId, legalName: "Seller Commerce", displayName: "Seller Shop", status: "PENDING", version: 1, shops: [], kycSubmissions: [], bankAccounts: [] };
  const transaction = { vendorKycSubmission: { findFirst: async () => null, create: async ({ data }: any) => { assert.equal(data.documents.create[0].checksum, kycDocument.checksum); return { id: categoryId }; } }, mediaUpload: { findMany: async () => [{ storageKey: kycDocument.storageKey, mimeType: kycDocument.mimeType, checksum: kycDocument.checksum.toUpperCase() }] }, auditLog: { create: async () => { audited = true; } } };
  const client = { $transaction: async (operation: (value: typeof transaction) => Promise<unknown>) => operation(transaction), vendor: { findUniqueOrThrow: async () => workspace }, vendorShop: { findMany: async () => workspace.shops }, vendorKycSubmission: { findMany: async () => workspace.kycSubmissions }, vendorBankAccount: { findMany: async () => workspace.bankAccounts } } as unknown as PrismaClient;
  await new VendorService(client).submitKyc(kycSession, { documents: [kycDocument] });
  assert.equal(audited, true);
});

test("vendor report applies the selected period and derives fulfilment metrics", async () => {
  const reportSession = { ...session, principal: { ...session.principal, vendorIds: ["33333333-3333-4333-8333-333333333333"] }, permissions: ["vendor:read"], vendorMemberships: [{ vendorId: "33333333-3333-4333-8333-333333333333", role: "VENDOR_OWNER", permissions: ["vendor:read"] }] } as Session;
  let since: Date | undefined;
  const client = { vendorOrder: { findMany: async ({ where }: { where: { createdAt: { gte: Date } } }) => { since = where.createdAt.gte; return [{ id: "44444444-4444-4444-8444-444444444444", status: "DELIVERED", totalMinor: 25000n, createdAt: new Date(), order: { orderNumber: "AGO-1001" }, shop: { name: "Seller Shop" }, _count: { items: 2 } }, { id: "55555555-5555-4555-8555-555555555555", status: "CANCELLED", totalMinor: 10000n, createdAt: new Date(), order: { orderNumber: "AGO-1002" }, shop: { name: "Seller Shop" }, _count: { items: 1 } }]; } }, product: { count: async () => 4 }, inventoryItem: { count: async () => 2 }, return: { count: async () => 1 } } as unknown as PrismaClient;
  const report = await new VendorService(client).report(reportSession, 7);
  assert.equal(report.periodDays, 7); assert.equal(report.averageOrderMinor, "25000"); assert.equal(report.fulfilmentRate, 50); assert.equal(report.cancelledCount, 1); assert.equal(report.returnCount, 1); assert.equal(report.recentOrders[0]?.orderNumber, "AGO-1001"); assert.equal(report.recentOrders[0]?.itemCount, 2); assert.ok(since instanceof Date);
});
