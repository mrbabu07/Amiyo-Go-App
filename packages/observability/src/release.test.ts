import assert from "node:assert/strict";
import test from "node:test";
import { releaseIdentity } from "./release.js";

test("release identity prefers explicit SHA and accepts Render commit metadata", () => {
  assert.equal(releaseIdentity({ RELEASE_SHA: "ABCDEF1234567", RENDER_GIT_COMMIT: "1111111" }), "abcdef1234567");
  assert.equal(releaseIdentity({ RENDER_GIT_COMMIT: "1234567890abcdef" }), "1234567890abcdef");
  assert.equal(releaseIdentity({ GITHUB_SHA: "abcdef1" }), "abcdef1");
});

test("release identity never reflects arbitrary environment values", () => {
  assert.equal(releaseIdentity({ RELEASE_SHA: "secret/value" }), "unknown");
  assert.equal(releaseIdentity({ RENDER_GIT_COMMIT: "" }), "unknown");
});
