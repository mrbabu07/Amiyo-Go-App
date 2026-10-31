import { readFileSync } from "node:fs";
import { strict as assert } from "node:assert";
import { test } from "node:test";

const vendor = readFileSync(new URL("./VendorUniversityScreen.tsx", import.meta.url), "utf8");
const admin = readFileSync(new URL("../admin/AdminUniversityScreen.tsx", import.meta.url), "utf8");

test("seller university modules expand into steps and actions", () => {
  assert.match(vendor, /accessibilityState=\{\{ expanded \}\}/);
  assert.match(vendor, /setExpanded\(\(value\) => !value\)/);
  assert.match(vendor, /module\.steps\.map/);
  assert.match(vendor, /module\.links\.map/);
});

test("admin university guides open controlled operational workspaces", () => {
  assert.match(admin, /router\.push\(href/);
  assert.match(admin, /\/admin\/orders/);
  assert.match(admin, /\/admin\/analytics/);
});
