import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { URL } from "node:url";

test("inline cancellation retains explicit confirmation, current policy and durable recovery", () => {
  const source = readFileSync(new URL("./InlineOrderCancellation.tsx", import.meta.url), "utf8");
  assert.match(source, /CancelOrderConfirmation/);
  assert.match(source, /cancellationState\(order, Date.now\(\)\).cancellable/);
  assert.match(source, /pendingOrderActions.prepare\(user!.uid, order.id/);
  assert.match(source, /expectedVersion: order.version/);
  assert.match(source, /cancelCustomerOrder\(user!, order.id, saved.command.input, saved.key\)/);
  assert.match(source, /mayDiscardOrderRejection\(saved.fresh, error.status, error.code\)/);
  assert.match(source, /activeUid\.current === ownerUid/);
  assert.doesNotMatch(source, /firebaseAuth/);
  assert.match(source, /retry: false/);
  assert.match(source, /Check saved order request/);
  const expansion = readFileSync(new URL("./CustomerOrderExpansion.tsx", import.meta.url), "utf8");
  assert.match(expansion, /InlineOrderCancellation key=\{`\$\{user.uid\}:\$\{id\}`\}/);
});
