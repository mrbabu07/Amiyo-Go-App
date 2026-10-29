import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const manifest = JSON.parse(readFileSync(resolve(import.meta.dirname, "../../../package.json"), "utf8"));

test("mobile Firebase dependency scope excludes unused product bundles", () => {
  assert.equal(manifest.dependencies.firebase, undefined);
  assert.equal(manifest.dependencies["@firebase/app"], "0.16.4");
  assert.equal(manifest.dependencies["@firebase/auth"], "1.13.8");
  assert.equal(manifest.dependencies["@firebase/analytics"], "0.10.25");
});
