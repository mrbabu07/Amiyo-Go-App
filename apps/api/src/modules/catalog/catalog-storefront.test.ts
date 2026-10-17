import assert from "node:assert/strict";
import test from "node:test";
import type { PrismaClient } from "@prisma/client";
import { CatalogService } from "./catalog.service.js";

test("public shop projection exposes bounded decoration without operational settings", async () => {
  const client = { vendorShop: { findMany: async () => [{ id: "11111111-1111-4111-8111-111111111111", vendorId: "22222222-2222-4222-8222-222222222222", name: "Village Store", slug: "village-store", description: null, logoStorageKey: null, bannerStorageKey: null, version: 1, createdAt: new Date(), settings: { phone: "01700000000", pickupAddress: { address: "Private pickup address" }, storefront: { tagline: "  Fresh every day  ", announcement: "A".repeat(220), trustMessage: "Local verified seller" } }, _count: { products: 2 } }] } } as unknown as PrismaClient;
  const result = await new CatalogService(client).shops(undefined, 17);
  assert.deepEqual(result.data[0]?.storefront, { tagline: "Fresh every day", announcement: "A".repeat(180), trustMessage: "Local verified seller" });
  assert.equal("settings" in result.data[0]!, false);
  assert.doesNotMatch(JSON.stringify(result), /Private pickup address|01700000000/);
});
