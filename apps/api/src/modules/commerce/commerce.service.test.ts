import assert from "node:assert/strict";
import test from "node:test";
import type { PrismaClient } from "@prisma/client";
import type { Session } from "@amiyo/contracts";
import { CommerceService } from "./commerce.service.js";

const session = { principal: { userId: "11111111-1111-4111-8111-111111111111", roles: ["CUSTOMER"], vendorIds: [] }, status: "ACTIVE", email: null, phone: null, profile: { firstName: null, lastName: null, displayName: "Customer", avatarStorageKey: null, locale: "en", currency: "BDT" }, permissions: ["checkout:manage"], vendorMemberships: [] } as Session;
const checkout = { addressId: "22222222-2222-4222-8222-222222222222", paymentMethod: "SSLCOMMERZ" as const };

test("checkout rejects a payment method disabled by platform settings", async () => {
  const client = { platformConfiguration: { findUnique: async () => ({ maintenanceMode: { enabled: false }, paymentMethods: { cod: { enabled: true }, sslcommerz: { enabled: false }, bkashManual: { enabled: true } } }) } } as unknown as PrismaClient;
  await assert.rejects(() => new CommerceService(client).checkout(session, checkout, "checkout-key"), /not currently available/);
});

test("checkout rejects writes during platform maintenance", async () => {
  const client = { platformConfiguration: { findUnique: async () => ({ maintenanceMode: { enabled: true, message: "Scheduled maintenance is active" }, paymentMethods: { sslcommerz: { enabled: true } } }) } } as unknown as PrismaClient;
  await assert.rejects(() => new CommerceService(client).checkout(session, checkout, "checkout-key"), /Scheduled maintenance is active/);
});
