import assert from "node:assert/strict";
import test from "node:test";
import { parseApiEnv, parseMobilePublicEnv, parseWorkerEnv } from "./env.js";

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
  const shared = { API_PUBLIC_URL: "https://api.example.com", CORS_ORIGINS: "https://app.example.com", DATABASE_URL: "postgresql://database.example.com/amiyogo?sslmode=require", FIREBASE_PROJECT_ID: "amiyo-app", FIREBASE_USE_APPLICATION_DEFAULT: "true", FIREBASE_STORAGE_BUCKET: "bucket.example", PARCEL_QR_SIGNING_SECRET: "a".repeat(32) };
  assert.throws(() => parseApiEnv({ ...shared, NODE_ENV: "staging", REDIS_URL: "redis://redis.example.com:6379" }), /TLS Redis/);
  assert.equal(parseApiEnv({ ...shared, NODE_ENV: "production", REDIS_URL: "rediss://redis.example.com:6379", SSLCOMMERZ_SANDBOX: "false" }).REDIS_URL, "rediss://redis.example.com:6379");
  assert.equal(parseApiEnv({ API_PUBLIC_URL: "http://localhost:4000", DATABASE_URL: "postgresql://localhost:5432/amiyogo", REDIS_URL: "redis://localhost:6379" }).REDIS_URL, "redis://localhost:6379");
});

test("deployed public endpoints require HTTPS while localhost remains available", () => {
  const shared = { NODE_ENV: "staging", CORS_ORIGINS: "https://app.example.com", DATABASE_URL: "postgresql://database.example.com/amiyogo?sslmode=require", REDIS_URL: "rediss://redis.example.com:6379", FIREBASE_PROJECT_ID: "amiyo-app", FIREBASE_USE_APPLICATION_DEFAULT: "true", FIREBASE_STORAGE_BUCKET: "bucket.example", PARCEL_QR_SIGNING_SECRET: "a".repeat(32) };
  assert.throws(() => parseApiEnv({ ...shared, API_PUBLIC_URL: "http://api.example.com" }), /API_PUBLIC_URL must use HTTPS/);
  assert.throws(() => parseApiEnv({ ...shared, API_PUBLIC_URL: "https://api.example.com", APP_PUBLIC_URL: "http://app.example.com" }), /APP_PUBLIC_URL must use HTTPS/);
  assert.throws(() => parseApiEnv({ ...shared, API_PUBLIC_URL: "https://api.example.com", OBJECT_STORAGE_PUBLIC_URL: "http://cdn.example.com" }), /OBJECT_STORAGE_PUBLIC_URL must use HTTPS/);
  assert.equal(parseApiEnv({ API_PUBLIC_URL: "http://localhost:4000", DATABASE_URL: "postgresql://localhost:5432/amiyogo", REDIS_URL: "redis://localhost:6379" }).API_PUBLIC_URL, "http://localhost:4000");
});

test("deployed CORS requires an explicit HTTPS allowlist", () => {
  const shared = { NODE_ENV: "production", API_PUBLIC_URL: "https://api.example.com", DATABASE_URL: "postgresql://database.example.com/amiyogo?sslmode=require", REDIS_URL: "rediss://redis.example.com:6379", FIREBASE_PROJECT_ID: "amiyo-app", FIREBASE_USE_APPLICATION_DEFAULT: "true", FIREBASE_STORAGE_BUCKET: "bucket.example", PARCEL_QR_SIGNING_SECRET: "a".repeat(32), SSLCOMMERZ_SANDBOX: "false" };
  assert.throws(() => parseApiEnv(shared), /explicit CORS origin allowlist/);
  assert.throws(() => parseApiEnv({ ...shared, CORS_ORIGINS: "*" }), /explicit HTTPS origin/);
  assert.throws(() => parseApiEnv({ ...shared, CORS_ORIGINS: "http://app.example.com" }), /explicit HTTPS origin/);
  assert.throws(() => parseApiEnv({ ...shared, CORS_ORIGINS: "not-a-url" }), /explicit HTTPS origin/);
  assert.throws(() => parseApiEnv({ ...shared, CORS_ORIGINS: "https://app.example.com/path" }), /explicit HTTPS origin/);
  assert.equal(parseApiEnv({ ...shared, CORS_ORIGINS: "https://app.example.com, https://admin.example.com" }).CORS_ORIGINS, "https://app.example.com, https://admin.example.com");
});

