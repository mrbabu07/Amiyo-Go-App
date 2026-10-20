import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const source = readFileSync(resolve(import.meta.dirname, "AdminCommerceWorkspaceScreen.tsx"), "utf8");

test("admin commerce keeps COD variances exact", () => {
  const variance = BigInt("900719925474099399") - BigInt("900719925474099301");
  assert.equal(variance, 98n);
  assert.equal(variance < 0n ? -variance : variance, 98n);
  assert.match(source, /formatMinor/);
  assert.match(source, /subtractMinor\(item\.collectedMinor, item\.expectedMinor\)/);
  assert.match(source, /absoluteMinor\(subtractMinor\(item\.receivedMinor, item\.expectedMinor\)\)/);
  assert.doesNotMatch(source, /Number\(item\.(?:collected|received|expected)Minor\)/);
  assert.doesNotMatch(source, /Number\(minor\)/);
});
