import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const root = resolve(import.meta.dirname, "../../..");
const shell = readFileSync(resolve(root, "src/ui/Screen.tsx"), "utf8");
const dashboard = readFileSync(resolve(root, "app/vendor/dashboard.tsx"), "utf8");
const orders = readFileSync(resolve(root, "src/features/orders/VendorOrdersScreen.tsx"), "utf8");

test("seller workspace uses responsive grouped navigation", () => {
  assert.match(shell, /function VendorScreen/);
  assert.match(shell, /function VendorSidebar/);
  assert.match(shell, /mobileSidebarOpen/);
  for (const group of ["Products", "Orders", "Finance", "Growth", "Shop", "Support"]) assert.match(shell, new RegExp(`label: "${group}"`));
  assert.match(shell, /accessibilityLabel="Seller navigation"/);
});

test("seller dashboard exposes live operational hierarchy", () => {
  for (const section of ["Seller action center", "Business setup", "Fulfillment control", "Recent orders", "Seller University"]) assert.match(dashboard, new RegExp(section));
  assert.match(dashboard, /getVendorWorkspace/);
  assert.match(dashboard, /getVendorReport/);
  assert.match(dashboard, /getVendorOrders/);
  assert.doesNotMatch(dashboard, /Â|Ã|à§|â†|â€œ|â€/);
});

test("seller orders stay inside the workspace with reference controls", () => {
  assert.match(orders, /<Screen eyebrow="FULFILLMENT"/);
  for (const control of ["Search seller orders", "Batch print", "Documents", "View order"]) assert.match(orders, new RegExp(control));
  assert.match(orders, /thumbnailUrl/);
  assert.doesNotMatch(orders, /Â|Ã|à§|â†|â€œ|â€/);
});
