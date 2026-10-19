import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("admin inventory exposes premium stock-risk and atomic bulk controls", async () => {
  const source = await readFile(new URL("./AdminInventoryScreen.tsx", import.meta.url), "utf8");
  assert.match(source, /STOCK COMMAND CENTER/);
  assert.match(source, /compact && styles\.heroCompact/);
  assert.match(source, /Changes are atomic/);
  assert.match(source, /accessibilityRole="checkbox"/);
  assert.match(source, /No matching inventory/);
  assert.match(source, /Inventory CSV import/);
  assert.match(source, /ActivityIndicator color=\{colors\.primary\}/);
});
