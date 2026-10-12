import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { URL } from "node:url";
import { orderSupportDraft, validOrderContext } from "./order-support-draft";

const orderId = "11111111-1111-4111-8111-111111111111";

test("order support draft preserves verified identifiers without submitting", () => {
  const draft = orderSupportDraft({ id: orderId, orderNumber: "AG-1001", status: "SHIPPED" });
  assert.equal(draft.orderId, orderId);
  assert.equal(draft.category, "ORDER");
  assert.match(draft.subject, /AG-1001/);
  assert.match(draft.message, new RegExp(orderId));
  assert.match(draft.message, /Issue details:/);
});

test("order support accepts only UUID context and verifies ownership before applying", () => {
  assert.equal(validOrderContext(orderId), true);
  assert.equal(validOrderContext("AG-1001"), false);
  const context = readFileSync(new URL("./OrderSupportContext.tsx", import.meta.url), "utf8");
  const route = readFileSync(new URL("../../../app/support.tsx", import.meta.url), "utf8");
  const detail = readFileSync(new URL("../orders/CustomerOrderDetailScreen.tsx", import.meta.url), "utf8");
  assert.match(context, /getCustomerOrder\(user, orderId\)/);
  assert.match(context, /Use order details/);
  assert.doesNotMatch(context, /useEffect/);
  assert.match(route, /orderId/);
  assert.match(detail, /SupportLink href=\{`\/support\?orderId=\$\{data.id\}`\}/);
  assert.match(detail, /accessibilityRole="button" accessibilityLabel=\{label\}/);
  assert.match(detail, /accessibilityRole="link" accessibilityLabel=\{label\}/);
});
