import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { URL } from "node:url";

const source = readFileSync(new URL("../operations/ReturnsScreen.tsx", import.meta.url), "utf8");

test("returns layout preserves reference hierarchy without copying reference colors", () => {
  for (const title of ["My Returns", "Request Return", "Active returns", "Refunded", "PRODUCT", "REASON", "Return status", "Refund summary", "Back to orders", "No returns yet"]) assert.ok(source.includes(title));
  assert.match(source, /productColumn: \{ flex: 0.8/);
  assert.match(source, /progressColumn: \{ flex: 1.2/);
  assert.match(source, /compact=\{width < 1024\}/);
  assert.match(source, /flexBasis: "auto", width: "100%"/);
  assert.match(source, /backgroundColor: colors.primarySoft/);
  assert.doesNotMatch(source, /#(?:f97316|ea580c|f8fafc|fff7ed)/i);
});

test("return cards keep actions independent and preserve account and error safeguards", () => {
  assert.match(source, /return <View style=\{styles.card\}/);
  assert.match(source, /queryKey: \["returns", user\?\.uid\]/);
  assert.match(source, /if \(!user\) return/);
  assert.match(source, /!query.error && !query.data\?\.length/);
  assert.match(source, /label="Try again"/);
  assert.match(source, /label="Open related order"/);
  assert.match(source, /accessibilityRole="button"/);
  assert.match(source, /Counts cover the loaded requests/);
});
