import assert from "node:assert/strict";
import test from "node:test";
import { checkRateLimitStore, closeRateLimitStore, marketplaceRateLimit } from "./marketplace-rate-limit.js";

test("local rate limits retain the in-process store", () => {
  const previous = process.env.NODE_ENV;
  process.env.NODE_ENV = "test";
  try {
    assert.equal(typeof marketplaceRateLimit("local-test", { windowMs: 1_000, limit: 1 }), "function");
  } finally {
    if (previous === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = previous;
  }
});

test("production refuses a process-local rate-limit fallback", () => {
  const previousNodeEnv = process.env.NODE_ENV;
  const previousRedisUrl = process.env.REDIS_URL;
  process.env.NODE_ENV = "production";
  delete process.env.REDIS_URL;
  try {
    assert.throws(() => marketplaceRateLimit("production-test", { windowMs: 1_000, limit: 1 }), /REDIS_URL is required/);
  } finally {
    if (previousNodeEnv === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = previousNodeEnv;
    if (previousRedisUrl === undefined) delete process.env.REDIS_URL; else process.env.REDIS_URL = previousRedisUrl;
  }
});

test("local readiness and shutdown do not require Redis", async () => {
  await checkRateLimitStore();
  await closeRateLimitStore();
});
