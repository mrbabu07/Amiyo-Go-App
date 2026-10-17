import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (name: string) => readFileSync(new URL(`./${name}`, import.meta.url), "utf8");

for (const name of ["AdminCodDeliveryScreen.tsx", "AdminLogisticsScreen.tsx", "AdminOperationsScreen.tsx"]) {
  test(`${name} scopes private operations state to the active admin`, () => {
    const source = read(name);
    assert.match(source, /useCurrentUser/);
    assert.match(source, /user\?\.uid/);
    assert.match(source, /activeUid\.current/);
    assert.doesNotMatch(source, /firebaseAuth/);
  });
}
