import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("./AdminOrdersScreen.tsx", import.meta.url), "utf8");

test("admin orders expose status notification counts and recent order labels", () => {
  assert.match(source, /New in 24 hours/);
  assert.match(source, /function StatusOverview/);
  assert.match(source, /Red bubbles show orders received in the last 24 hours/);
  assert.match(source, />NEW</);
  assert.match(source, /newCountText/);
});

test("admin order cards expose an operational fulfillment tracker", () => {
  assert.match(source, /function OrderProgress/);
  assert.match(source, /progressStages/);
  assert.match(source, /Track & manage/);
  assert.match(source, /Seller packages/);
  assert.match(source, /resolution history/);
});
