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
