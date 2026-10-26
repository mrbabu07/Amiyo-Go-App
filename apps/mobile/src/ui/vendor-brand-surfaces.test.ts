import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");

test("seller command surfaces use semantic brand colors", () => {
  const source = [read("../features/vendor/VendorBulkProductsScreen.tsx"), read("../features/vendor/VendorSettingsScreen.tsx"), read("../features/vendor/VendorShopLocationScreen.tsx"), read("../features/vendor/VendorShopDecorationScreen.tsx"), read("../features/vendor/VendorShopMediaScreen.tsx"), read("../features/vendor/VendorShopScreen.tsx"), read("../features/orders/VendorOrderDetailScreen.tsx"), read("../features/operations/ReturnsScreen.tsx"), read("../features/operations/VendorStatementExport.tsx")].join("\n");
  assert.match(source, /colors\.onPrimary/);
  assert.match(source, /colors\.shellMuted/);
  assert.match(source, /colors\.shellAccent/);
  assert.doesNotMatch(source, /#cbd5e1|#e2e8f0|#d9e6a7|"#fff"/i);
});
