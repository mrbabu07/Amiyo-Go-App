import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const routeNames = ["index", "vendors", "vendor-requests", "vendor-kyc", "vendor-activity", "chats", "customers", "users", "staff", "payouts", "payout-requests", "returns", "payment-verification", "payment-verifications", "vouchers", "coupons", "flash-sales", "audit", "products", "inventory", "orders", "logistics", "cod-delivery", "cod-reconciliation", "offers", "insights", "reviews", "qa", "trust-safety", "settings", "university"];

test("reference admin workspaces have mobile routes", async () => {
  await Promise.all(routeNames.map((name) => access(new URL(`../apps/mobile/app/admin/${name}.tsx`, import.meta.url))));
  await Promise.all(["audit-logs", "products/add", "products/edit/[id]", "vendors/kyc", "chat/[vendorId]", "categories/manage", "categories/[categoryId]/attributes", "flash-sales/manage", "offers/add", "offers/edit/[id]", "reviews/moderation"].map((name) => access(new URL(`../apps/mobile/app/admin/${name}.tsx`, import.meta.url))));
});

test("admin shell exposes reference navigation groups", async () => {
  const source = await readFile(new URL("../apps/mobile/src/ui/Screen.tsx", import.meta.url), "utf8");
  for (const label of ["Dashboard", "Operations", "University", "Audit Logs", "Analytics & Reports", "Platform Control", "Settings", "Staff", "Vendors", "Catalog", "Orders", "Marketing", "Finance", "Customers"]) assert.match(source, new RegExp(`label: "${label}"`));
  for (const path of ["/admin/vendor-requests", "/admin/vendors/kyc", "/admin/payment-verification", "/admin/flash-sales", "/admin/trust-safety"]) assert.match(source, new RegExp(path));
});

test("reference queue pages use live data and actions", async () => {
  const source = await readFile(new URL("../apps/mobile/src/features/admin/AdminReferenceWorkspaceScreen.tsx", import.meta.url), "utf8");
  for (const api of ["getAdminWorkspace", "getAdminPlatform", "getAdminQueues", "reviewAdminPayout", "transitionAdminReturn", "reviewPaymentVerification"]) assert.match(source, new RegExp(api));
  assert.match(source, /Search .*\.\.\./);
  assert.match(source, /No matching records/);
});

test("commerce aliases are replaced with dedicated live workspaces", async () => {
  const screen = await readFile(new URL("../apps/mobile/src/features/admin/AdminCommerceWorkspaceScreen.tsx", import.meta.url), "utf8");
  const service = await readFile(new URL("../apps/api/src/modules/admin/admin.service.ts", import.meta.url), "utf8");
  const routes = await readFile(new URL("../apps/api/src/modules/admin/admin.routes.ts", import.meta.url), "utf8");
  for (const kind of ["orders", "inventory", "coupons", "offers", "chats", "cod-delivery", "cod-reconciliation", "vendor-activity"]) assert.match(screen, new RegExp(`"${kind}"`));
  for (const model of ["order.findMany", "inventoryItem.findMany", "coupon.findMany", "campaign.findMany", "chatThread.findMany", "codCollection.findMany"]) assert.match(service, new RegExp(model.replace(".", "\\.")));
  for (const endpoint of ["/commerce", "/inventory/:id", "/coupons/:id", "/chats/:id/messages"]) assert.match(routes, new RegExp(endpoint.replaceAll("/", "\\/")));
});

test("admin logistics preserves the reference lifecycle routes and controls", async () => {
  const routes = await readFile(new URL("../apps/api/src/modules/operations/operations.routes.ts", import.meta.url), "utf8");
  const screen = await readFile(new URL("../apps/mobile/src/features/operations/AdminLogisticsScreen.tsx", import.meta.url), "utf8");
  for (const endpoint of ["/dashboard", "/state-machine", "/tracking-events", "/shipments/:id/mark-rto", "/shipments/:id/generate-label", "/dispatch-manifest/export", "/manifests/:id/confirm-pickup", "/courier-provider-status", "/cod/:id/mark-collected", "/cod/:id/mark-remitted", "/cod/:id/mark-failed", "/cod/:id/mark-disputed", "/returns/:returnId/inspection-result", "/returns/:returnId/refurbish", "/audit-log"]) assert.match(routes, new RegExp(endpoint.replaceAll("/", "\\/")));
  for (const control of ["Generate label", "Mark RTO", "Confirm RTO received", "Confirm pickup", "Mark collected", "Mark remitted", "Dispute", "Mark failed"]) assert.match(screen, new RegExp(control));
});
