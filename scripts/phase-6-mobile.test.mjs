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
  assert.match(source, /Request courier pickup/);
  assert.match(source, /requestVendorOrderPickup/);
  assert.match(source, /Operations assigns the courier and confirms pickup/);
  assert.match(source, /item\.shipment\?\.status === "READY_TO_SHIP"/);
  assert.match(source, /const user = useCurrentUser\(\)/);
});

test("operations can see seller pickup evidence before confirming collection", async () => {
  const source = await readFile(new URL("../apps/mobile/src/features/operations/AdminLogisticsScreen.tsx", import.meta.url), "utf8");
  assert.match(source, /Seller requested pickup/);
  assert.match(source, /row\.assignment\?\.pickupDate/);
  assert.match(source, /row\.assignment\.pickupWindow/);
  assert.match(source, /Mark picked up/);
  assert.match(source, /Pickup confirmed from logistics workspace/);
  assert.match(source, /Finance exposure/);
  assert.match(source, /row\.exception\?\.owner\.name/);
  assert.match(source, /row\.exception\?\.slaTargetAt/);
});
