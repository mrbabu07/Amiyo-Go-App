import assert from "node:assert/strict";
import test from "node:test";
import type { PrismaClient } from "@prisma/client";
import type { Session } from "@amiyo/contracts";
import { AdminPaymentEvidenceAccessService } from "./admin-payment-evidence-access.service.js";

const admin: Session = { principal: { userId: "11111111-1111-4111-8111-111111111111", roles: ["FINANCE_ADMIN"], vendorIds: [] }, status: "ACTIVE", email: "finance@example.com", phone: null, profile: { firstName: null, lastName: null, displayName: "Finance", avatarStorageKey: null, locale: "en", currency: "BDT" }, permissions: ["admin:read"], vendorMemberships: [] };
const verificationId = "22222222-2222-4222-8222-222222222222";
const uploadId = "33333333-3333-4333-8333-333333333333";

test("payment evidence access is ownership-bound, audited and signed for five minutes", async () => {
  let mediaWhere: unknown; let audit: any; let requestedDownload = true;
  const client = { paymentVerification: { findUnique: async () => ({ evidenceStorageKey: "private/payment_evidence/customer/proof.jpg" }) }, mediaUpload: { findFirst: async ({ where }: any) => { mediaWhere = where; return { storageKey: where.storageKey, mimeType: "image/jpeg" }; } }, auditLog: { create: async ({ data }: any) => { audit = data; } } } as unknown as PrismaClient;
  const result = await new AdminPaymentEvidenceAccessService(client, { createReadUrl: async (_key, _expiresAt, download) => { requestedDownload = download; return "https://storage.example.test/signed"; } }).access(admin, verificationId, uploadId, false);
  assert.deepEqual(mediaWhere, { id: uploadId, storageKey: "private/payment_evidence/customer/proof.jpg", purpose: "payment_evidence", visibility: "private", status: "ready" });
  assert.equal(requestedDownload, false);
  assert.equal(audit.action, "payment.verification_evidence.accessed");
  assert.equal(result.url, "https://storage.example.test/signed");
  assert.ok(new Date(result.expiresAt).getTime() > Date.now());
});

test("PDF evidence is download-only and mismatched uploads are hidden", async () => {
  let requestedDownload = false;
  const client = { paymentVerification: { findUnique: async () => ({ evidenceStorageKey: "private/payment_evidence/customer/proof.pdf" }) }, mediaUpload: { findFirst: async () => ({ storageKey: "private/payment_evidence/customer/proof.pdf", mimeType: "application/pdf" }) }, auditLog: { create: async () => ({}) } } as unknown as PrismaClient;
  await new AdminPaymentEvidenceAccessService(client, { createReadUrl: async (_key, _expiresAt, download) => { requestedDownload = download; return "https://storage.example.test/signed"; } }).access(admin, verificationId, uploadId, false);
  assert.equal(requestedDownload, true);
  const missing = { paymentVerification: { findUnique: async () => ({ evidenceStorageKey: "private/payment_evidence/customer/proof.pdf" }) }, mediaUpload: { findFirst: async () => null } } as unknown as PrismaClient;
  await assert.rejects(() => new AdminPaymentEvidenceAccessService(missing, { createReadUrl: async () => "https://storage.example.test/signed" }).access(admin, verificationId, uploadId, false), /Payment evidence not found/);
});

test("customers cannot request payment evidence URLs", async () => {
  const customer: Session = { ...admin, principal: { ...admin.principal, roles: ["CUSTOMER"] }, permissions: [] };
  await assert.rejects(() => new AdminPaymentEvidenceAccessService({} as PrismaClient, { createReadUrl: async () => "https://storage.example.test/signed" }).access(customer, verificationId, uploadId, false), /admin:read access is required/);
});