test("deployed database connections require PostgreSQL TLS", () => {
  const shared = { NODE_ENV: "staging", API_PUBLIC_URL: "https://api.example.com", CORS_ORIGINS: "https://app.example.com", REDIS_URL: "rediss://redis.example.com:6379", FIREBASE_PROJECT_ID: "amiyo-app", FIREBASE_USE_APPLICATION_DEFAULT: "true", FIREBASE_STORAGE_BUCKET: "bucket.example", PARCEL_QR_SIGNING_SECRET: "a".repeat(32) };
  assert.throws(() => parseApiEnv({ ...shared, DATABASE_URL: "postgresql://database.example.com/amiyogo" }), /DATABASE_URL must use PostgreSQL with TLS/);
  assert.throws(() => parseApiEnv({ ...shared, DATABASE_URL: "postgresql://database.example.com/amiyogo?sslmode=require", DIRECT_URL: "postgresql://database.example.com/amiyogo" }), /DIRECT_URL must use PostgreSQL with TLS/);
  assert.equal(parseApiEnv({ ...shared, DATABASE_URL: "postgresql://database.example.com/amiyogo?sslmode=verify-full" }).DATABASE_URL.includes("verify-full"), true);
});

test("worker applies shared deployment safety and provider pairing", () => {
  const local = { API_PUBLIC_URL: "http://localhost:4000", DATABASE_URL: "postgresql://localhost:5432/amiyogo", REDIS_URL: "redis://localhost:6379" };
  assert.throws(() => parseWorkerEnv({ ...local, AMIYO_DELIVERY_API_URL: "https://delivery.example.com" }), /configured together/);
  assert.throws(() => parseWorkerEnv({ ...local, EMAIL_PROVIDER: "resend", EMAIL_PROVIDER_TOKEN: "long-enough-token" }), /configured together/);
  assert.throws(() => parseWorkerEnv({ ...local, NODE_ENV: "production", FIREBASE_AUTH_EMULATOR_HOST: "127.0.0.1:9099" }), /forbidden in production/);
});

test("mobile production builds reject local services and incomplete observability", () => {
  const firebase = { EXPO_PUBLIC_FIREBASE_API_KEY: "public-key", EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN: "amiyo-app.firebaseapp.com", EXPO_PUBLIC_FIREBASE_PROJECT_ID: "amiyo-app", EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET: "amiyo-app.firebasestorage.app", EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: "123456", EXPO_PUBLIC_FIREBASE_APP_ID: "1:123456:web:abcdef" };
  assert.throws(() => parseMobilePublicEnv({ EAS_BUILD_PROFILE: "production", EXPO_PUBLIC_API_URL: "http://localhost:4000", EXPO_PUBLIC_FIREBASE_AUTH_EMULATOR_URL: "http://127.0.0.1:9099" }), /HTTPS API URL/);
  assert.throws(() => parseMobilePublicEnv({ EAS_BUILD_PROFILE: "production", EXPO_PUBLIC_API_URL: "https://api.example.com", ...firebase }), /EAS project ID/);
  const parsed = parseMobilePublicEnv({ EAS_BUILD_PROFILE: "production", EXPO_PUBLIC_API_URL: "https://api.example.com", EXPO_PUBLIC_EAS_PROJECT_ID: "b3f9db72-cc0c-4aac-b410-aa496f931254", EXPO_PUBLIC_SENTRY_DSN: "https://public@example.ingest.sentry.io/1", ...firebase });
  assert.equal(parsed.EAS_BUILD_PROFILE, "production");
});
