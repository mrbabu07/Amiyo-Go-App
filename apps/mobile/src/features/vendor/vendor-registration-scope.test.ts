import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("./VendorRegistrationScreen.tsx", import.meta.url), "utf8");
const locationSelect = readFileSync(new URL("./components/LocationSelect.tsx", import.meta.url), "utf8");

test("seller registration follows the active account through completion", () => {
  assert.match(source, /useCurrentUser\(\)/);
  assert.match(source, /mutationFn: \(owner: User\)/);
  assert.match(source, /activeUid\.current !== owner\.uid/);
  assert.match(source, /createSession\(owner\)/);
  assert.match(source, /\[user\?\.uid\]/);
  assert.doesNotMatch(source, /firebaseAuth\?\.currentUser/);
});

test("seller location modal avoids nested web buttons and exposes radio state", () => {
  assert.match(locationSelect, /<View style=\{styles\.backdrop\}>/);
  assert.match(locationSelect, /style=\{StyleSheet\.absoluteFill\}/);
  assert.match(locationSelect, /accessibilityViewIsModal/);
  assert.match(locationSelect, /accessibilityRole="radio"/);
  assert.match(locationSelect, /accessibilityState=\{\{ checked: active \}\}/);
  assert.doesNotMatch(locationSelect, /<Pressable onPress=\{close\} style=\{styles\.backdrop\}>/);
  assert.doesNotMatch(locationSelect, /<Pressable onPress=\{\(\) => undefined\} style=\{styles\.modal\}>/);
});
