import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { URL } from "node:url";
import test from "node:test";

test("customer order navigation has real destinations and independent named links", async () => {
  const source = await readFile(new URL("./CustomerOrdersScreen.tsx", import.meta.url), "utf8");
  for (const suffix of ["", "/tracking", "/invoice"]) {
    assert.ok(source.includes('href={`/order/${order.id}' + suffix + '` as never} asChild'));
  }
  for (const label of ["Open order", "View details for", "Track order", "Invoice for"]) {
    assert.ok(source.includes('accessibilityLabel={`' + label + ' ${order.orderNumber}`}'));
  }
  assert.match(source, /const user = useCurrentUser\(\)/);
  assert.match(source, /style=\{StyleSheet.flatten\(\[styles.productArea, compact && styles.productAreaCompact\]\)\}/);
  assert.match(source, /queryKey: \["orders", "customer", user\?\.uid\]/);
  assert.doesNotMatch(source, /onPress=\{on(?:Open|Track|Invoice)\}/);
});
