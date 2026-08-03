import assert from "node:assert/strict";
import test from "node:test";
import { saveVendorBankAccountSchema, submitVendorKycSchema, updateVendorShopSchema } from "./vendor.js";

test("vendor bank account requires a supported payout provider", () => {
  assert.equal(saveVendorBankAccountSchema.parse({ provider: "BKASH", accountName: "Demo Seller", accountNumber: "01700000000" }).isDefault, true);
  assert.throws(() => saveVendorBankAccountSchema.parse({ provider: "PAYPAL", accountName: "Demo Seller", accountNumber: "01700000000" }));
});

test("KYC submission requires durable document metadata", () => {
  assert.throws(() => submitVendorKycSchema.parse({ documents: [] }));
  assert.equal(submitVendorKycSchema.parse({ documents: [{ documentType: "TRADE_LICENSE", storageKey: "private/kyc/demo.pdf", mimeType: "application/pdf", checksum: "0123456789abcdef" }] }).documents.length, 1);
});

test("shop updates require optimistic version and a changed field", () => {
  assert.throws(() => updateVendorShopSchema.parse({ version: 1 }));
  assert.equal(updateVendorShopSchema.parse({ version: 1, name: "Updated Shop" }).name, "Updated Shop");
});
