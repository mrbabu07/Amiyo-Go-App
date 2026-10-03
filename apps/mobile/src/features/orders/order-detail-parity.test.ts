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
