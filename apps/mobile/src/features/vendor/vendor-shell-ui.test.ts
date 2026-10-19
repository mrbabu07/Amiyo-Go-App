import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const root = resolve(import.meta.dirname, "../../..");
const shell = readFileSync(resolve(root, "src/ui/Screen.tsx"), "utf8");
const dashboard = readFileSync(resolve(root, "app/vendor/dashboard.tsx"), "utf8");
const orders = readFileSync(resolve(root, "src/features/orders/VendorOrdersScreen.tsx"), "utf8");
const orderDetail = readFileSync(resolve(root, "src/features/orders/VendorOrderDetailScreen.tsx"), "utf8");

test("seller workspace uses responsive grouped navigation", () => {
  assert.match(shell, /function VendorScreen/);
  assert.match(shell, /function VendorSidebar/);
  assert.match(shell, /mobileSidebarOpen/);
  assert.match(shell, /vendorMobileLinks/);
  assert.match(shell, /accessibilityLabel="Seller quick navigation"/);
  assert.match(shell, /!desktop \? <ScrollView/);
  assert.match(shell, /compact=\{!desktop\}/);
  assert.match(shell, /compact && styles\.vendorHeadingCompact/);
  assert.match(shell, /compact && styles\.vendorPageTitleCompact/);
  assert.match(shell, /vendorMobileNavItem: \{[^}]*minHeight: 40/);
  assert.match(shell, /vendorBack: \{[^}]*height: 44[^}]*width: 44/);
  for (const group of ["Products", "Orders", "Finance", "Growth", "Shop", "Support"]) assert.match(shell, new RegExp(`label: "${group}"`));
  assert.match(shell, /accessibilityLabel="Seller navigation"/);
  assert.match(shell, /function VendorRouteSearch/);
  assert.match(shell, /accessibilityLabel="Search seller tools"/);
  assert.match(shell, /placeholder="Search products, orders, finance\.\.\."/);
  assert.match(shell, /accessibilityLabel="Add product"/);
  assert.match(shell, /mobileSearchOpen/);
});

test("seller dashboard exposes live operational hierarchy", () => {
  for (const section of ["Seller action center", "Business setup", "Fulfillment control", "Recent orders", "Seller University"]) assert.match(dashboard, new RegExp(section));
  for (const action of ["Quick actions", "Add product", "Inventory", "Finance", "Storefront", "Messages"]) assert.match(dashboard, new RegExp(action));
  assert.match(dashboard, /horizontal showsHorizontalScrollIndicator=\{false\}/);
  assert.match(dashboard, /compact && styles\.heroCompact/);
  assert.match(dashboard, /compact && styles\.orderActionCompact/);
  assert.match(dashboard, /getVendorWorkspace/);
  assert.match(dashboard, /getVendorReport/);
  assert.match(dashboard, /getVendorOrders/);
  assert.match(dashboard, /useCurrentUser/);
  assert.match(dashboard, /\["vendor", "workspace", user\?\.uid\]/);
  assert.match(dashboard, /\["vendor", "report", user\?\.uid\]/);
  assert.match(dashboard, /\["orders", "vendor", user\?\.uid\]/);
  assert.doesNotMatch(dashboard, /firebaseAuth/);
  assert.doesNotMatch(dashboard, /Â|Ã|à§|â†|â€œ|â€/);
});

test("seller orders stay inside the workspace with reference controls", () => {
  assert.match(orders, /<Screen eyebrow="FULFILLMENT"/);
  for (const control of ["Search seller orders", "Batch print", "Documents", "View order"]) assert.match(orders, new RegExp(control));
  assert.match(orders, /thumbnailUrl/);
  assert.match(orders, /formatMinor\(order\.total\.amountMinor\)/);
  assert.doesNotMatch(orders, /Number\(amount\)/);
  assert.match(orders, /useCurrentUser/);
  assert.doesNotMatch(orders, /firebaseAuth/);
  assert.doesNotMatch(orders, /Â|Ã|à§|â†|â€œ|â€/);
  assert.match(orderDetail, /<Screen hideHeading title="Vendor order detail">/);
  assert.match(orderDetail, /<Screen eyebrow="FULFILLMENT" title="Loading seller order">/);
  assert.doesNotMatch(orderDetail, /<SafeAreaView|<ScrollView/);
  assert.match(orderDetail, /card: \{ backgroundColor: colors\.surface, borderRadius: radius\.lg, boxShadow:/);
  assert.match(orderDetail, /metric: \{[^}]*boxShadow:/);
  assert.doesNotMatch(orderDetail, /card: \{[^}]*borderWidth|metric: \{[^}]*borderWidth/);
});
