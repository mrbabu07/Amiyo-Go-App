import assert from "node:assert/strict";
import test from "node:test";
import type { PrismaClient } from "@prisma/client";
import { platformFeatureEnabled } from "./platform-feature-flags.js";

test("platform feature controls default on and honor explicit admin shutdown", async () => {
  const disabled = { platformConfiguration: { findUnique: async () => ({ featureFlags: { reviews: false, questions: true } }) } } as unknown as PrismaClient;
  assert.equal(await platformFeatureEnabled(disabled, "reviews"), false);
  assert.equal(await platformFeatureEnabled(disabled, "questions"), true);
  const missing = { platformConfiguration: { findUnique: async () => null } } as unknown as PrismaClient;
  assert.equal(await platformFeatureEnabled(missing, "reviews"), true);
});
