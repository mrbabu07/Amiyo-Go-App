import assert from "node:assert/strict";
import test from "node:test";
import type { PrismaClient } from "@prisma/client";
import type { Session } from "@amiyo/contracts";
import { OperationsService } from "./operations.service.js";

const vendorId = "11111111-1111-4111-8111-111111111111";
const seller = { principal: { userId: "seller", roles: ["VENDOR_OWNER"], vendorIds: [vendorId] }, status: "ACTIVE", permissions: ["finance:read"], vendorMemberships: [] } as unknown as Session;

test("seller finance exposes the current admin payout policy", async () => {
  const client = {
    vendorWallet: { findUnique: async () => null },
    vendorPayoutRequest: { findMany: async () => [] },
    platformConfiguration: { findUnique: async () => ({ version: 4, featureFlags: { settlement: { minimumPayoutMinor: "125000", holdDays: 5, cadenceDays: 14, automaticProposal: true } } }) }
  } as unknown as PrismaClient;

  const result = await new OperationsService(client).finance(seller);

  assert.deepEqual(result.payoutPolicy, { minimum: { amountMinor: "125000", currency: "BDT" }, holdDays: 5, cadenceDays: 14 });
  assert.equal(result.balance.amountMinor, "0");
});
