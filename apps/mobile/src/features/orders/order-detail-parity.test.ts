import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { URL } from "node:url";
import test from "node:test";

test("order detail displays saved delivery and payment data without assuming paid", async () => {
  const source = await readFile(new URL("./OrderDeliverySummary.tsx", import.meta.url), "utf8");
  for (const field of ["recipientName", "phone", "line1", "line2", "unionName", "upazila", "district", "division", "postalCode"]) {
    assert.ok(source.includes(`address.${field}`));
  }
  for (const field of ["method", "status", "provider", "transactionId", "refunded"]) {
    assert.ok(source.includes(`payment.${field}`));
  }
  assert.ok(source.includes("Delivery address is unavailable"));
  assert.ok(source.includes("No payment record is available yet"));
  assert.doesNotMatch(source, /payment\.status\s*=/);
});

test("order detail wires the summary, seller shipment and narrow-screen columns", async () => {
  const source = await readFile(new URL("./CustomerOrderDetailScreen.tsx", import.meta.url), "utf8");
  assert.ok(source.includes("<OrderDeliverySummary order={data} />"));
  assert.ok(source.includes("vendorOrder.shopName || vendorOrder.vendorName"));
  assert.ok(source.includes("vendorOrder.shipment.trackingNumber"));
  assert.ok(source.includes("vendorOrder.shipment.provider"));
  assert.ok(source.includes("styles.mainColumn, compact && styles.columnCompact"));
  assert.ok(source.includes("styles.sideColumn, compact && styles.columnCompact"));
  assert.match(source, /columnCompact: \{ flex: 0, minWidth: 0, width: "100%" \}/);
  assert.ok(source.includes("const user = useCurrentUser()"));
  assert.ok(source.includes("<OrderItemImage name={item.productName} uri={item.thumbnailUrl} />"));
});

test("order item image has a local fallback for missing and broken media", async () => {
  const source = await readFile(new URL("./OrderItemImage.tsx", import.meta.url), "utf8");
  assert.ok(source.includes("uri && uri !== failedUri"));
  assert.ok(source.includes("onError={() => setFailedUri(uri!)}"));
  assert.ok(source.includes("accessibilityLabel={name}"));
  assert.ok(source.includes("image unavailable"));
  assert.doesNotMatch(source, /https?:\/\//);
});

test("cancel requires an explicit reason and confirmation rather than one-click mutation", async () => {
  const screen = await readFile(new URL("./CustomerOrderDetailScreen.tsx", import.meta.url), "utf8");
  const confirmation = await readFile(new URL("./CancelOrderConfirmation.tsx", import.meta.url), "utf8");
  assert.ok(screen.includes('label="Cancel" onPress={() => setConfirmCancel(true)}'));
  assert.ok(screen.includes("onConfirm={(reason) => cancel.mutate(reason)}"));
  assert.ok(confirmation.includes('accessibilityLabel="Cancellation reason"'));
  assert.ok(confirmation.includes("busy || !eligible || reason.trim().length < 3"));
  assert.ok(confirmation.includes("Keep order"));
});

test("return form requires delivered package and explicit review of selected items", async () => {
  const screen = await readFile(new URL("./CustomerOrderDetailScreen.tsx", import.meta.url), "utf8");
  const form = await readFile(new URL("./CustomerReturnForm.tsx", import.meta.url), "utf8");
  assert.ok(screen.includes('vendorOrder.status === "DELIVERED" ? <CustomerReturnForm'));
  assert.ok(screen.includes("createCustomerReturn(user!, input, randomUUID())"));
  assert.ok(screen.includes("key={`${user.uid}:${vendorOrder.id}`}"));
  assert.ok(form.includes("Confirm return request"));
  assert.ok(form.includes("Edit selection"));
  assert.ok(form.includes("submitting.current"));
  assert.ok(form.includes('pickAndUploadDocument(user, "return_evidence")'));
  assert.ok(form.includes("evidenceStorageKeys: review.evidenceStorageKeys"));
  assert.ok(form.includes("firebaseAuth?.currentUser?.uid === accountId"));
});
