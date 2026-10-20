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
  assert.equal(env.HTTP_REQUEST_TIMEOUT_MS, 30_000);
  assert.equal(env.HTTP_HEADERS_TIMEOUT_MS, 15_000);
  assert.equal(env.HTTP_KEEP_ALIVE_TIMEOUT_MS, 5_000);
  assert.equal(env.HTTP_MAX_REQUESTS_PER_SOCKET, 1_000);
});

test("API env rejects a headers timeout beyond the request timeout", () => {
  assert.throws(() => parseApiEnv({ API_PUBLIC_URL: "http://localhost:4000", DATABASE_URL: "postgresql://localhost:5432/amiyogo", REDIS_URL: "redis://localhost:6379", HTTP_REQUEST_TIMEOUT_MS: "10000", HTTP_HEADERS_TIMEOUT_MS: "10001" }), /cannot exceed the request timeout/);
});

test("API env rejects partial SSLCommerz credentials", () => {
  assert.throws(() => parseApiEnv({ API_PUBLIC_URL: "http://localhost:4000", DATABASE_URL: "postgresql://localhost:5432/amiyogo", REDIS_URL: "redis://localhost:6379", SSLCOMMERZ_STORE_ID: "sandbox-store" }), /configured together/);
});

test("API env forbids SSLCommerz sandbox credentials in production", () => {
  assert.throws(() => parseApiEnv({ NODE_ENV: "production", API_PUBLIC_URL: "https://api.example.com", DATABASE_URL: "postgresql://localhost:5432/amiyogo", REDIS_URL: "rediss://redis.example.com:6379", FIREBASE_PROJECT_ID: "amiyo-app", FIREBASE_USE_APPLICATION_DEFAULT: "true", FIREBASE_STORAGE_BUCKET: "bucket.example", SSLCOMMERZ_STORE_ID: "sandbox-store", SSLCOMMERZ_STORE_PASSWORD: "sandbox-password", SSLCOMMERZ_SANDBOX: "true" }), /sandbox mode is forbidden/);
});

test("staging and production require TLS Redis while local development remains compatible", () => {
  const shared = { API_PUBLIC_URL: "https://api.example.com", DATABASE_URL: "postgresql://database.example.com/amiyogo", FIREBASE_PROJECT_ID: "amiyo-app", FIREBASE_USE_APPLICATION_DEFAULT: "true", FIREBASE_STORAGE_BUCKET: "bucket.example", PARCEL_QR_SIGNING_SECRET: "a".repeat(32) };
  assert.throws(() => parseApiEnv({ ...shared, NODE_ENV: "staging", REDIS_URL: "redis://redis.example.com:6379" }), /TLS Redis/);
  assert.equal(parseApiEnv({ ...shared, NODE_ENV: "production", REDIS_URL: "rediss://redis.example.com:6379", SSLCOMMERZ_SANDBOX: "false" }).REDIS_URL, "rediss://redis.example.com:6379");
  assert.equal(parseApiEnv({ API_PUBLIC_URL: "http://localhost:4000", DATABASE_URL: "postgresql://localhost:5432/amiyogo", REDIS_URL: "redis://localhost:6379" }).REDIS_URL, "redis://localhost:6379");
});
