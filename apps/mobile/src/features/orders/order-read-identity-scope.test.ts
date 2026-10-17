import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (name: string) => readFileSync(new URL(`./${name}`, import.meta.url), "utf8");

for (const name of ["InvoiceScreen.tsx", "OrderTrackingScreen.tsx", "FulfillmentDocumentScreen.tsx", "DocumentVerificationScreen.tsx"]) {
  test(`${name} subscribes to reactive identity`, () => {
    const source = read(name);
    assert.match(source, /useCurrentUser/);
    assert.doesNotMatch(source, /firebaseAuth/);
  });
}

test("document verification hides results after an account change", () => {
  const source = read("DocumentVerificationScreen.tsx");
  assert.match(source, /return \{ result, uid: user\.uid \}/);
  assert.match(source, /verification\.data\?\.uid === activeUid\.current/);
});
