import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { URL } from "node:url";

const source = readFileSync(new URL("./CollectionViewControl.tsx", import.meta.url), "utf8");
const screen = readFileSync(new URL("./Screen.tsx", import.meta.url), "utf8");

test("collection view controls persist direction and size choices", () => {
  for (const label of ["Vertical", "Horizontal", "Small", "Large"]) assert.match(source, new RegExp(`label="${label}"`));
  assert.match(source, /AsyncStorage\.getItem\(storageKey\(scope\)\)/);
  assert.match(source, /AsyncStorage\.setItem\(storageKey\(scope\), JSON\.stringify\(next\)\)/);
  assert.match(source, /accessibilityState=\{\{ selected: active \}\}/);
});

test("customer, admin and seller sections expose independent view preferences", () => {
  for (const scope of ["customer-workspace", "admin-workspace", "vendor-workspace"]) assert.match(screen, new RegExp(`useCollectionView\\("${scope}"\\)`));
  assert.equal(screen.match(/<CollectionViewControl \{\.\.\.collectionView\} \/>/g)?.length, 3);
  assert.match(screen, /collectionVertical/);
  assert.match(screen, /collectionHorizontal/);
  assert.match(screen, /collectionSmall/);
});
