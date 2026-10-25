import assert from "node:assert/strict";
import test from "node:test";
import { adminCategoryControlSchema, adminCategoryInputSchema } from "./admin.js";

test("category return policies are bounded and explicit", () => {
  const category = { name: "Electronics", slug: "electronics", displayOrder: 1 };
  assert.equal(adminCategoryInputSchema.parse(category).returnPolicy, null);
  assert.equal(adminCategoryControlSchema.safeParse({ returnPolicy: { returnable: true, windowDays: 14, requireEvidence: true } }).success, true);
  assert.equal(adminCategoryControlSchema.safeParse({ returnPolicy: { returnable: true, windowDays: 0, requireEvidence: true } }).success, false);
  assert.equal(adminCategoryControlSchema.safeParse({ returnPolicy: null }).success, true);
  assert.equal(adminCategoryControlSchema.safeParse({}).success, false);
});
