import assert from "node:assert/strict";
import test from "node:test";
import type { PrismaClient } from "@prisma/client";
import type { Session } from "@amiyo/contracts";
import { SupportAttachmentAccessService } from "./support-attachment-access.service.js";

const customerId = "11111111-1111-4111-8111-111111111111";
const ticketId = "22222222-2222-4222-8222-222222222222";
const uploadId = "33333333-3333-4333-8333-333333333333";
const customer: Session = { principal: { userId: customerId, roles: ["CUSTOMER"], vendorIds: [] }, status: "ACTIVE", email: "customer@example.com", phone: null, profile: { firstName: null, lastName: null, displayName: "Customer", avatarStorageKey: null, locale: "en", currency: "BDT" }, permissions: ["support:manage"], vendorMemberships: [] };

test("customer receives an audited signed URL only for an attachment on their ticket", async () => {
  let owner = ""; let disposition = false; let audit: any;
  const client = {
    supportTicket: { findFirst: async ({ where }: any) => { owner = where.userId; return { messages: [{ attachments: [{ storageKey: "support/customer/photo.png" }] }] }; } },
    mediaUpload: { findFirst: async ({ where }: any) => { assert.deepEqual(where.storageKey.in, ["support/customer/photo.png"]); return { storageKey: "support/customer/photo.png", mimeType: "image/png" }; } },
    auditLog: { create: async ({ data }: any) => { audit = data; } }
  } as unknown as PrismaClient;
  const storage = { createReadUrl: async (_key: string, _expiresAt: Date, download: boolean) => { disposition = download; return "https://storage.example.test/signed"; } };
  const result = await new SupportAttachmentAccessService(client, storage).access(customer, ticketId, uploadId, false);
  assert.equal(owner, customerId);
  assert.equal(disposition, false);
  assert.equal(audit.action, "support.attachment.accessed");
  assert.equal(result.url, "https://storage.example.test/signed");
});

test("PDF support attachments always download", async () => {
  let disposition = false;
  const client = {
    supportTicket: { findFirst: async () => ({ messages: [{ attachments: [{ storageKey: "support/customer/document.pdf" }] }] }) },
    mediaUpload: { findFirst: async () => ({ storageKey: "support/customer/document.pdf", mimeType: "application/pdf" }) },
    auditLog: { create: async () => ({}) }
  } as unknown as PrismaClient;
  const storage = { createReadUrl: async (_key: string, _expiresAt: Date, download: boolean) => { disposition = download; return "https://storage.example.test/signed"; } };
  await new SupportAttachmentAccessService(client, storage).access(customer, ticketId, uploadId, false);
  assert.equal(disposition, true);
});

test("customer cannot access a foreign support ticket", async () => {
  const client = { supportTicket: { findFirst: async () => null } } as unknown as PrismaClient;
  await assert.rejects(() => new SupportAttachmentAccessService(client, { createReadUrl: async () => "https://storage.example.test/signed" }).access(customer, ticketId, uploadId, false), /Support ticket not found/);
});
