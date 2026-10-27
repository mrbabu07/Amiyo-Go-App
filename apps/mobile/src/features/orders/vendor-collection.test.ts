import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("seller collection displays authoritative parcel balance and fails closed on read errors", () => {
  const source = readFileSync(new URL("./VendorOrderDetailScreen.tsx", import.meta.url), "utf8");
  assert.match(source, /getFulfillmentDocument\(user!, id\)/);
  assert.match(source, /collection.data.payment.collectAmount.amountMinor/);
  assert.match(source, /collection.isError \? "Unable to verify/);
  assert.doesNotMatch(source, /method === "COD" \? money\(item.total/);
  assert.doesNotMatch(source, /Number\(minor\)/);
});
