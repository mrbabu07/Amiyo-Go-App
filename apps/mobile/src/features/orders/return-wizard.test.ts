import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { URL } from "node:url";
import test from "node:test";

test("inline return wizard loads owned order details and uses the durable command store", () => {
  const source = readFileSync(new URL("../operations/CustomerReturnWizard.tsx", import.meta.url), "utf8");
  assert.match(source, /getCustomerOrder\(user!, orderId\)/);
  assert.match(source, /pendingOrderActions.load\(user!.uid, orderId\)/);
  assert.match(source, /pendingOrderActions.prepare\(user!.uid, orderId/);
  assert.match(source, /createCustomerReturn\(user!, input, saved.key\)/);
  assert.match(source, /mayDiscardOrderRejection\(saved.fresh, error.status, error.code\)/);
  assert.match(source, /retry: false/);
  assert.match(source, /Open order recovery/);
  assert.match(source, /returnEligibilityMessage\(item.returnEligibility, Date.now\(\)\)/);
  assert.match(source, /firebaseAuth\?\.currentUser\?\.uid === user\?\.uid/);
});

test("return wizard stages preserve final explicit review and policy checks", () => {
  const source = readFileSync(new URL("./CustomerReturnForm.tsx", import.meta.url), "utf8");
  assert.match(source, /\["Items", "Reason", "Evidence & refund", "Review"\]/);
  assert.match(source, /if \(step === 1 && !reason\)/);
  assert.match(source, /buildReturnSelection\(vendorOrder.id, vendorOrder.items, quantities/);
  assert.match(source, /checkPolicy\(review.evidenceStorageKeys\?\.length/);
  assert.match(source, /Confirm return request/);
  assert.match(source, /Previous step/);
  const screen = readFileSync(new URL("../operations/ReturnsScreen.tsx", import.meta.url), "utf8");
  assert.match(screen, /CustomerReturnWizard key=\{user.uid\}/);
  assert.match(screen, /const requestReturn = \(\) => setShowWizard\(true\)/);
});
