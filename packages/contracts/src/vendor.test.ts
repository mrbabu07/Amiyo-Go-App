import assert from "node:assert/strict";
import test from "node:test";
import { createVendorVoucherSchema, saveVendorBankAccountSchema, submitVendorKycSchema, updateVendorShopSchema, updateVendorStaffSchema } from "./vendor.js";

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
test("vendor vouchers normalize codes and require a valid window", () => { const parsed = createVendorVoucherSchema.parse({ code: " save10 ", discountType: "PERCENT", value: 10, startsAt: "2026-08-01T00:00:00.000Z", endsAt: "2026-09-01T00:00:00.000Z" }); assert.equal(parsed.code, "SAVE10"); assert.throws(() => createVendorVoucherSchema.parse({ ...parsed, endsAt: parsed.startsAt })); });
test("vendor staff permissions stay inside the delegated allowlist", () => { assert.equal(updateVendorStaffSchema.parse({ status: "active", permissions: ["orders:read"] }).permissions.length, 1); assert.throws(() => updateVendorStaffSchema.parse({ status: "active", permissions: ["admin:manage"] })); });
