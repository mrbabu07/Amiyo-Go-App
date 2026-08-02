import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("local Firebase Auth emulator has aligned API and mobile contracts", async () => {
  const firebase = JSON.parse(await readFile(new URL("../firebase.json", import.meta.url), "utf8"));
  const mobile = await readFile(new URL("../apps/mobile/src/features/auth/firebase-auth-emulator.ts", import.meta.url), "utf8");
  const apiExample = await readFile(new URL("../apps/api/.env.example", import.meta.url), "utf8");
  assert.equal(firebase.emulators.auth.port, 9099);
  assert.match(mobile, /connectAuthEmulator/);
  assert.match(mobile, /EXPO_PUBLIC_FIREBASE_AUTH_EMULATOR_URL/);
  assert.match(apiExample, /FIREBASE_AUTH_EMULATOR_HOST=/);
});
