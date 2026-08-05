import assert from "node:assert/strict";
import test from "node:test";
import { mediaUploadInputSchema } from "./media.js";

test("media tickets enforce purpose-specific type and size limits", () => {
  assert.equal(mediaUploadInputSchema.safeParse({ purpose: "banner", fileName: "hero.webp", mimeType: "image/webp", size: 1_000_000 }).success, true);
  assert.equal(mediaUploadInputSchema.safeParse({ purpose: "banner", fileName: "hero.pdf", mimeType: "application/pdf", size: 1_000_000 }).success, false);
  assert.equal(mediaUploadInputSchema.safeParse({ purpose: "product", fileName: "large.jpg", mimeType: "image/jpeg", size: 11_000_000 }).success, false);
});
