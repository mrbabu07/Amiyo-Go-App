import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { URL } from "node:url";
import test from "node:test";

const customer = readFileSync(new URL("./SupportThreadScreen.tsx", import.meta.url), "utf8");
const admin = readFileSync(new URL("./AdminSupportScreen.tsx", import.meta.url), "utf8");

test("customer support conversation remains readable on mobile", () => {
  assert.match(customer, /useWindowDimensions\(\)\.width < 620/);
  assert.match(customer, /compact && styles\.contextCompact/);
  assert.match(customer, /compact && styles\.contextActionsCompact/);
  assert.match(customer, /compact && styles\.messageCompact/);
  assert.match(customer, /minHeight: 44/);
});

test("admin support case controls stack safely on mobile", () => {
  assert.match(admin, /useWindowDimensions\(\)\.width < 620/);
  assert.match(admin, /compact && styles\.contextCompact/);
  assert.match(admin, /compact && styles\.contextButtonCompact/);
  assert.match(admin, /compact && styles\.sendCompact/);
  assert.match(admin, /minHeight: 44/);
});
