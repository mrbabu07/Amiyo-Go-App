import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");

test("primary customer surfaces use semantic brand colors", () => {
  const source = [
    "../features/home/CustomerHomeScreen.tsx",
    "../features/home/components/StoreFooter.tsx",
    "../features/home/components/ProductCard.tsx",
    "../features/home/components/StoreHeader.tsx",
    "../features/account/AddressesScreen.tsx",
    "../features/auth/AuthScreen.tsx",
    "../features/catalog/MarketplacePageHero.tsx",
    "../features/catalog/ProductDetailScreen.tsx",
    "../features/engagement/AlertsScreen.tsx",
    "../features/engagement/MessagesScreen.tsx",
    "../features/engagement/MyReviewsScreen.tsx",
    "../features/engagement/SharedWishlistScreen.tsx",
    "../features/engagement/WishlistScreen.tsx",
    "../features/engagement/WishlistToCart.tsx",
    "../features/information/CustomerUniversityScreen.tsx",
    "../features/information/ContactScreen.tsx",
    "../features/orders/CancelOrderConfirmation.tsx",
    "../features/orders/CustomerOrderDetailScreen.tsx",
    "../features/orders/CustomerOrdersScreen.tsx",
    "../features/orders/DocumentVerificationScreen.tsx",
    "../features/orders/InvoiceScreen.tsx",
    "../features/orders/OrderDeliverySummary.tsx",
    "../features/support/OrderSupportContext.tsx",
    "../features/support/ReturnSupportContext.tsx",
    "../features/orders/VendorOrderDetailScreen.tsx"
  ].map(read).join("\n");
  assert.match(source, /colors\.onPrimary/);
  assert.match(source, /colors\.shellMuted/);
  assert.doesNotMatch(source, /#bae6fd|#94a3b8|#cbd5e1|#475569|#e2e8f0|#f8fafc|#fef2f2|#ecfdf5|#fff7ed|"#fff"/i);
});
