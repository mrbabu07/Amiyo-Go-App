import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { URL } from "node:url";

const source = readFileSync(new URL("./CollectionViewControl.tsx", import.meta.url), "utf8");
const screen = readFileSync(new URL("./Screen.tsx", import.meta.url), "utf8");
const adminOrders = readFileSync(new URL("../features/admin/AdminOrdersScreen.tsx", import.meta.url), "utf8");

test("collection view controls persist direction and size choices", () => {
  for (const label of ["Vertical", "Horizontal", "Small", "Large"]) assert.match(source, new RegExp(`label="${label}"`));
  assert.match(source, /AsyncStorage\.getItem\(storageKey\(scope\)\)/);
  assert.match(source, /AsyncStorage\.setItem\(storageKey\(scope\), JSON\.stringify\(next\)\)/);
  assert.match(source, /accessibilityState=\{\{ selected: active \}\}/);
});

test("view controls appear only on collections with real layout behavior", () => {
  assert.doesNotMatch(screen, /CollectionViewControl/);
  assert.match(adminOrders, /useCollectionView\("admin-orders"\)/);
  assert.match(adminOrders, /preference\.direction === "horizontal"/);
  assert.match(adminOrders, /orderSlotHorizontal/);
  assert.match(adminOrders, /orderSlotSmall/);
});
