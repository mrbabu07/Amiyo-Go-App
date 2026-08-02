import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("Firebase public configuration stays env-driven and analytics is consent-gated", async () => {
  const config = await readFile(new URL("../apps/mobile/src/features/auth/firebase.config.ts", import.meta.url), "utf8");
  const analytics = await readFile(new URL("../apps/mobile/src/features/auth/firebase-analytics.web.ts", import.meta.url), "utf8");
  const example = await readFile(new URL("../apps/mobile/.env.example", import.meta.url), "utf8");
  assert.match(config, /EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID/);
  assert.match(config, /EXPO_PUBLIC_FIREBASE_ANALYTICS_ENABLED === "true"/);
  assert.match(analytics, /isSupported\(\)/);
  assert.match(example, /EXPO_PUBLIC_FIREBASE_ANALYTICS_ENABLED=false/);
  assert.doesNotMatch(config, /AIza[0-9A-Za-z_-]{20,}/);
});

test("partial Firebase setup remains a production readiness blocker", async () => {
  const checker = await readFile(new URL("../scripts/release-readiness.mjs", import.meta.url), "utf8");
  assert.match(checker, /TBD\|PARTIAL\|BLOCKED/);
});
