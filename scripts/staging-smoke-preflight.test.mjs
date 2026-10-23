import assert from "node:assert/strict";
import test from "node:test";
import { stagingSmokePreflight } from "./staging-smoke-preflight.mjs";

test("staging smoke preflight accepts a same-origin HTTPS catalog target", () => {
  assert.deepEqual(stagingSmokePreflight({ API_PUBLIC_URL: "https://api.amiyo.test", LOAD_TARGET_URL: "https://api.amiyo.test/api/v2/catalog/products?limit=20" }), {
    apiOrigin: "https://api.amiyo.test",
    loadPath: "/api/v2/catalog/products?limit=20"
  });
});

test("staging smoke preflight rejects missing, insecure and cross-origin targets", () => {
  assert.throws(() => stagingSmokePreflight({ LOAD_TARGET_URL: "https://api.amiyo.test/ready" }), /API_PUBLIC_URL is required/);
  assert.throws(() => stagingSmokePreflight({ API_PUBLIC_URL: "http://api.amiyo.test", LOAD_TARGET_URL: "http://api.amiyo.test/ready" }), /API_PUBLIC_URL must use HTTPS/);
  assert.throws(() => stagingSmokePreflight({ API_PUBLIC_URL: "https://api.amiyo.test", LOAD_TARGET_URL: "https://other.amiyo.test/ready" }), /must use the API_PUBLIC_URL origin/);
  assert.throws(() => stagingSmokePreflight({ API_PUBLIC_URL: "https://api.amiyo.test", LOAD_TARGET_URL: "https://api.amiyo.test/" }), /representative public endpoint/);
});
