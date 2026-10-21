import assert from "node:assert/strict";
import test from "node:test";
import { createVendorCategoryRequestSchema, createVendorVoucherSchema, saveVendorBankAccountSchema, submitVendorKycSchema, updateVendorBankAccountSchema, updateVendorShopSchema, updateVendorStaffSchema, vendorVacationSchema } from "./vendor.js";

test("vendor bank account requires a supported payout provider", () => {
  assert.equal(saveVendorBankAccountSchema.parse({ provider: "BKASH", accountName: "Demo Seller", accountNumber: "01700000000" }).isDefault, true);
  assert.throws(() => saveVendorBankAccountSchema.parse({ provider: "PAYPAL", accountName: "Demo Seller", accountNumber: "01700000000" }));
});
test("payout account updates allow only a name or default promotion", () => { assert.equal(updateVendorBankAccountSchema.parse({ accountName: "Updated Seller" }).accountName, "Updated Seller"); assert.equal(updateVendorBankAccountSchema.parse({ isDefault: true }).isDefault, true); assert.throws(() => updateVendorBankAccountSchema.parse({})); assert.throws(() => updateVendorBankAccountSchema.parse({ isDefault: false })); });

test("KYC submission requires durable document metadata", () => {
  assert.throws(() => submitVendorKycSchema.parse({ documents: [] }));
  assert.equal(submitVendorKycSchema.parse({ documents: [{ documentType: "TRADE_LICENSE", storageKey: "private/kyc/demo.pdf", mimeType: "application/pdf", checksum: "0123456789abcdef" }] }).documents.length, 1);
  assert.throws(() => submitVendorKycSchema.parse({ documents: [{ documentType: "TRADE_LICENSE", storageKey: "private/kyc/one.pdf", mimeType: "application/pdf", checksum: "0123456789abcdef" }, { documentType: "TRADE_LICENSE", storageKey: "private/kyc/two.pdf", mimeType: "application/pdf", checksum: "fedcba9876543210" }] }), /Document types must be unique/);
  assert.throws(() => submitVendorKycSchema.parse({ documents: [{ documentType: "TRADE_LICENSE", storageKey: "private/kyc/same.pdf", mimeType: "application/pdf", checksum: "0123456789abcdef" }, { documentType: "BANK_PROOF", storageKey: "private/kyc/same.pdf", mimeType: "application/pdf", checksum: "0123456789abcdef" }] }), /Uploaded files must be unique/);
});

test("shop updates require optimistic version and a changed field", () => {
  assert.throws(() => updateVendorShopSchema.parse({ version: 1 }));
  assert.equal(updateVendorShopSchema.parse({ version: 1, name: "Updated Shop" }).name, "Updated Shop");
});
test("seller vacation requires a valid bounded window and buyer message", () => { const value = { enabled: true, startsAt: "2026-12-20T00:00:00.000Z", endsAt: "2026-12-28T00:00:00.000Z", reason: "Eid holiday", buyerMessage: "Back on December 28" }; assert.equal(vendorVacationSchema.parse(value).enabled, true); assert.throws(() => vendorVacationSchema.parse({ ...value, endsAt: value.startsAt })); });
test("vendor vouchers normalize codes and require a valid window", () => { const parsed = createVendorVoucherSchema.parse({ code: " save10 ", discountType: "PERCENT", value: 10, startsAt: "2026-08-01T00:00:00.000Z", endsAt: "2026-09-01T00:00:00.000Z" }); assert.equal(parsed.code, "SAVE10"); assert.throws(() => createVendorVoucherSchema.parse({ ...parsed, endsAt: parsed.startsAt })); });
test("vendor staff permissions stay inside the delegated allowlist", () => { assert.equal(updateVendorStaffSchema.parse({ status: "active", permissions: ["orders:read"] }).permissions.length, 1); assert.throws(() => updateVendorStaffSchema.parse({ status: "active", permissions: ["admin:manage"] })); assert.throws(() => updateVendorStaffSchema.parse({ status: "active", permissions: [] })); });

test("vendor staff invite normalizes registered account email and bounds roles", async () => {
  const { inviteVendorStaffSchema } = await import("./vendor.js");
  const invite = inviteVendorStaffSchema.parse({ email: " Team@Example.COM ", role: "VENDOR_STAFF", permissions: ["orders:read"] });
  assert.equal(invite.email, "team@example.com");
  assert.throws(() => inviteVendorStaffSchema.parse({ email: "team@example.com", role: "VENDOR_OWNER", permissions: ["orders:read"] }));
  assert.throws(() => inviteVendorStaffSchema.parse({ email: "team@example.com", role: "VENDOR_STAFF", permissions: ["orders:read", "orders:read"] }));
});
test("category access requests require an operational reason", () => { assert.equal(createVendorCategoryRequestSchema.safeParse({ categoryId: crypto.randomUUID(), reason: "We stock verified electronics" }).success, true); assert.equal(createVendorCategoryRequestSchema.safeParse({ categoryId: crypto.randomUUID(), reason: "no" }).success, false); });
