import assert from "node:assert/strict";
import test from "node:test";
import type { PrismaClient } from "@prisma/client";
import type { Session } from "@amiyo/contracts";
import { AdminService } from "./admin.service.js";

const admin: Session = { principal: { userId: "11111111-1111-4111-8111-111111111111", roles: ["SUPER_ADMIN"], vendorIds: [] }, status: "ACTIVE", email: null, phone: null, profile: { firstName: null, lastName: null, displayName: "Admin", avatarStorageKey: null, locale: "en", currency: "BDT" }, permissions: ["admin:read", "admin:manage"], vendorMemberships: [] };

test("manual payment approval consumes inventory before confirming the order", async () => {
  const writes: string[] = [];
  const transaction = verificationTransaction("PENDING_PAYMENT", true, writes);
  const service = new AdminService({ $transaction: async (operation: (value: typeof transaction) => Promise<unknown>) => operation(transaction) } as unknown as PrismaClient);
  service.platform = async () => ({ ok: true }) as never;

  await service.reviewPayment(admin, "verification", { status: "approved", reason: "Evidence verified" });

  assert.deepEqual(writes, ["inventory", "reservation", "payment", "order", "event", "verification", "audit"]);
});

test("manual payment approval refuses an expired inventory hold", async () => {
  const writes: string[] = [];
  const transaction = verificationTransaction("PENDING_PAYMENT", false, writes);
  const service = new AdminService({ $transaction: async (operation: (value: typeof transaction) => Promise<unknown>) => operation(transaction) } as unknown as PrismaClient);

  await assert.rejects(() => service.reviewPayment(admin, "verification", { status: "approved", reason: "Evidence verified" }), /inventory hold expired/);
  assert.deepEqual(writes, []);
});

function verificationTransaction(orderStatus: string, hasReservation: boolean, writes: string[]) {
  return {
    $queryRaw: async () => [],
    paymentVerification: {
      findUnique: async () => ({ id: "verification", paymentId: "payment", status: "pending", payment: { orderId: "order", order: { status: orderStatus } } }),
      update: async () => { writes.push("verification"); }
    },
    inventoryReservation: {
      findMany: async () => hasReservation ? [{ id: "reservation", variantId: "variant", quantity: 2, status: "ACTIVE" }] : [],
      updateMany: async () => { writes.push("reservation"); return { count: 1 }; }
    },
    inventoryItem: {
      findUnique: async () => ({ id: "inventory", onHand: 5, reserved: 2 }),
      update: async () => { writes.push("inventory"); }
    },
    payment: { update: async () => { writes.push("payment"); } },
    order: { update: async () => { writes.push("order"); } },
    orderStatusEvent: { create: async () => { writes.push("event"); } },
    auditLog: { create: async () => { writes.push("audit"); } }
  };
}
