import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";
import { z } from "zod";
import { returnSchema } from "@amiyo/contracts";
import { adminOrderDetailSchema, adminWorkspaceSchema, customerOrderSummarySchema, fulfillmentDocumentSchema, orderSchema, orderTrackingSchema, sessionSchema, vendorCommissionInvoiceSchema, vendorFinanceSchema, vendorOrderDetailSchema, vendorOrderListResponseSchema, vendorStatementSchema } from "@amiyo/contracts";

export function loopbackOrigin(value) {
  const url = new URL(value);
  assert.ok(url.protocol === "http:" && ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname) && !url.username && !url.password && url.pathname === "/" && !url.search && !url.hash, "Authenticated demo smoke is restricted to loopback HTTP origins");
  return url;
}

export async function runAuthenticatedSmoke({ apiUrl = "http://127.0.0.1:4000", authUrl = "http://127.0.0.1:9099", fetcher = fetch } = {}) {
  const api = loopbackOrigin(apiUrl);
  const auth = loopbackOrigin(authUrl);
  const results = [];
  const identities = {};
  const productReturn = returnSchema.extend({ items: z.array(returnSchema.shape.items.element.extend({ productName: z.string(), sku: z.string(), thumbnailUrl: z.string().url().nullable() })) });
  for (const [role, expectedRole] of [["customer", "CUSTOMER"], ["vendor", "VENDOR_OWNER"], ["admin", "SUPER_ADMIN"]]) {
    try {
      const response = await fetcher(new URL("/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=local-emulator", auth), { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email: `${role}@amiyo.test`, password: "AmiyoDemo123!", returnSecureToken: true }), redirect: "error", signal: AbortSignal.timeout(20000) });
      assert.equal(response.status, 200);
      const identity = await response.json();
      assert.equal(identity.localId, `amiyo-demo-${role}`);
      assert.equal(typeof identity.idToken, "string");
      identities[role] = { token: identity.idToken, expectedRole };
      results.push({ role, check: "emulator-login", status: "pass" });
    } catch { results.push({ role, check: "emulator-login", status: "fail", reason: "Existing demo identity unavailable; no accounts were created or changed" }); }
  }
  async function check(role, path, expectedStatus, schema, validate) {
    if (!identities[role]) { results.push({ role, check: path, status: "skipped", reason: "Login failed" }); return null; }
    const started = performance.now();
    let actualStatus = null;
    try {
      const response = await fetcher(new URL(path, api), { headers: { Authorization: `Bearer ${identities[role].token}` }, redirect: "error", signal: AbortSignal.timeout(30000) });
      actualStatus = response.status;
      assert.equal(response.status, expectedStatus);
      const body = schema ? schema.parse(await response.json()) : null;
      if (validate) validate(body);
      results.push({ role, check: path, status: "pass", elapsedMs: Math.round(performance.now() - started) });
      return body;
    } catch (error) { results.push({ role, check: path, status: "fail", expectedStatus, actualStatus, reason: error.name === "ZodError" ? "Response contract mismatch" : "Unexpected HTTP status, identity, ownership or network failure" }); return null; }
  }
  for (const role of Object.keys(identities)) {
    await check(role, "/api/v2/me", 200, sessionSchema, (session) => {
      assert.equal(session.status, "ACTIVE");
      assert.ok(session.principal.roles.includes(identities[role].expectedRole));
    });
  }
  const customerOrders = await check("customer", "/api/v2/orders", 200, customerOrderSummarySchema.array());
  const customerReturns = await check("customer", "/api/v2/returns", 200, productReturn.array());
  await check("vendor", "/api/v2/vendor/workspace/returns", 200, productReturn.array());
  if (customerReturns?.length) {
    await check("customer", `/api/v2/returns/${customerReturns[0].id}`, 200, productReturn.extend({ events: z.array(returnSchema.shape.events.unwrap().element.strict()) }), (detail) => {
      for (let index = 1; index < detail.events.length; index += 1) assert.ok(Date.parse(detail.events[index - 1].createdAt) <= Date.parse(detail.events[index].createdAt));
    });
    await check("customer", `/api/v2/vendor/returns/${customerReturns[0].id}`, 403);
  } else results.push({ role: "customer", check: "own-return-detail", status: "skipped", reason: "No existing customer return fixture; none was created" });
  const returns = await check("admin", "/api/v2/admin/returns", 200, returnSchema.array());
  const evidenceCaseId = returns?.[0]?.id ?? "00000000-0000-4000-8000-000000000000";
  await check("customer", `/api/v2/admin/returns/${evidenceCaseId}/evidence`, 403);
  await check("vendor", `/api/v2/admin/returns/${evidenceCaseId}/evidence`, 403);
  if (returns?.length) {
    await check("admin", `/api/v2/admin/returns/${evidenceCaseId}/evidence`, 200, z.array(z.object({ id: z.string().uuid(), name: z.string(), mimeType: z.string() }).strict()));
  } else results.push({ role: "admin", check: "return-evidence-list", status: "skipped", reason: "No existing return fixture; none was created" });
  const vendorOrderPage = await check("vendor", "/api/v2/vendor/orders?limit=30", 200, vendorOrderListResponseSchema);
  const vendorOrders = vendorOrderPage?.data ?? [];
  const finance = await check("vendor", "/api/v2/vendor/finance", 200, vendorFinanceSchema);
  await check("admin", "/api/v2/admin/workspace", 200, adminWorkspaceSchema);
  await check("customer", "/api/v2/admin/workspace", 403);
  await check("vendor", "/api/v2/admin/workspace", 403);
  await check("customer", "/api/v2/vendor/finance", 403);
  const month = new Date(Date.now() + 6 * 3600000).toISOString().slice(0, 7);
  if (finance) {
    for (const [name, schema] of [["statement", vendorStatementSchema], ["commission-invoice", vendorCommissionInvoiceSchema]]) {
      await check("vendor", `/api/v2/vendor/finance/${name}?month=${month}`, 200, schema, (report) => assert.equal(report.vendorId, finance.vendorId));
      await check("customer", `/api/v2/vendor/finance/${name}?month=${month}&vendorId=${encodeURIComponent(finance.vendorId)}`, 403);
    }
  } else results.push({ role: "vendor", check: "monthly-finance-reports", status: "skipped", reason: "Finance account unavailable" });
  if (customerOrders?.length) {
    await check("customer", `/api/v2/orders/${customerOrders[0].id}`, 200, orderSchema);
    await check("customer", `/api/v2/orders/${customerOrders[0].id}/tracking`, 200, orderTrackingSchema);
    await check("admin", `/api/v2/admin/workspace/orders/${customerOrders[0].id}`, 200, adminOrderDetailSchema);
    await check("vendor", `/api/v2/orders/${customerOrders[0].id}`, 404);
  }
  else results.push({ role: "vendor", check: "other-customer-order-denial", status: "skipped", reason: "No customer order fixture" });
  if (vendorOrders?.length) {
    await check("vendor", `/api/v2/vendor/orders/${vendorOrders[0].id}`, 200, vendorOrderDetailSchema);
    await check("vendor", `/api/v2/vendor/orders/${vendorOrders[0].id}/documents`, 200, fulfillmentDocumentSchema);
    await check("customer", `/api/v2/vendor/orders/${vendorOrders[0].id}`, 403);
  }
  else results.push({ role: "customer", check: "vendor-package-denial", status: "skipped", reason: "No vendor package fixture" });
  return { kind: "authenticated-loopback-marketplace-smoke", results };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const report = await runAuthenticatedSmoke({ apiUrl: process.env.SMOKE_API_URL, authUrl: process.env.SMOKE_AUTH_URL });
  console.log(JSON.stringify(report, null, 2));
  if (report.results.some((result) => result.status !== "pass")) process.exitCode = 1;
}
