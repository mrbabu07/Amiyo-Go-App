import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("vendor fulfillment and customer tracking expose accessible actions", async () => {
  const source = (await Promise.all([readFile(new URL("../apps/mobile/src/features/orders/VendorOrdersScreen.tsx", import.meta.url), "utf8"), readFile(new URL("../apps/mobile/src/features/orders/VendorOrderDetailScreen.tsx", import.meta.url), "utf8"), readFile(new URL("../apps/mobile/src/features/orders/OrderTrackingScreen.tsx", import.meta.url), "utf8")])).join("\n");
  assert.match(source, /accessibilityRole="header"/); assert.match(source, /accessibilityRole="button"/); assert.match(source, /Ready for pickup/); assert.match(source, /Tracking number pending/);
});
