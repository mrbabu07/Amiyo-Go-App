import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const first = new URL("../docs/migration/rehearsals/synthetic-1/", import.meta.url); const second = new URL("../docs/migration/rehearsals/synthetic-2/", import.meta.url);
test("independent synthetic rehearsals are deterministic and reject-free", async () => { const one = JSON.parse(await readFile(new URL("reconciliation.json", first), "utf8")); const two = JSON.parse(await readFile(new URL("reconciliation.json", second), "utf8")); assert.equal(one.digest, two.digest); assert.equal(one.rejected, 0); assert.equal(two.rejected, 0); assert.equal(one.monetaryTotals["orders.totalMinor"], one.monetaryTotals["payments.amountMinor"]); });
test("source manifests capture checksums for every automated collection", async () => { const manifest = JSON.parse(await readFile(new URL("source-manifest.json", first), "utf8")); assert.deepEqual(Object.keys(manifest).sort(), ["categories", "orders", "payments", "products", "users", "vendors"]); for (const entry of Object.values(manifest)) assert.match(entry.sha256, /^[a-f0-9]{64}$/); });
test("load plan references resolve inside the deterministic ID map", async () => { const plan = JSON.parse(await readFile(new URL("load-plan.json", first), "utf8")); const ids = new Set(plan.rows.map((row) => row.targetId)); const foreignKeys = ["userId", "vendorId", "shopId", "categoryId", "productId", "variantId", "orderId", "vendorOrderId"]; for (const row of plan.rows) for (const key of foreignKeys) if (typeof row.data[key] === "string") assert.ok(ids.has(row.data[key]), `${row.targetTable}.${key} is unresolved`); });
test("production gate remains explicitly unsigned", async () => { const phase = await readFile(new URL("../docs/phase-9-data-migration.md", import.meta.url), "utf8"); assert.match(phase, /Gate status: blocked/); assert.match(phase, /not passed/); });
test("cutover policy has bounded freeze, rollback and legacy-read windows", async () => {
  const [runbook, approval, decisions] = await Promise.all([
    readFile(new URL("../docs/migration/cutover-runbook.md", import.meta.url), "utf8"),
    readFile(new URL("../docs/migration/reconciliation-approval-template.md", import.meta.url), "utf8"),
    readFile(new URL("../docs/decisions-needed.md", import.meta.url), "utf8")
  ]);
  assert.match(runbook, /two-hour maintenance window/);
  assert.match(runbook, /no more than 45 minutes/);
  assert.match(runbook, /30-minute rollback-decision window/);
  assert.match(runbook, /read-only for seven days/);
  assert.match(runbook, /three distinct engineering\/finance\/operations approvals/);
  for (const field of ["Scheduled two-hour maintenance window", "Write freeze started / ended", "30-minute rollback decision deadline", "Legacy read-only expiry"]) assert.match(approval, new RegExp(field));
  assert.match(decisions, /\| Migration cutover \| IMPLEMENTED \|/);
});
test("release one is greenfield and cannot silently import reference data", async () => {
  const [policy, decisions, runbook] = await Promise.all([
    readFile(new URL("../docs/greenfield-data-launch-policy.md", import.meta.url), "utf8"),
    readFile(new URL("../docs/decisions-needed.md", import.meta.url), "utf8"),
    readFile(new URL("../docs/migration/cutover-runbook.md", import.meta.url), "utf8")
  ]);
  assert.match(policy, /separate greenfield marketplace/);
  assert.match(policy, /behavioral and visual references only/);
  assert.match(policy, /Do not connect Amiyo-App production services to the legacy MongoDB database/);
  assert.match(policy, /Local demo users, demo orders, sandbox payments and synthetic migration rehearsals are forbidden in production/);
  assert.match(decisions, /\| Migration exports \| IMPLEMENTED \| Not applicable to the greenfield release/);
  assert.match(runbook, /contingency runbook/);
});
