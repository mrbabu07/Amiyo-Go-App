import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("local Firebase Auth emulator has aligned API and mobile contracts", async () => {
  const firebase = JSON.parse(await readFile(new URL("../firebase.json", import.meta.url), "utf8"));
  const mobile = await readFile(new URL("../apps/mobile/src/features/auth/firebase-auth-emulator.ts", import.meta.url), "utf8");
  const apiExample = await readFile(new URL("../apps/api/.env.example", import.meta.url), "utf8");
  const firebaseDev = await readFile(new URL("firebase-dev.mjs", import.meta.url), "utf8");
  assert.equal(firebase.emulators.auth.port, 9099);
  assert.match(mobile, /connectAuthEmulator/);
  assert.match(mobile, /EXPO_PUBLIC_FIREBASE_AUTH_EMULATOR_URL/);
  assert.match(apiExample, /FIREBASE_AUTH_EMULATOR_HOST=/);
  assert.match(firebaseDev, /--export-on-exit/);
  assert.match(firebaseDev, /firebase-export-metadata\.json/);
});

test("Firebase Auth E2E verifies emulator tokens through the API adapter", async () => {
  const packageJson = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));
  const harness = await readFile(new URL("firebase-auth-e2e.mjs", import.meta.url), "utf8");

  assert.match(packageJson.scripts["test:firebase-auth-e2e"], /firebase emulators:exec --only auth/);
  assert.match(harness, /accounts:signUp/);
  assert.match(harness, /FirebaseTokenVerifier/);
  assert.match(harness, /INVALID_ACCESS_TOKEN/);
});

test("local demo identities align Firebase users, database roles, and login shortcuts", async () => {
  const authSeed = await readFile(new URL("seed-firebase-demo-users.mjs", import.meta.url), "utf8");
  const databaseSeed = await readFile(new URL("../prisma/seed.ts", import.meta.url), "utf8");
  const authScreen = await readFile(new URL("../apps/mobile/src/features/auth/AuthScreen.tsx", import.meta.url), "utf8");
  const setup = await readFile(new URL("demo-setup.mjs", import.meta.url), "utf8");
  for (const identity of ["amiyo-demo-customer", "amiyo-demo-vendor", "amiyo-demo-admin"]) {
    assert.match(authSeed, new RegExp(identity));
    assert.match(databaseSeed, new RegExp(identity));
  }
  assert.match(authSeed, /loopback Firebase Auth Emulator/);
  assert.match(authScreen, /Local demo accounts/);
  assert.match(authScreen, /EXPO_PUBLIC_FIREBASE_AUTH_EMULATOR_URL/);
  assert.match(setup, /apps\/api\/\.env/);
  assert.match(setup, /prisma:migrate:deploy/);
  assert.doesNotMatch(setup, /db push/);
});
