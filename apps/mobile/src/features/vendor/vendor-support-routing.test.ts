import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const form = readFileSync(new URL("../support/SupportScreen.tsx", import.meta.url), "utf8");
const thread = readFileSync(new URL("../support/SupportThreadScreen.tsx", import.meta.url), "utf8");
const route = readFileSync(new URL("../../../app/vendor/support.tsx", import.meta.url), "utf8");
const detailRoute = readFileSync(new URL("../../../app/vendor/support/[id].tsx", import.meta.url), "utf8");

test("seller support stays inside the seller workspace", () => {
  assert.match(route, /audience="seller" basePath="\/vendor\/support"/);
  assert.match(detailRoute, /SupportThreadScreen audience="seller" basePath="\/vendor\/support"/);
  assert.match(form, /router\.push\(`\$\{basePath\}\/\$\{ticket\.id\}` as never\)/);
  assert.match(thread, /router\.replace\(basePath\)/);
  assert.match(thread, /`\/vendor\/orders\/\$\{ticket\.orderId\}`/);
  assert.match(thread, /`\/vendor\/returns\/\$\{ticket\.returnId\}`/);
});

test("shared support labels seller operations without changing customer defaults", () => {
  assert.match(form, /audience === "seller" \? "Seller operations support" : "How can we help\?"/);
  assert.match(form, /basePath = "\/support"/);
  assert.match(thread, /audience === "seller" \? "SELLER SUPPORT THREAD" : "SUPPORT THREAD"/);
});
