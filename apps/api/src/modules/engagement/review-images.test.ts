import assert from "node:assert/strict";
import test from "node:test";
import { reviewImages } from "./review-images.js";

test("review photos expose only owned public image keys through configured HTTPS storage", () => {
  const owner = "11111111-1111-4111-8111-111111111111";
  const id = "22222222-2222-4222-8222-222222222222";
  const photo = { id, storageKey: `public/review/${owner}/${id}.jpg`, mimeType: "image/jpeg" };
  assert.deepEqual(reviewImages([photo], owner, "https://cdn.example/assets"), [{ id, url: `https://cdn.example/assets/${photo.storageKey}` }]);
  for (const storageKey of [`private/review/${owner}/${id}.jpg`, `public/review/${id}/${id}.jpg`, "https://external.example/image.jpg", `public/review/${owner}/../secret.jpg`]) assert.deepEqual(reviewImages([{ ...photo, storageKey }], owner, "https://cdn.example"), []);
  for (const base of ["", "http://cdn.example", "https://user:pass@cdn.example", "https://cdn.example?token=secret", "invalid"]) assert.deepEqual(reviewImages([photo], owner, base), []);
  assert.deepEqual(reviewImages([{ ...photo, mimeType: "image/svg+xml" }], owner, "https://cdn.example"), []);
  assert.equal(reviewImages(Array.from({ length: 6 }, () => photo), owner, "https://cdn.example").length, 5);
});
