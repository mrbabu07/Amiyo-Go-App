import assert from "node:assert/strict";
import test from "node:test";
import { payoutAmountMinor, selectPayoutBank } from "../operations/vendor-payout-input";

test("payout amounts preserve exact minor units and respect the available balance", () => {
  assert.equal(payoutAmountMinor("100.29", "10029"), "10029");
  assert.equal(payoutAmountMinor("0.01", "1"), "1");
  assert.equal(payoutAmountMinor("12.5", "1250"), "1250");
  assert.equal(payoutAmountMinor("90071992547409.93", "9007199254740993"), "9007199254740993");
  assert.equal(payoutAmountMinor("100.30", "10029"), null);
  for (const invalid of ["", "0", "-1", "1.005", "1e3", "Infinity", "1.2.3"]) assert.equal(payoutAmountMinor(invalid, "100000"), null);
  assert.equal(payoutAmountMinor("1", "-100"), null);
});

test("payout destinations must belong to the current workspace", () => {
  const accounts = [{ id: "secondary", isDefault: false }, { id: "default", isDefault: true }];
  assert.equal(selectPayoutBank(accounts, ""), "default");
  assert.equal(selectPayoutBank(accounts, "secondary"), "secondary");
  assert.equal(selectPayoutBank(accounts, "previous-seller-account"), "");
  assert.equal(selectPayoutBank([], "default"), "");
  assert.equal(selectPayoutBank([accounts[0]!], ""), "secondary");
});
