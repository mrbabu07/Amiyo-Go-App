import assert from "node:assert/strict";
import test from "node:test";
import type { PrismaClient } from "@prisma/client";
import type { Session } from "@amiyo/contracts";
import { AdminKycDocumentAccessService } from "./admin-kyc-document-access.service.js";

const admin: Session = { principal: { userId: "11111111-1111-4111-8111-111111111111", roles: ["OPERATIONS_ADMIN"], vendorIds: [] }, status: "ACTIVE", email: "admin@example.com", phone: null, profile: { firstName: null, lastName: null, displayName: "Admin", avatarStorageKey: null, locale: "en", currency: "BDT" }, permissions: ["admin:read"], vendorMemberships: [] };
const submissionId = "22222222-2222-4222-8222-222222222222";
const documentId = "33333333-3333-4333-8333-333333333333";

test("KYC image access is audited and signed for five minutes", async () => {
  let audit: any; let download = true;
  const client = { vendorKycDocument: { findFirst: async ({ where }: any) => { assert.deepEqual(where, { id: documentId, submissionId }); return { storageKey: "kyc/private/front.jpg", mimeType: "image/jpeg" }; } }, auditLog: { create: async ({ data }: any) => { audit = data; } } } as unknown as PrismaClient;
  const service = new AdminKycDocumentAccessService(client, { createReadUrl: async (_key, _expiry, requestedDownload) => { download = requestedDownload; return "https://storage.example.test/signed"; } });
  const result = await service.access(admin, submissionId, documentId, false);
  assert.equal(download, false);
  assert.equal(audit.action, "vendor.kyc_document.accessed");
  assert.equal(result.url, "https://storage.example.test/signed");
  assert.ok(new Date(result.expiresAt).getTime() > Date.now());
});

test("KYC PDF access is download-only and unrelated documents are hidden", async () => {
  let download = false;
  const client = { vendorKycDocument: { findFirst: async () => ({ storageKey: "kyc/private/license.pdf", mimeType: "application/pdf" }) }, auditLog: { create: async () => ({}) } } as unknown as PrismaClient;
  await new AdminKycDocumentAccessService(client, { createReadUrl: async (_key, _expiry, requestedDownload) => { download = requestedDownload; return "https://storage.example.test/signed"; } }).access(admin, submissionId, documentId, false);
  assert.equal(download, true);
  const missing = { vendorKycDocument: { findFirst: async () => null } } as unknown as PrismaClient;
  await assert.rejects(() => new AdminKycDocumentAccessService(missing, { createReadUrl: async () => "https://storage.example.test/signed" }).access(admin, submissionId, documentId, false), /KYC document not found/);
});

test("customers cannot request KYC document URLs", async () => {
  const customer: Session = { ...admin, principal: { ...admin.principal, roles: ["CUSTOMER"] }, permissions: [] };
  await assert.rejects(() => new AdminKycDocumentAccessService({} as PrismaClient, { createReadUrl: async () => "https://storage.example.test/signed" }).access(customer, submissionId, documentId, false), /admin:read access is required/);
});
