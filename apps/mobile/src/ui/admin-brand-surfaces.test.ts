import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");

test("admin order and finance command surfaces use semantic brand colors", () => {
  const source = [read("../features/admin/AdminOrderDetailScreen.tsx"), read("../features/admin/AdminPayoutsScreen.tsx"), read("../features/admin/AdminCommissionScreen.tsx")].join("\n");
  assert.match(source, /colors\.onPrimary/);
  assert.match(source, /colors\.shellMuted/);
  assert.doesNotMatch(source, /#94a3b8|#cbd5e1|#f1f5f9|#fff7ed|#ecfdf5|#fef2f2/i);
});
