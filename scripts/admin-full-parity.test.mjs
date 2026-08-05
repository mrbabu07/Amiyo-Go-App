import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const routeNames = ["vendors", "vendor-requests", "vendor-kyc", "customers", "users", "payouts", "returns", "payment-verifications", "vouchers", "flash-sales", "audit", "products", "inventory", "orders", "logistics", "offers", "insights", "reviews", "qa", "trust-safety"];

test("reference admin workspaces have mobile routes", async () => {
  await Promise.all(routeNames.map((name) => access(new URL(`../apps/mobile/app/admin/${name}.tsx`, import.meta.url))));
});

test("admin shell exposes reference navigation groups", async () => {
  const source = await readFile(new URL("../apps/mobile/src/ui/Screen.tsx", import.meta.url), "utf8");
  for (const label of ["Overview", "Vendors", "Catalog", "Orders", "Marketing", "Finance", "Customers"]) assert.match(source, new RegExp(`label: "${label}"`));
  for (const path of ["/admin/vendor-requests", "/admin/vendor-kyc", "/admin/payment-verifications", "/admin/flash-sales", "/admin/trust-safety"]) assert.match(source, new RegExp(path));
});

test("reference queue pages use live data and actions", async () => {
  const source = await readFile(new URL("../apps/mobile/src/features/admin/AdminReferenceWorkspaceScreen.tsx", import.meta.url), "utf8");
  for (const api of ["getAdminWorkspace", "getAdminPlatform", "getAdminQueues", "reviewAdminPayout", "transitionAdminReturn", "reviewPaymentVerification"]) assert.match(source, new RegExp(api));
  assert.match(source, /Search .*\.\.\./);
  assert.match(source, /No matching records/);
});
