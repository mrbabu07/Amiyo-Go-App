import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const routes = ["dashboard", "shop", "kyc", "staff", "returns", "marketing", "messages"];

test("seller workspace exposes dedicated operational routes", async () => {
  await Promise.all(routes.map((route) => access(new URL(`../apps/mobile/app/vendor/${route}.tsx`, import.meta.url))));
  await access(new URL("../apps/mobile/app/vendor/messages/[id].tsx", import.meta.url));
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
