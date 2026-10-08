import assert from "node:assert/strict";
import test from "node:test";
import type { PrismaClient } from "@prisma/client";
import { CommerceService } from "./commerce.service.js";

test("cart add repeats a matching receipt without incrementing quantity and rejects changed payload", async () => {
  let quantity = 0;
  let receipt: { requestHash: string; expiresAt: Date } | null = null;
  let writes = 0;
  const cart = { id: "cart", currency: "BDT", items: [], updatedAt: new Date() };
  const transaction = {
    cart: { findFirst: async () => cart },
    productVariant: { findFirst: async () => ({ productId: "product", inventory: { onHand: 10, reserved: 0 }, priceMinor: 100n, currency: "BDT" }) },
    cartItem: { findUnique: async () => quantity ? { quantity } : null, upsert: async ({ create, update }: { create: { quantity: number }; update: { quantity: number } }) => { quantity = quantity ? update.quantity : create.quantity; writes++; } },
    idempotencyRecord: { findUnique: async ({ where }: { where: { scope_key: { scope: string } } }) => { assert.equal(where.scope_key.scope, "cart-add:customer"); return receipt; }, create: async ({ data }: { data: { requestHash: string; expiresAt: Date } }) => { receipt = data; } }
  };
  const client = { cart: transaction.cart, $transaction: async (operation: (value: typeof transaction) => Promise<unknown>, options: { isolationLevel: string }) => { assert.equal(options.isolationLevel, "Serializable"); return operation(transaction); } } as unknown as PrismaClient;
  const service = new CommerceService(client);
  await service.addItem("customer", "variant", 2, "key");
  await service.addItem("customer", "variant", 2, "key");
  assert.equal(quantity, 2);
  assert.equal(writes, 1);
  await assert.rejects(service.addItem("customer", "variant", 3, "key"), /different items/);
  assert.equal(writes, 1);
});
