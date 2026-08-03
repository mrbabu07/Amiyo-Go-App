import assert from "node:assert/strict";
import test from "node:test";
import type { PrismaClient } from "@prisma/client";
import type { Session } from "@amiyo/contracts";
import { SupportService } from "./support.service.js";

const customerId = "11111111-1111-4111-8111-111111111111";
const ticketId = "22222222-2222-4222-8222-222222222222";
const customer: Session = { principal: { userId: customerId, roles: ["CUSTOMER"], vendorIds: [] }, status: "ACTIVE", email: "customer@example.com", phone: null, profile: { firstName: null, lastName: null, displayName: "Customer", avatarStorageKey: null, locale: "en", currency: "BDT" }, permissions: ["support:manage"], vendorMemberships: [] };

test("customer support list is scoped to the signed-in user", async () => {
  let scopedUserId = "";
  const client = { supportTicket: { findMany: async ({ where }: { where: { userId: string } }) => { scopedUserId = where.userId; return []; } } } as unknown as PrismaClient;
  assert.deepEqual(await new SupportService(client).listMine(customer), []);
  assert.equal(scopedUserId, customerId);
});

test("customer cannot read the staff support queue", async () => {
  await assert.rejects(() => new SupportService({} as PrismaClient).listAdmin(customer), /Support staff access is required/);
});

test("customer cannot reply to another customer's ticket", async () => {
  const client = { supportTicket: { findUnique: async () => ({ id: ticketId, userId: "33333333-3333-4333-8333-333333333333" }) } } as unknown as PrismaClient;
  await assert.rejects(() => new SupportService(client).addMessage(customer, ticketId, { body: "Any update?" }), /cannot access this support ticket/);
});
