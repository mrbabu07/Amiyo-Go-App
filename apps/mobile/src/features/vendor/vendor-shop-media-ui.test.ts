import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const media = readFileSync(new URL("./VendorShopMediaScreen.tsx", import.meta.url), "utf8");
const storefront = readFileSync(new URL("../catalog/ShopScreen.tsx", import.meta.url), "utf8");
const route = readFileSync(new URL("../../../app/vendor/shop/media.tsx", import.meta.url), "utf8");

test("vendor shop media uses purpose-scoped uploads and sends upload IDs", () => {
  assert.match(media, /pickAndUploadImage\(owner, kind === "logo" \? "shop" : "banner"\)/);
  assert.match(media, /waitForMediaUploadReady\(owner, result\.id\)/);
  assert.match(media, /logoUploadId: uploadId/);
  assert.match(media, /bannerUploadId: uploadId/);
  assert.doesNotMatch(media, /storageKey:/);
  assert.match(route, /VendorShopMediaScreen/);
});

test("public storefront renders published shop logo and banner", () => {
  assert.match(storefront, /result\.data\.bannerUrl/);
  assert.match(storefront, /result\.data\.logoUrl/);
  assert.match(storefront, /accessibilityLabel=\{`\$\{result\.data\.name\} cover`\}/);
});
