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
  assert.match(source, /activeUid\.current === ownerUid/);
  assert.match(source, /\["returns", ownerUid\]/);
  assert.match(source, /\["orders", "customer", ownerUid\]/);
  assert.doesNotMatch(source, /firebaseAuth/);
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

test("expanded orders open the shared return wizard without loading the order picker", () => {
  const wizard = readFileSync(new URL("../operations/CustomerReturnWizard.tsx", import.meta.url), "utf8");
  assert.match(wizard, /useState\(initialOrderId\)/);
  assert.match(wizard, /enabled: Boolean\(user && !initialOrderId\)/);
  assert.match(wizard, /!initialOrderId \? <>/);
  const expansion = readFileSync(new URL("./CustomerOrderExpansion.tsx", import.meta.url), "utf8");
  assert.match(expansion, /key=\{`\$\{user.uid\}:\$\{id\}`\} initialOrderId=\{id\}/);
  assert.match(expansion, /Request return/);
});
