import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

test("customer and seller after-sales detail routes exist", async () => {
  await Promise.all(["return/[id].tsx", "support/[id].tsx", "vendor/returns/[id].tsx", "vendor/support.tsx", "vendor/reports.tsx"].map((route) => access(new URL(`../apps/mobile/app/${route}`, import.meta.url))));
});

test("return and support lists navigate into dedicated detail journeys", async () => {
  const sources = (await Promise.all(["operations/ReturnsScreen.tsx", "vendor/VendorReturnsScreen.tsx", "support/SupportScreen.tsx", "operations/ReturnDetailScreen.tsx", "support/SupportThreadScreen.tsx"].map((file) => readFile(new URL(`../apps/mobile/src/features/${file}`, import.meta.url), "utf8")))).join("\n");
  for (const capability of ["/return/", "/vendor/returns/", "/support/", "Progress timeline", "Send reply", "Open related order"]) assert.match(sources, new RegExp(capability.replaceAll("/", "\\/")));
});
