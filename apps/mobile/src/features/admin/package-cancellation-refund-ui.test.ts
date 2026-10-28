import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("admin refund desk exposes captured seller package cancellations", () => {
  const desk = readFileSync(new URL("./PackageCancellationRefundDesk.tsx", import.meta.url), "utf8");
  const returns = readFileSync(new URL("./AdminReturnsScreen.tsx", import.meta.url), "utf8");
  assert.match(desk, /getPackageCancellationRefunds/);
  assert.match(desk, /completePackageCancellationRefund/);
  assert.match(desk, /Provider refund reference/);
  assert.match(desk, /orderNumber/);
  assert.match(desk, /shopName/);
  assert.match(returns, /<PackageCancellationRefundDesk \/>/);
});
