import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const sourceUrl = new URL("../apps/mobile/src/features/catalog/ProductDetailScreen.tsx", import.meta.url);

test("customer product detail supports gallery and variant-aware purchase", async () => {
  const source = await readFile(sourceUrl, "utf8");
  for (const capability of ["ProductGallery", "selectedVariantId", "selectedMediaId", "Choose a variant", "Increase quantity", "addCartItem(currentUser, selected.id, quantity)"]) {
    assert.match(source, new RegExp(capability.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
});

test("product quantity remains bounded by sellable inventory", async () => {
  const source = await readFile(sourceUrl, "utf8");
  assert.match(source, /Math\.min\(99, selected\?\.availableQuantity/);
  assert.match(source, /quantity >= maximumQuantity/);
  assert.match(source, /disabled=!maximumQuantity|disabled=\{!maximumQuantity/);
});

test("customer product detail exposes delivery, protection, share and reporting", async () => {
  const source = await readFile(sourceUrl, "utf8");
  for (const capability of ["DeliveryAvailability", "BuyerProtection", "Share.share", "ReportPanel", "reportProduct", "Similar Products", "ProductCard"]) assert.match(source, new RegExp(capability.replace(".", "\\.")));
});

test("customer product detail mirrors the reference purchase hierarchy", async () => {
  const source = await readFile(sourceUrl, "utf8");
  for (const capability of ["breadcrumbBar", "CURRENT PRICE", "Marketplace protected", "Buy Now", "Add to Cart", "SellerInfoStrip", "Visit Store", "Description", "Specifications", "mobilePurchase", "Similar Products"]) assert.match(source, new RegExp(capability));
});
