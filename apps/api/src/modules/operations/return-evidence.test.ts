import assert from "node:assert/strict";
import test from "node:test";
import { validateCustomerReturnEvidence } from "./return-evidence.js";

test("return evidence checks owner, purpose, privacy and completion", async () => {
  const client = { mediaUpload: { findMany: async (query: any) => {
    assert.deepEqual(query.where, { userId: "buyer", purpose: "return_evidence", visibility: "private", storageKey: { in: ["private/evidence"] }, status: { in: ["uploaded", "processing", "ready"] } });
    return [{ storageKey: "private/evidence" }];
  } } };
  assert.deepEqual(await validateCustomerReturnEvidence(client as never, "buyer", ["private/evidence"]), ["private/evidence"]);
});
test("return evidence rejects missing, duplicate and excessive keys", async () => {
  const client = { mediaUpload: { findMany: async () => [] } };
  await assert.rejects(validateCustomerReturnEvidence(client as never, "buyer", ["foreign"]), /owned by you/);
  await assert.rejects(validateCustomerReturnEvidence(client as never, "buyer", ["same", "same"]), /unique/);
  await assert.rejects(validateCustomerReturnEvidence(client as never, "buyer", ["1", "2", "3", "4", "5", "6"]), /five/);
  assert.deepEqual(await validateCustomerReturnEvidence({} as never, "buyer"), []);
});
