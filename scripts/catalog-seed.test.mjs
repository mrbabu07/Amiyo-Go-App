import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("catalog seed is locally runnable and product-detail complete", async () => {
  const source = await readFile(new URL("../prisma/seed.ts", import.meta.url), "utf8");
  assert.match(source, /loadEnvFile\("apps\/api\/\.env"\)/);
  assert.match(source, /Catalog seed complete/);
  assert.match(source, /Premium Wireless Headphones/);
  assert.match(source, /variants: \{ create:/);
  assert.match(source, /inventory: \{ create:/);
  assert.match(source, /media: \{ create:/);
  assert.ok((source.match(/AMIYO-[A-Z]+-001/g) ?? []).length >= 20);
});

test("seller roles receive return-management permission during seed", async () => {
  const source = await readFile(new URL("../prisma/seed.ts", import.meta.url), "utf8");
  for (const role of ["VENDOR_OWNER", "VENDOR_MANAGER", "VENDOR_STAFF"]) {
    assert.match(source, new RegExp(`${role}: \\[[^\\n]+returns:manage`));
  }
});
