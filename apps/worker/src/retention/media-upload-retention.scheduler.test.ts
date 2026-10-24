import assert from "node:assert/strict";
import test from "node:test";
import { MediaUploadRetentionScheduler } from "./media-upload-retention.scheduler.js";

test("media retention selects only expired pending and old rejected uploads", async () => {
  const now = new Date("2026-10-24T12:00:00.000Z");
  const removed: string[] = [];
  const deleted: unknown[] = [];
  let query: any;
  const client = {
    mediaUpload: {
      findMany: async (input: unknown) => { query = input; return [{ id: "pending", status: "pending", storageKey: "private/support/pending.pdf" }, { id: "rejected", status: "rejected", storageKey: "public/product/rejected.jpg" }]; },
      deleteMany: async (input: unknown) => { deleted.push(input); return { count: 1 }; }
    }
  };
  const storage = { download: async () => Buffer.alloc(0), remove: async (key: string) => { removed.push(key); } };
  await new MediaUploadRetentionScheduler(client as never, storage, () => assert.fail("unexpected cleanup error")).poll(now);
  assert.deepEqual(query.where.OR, [
    { status: "pending", expiresAt: { lte: new Date("2026-10-23T12:00:00.000Z") } },
    { status: "rejected", createdAt: { lte: new Date("2026-10-17T12:00:00.000Z") } }
  ]);
  assert.equal(query.take, 100);
  assert.deepEqual(removed, ["private/support/pending.pdf", "public/product/rejected.jpg"]);
  assert.deepEqual(deleted, [
    { where: { id: "pending", status: "pending", storageKey: "private/support/pending.pdf" } },
    { where: { id: "rejected", status: "rejected", storageKey: "public/product/rejected.jpg" } }
  ]);
  assert.doesNotMatch(JSON.stringify(query), /ready|uploaded|processing/);
});

test("storage deletion failure preserves the database row for retry", async () => {
  let deleted = false;
  const errors: unknown[] = [];
  const client = { mediaUpload: { findMany: async () => [{ id: "one", status: "pending", storageKey: "private/file" }], deleteMany: async () => { deleted = true; } } };
  const storage = { download: async () => Buffer.alloc(0), remove: async () => { throw new Error("provider unavailable"); } };
  await new MediaUploadRetentionScheduler(client as never, storage, (error) => errors.push(error)).poll();
  assert.equal(deleted, false);
  assert.equal(errors.length, 1);
});

test("overlapping media retention polls do not run concurrently", async () => {
  let queries = 0;
  let release: () => void = () => undefined;
  const pending = new Promise<void>((resolve) => { release = resolve; });
  const client = { mediaUpload: { findMany: async () => { queries++; await pending; return []; }, deleteMany: async () => ({ count: 0 }) } };
  const storage = { download: async () => Buffer.alloc(0), remove: async () => undefined };
  const scheduler = new MediaUploadRetentionScheduler(client as never, storage, () => assert.fail("unexpected cleanup error"));
  const first = scheduler.poll();
  await Promise.resolve();
  await scheduler.poll();
  release();
  await first;
  assert.equal(queries, 1);
});
