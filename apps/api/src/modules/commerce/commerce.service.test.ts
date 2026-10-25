import assert from "node:assert/strict";
import test from "node:test";
import type { PrismaClient } from "@prisma/client";
import type { Session } from "@amiyo/contracts";
import { CommerceService, shopVacationActive } from "./commerce.service.js";

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

test("checkout requires active-phone confirmation when village COD policy is enabled", async () => {
  const client = { platformConfiguration: { findUnique: async () => ({ maintenanceMode: { enabled: false }, paymentMethods: { cod: { enabled: true } }, villageOperations: { enabled: true, requireCodPhoneConfirmation: true } }) } } as unknown as PrismaClient;
  await assert.rejects(() => new CommerceService(client).checkout(session, { addressId: checkout.addressId, paymentMethod: "COD" }, "checkout-key"), /Confirm that the delivery phone number is active/);
});

test("checkout rejects pickup selection while the admin feature is disabled", async () => {
  const client = { platformConfiguration: { findUnique: async () => ({ maintenanceMode: { enabled: false }, paymentMethods: { cod: { enabled: true } }, villageOperations: { enabled: true, pickupPointsEnabled: false } }) } } as unknown as PrismaClient;
  await assert.rejects(() => new CommerceService(client).checkout(session, { addressId: checkout.addressId, pickupPointId: "33333333-3333-4333-8333-333333333333", paymentMethod: "COD", codPhoneConfirmed: true }, "checkout-key"), /pickup is currently unavailable/i);
});

test("shop vacation blocks only its active scheduled window", () => {
  const settings = { vacationMode: { enabled: true, startsAt: "2026-10-20T00:00:00.000Z", endsAt: "2026-10-22T00:00:00.000Z" } };
  assert.equal(shopVacationActive(settings, Date.parse("2026-10-21T12:00:00.000Z")), true);
  assert.equal(shopVacationActive(settings, Date.parse("2026-10-22T00:00:00.000Z")), false);
  assert.equal(shopVacationActive({ vacationMode: { ...settings.vacationMode, enabled: false } }, Date.parse("2026-10-21T12:00:00.000Z")), false);
});
