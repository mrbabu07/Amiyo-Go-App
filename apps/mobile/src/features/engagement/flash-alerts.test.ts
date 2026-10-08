import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { URL } from "node:url";

test("flash controls use independent authenticated state and explicit off actions", () => {
  const source = readFileSync(new URL("./FlashAlerts.tsx", import.meta.url), "utf8");
  assert.match(source, /queryKey: \["flash-alerts", user\?\.uid \?\? null\]/);
  assert.match(source, /firebaseAuth\?\.currentUser\?\.uid !== user.uid/);
  assert.match(source, /firebaseAuth\?\.currentUser\?\.uid !== uid/);
  assert.match(source, /retry: false/);
  assert.match(source, /accessibilityRole="switch"/);
  assert.match(source, /enabled: false/);
  assert.match(source, /does not change your stock or price alerts/);
  assert.doesNotMatch(source, /removeAlert\(/);
});
