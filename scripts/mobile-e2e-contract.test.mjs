import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const flows = ["customer", "vendor", "admin"];

test("native smoke flows use the production package and environment credentials", async () => {
  for (const role of flows) {
    const flow = await readFile(new URL(`../.maestro/${role}-smoke.yaml`, import.meta.url), "utf8");
    assert.match(flow, /appId: com\.amiyo\.go/);
    assert.match(flow, /clearState: true/);
    assert.match(flow, /openLink: amiyogo:\/\/auth/);
    assert.match(flow, new RegExp(`\\$\\{${role.toUpperCase()}_EMAIL\\}`));
    assert.match(flow, new RegExp(`\\$\\{${role.toUpperCase()}_PASSWORD\\}`));
    assert.doesNotMatch(flow, /@amiyo\.test|AmiyoDemo123|store_passwd|postgresql:\/\//);
  }
});

test("native smoke flows cover customer, seller and admin protected workspaces", async () => {
  const customer = await readFile(new URL("../.maestro/customer-smoke.yaml", import.meta.url), "utf8");
  const vendor = await readFile(new URL("../.maestro/vendor-smoke.yaml", import.meta.url), "utf8");
  const admin = await readFile(new URL("../.maestro/admin-smoke.yaml", import.meta.url), "utf8");
  assert.match(customer, /amiyogo:\/\/account/);
  assert.match(customer, /amiyogo:\/\/orders/);
  assert.match(vendor, /amiyogo:\/\/vendor\/dashboard/);
  assert.match(vendor, /visible: Vendor orders/);
  assert.match(admin, /amiyogo:\/\/admin\/orders/);
  assert.match(admin, /visible: Marketplace orders/);
});

test("native QR smoke proves a denied camera keeps manual verification available", async () => {
  const flow = await readFile(new URL("../.maestro/camera-denial-smoke.yaml", import.meta.url), "utf8");
  assert.match(flow, /permissions:\s+camera: deny/);
  assert.match(flow, /amiyogo:\/\/verify-document/);
  assert.match(flow, /tapOn: Scan QR with camera/);
  assert.match(flow, /Camera permission is required to scan/);
  assert.match(flow, /assertVisible: Document QR code/);
});

test("signed document smoke requires a fresh external payload and verifies current record state", async () => {
  const flow = await readFile(new URL("../.maestro/signed-document-smoke.yaml", import.meta.url), "utf8");
  assert.match(flow, /\$\{CUSTOMER_EMAIL\}/);
  assert.match(flow, /\$\{CUSTOMER_PASSWORD\}/);
  assert.match(flow, /\$\{DOCUMENT_QR_PAYLOAD\}/);
  assert.match(flow, /Signature and record verified\|Signed document: record mismatch/);
  assert.match(flow, /Current order status:\.\*/);
  assert.doesNotMatch(flow, /AGI1\||AGP2\|/);
});

test("Android offline smoke restores connectivity after pass or failure", async () => {
  const flow = await readFile(new URL("../.maestro/offline-reconnect-smoke.yaml", import.meta.url), "utf8");
  const offlineMessage = /You are offline\. Saved screens remain available; updates will resume after reconnecting\./;
  assert.match(flow, /appId: com\.amiyo\.go/);
  assert.match(flow, /onFlowComplete:\s+- setAirplaneMode: disabled/);
  assert.match(flow, /setAirplaneMode: enabled/);
  assert.match(flow, offlineMessage);
  assert.match(flow, /notVisible: You are offline/);
  assert.equal(flow.match(/setAirplaneMode: disabled/g)?.length, 2);
});
