import assert from "node:assert/strict";
import test from "node:test";
import { ApiProblem } from "../../middleware/api-problem.js";
import { requireFirebaseAdminConfiguration, resolveFirebaseAdminConfiguration } from "./firebase-admin.config.js";

test("Firebase Admin service-account configuration normalizes escaped private-key lines", () => {
  const configuration = resolveFirebaseAdminConfiguration({ FIREBASE_PROJECT_ID: "amiyo-app", FIREBASE_CLIENT_EMAIL: "firebase@example.com", FIREBASE_PRIVATE_KEY: "line-one\\nline-two" });
  assert.equal(configuration.mode, "service_account");
  if (configuration.mode === "service_account") assert.equal(configuration.privateKey, "line-one\nline-two");
});

test("Firebase Admin supports explicit application-default and local emulator modes", () => {
  assert.equal(resolveFirebaseAdminConfiguration({ FIREBASE_PROJECT_ID: "amiyo-app", FIREBASE_USE_APPLICATION_DEFAULT: "true" }).mode, "application_default");
  assert.equal(resolveFirebaseAdminConfiguration({ NODE_ENV: "development", FIREBASE_PROJECT_ID: "amiyo-app", FIREBASE_AUTH_EMULATOR_HOST: "127.0.0.1:9099" }).mode, "emulator");
});

test("Firebase Admin rejects unsafe or incomplete configuration", () => {
  assert.throws(() => resolveFirebaseAdminConfiguration({ NODE_ENV: "production", FIREBASE_PROJECT_ID: "amiyo-app", FIREBASE_AUTH_EMULATOR_HOST: "127.0.0.1:9099" }), /cannot be used in production/);
  assert.throws(() => resolveFirebaseAdminConfiguration({ FIREBASE_PROJECT_ID: "amiyo-app", FIREBASE_CLIENT_EMAIL: "firebase@example.com" }), /incomplete/);
  assert.throws(() => requireFirebaseAdminConfiguration({}), (error) => error instanceof ApiProblem && error.code === "AUTH_PROVIDER_NOT_CONFIGURED" && error.status === 503);
});
