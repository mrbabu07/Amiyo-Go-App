import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
const source = readFileSync(new URL("./VendorProductFormScreen.tsx", import.meta.url), "utf8");
test("seller product form scopes catalog, workspace, uploads and save completion by account", () => { assert.match(source, /useCurrentUser\(\)/); assert.match(source, /\["vendor", "products", user\?\.uid\]/); assert.match(source, /\["vendor", "workspace", user\?\.uid\]/); assert.match(source, /pickAndUploadImage\(owner, "product"\)/); assert.match(source, /activeUid\.current === owner\.uid/); assert.doesNotMatch(source, /firebaseAuth\?\.currentUser/); });

test("seller product editor reports live listing readiness", () => {
  assert.match(source, /LISTING READINESS/);
  assert.match(source, /readinessChecks/);
  assert.match(source, /Product identity/);
  assert.match(source, /Category details/);
  assert.match(source, /Product media/);
  assert.match(source, /Sellable variants/);
  assert.match(source, /Shop connection/);
  assert.match(source, /compact && styles\.readinessCompact/);
  assert.match(source, /complete=\{informationComplete\}/);
  assert.match(source, /complete=\{mediaComplete\}/);
  assert.match(source, /complete=\{variantsComplete\}/);
});

test("seller product editor preserves exact variant money", () => {
  assert.match(source, /parseMajorToMinor\(variant\.price\)/);
  assert.match(source, /minorToMajorInput\(value\)/);
  assert.match(source, /compareAt >= price/);
  assert.doesNotMatch(source, /Math\.round\(Number\(value\) \* 100\)/);
  assert.doesNotMatch(source, /String\(Number\(value\) \/ 100\)/);
});

test("seller variant generator keeps custom color and size fields separated on mobile", () => {
  assert.match(source, /<Field fullWidth label="Custom colors \(comma separated\)"/);
  assert.match(source, /<Field fullWidth label="Sizes \(comma separated\)"/);
  assert.match(source, /colorOptions: \{ flexBasis: "auto", flexGrow: 0, flexShrink: 0, minWidth: 0, width: "100%" \}/);
  assert.match(source, /fieldFullWidth: \{ flexBasis: "auto", flexGrow: 0, flexShrink: 0, minWidth: 0, width: "100%" \}/);
});
