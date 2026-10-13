import assert from "node:assert/strict";
import test from "node:test";
import { Prisma, type PrismaClient } from "@prisma/client";
import type { Session } from "@amiyo/contracts";
import { SupportService } from "./support.service.js";

const customerId = "11111111-1111-4111-8111-111111111111";
const ticketId = "22222222-2222-4222-8222-222222222222";
const returnId = "44444444-4444-4444-8444-444444444444";
const customer: Session = { principal: { userId: customerId, roles: ["CUSTOMER"], vendorIds: [] }, status: "ACTIVE", email: "customer@example.com", phone: null, profile: { firstName: null, lastName: null, displayName: "Customer", avatarStorageKey: null, locale: "en", currency: "BDT" }, permissions: ["support:manage"], vendorMemberships: [] };
const agentId = "66666666-6666-4666-8666-666666666666";
const agent: Session = { ...customer, principal: { userId: agentId, roles: ["SUPPORT_AGENT"], vendorIds: [] }, email: "agent@example.com", permissions: ["support:manage", "admin:read"] };

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
  await assert.rejects(() => new SupportService(client).addMessage(customer, ticketId, { body: "Any update?", attachments: [] }), /cannot access this support ticket/);
});

test("support staff can reply to a customer ticket", async () => {
  let created: { ticketId: string; senderId: string; body: string } | undefined;
  const client = {
    supportTicket: {
      findUnique: async () => ({ id: ticketId, userId: customerId }),
      update: async () => ({ id: ticketId, userId: customerId, orderId: null, returnId: null, subject: "Delivery update", category: "DELIVERY", priority: "normal", status: "open", assignedTo: null, createdAt: new Date(), updatedAt: new Date(), messages: [] })
    },
    supportMessage: { create: async ({ data }: any) => { created = data; } }
  } as unknown as PrismaClient;
  const ticket = await new SupportService(client).addMessage(agent, ticketId, { body: "Your delivery case is now under review.", attachments: [] });
  assert.deepEqual(created, { ticketId, senderId: agentId, body: "Your delivery case is now under review.", attachments: Prisma.JsonNull });
  assert.equal(ticket.id, ticketId);
});

test("support rejects attachments not owned by the sender", async () => {
  const client = { mediaUpload: { findMany: async () => [] } } as unknown as PrismaClient;
  await assert.rejects(() => new SupportService(client).create(customer, { subject: "Payment evidence", category: "PAYMENT", priority: "high", message: "Please review this receipt", attachments: [{ storageKey: "support/receipt.pdf", name: "receipt.pdf", mimeType: "application/pdf" }] }), /completed support upload owned by the sender/);
});

test("support cannot link a missing or another customer's order", async () => {
  const client = { order: { findFirst: async ({ where }: any) => {
    assert.deepEqual(where, { id: ticketId, userId: customerId });
    return null;
  } } } as unknown as PrismaClient;
  await assert.rejects(new SupportService(client).create(customer, { subject: "Return review", category: "RETURN", priority: "high", orderId: ticketId, message: "Please review my return", attachments: [] }), /Order not found in your account/);
});

test("support persists the verified owned order and return review priority", async () => {
  const client = {
    order: { findFirst: async ({ where }: any) => { assert.equal(where.userId, customerId); return { id: ticketId }; } },
    supportTicket: { create: async ({ data }: any) => {
      assert.equal(data.orderId, ticketId);
      assert.equal(data.category, "RETURN");
      assert.equal(data.priority, "high");
      assert.equal(data.userId, customerId);
      return { ...data, id: "ticket", assignedTo: null, status: "open", createdAt: new Date(), updatedAt: new Date(), messages: [] };
    } }
  } as unknown as PrismaClient;
  const ticket = await new SupportService(client).create(customer, { subject: "Return review", category: "RETURN", priority: "high", orderId: ticketId, message: "Please review my return", attachments: [] });
  assert.equal(ticket.orderId, ticketId);
});

test("support links an owned return and derives its verified order", async () => {
  const client = {
    return: { findFirst: async ({ where }: any) => {
      assert.deepEqual(where, { id: returnId, userId: customerId });
      return { id: returnId, orderId: ticketId };
    } },
    supportTicket: { create: async ({ data }: any) => {
      assert.equal(data.returnId, returnId);
      assert.equal(data.orderId, ticketId);
      return { ...data, id: "ticket", assignedTo: null, status: "open", createdAt: new Date(), updatedAt: new Date(), messages: [] };
    } }
  } as unknown as PrismaClient;
  const ticket = await new SupportService(client).create(customer, { subject: "Return review", category: "RETURN", priority: "high", returnId, message: "Please review my return", attachments: [] });
  assert.equal(ticket.returnId, returnId);
  assert.equal(ticket.orderId, ticketId);
});

test("support rejects a return outside the signed-in account", async () => {
  const client = { return: { findFirst: async () => null } } as unknown as PrismaClient;
  await assert.rejects(
    new SupportService(client).create(customer, { subject: "Return review", category: "RETURN", priority: "high", returnId, message: "Please review my return", attachments: [] }),
    /Return not found in your account/
  );
});

test("support rejects mismatched return and order references", async () => {
  const client = { return: { findFirst: async () => ({ id: returnId, orderId: ticketId }) } } as unknown as PrismaClient;
  await assert.rejects(
    new SupportService(client).create(customer, { subject: "Return review", category: "RETURN", priority: "high", returnId, orderId: "55555555-5555-4555-8555-555555555555", message: "Please review my return", attachments: [] }),
    /Return does not belong to the linked order/
  );
});
