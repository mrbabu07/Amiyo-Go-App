import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const artifacts = [
  "docs/handover.md",
  "docs/environment-reference.md",
  "docs/api/client-generation.md",
  "docs/test-strategy-and-evidence.md",
  "docs/store-release-guide.md",
  "docs/known-limitations.md",
  "docs/runbooks/queue-operations.md",
  "docs/runbooks/payment-operations.md",
  "docs/runbooks/delivery-operations.md"
];

test("handover package contains every required maintainer artifact", async () => {
  await Promise.all(artifacts.map((artifact) => access(new URL(`../${artifact}`, import.meta.url))));
  const handover = await readFile(new URL("../docs/handover.md", import.meta.url), "utf8");
  for (const artifact of artifacts.slice(1)) assert.match(handover, new RegExp(artifact.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
});

test("handover does not overstate the production gate", async () => {
  const handover = await readFile(new URL("../docs/handover.md", import.meta.url), "utf8");
  const limitations = await readFile(new URL("../docs/known-limitations.md", import.meta.url), "utf8");
  assert.match(handover, /production approval remains blocked/);
  assert.match(limitations, /production-scale rehearsals/);
  assert.match(limitations, /real-device E2E evidence/);
});

test("committed OpenAPI document is valid and versioned", async () => {
  const openapi = JSON.parse(await readFile(new URL("../docs/api/openapi.json", import.meta.url), "utf8"));
  assert.match(openapi.openapi, /^3\./);
  assert.equal(openapi.info.title, "Amiyo-Go API");
  assert.ok(Object.keys(openapi.paths).length > 5);
});
