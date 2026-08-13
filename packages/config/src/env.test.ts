import assert from "node:assert/strict";
import test from "node:test";
import { parseApiEnv } from "./env.js";

test("API env accepts blank optional values from env example files", () => {
  const env = parseApiEnv({
    API_PUBLIC_URL: "http://localhost:4000",
    DATABASE_URL: "postgresql://localhost:5432/amiyogo",
    DIRECT_URL: "",
    REDIS_URL: "redis://localhost:6379",
    FIREBASE_PROJECT_ID: "amiyo-app",
    FIREBASE_CLIENT_EMAIL: "",
    FIREBASE_PRIVATE_KEY: "",
    FIREBASE_AUTH_EMULATOR_HOST: "127.0.0.1:9099",
    OBJECT_STORAGE_PUBLIC_URL: ""
  });

  assert.equal(env.FIREBASE_CLIENT_EMAIL, undefined);
  assert.equal(env.OBJECT_STORAGE_PUBLIC_URL, undefined);
  assert.equal(env.DIRECT_URL, undefined);
});

test("API env rejects partial SSLCommerz credentials", () => {
  assert.throws(() => parseApiEnv({ API_PUBLIC_URL: "http://localhost:4000", DATABASE_URL: "postgresql://localhost:5432/amiyogo", REDIS_URL: "redis://localhost:6379", SSLCOMMERZ_STORE_ID: "sandbox-store" }), /configured together/);
});

test("API env forbids SSLCommerz sandbox credentials in production", () => {
  assert.throws(() => parseApiEnv({ NODE_ENV: "production", API_PUBLIC_URL: "https://api.example.com", DATABASE_URL: "postgresql://localhost:5432/amiyogo", REDIS_URL: "redis://localhost:6379", FIREBASE_PROJECT_ID: "amiyo-app", FIREBASE_USE_APPLICATION_DEFAULT: "true", FIREBASE_STORAGE_BUCKET: "bucket.example", SSLCOMMERZ_STORE_ID: "sandbox-store", SSLCOMMERZ_STORE_PASSWORD: "sandbox-password", SSLCOMMERZ_SANDBOX: "true" }), /sandbox mode is forbidden/);
});
