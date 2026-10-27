import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";

test("admin storefront identity controls web title and description metadata", () => {
  const source = fs.readFileSync(new URL("../../../app/_layout.tsx", import.meta.url), "utf8");
  assert.match(source, /document\.title = platform\.data\.seo\.title/);
  assert.match(source, /description\.content = platform\.data\.seo\.description/);
  assert.match(source, /queryKey: \["platform", "public-settings"\]/);
});
