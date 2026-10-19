import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("./AdminCategoryAttributesScreen.tsx", import.meta.url), "utf8");

test("category attributes supports responsive seller and discovery controls", () => {
  assert.match(source, /CATALOG FIELD ARCHITECTURE/);
  assert.match(source, /Required for sellers/);
  assert.match(source, /Customer filter/);
  assert.match(source, /attribute\.required/);
  assert.match(source, /attribute\.filterable/);
  assert.match(source, /compact && catalogStyles\.toggleRowCompact/);
  assert.match(source, /trackColor=\{\{ false: colors\.border, true: colors\.primarySoft \}\}/);
  assert.match(source, /function moveAttribute/);
  assert.match(source, /Move \$\{attribute\.label\} up/);
  assert.match(source, /Move \$\{attribute\.label\} down/);
  assert.match(source, /Field position \{index \+ 1\}/);
  assert.match(source, /Manage category tree/);
  assert.match(source, /router\.push\("\/admin\/categories\/manage"\)/);
});
