import assert from "node:assert/strict";
import test from "node:test";
import { TtlCache } from "./ttl-cache.js";

test("TTL cache coalesces concurrent loads", async () => {
  const cache = new TtlCache();
  let calls = 0;
  const load = async () => { calls += 1; await new Promise((resolve) => setTimeout(resolve, 5)); return "ready"; };
  const values = await Promise.all(Array.from({ length: 10 }, () => cache.getOrCreate("home", 1_000, load)));
  assert.deepEqual(values, Array(10).fill("ready"));
  assert.equal(calls, 1);
});

test("TTL cache evicts rejected loads", async () => {
  const cache = new TtlCache();
  let calls = 0;
  await assert.rejects(() => cache.getOrCreate("home", 1_000, async () => { calls += 1; throw new Error("offline"); }));
  assert.equal(await cache.getOrCreate("home", 1_000, async () => { calls += 1; return "ready"; }), "ready");
  assert.equal(calls, 2);
});

test("TTL cache serves stale data while refreshing", async () => {
  const cache = new TtlCache();
  let value = "first";
  assert.equal(await cache.getOrCreate("home", 0, async () => value, 1_000), "first");
  value = "second";
  assert.equal(await cache.getOrCreate("home", 100, async () => value, 1_000), "first");
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.equal(await cache.getOrCreate("home", 100, async () => value, 1_000), "second");
});

test("TTL cache can extend a warmed entry's stale window", async () => {
  const cache = new TtlCache();
  assert.equal(await cache.getOrCreate("growth", 0, async () => "warmed"), "warmed");
  cache.extendStale("growth", 1_000);
  assert.equal(await cache.getOrCreate("growth", 100, async () => "refreshed"), "warmed");
});
