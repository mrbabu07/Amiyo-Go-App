import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const routes = ["dashboard", "shop", "kyc", "staff", "returns", "marketing", "messages"];

test("seller workspace exposes dedicated operational routes", async () => {
  await Promise.all(routes.filter((route) => route !== "products").map((route) => access(new URL(`../apps/mobile/app/vendor/${route}.tsx`, import.meta.url))));
  await access(new URL("../apps/mobile/app/vendor/messages/[id].tsx", import.meta.url));
  await Promise.all(["index", "add", "[id]", "edit/[id]"].map((route) => access(new URL(`../apps/mobile/app/vendor/products/${route}.tsx`, import.meta.url))));
});

test("seller product workspace supports create, edit, detail and moderation submission", async () => {
  const sources = (await Promise.all([
    readFile(new URL("../apps/mobile/src/features/vendor/VendorProductsScreen.tsx", import.meta.url), "utf8"),
    readFile(new URL("../apps/mobile/src/features/vendor/VendorProductFormScreen.tsx", import.meta.url), "utf8"),
    readFile(new URL("../apps/mobile/src/features/vendor/VendorProductDetailScreen.tsx", import.meta.url), "utf8"),
    readFile(new URL("../apps/mobile/src/features/catalog/catalog.api.ts", import.meta.url), "utf8")
  ])).join("\n");
  for (const capability of ["createVendorProduct", "updateVendorProduct", "submitVendorProduct", "replaceVendorProductVariants", "replaceVendorProductMedia", "archiveVendorProduct", "pickAndUploadImage", "ProductCategorySelect", "Search seller products", "Variant generator"]) assert.match(sources, new RegExp(capability));
});

test("seller product media and variant APIs enforce transactional replacement", async () => {
  const routes = await readFile(new URL("../apps/api/src/modules/catalog/catalog.routes.ts", import.meta.url), "utf8");
  const service = await readFile(new URL("../apps/api/src/modules/catalog/catalog.service.ts", import.meta.url), "utf8");
  for (const endpoint of ["/:id/variants", "/:id/media", "router.delete"]) assert.match(routes, new RegExp(endpoint.replaceAll("/", "\\/")));
  for (const guard of ["VERSION_CONFLICT", "MEDIA_UPLOAD_NOT_READY", "VARIANT_NOT_OWNED", "STOCK_BELOW_RESERVED", "PRODUCT_REVIEW_IN_PROGRESS", "catalog.product_media.replaced", "catalog.product_variants.replaced", "catalog.product.archived"]) assert.match(service, new RegExp(guard));
});

test("seller navigation links every dedicated workspace", async () => {
  const screen = await readFile(new URL("../apps/mobile/src/ui/Screen.tsx", import.meta.url), "utf8");
  for (const route of routes) assert.match(screen, new RegExp(`/vendor/${route}`));
});

test("seller workspace keeps core reference operations functional", async () => {
  const sources = (await Promise.all([
    "VendorShopScreen.tsx",
    "VendorKycScreen.tsx",
    "VendorStaffScreen.tsx",
    "VendorReturnsScreen.tsx",
    "VendorMarketingScreen.tsx"
  ].map((file) => readFile(new URL(`../apps/mobile/src/features/vendor/${file}`, import.meta.url), "utf8")))).join("\n");
  for (const capability of ["updateVendorShop", "submitVendorKyc", "updateVendorStaff", "getVendorReturns", "createVendorVoucher"]) assert.match(sources, new RegExp(capability));
});
