import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");

test("admin order and finance command surfaces use semantic brand colors", () => {
  const source = [
    "AdminOrderDetailScreen.tsx",
    "AdminPayoutsScreen.tsx",
    "AdminCommissionScreen.tsx",
    "AdminAccessScreen.tsx",
    "AdminCategoryRequestsScreen.tsx",
    "AdminCommerceWorkspaceScreen.tsx",
    "AdminContentScreen.tsx",
    "AdminGlobalSearch.tsx",
    "AdminOrderInvoiceScreen.tsx",
    "AdminOrderRefund.tsx",
    "AdminOrderSettlement.tsx",
    "AdminOrdersScreen.tsx",
    "AdminPaymentVerificationScreen.tsx",
    "AdminPlatformScreen.tsx",
    "AdminReferenceWorkspaceScreen.tsx",
    "AdminReturnsScreen.tsx",
    "AdminSettingsScreen.tsx",
    "AdminTrustScreen.tsx"
  ].map((file) => read(`../features/admin/${file}`)).concat([
    read("../features/operations/AdminCodDeliveryScreen.tsx"),
    read("../features/operations/AdminLogisticsScreen.tsx"),
    read("../features/operations/AdminOperationsScreen.tsx")
  ]).join("\n");
  assert.match(source, /colors\.onPrimary/);
  assert.match(source, /colors\.shellMuted/);
  assert.doesNotMatch(source, /#94a3b8|#cbd5e1|#e2e8f0|#eef2f7|#f1f5f9|#f8fafc|#fff7ed|#ecfdf5|#fef2f2/i);
});
