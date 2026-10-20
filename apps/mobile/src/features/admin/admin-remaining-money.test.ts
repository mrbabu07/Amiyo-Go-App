import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const files = {
  inventory: readFileSync(new URL("./AdminInventoryScreen.tsx", import.meta.url), "utf8"),
  offer: readFileSync(new URL("./AdminOfferFormScreen.tsx", import.meta.url), "utf8"),
  reference: readFileSync(new URL("./AdminReferenceWorkspaceScreen.tsx", import.meta.url), "utf8"),
  returns: readFileSync(new URL("./AdminReturnsScreen.tsx", import.meta.url), "utf8")
};

test("admin catalog and queue displays use exact money formatting", () => {
  assert.match(files.inventory, /formatMinor\(minor\)/);
  assert.match(files.offer, /formatMinor\(product\.priceMinor\)/);
  assert.match(files.reference, /formatMinor\(minor\)/);
  assert.doesNotMatch(files.inventory, /Number\(minor\)/);
  assert.doesNotMatch(files.offer, /Number\(product\.priceMinor\)/);
  assert.doesNotMatch(files.reference, /Number\(minor\)/);
});

test("admin return approval round-trips exact minor units", () => {
  assert.match(files.returns, /parseMajorToMinor\(amount\)/);
  assert.match(files.returns, /minorToMajorInput\(requestedAmountMinor\)/);
  assert.doesNotMatch(files.returns, /Math\.round\(Number\(amount\)/);
  assert.doesNotMatch(files.returns, /Number\(requestedAmountMinor\)/);
});
