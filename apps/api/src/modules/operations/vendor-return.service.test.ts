import assert from "node:assert/strict";
import test from "node:test";
import type { PrismaClient } from "@prisma/client";
import type { Session } from "@amiyo/contracts";
import { OperationsService } from "./operations.service.js";

const userId = "11111111-1111-4111-8111-111111111111";
const vendorId = "22222222-2222-4222-8222-222222222222";
const returnId = "33333333-3333-4333-8333-333333333333";
const session: Session = { principal: { userId, roles: ["CUSTOMER"], vendorIds: [vendorId] }, status: "ACTIVE", email: "seller@example.com", phone: null, profile: { firstName: null, lastName: null, displayName: "Seller", avatarStorageKey: null, locale: "en", currency: "BDT" }, permissions: ["returns:manage"], vendorMemberships: [{ vendorId, role: "VENDOR_STAFF", permissions: ["returns:manage"] }] };

test("seller return response rejects evidence owned by another user", async () => {
  const transaction = {
    idempotencyRecord: { findUnique: async () => null },
    return: { findUnique: async () => ({ id: returnId, status: "REQUESTED", version: 1, requestedMinor: 1000n, approvedMinor: null, items: [], vendorOrder: { vendorId } }) },
    mediaUpload: { findMany: async () => [] }
  };
  const client = { $transaction: async (operation: (value: unknown) => unknown) => operation(transaction) } as unknown as PrismaClient;
  await assert.rejects(() => new OperationsService(client).respondToVendorReturn(session, returnId, { expectedVersion: 1, action: "DISPUTE", reason: "Parcel evidence is inconsistent", notes: null, evidenceStorageKeys: ["return-evidence/foreign.jpg"] }, "44444444-4444-4444-8444-444444444444"), /completed return upload owned by the seller/);
});

test("seller return receipt requires the pickup-scheduled state", async () => {
  const transaction = { idempotencyRecord: { findUnique: async () => null }, return: { findUnique: async () => ({ id: returnId, status: "APPROVED", version: 2, items: [{ quantity: 1 }], vendorOrder: { vendorId } }) } };
  const client = { $transaction: async (operation: (value: unknown) => unknown) => operation(transaction) } as unknown as PrismaClient;
  await assert.rejects(() => new OperationsService(client).confirmVendorReturnReceipt(session, returnId, { expectedVersion: 2, condition: "received", receivedQuantity: 1, notes: null }, "55555555-5555-4555-8555-555555555555"), /picked-up return/);
});
