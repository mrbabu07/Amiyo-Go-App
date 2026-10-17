import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (name: string) => readFileSync(new URL(`./${name}`, import.meta.url), "utf8");

test("vendor payout completion stays with the initiating account", () => {
  const source = read("VendorFinanceScreen.tsx");
  assert.match(source, /useCurrentUser/);
  assert.match(source, /activeUid\.current !== ownerUid/);
  assert.match(source, /\["vendor-finance", ownerUid\]/);
  assert.doesNotMatch(source, /firebaseAuth/);
});

test("vendor return refreshes only its account-scoped detail and list", () => {
  const source = read("ReturnDetailScreen.tsx");
  assert.match(source, /\["vendor", "return", id, ownerUid\]/);
  assert.match(source, /\["vendor", "returns", ownerUid\]/);
  assert.doesNotMatch(source, /firebaseAuth/);
});

test("customer return completion refreshes only the initiating customer", () => {
  const source = read("CustomerReturnWizard.tsx");
  assert.match(source, /\["returns", ownerUid\]/);
  assert.match(source, /\["orders", "customer", ownerUid\]/);
  assert.doesNotMatch(source, /firebaseAuth/);
});
