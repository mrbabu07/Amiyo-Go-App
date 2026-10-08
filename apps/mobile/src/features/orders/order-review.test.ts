import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { URL } from "node:url";
import { reviewInputSchema } from "@amiyo/contracts";

test("order review payload validates purchased item, rating and optional text", () => {
  const valid = { orderItemId: "12345678-1234-4234-8234-123456789012", rating: 5, body: null };
  assert.equal(reviewInputSchema.parse(valid).body, null);
  assert.equal(reviewInputSchema.parse({ ...valid, body: "  Good product  " }).body, "Good product");
  for (const rating of [0, 6, 2.5]) assert.equal(reviewInputSchema.safeParse({ ...valid, rating }).success, false);
  for (const body of ["ab", "x".repeat(2001)]) assert.equal(reviewInputSchema.safeParse({ ...valid, body }).success, false);
  assert.equal(reviewInputSchema.safeParse({ ...valid, mediaUploadIds: [valid.orderItemId] }).success, true);
  assert.equal(reviewInputSchema.safeParse({ ...valid, mediaUploadIds: [valid.orderItemId, valid.orderItemId] }).success, false);
  assert.equal(reviewInputSchema.safeParse({ ...valid, mediaUploadIds: ["https://untrusted.example/image.png"] }).success, false);
});

test("inline reviews retain explicit submission and account guards without mutation retry", () => {
  const source = readFileSync(new URL("./OrderReviewForm.tsx", import.meta.url), "utf8");
  assert.match(source, /retry: false/);
  assert.match(source, /firebaseAuth\?\.currentUser\?\.uid === user.uid/);
  assert.match(source, /if \(lock.current\)/);
  assert.match(source, /Submit review/);
  assert.match(source, /queryKey: \["reviews", "mine", user\?\.uid\]/);
  assert.match(source, /queryKey: \["reviews", "mine", user\?\.uid, orderItemId\]/);
  assert.match(source, /getMyReviews\(user!, orderItemId\)/);
  assert.match(source, /pickAndUploadImage\(user!, "review"\)/);
  assert.match(source, /getMediaUploadStatus\(user!, photo.id\)/);
  assert.match(source, /mediaUploadIds: photos.map\(\(photo\) => photo.id\)/);
  assert.match(source, /photos.some\(\(photo\) => !photo.ready\)/);
  assert.match(source, /if \(!existing.data \|\| existing.error \|\| existing.data.length\)/);
  const expansion = readFileSync(new URL("./CustomerOrderExpansion.tsx", import.meta.url), "utf8");
  assert.match(expansion, /detail.status === "DELIVERED"/);
  assert.match(expansion, /key=\{`\$\{user.uid\}:\$\{item.id\}`\} orderItemId=\{item.id\}/);
});
