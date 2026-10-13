import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("vendor fulfillment and customer tracking expose accessible actions", async () => {
  const source = (await Promise.all([readFile(new URL("../apps/mobile/src/features/orders/VendorOrdersScreen.tsx", import.meta.url), "utf8"), readFile(new URL("../apps/mobile/src/features/orders/VendorOrderDetailScreen.tsx", import.meta.url), "utf8"), readFile(new URL("../apps/mobile/src/features/orders/OrderTrackingScreen.tsx", import.meta.url), "utf8")])).join("\n");
  assert.match(source, /accessibilityRole="header"/); assert.match(source, /accessibilityRole="button"/); assert.match(source, /Ready for pickup/); assert.match(source, /Tracking number pending/);
  assert.match(source, /Shipping documents/);
  assert.match(source, /Fulfillment timeline/);
  assert.match(source, /item\.shipment\?\.events\.map/);
  assert.match(source, /Recorded package and courier events only/);
  assert.match(source, /OrderItemImage/);
  assert.match(source, /uri=\{line\.thumbnailUrl\}/);
  assert.match(source, /Message customer/);
  assert.match(source, /openVendorOrderCustomerThread/);
  assert.match(source, /\/vendor\/messages\/\$\{thread\.id\}/);
  assert.match(source, /Report delivery issue/);
  assert.match(source, /reportVendorDeliveryException/);
  assert.match(source, /Send to operations/);
  assert.match(source, /\["READY_TO_SHIP", "PICKED_UP", "IN_TRANSIT"\]/);
  assert.match(source, /const user = useCurrentUser\(\)/);
});
