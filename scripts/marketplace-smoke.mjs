import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
import { categorySchema, healthResponseSchema, productDetailSchema, productListResponseSchema, shopListResponseSchema } from "@amiyo/contracts";

const origin = new URL(process.env.SMOKE_API_URL || "http://127.0.0.1:4000");
if (!['http:', 'https:'].includes(origin.protocol) || origin.username || origin.password) throw new Error("SMOKE_API_URL must be an HTTP(S) URL without credentials");
const results = [];
const requireData = process.env.SMOKE_REQUIRE_DATA !== "0";
const expectedRelease = process.env.SMOKE_EXPECTED_RELEASE?.trim().toLowerCase() || null;
if (expectedRelease && !/^[a-f0-9]{7,64}$/.test(expectedRelease)) throw new Error("SMOKE_EXPECTED_RELEASE must be a commit SHA");

async function check(path, expectedStatus, schema, validate) {
  const started = performance.now();
  try {
    const response = await fetch(new URL(path, origin), { signal: AbortSignal.timeout(20_000), redirect: "error" });
    assert.equal(response.status, expectedStatus, `Expected HTTP ${expectedStatus}; received ${response.status}`);
    const body = schema ? schema.parse(await response.json()) : null;
    if (validate) validate(body);
    results.push({ path, status: "pass", elapsedMs: Math.round(performance.now() - started) });
    return body;
  } catch (error) {
    results.push({ path, status: "fail", reason: error.name === "ZodError" ? "Response contract mismatch" : error.message, elapsedMs: Math.round(performance.now() - started) });
    return null;
  }
}

const validateRelease = expectedRelease ? (health) => assert.equal(health.release, expectedRelease, "Deployed release does not match the expected commit") : undefined;
await check("/health", 200, healthResponseSchema, validateRelease);
await check("/ready", 200, healthResponseSchema, validateRelease);
await check("/api/v2/catalog/categories", 200, categorySchema.array(), (rows) => { if (requireData) assert.ok(rows.length, "No published categories"); });
const products = await check("/api/v2/catalog/products?limit=2", 200, productListResponseSchema, (page) => { if (requireData) assert.ok(page.data.length, "No published products"); });
await check("/api/v2/shops?limit=2", 200, shopListResponseSchema, (page) => { if (requireData) assert.ok(page.data.length, "No published shops"); });
if (products?.data.length) await check(`/api/v2/catalog/products/${encodeURIComponent(products.data[0].slug || products.data[0].id)}`, 200, productDetailSchema);
for (const path of ["/api/v2/orders", "/api/v2/vendor/orders", "/api/v2/admin/workspace"]) await check(path, 401);
const report = { kind: "read-only-marketplace-smoke", measuredAt: new Date().toISOString(), origin: origin.origin, results };
const output = JSON.stringify(report, null, 2);
console.log(output);
if (process.env.SMOKE_REPORT_PATH) await writeFile(process.env.SMOKE_REPORT_PATH, `${output}\n`, { encoding: "utf8", flag: "wx" });
if (results.some((result) => result.status === "fail")) process.exitCode = 1;
