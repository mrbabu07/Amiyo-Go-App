import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { URL } from "node:url";

const read = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");

const queryScreens = [
  "./AdminGlobalSearch.tsx",
  "./AdminOrderInvoiceScreen.tsx",
  "./AdminOrdersScreen.tsx",
  "./AdminVendorActivityScreen.tsx"
];

const mutationScreens = [
  "./AdminCommerceWorkspaceScreen.tsx",
  "./AdminCommissionScreen.tsx",
  "./AdminDeliverySettingsScreen.tsx",
  "./AdminInventoryScreen.tsx",
  "./AdminMarketingScreen.tsx",
  "./AdminNewsletterScreen.tsx",
  "./AdminOfferFormScreen.tsx",
  "./AdminOffersScreen.tsx",
  "./AdminOrderDetailScreen.tsx",
  "./AdminOrderInvoiceScreen.tsx",
  "./AdminOrderInterventions.tsx",
  "./AdminOrderRefund.tsx",
  "./AdminOrderReturnWindow.tsx",
  "./AdminProductCreateScreen.tsx",
  "./AdminProductEditScreen.tsx",
  "./AdminSettingsScreen.tsx",
  "./AdminTrustScreen.tsx",
  "./AdminVendorDetailScreen.tsx"
];

for (const path of [...queryScreens, ...mutationScreens]) {
  test(`${path} subscribes to reactive identity without direct Firebase auth reads`, () => {
    const source = read(path);
    assert.match(source, /const user = useCurrentUser\(\)/);
    assert.match(source, /userId = user\?\.uid \?\? null/);
    assert.doesNotMatch(source, /firebaseAuth/);
  });
}

for (const path of queryScreens) {
  test(`${path} scopes private admin query keys by UID`, () => {
    const source = read(path);
    assert.match(source, /queryKey: \["admin"[^\]]*userId/);
    assert.match(source, /retry: false/);
  });
}

for (const path of mutationScreens) {
  test(`${path} guards writes when the active account changes`, () => {
    const source = read(path);
    assert.match(source, /Account changed\./);
    assert.match(source, /currentActor\(\)/);
  });
}

test("manual settlement ignores completion after an account switch", () => {
  const source = read("./AdminOrderSettlement.tsx");
  assert.match(source, /const userIdRef = useRef\(userId\)/);
  assert.match(source, /userIdRef\.current !== actorId/);
  assert.match(source, /\["vendor-finance", actorId\]/);
  assert.doesNotMatch(source, /firebaseAuth/);
});
