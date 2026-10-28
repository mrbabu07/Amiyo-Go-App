import assert from "node:assert/strict";
import test from "node:test";
import { eligibleSellerPackages, runSellerBatch } from "./vendor-bulk-actions";
import { readFileSync } from "node:fs";

test("bulk packing cannot skip accepted state or update other selected statuses", () => {
  assert.deepEqual(eligibleSellerPackages([{ id: "new", status: "PLACED" }, { id: "accepted", status: "ACCEPTED" }, { id: "done", status: "DELIVERED" }], "PROCESSING").map((row) => row.id), ["accepted"]);
});
test("bulk stops after uncertain writes and reports only confirmed packages", async () => {
  const calls: string[] = []; const done: string[] = [];
  await assert.rejects(runSellerBatch(["one", "two", "three"], async (id) => { calls.push(id); if (id === "two") throw new Error("timeout"); }, () => true, (id) => done.push(id)), /timeout/);
  assert.deepEqual(calls, ["one", "two"]); assert.deepEqual(done, ["one"]);
  await assert.rejects(runSellerBatch(["other"], async () => { throw new Error("should not send"); }, () => false, () => {}), /Account changed/);
});
test("seller bulk UI restores and advances its durable account-scoped plan", () => {
  const source = readFileSync(new URL("./VendorBulkActions.tsx", import.meta.url), "utf8");
  assert.match(source, /vendorBatchRecovery\.load\(user\.uid\)/);
  assert.match(source, /vendorBatchRecovery\.start\(user\.uid, action, ids\)/);
  assert.match(source, /vendorBatchRecovery\.complete\(user\.uid, id\)/);
  assert.match(source, /latest\?\.status === plan\.action/);
  assert.match(source, /Discard saved batch plan/);
});
